import { expect, test as base, type Page } from '@playwright/test'
import type { Asset } from '../src/types/assets'
import type { SessionDetail } from '../src/types/sessions'
import type { Turn } from '../src/types/agent'
import type { Run } from '../src/types/runs'

export type Mode = 'normal' | 'empty' | 'error'
export const test = base.extend<{ contentRequests: void }>({
  contentRequests: [
    async ({ context }, use) => {
      const externalRequests: string[] = []
      context.on('request', (request) => {
        const url = new URL(request.url())
        if (['http:', 'https:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:5175') {
          externalRequests.push(`${request.method()} ${url.origin}${url.pathname}`)
        }
      })
      await use()
      expect(externalRequests, '模板页面不得请求外部推广、脚本或追踪资源').toEqual([])
    },
    { auto: true },
  ],
})
const DATE = '2026-11-26T08:00:00Z'
export const assets: Asset[] = ['原图', '营销图', '方形交付'].map((_, index) => ({
  id: `asset-${index + 1}`,
  kind: index === 0 ? 'original' : index === 1 ? 'marketing' : 'export',
  source: 'upload',
  image_format: 'PNG',
  width: 640,
  height: 480,
  size_bytes: 138240,
  has_alpha: false,
  created_at: DATE,
  url: `/mock/images/${index + 1}.svg`,
}))
export const session: SessionDetail = {
  id: 'session-1',
  title: '日常器物 · 新品系列',
  revision: 2,
  history_seq: 2,
  original_asset_id: assets[0].id,
  current_asset_id: assets[0].id,
  created_at: DATE,
  updated_at: DATE,
  assets,
  can_undo: true,
  can_redo: false,
  document: {
    width: 640,
    height: 480,
    layers: [
      {
        id: 'base',
        kind: 'image',
        name: '产品原图',
        asset_id: assets[0].id,
        width: 640,
        height: 480,
        transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0 },
        opacity: 1,
        visible: true,
        locked: false,
      },
      {
        id: 'text-1',
        kind: 'text',
        name: '标题',
        text: 'DAILY OBJECTS',
        font_size: 24,
        fill: '#263b35',
        asset_id: null,
        width: 280,
        height: 48,
        transform: { x: 24, y: 24, scale_x: 1, scale_y: 1, rotation: 0 },
        opacity: 1,
        visible: true,
        locked: false,
      },
    ],
  },
  previous_document: null,
}
session.previous_document = structuredClone(session.document)
export const run: Run = {
  id: 'run-1',
  tool: 'generate_image',
  status: 'succeeded',
  progress: 100,
  stage: '已完成',
  error: null,
  prompt: '陶瓷杯，自然光，浅木色桌面',
  candidates: assets.slice(0, 2),
  result: {},
}

export async function mockBackend(page: Page, mode: Mode = 'normal', signedIn = true) {
  let loggedIn = signedIn
  let current = structuredClone(session)
  let turns: Turn[] = []
  let uploadCount = 0
  let batchAssets = assets
  const calls: Array<{ path: string; method: string; body: unknown }> = []
  const unhandled: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.context().route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.origin === 'http://127.0.0.1:5175' ? route.continue() : route.abort()
  })
  await page.route('**/mock/images/*.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#ebe9df"/><rect y="330" width="640" height="150" fill="#d9d7cc"/><ellipse cx="330" cy="377" rx="116" ry="12" fill="#c7c7bb"/><path d="M395 202h35c62 0 62 111-8 111h-27" fill="none" stroke="#fafaf4" stroke-width="24"/><path d="M210 184h190l-15 159q-80 65-160 0z" fill="#fcfcf6"/><ellipse cx="305" cy="184" rx="95" ry="23" fill="#e0dfd5"/><ellipse cx="305" cy="188" rx="80" ry="14" fill="#c1ad91"/><path d="M275 137c-20-30 20-38 0-68M320 137c-20-30 20-38 0-68" fill="none" stroke="#fbfaf6" stroke-width="8" stroke-linecap="round"/></svg>`,
    }),
  )
  await page.route('**/events/**', (route) =>
    route.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify(run)}\n\n` }),
  )
  await page.route(new RegExp('^http://127\\.0\\.0\\.1:5175/api/'), async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')
    const method = request.method()
    const body = request.headers()['content-type']?.includes('application/json')
      ? (request.postDataJSON() as Record<string, unknown>)
      : undefined
    calls.push({ path, method, body })
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data })
    const noContent = () => route.fulfill({ status: 204 })
    if (path === '/auth/me')
      return loggedIn
        ? json({ id: 'user-1', username: 'studio' })
        : json({ detail: '请登录', code: 40100 }, 401)
    if (path === '/auth/login' || path === '/auth/register') {
      loggedIn = true
      return json({ id: 'user-1', username: body?.username })
    }
    if (path === '/auth/logout') {
      loggedIn = false
      return noContent()
    }
    if (mode === 'error') return json({ detail: '连接暂时中断，请重试', code: 50000 }, 503)
    if (path === '/assets/library')
      return json(
        mode === 'empty'
          ? []
          : [
              {
                session_id: current.id,
                title: current.title,
                updated_at: DATE,
                cover: assets[0],
                assets,
              },
            ],
      )
    if (path === '/assets' && method === 'POST') {
      uploadCount++
      return json({ ...assets[0], id: `upload-${uploadCount}` }, 201)
    }
    if (path === '/assets') return json(mode === 'empty' ? [] : assets)
    if (path === '/sessions' && method === 'GET') return json(mode === 'empty' ? [] : [current])
    if (path === '/sessions' && method === 'POST') {
      current = { ...current, title: typeof body?.title === 'string' ? body.title : current.title }
      return json(current, 201)
    }
    if (path === '/generations') return json({ ...run, status: 'queued' }, 202)
    if (path.startsWith('/runs/')) return json({ ...run, id: path.split('/').at(-1) })
    if (path === '/sessions/session-1' && method === 'PATCH') {
      current = { ...current, ...body }
      return json(current)
    }
    if (path === '/sessions/session-1') return json(current)
    if (path.endsWith('/history'))
      return json(
        mode === 'empty'
          ? []
          : [{ seq: 1, action: 'create_session', params: {}, result: {}, created_at: DATE }],
      )
    if (path.endsWith('/selection/prepare')) return noContent()
    if (path.endsWith('/selection') && method === 'DELETE') return noContent()
    if (path.endsWith('/selection') && method === 'GET') return json(null)
    if (path.endsWith('/selection'))
      return json({
        revision: current.revision,
        mask: assets[0],
        markers: [{ index: 1, x: 0.4, y: 0.4 }],
      })
    if (path.endsWith('/tools')) {
      current = { ...current, revision: current.revision + 1, can_undo: true }
      return json({ run: { ...run, tool: body?.tool }, session: current }, 202)
    }
    if (path.endsWith('/undo') || path.endsWith('/redo'))
      return json({ ...current, can_redo: true })
    if (path.endsWith('/messages') && method === 'GET') return json(turns)
    if (path.endsWith('/messages') && method === 'POST') {
      const turn: Turn = {
        id: 'turn-1',
        revision: current.revision,
        goal: String(body?.text),
        reply: '先去除背景，再调整亮度。确认后开始执行。',
        status: 'queued',
        error: null,
        created_at: DATE,
        steps: [
          {
            id: 'step-1',
            tool: 'remove_background',
            label: '去除背景',
            depends_on: [],
            run_id: null,
            status: 'waiting',
          },
        ],
      }
      turns = [...turns, turn]
      return json(turn, 201)
    }
    if (/\/messages\/turn-1\/(confirm|cancel|retry)$/.test(path)) {
      const turn = {
        ...turns[0],
        status: path.endsWith('cancel') ? ('canceled' as const) : ('succeeded' as const),
      }
      turns = [turn]
      return json(turn)
    }
    if (path === '/batches' && method === 'POST') {
      batchAssets = ((body?.asset_ids ?? []) as string[]).map((id) => ({ ...assets[0], id }))
      return json({ ...run, id: 'batch-1', tool: 'batch_process' }, 202)
    }
    const batch = {
      run: { ...run, id: 'batch-1', tool: 'batch_process' },
      items: batchAssets.map((source) => ({
        source,
        status: 'succeeded',
        error: null,
        outputs: [assets[2]],
      })),
      created_at: DATE,
    }
    if (path === '/batches') return json(mode === 'empty' ? [] : [batch])
    if (path === '/batches/batch-1') return json(batch)
    if (path.endsWith('/exports') || path.endsWith('/export'))
      return route.fulfill({
        contentType: 'application/zip',
        headers: { 'Content-Disposition': 'attachment; filename="delivery.zip"' },
        body: Buffer.from('test-only-zip'),
      })
    unhandled.push(`${method} ${path}`)
    return json({ detail: 'Mock route missing' }, 501)
  })
  return { calls, unhandled, errors }
}
