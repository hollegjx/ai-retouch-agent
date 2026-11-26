import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '@/request'

afterEach(() => vi.unstubAllGlobals())

describe('统一请求层', () => {
  it('JSON 请求携带同源 Cookie，204 正常返回', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetcher)
    expect(await api.post('/auth/logout')).toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ credentials: 'same-origin', method: 'POST' }),
    )
  })
  it('上传不覆盖 multipart boundary', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: 'a1' }))
    vi.stubGlobal('fetch', fetcher)
    const form = new FormData()
    form.append('file', new Blob(['image']), 'a.png')
    await api.upload('/assets', form)
    const init = fetcher.mock.calls[0][1] as RequestInit
    expect((init.headers as Headers).has('Content-Type')).toBe(false)
    expect(init.body).toBe(form)
  })
  it('保留业务状态码并兼容 FastAPI 校验数组', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { detail: [{ msg: 'Value error, 图片不能为空' }], code: 40000 },
            { status: 422 },
          ),
        ),
    )
    const error = await api.post('/assets').catch((error) => error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 40000, message: '图片不能为空' })
  })
  it('下载识别中文文件名，编码损坏时回退', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('zip', {
          headers: { 'Content-Disposition': "attachment; filename*=UTF-8''%E4%BA%A4%E4%BB%98.zip" },
        }),
      )
      .mockResolvedValueOnce(
        new Response('zip', {
          headers: { 'Content-Disposition': "attachment; filename*=UTF-8''%invalid" },
        }),
      )
    vi.stubGlobal('fetch', fetcher)
    expect((await api.download('/export', 'fallback.zip')).filename).toBe('交付.zip')
    expect((await api.download('/export', 'fallback.zip')).filename).toBe('fallback.zip')
  })
})
