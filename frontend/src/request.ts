export class ApiError extends Error {
  status: number
  code?: number

  constructor(status: number, message: string, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// pydantic 会给自定义校验加这个前缀，对用户没有意义
const VALUE_ERROR = /^Value error,\s*/

function messageOf(item: unknown): string {
  if (typeof item === 'string') return item.trim()
  if (!item || typeof item !== 'object') return ''
  const { msg, message } = item as { msg?: unknown; message?: unknown }
  return messageOf(msg ?? message).replace(VALUE_ERROR, '')
}

/** FastAPI 校验失败时 detail 是 `{loc, msg, type}` 数组，原样当字符串会渲染成 [object Object]。 */
function formatDetail(detail: unknown, fallback: string): string {
  if (Array.isArray(detail)) {
    return detail.map(messageOf).filter(Boolean).join('；') || fallback
  }
  return messageOf(detail) || fallback
}

/** 上传与下载走原生 fetch，错误一律经这里构造，文案格式与 JSON 请求保持一致。 */
export async function apiError(response: Response, fallback: string): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return new ApiError(
    response.status,
    formatDetail(payload.detail ?? payload.message, fallback),
    typeof payload.code === 'number' ? payload.code : undefined,
  )
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (init?.body !== undefined && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers,
  })
  if (!response.ok) throw await apiError(response, response.statusText || '请求失败，请重试')
  return response
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init)
  return response.status === 204 ? (undefined as T) : response.json()
}

function filenameOf(header: string | null, fallback: string): string {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '')
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      return fallback
    }
  }
  return /filename="([^"]+)"/i.exec(header ?? '')?.[1] ?? fallback
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body }),
  download: async (path: string, fallback: string, body?: unknown) => {
    const response = await send(
      path,
      body === undefined
        ? undefined
        : {
            method: 'POST',
            body: JSON.stringify(body),
          },
    )
    return {
      blob: await response.blob(),
      filename: filenameOf(response.headers.get('Content-Disposition'), fallback),
    }
  },
}
