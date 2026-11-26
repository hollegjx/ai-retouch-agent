import { expect } from '@playwright/test'
import { test, mockBackend } from './fixtures'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvMcAAAAASUVORK5CYII=',
  'base64',
)

test('登录、回跳与退出', async ({ page }) => {
  const state = await mockBackend(page, 'normal', false)
  await page.goto('/batch')
  await page.getByLabel('用户名').fill('artist01')
  await page.getByLabel('密码', { exact: true }).fill('secret123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '批量处理', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出', exact: true }).click()
  await expect(page.getByRole('heading', { name: '图片工作台' })).toBeVisible()
  expect(state.errors).toEqual([])
  expect(state.unhandled).toEqual([])
})

test('描述生成 → 选择候选 → 进入编辑', async ({ page }) => {
  const state = await mockBackend(page)
  await page.goto('/create')
  await page.getByLabel('画面描述').fill('自然光下的陶瓷杯')
  await page.getByRole('button', { name: '生成图片' }).click()
  await page.getByRole('button', { name: /方案 01/ }).click()
  await page.getByRole('button', { name: '进入编辑' }).click()
  await expect(page.getByLabel('会话标题')).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  expect(state.errors).toEqual([])
  expect(state.unhandled).toEqual([])
})

test('上传素材后打开画布', async ({ page }) => {
  const state = await mockBackend(page)
  await page.goto('/create')
  await page
    .getByLabel('上传图片')
    .setInputFiles({ name: 'source.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByLabel('会话标题')).toBeVisible()
  expect(state.calls.some((call) => call.path === '/assets' && call.method === 'POST')).toBe(true)
  expect(state.errors).toEqual([])
})

test('画布变换、文字、撤销与 AI 计划', async ({ page }) => {
  const state = await mockBackend(page)
  await page.goto('/editor/session-1')
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.getByRole('button', { name: '图层', exact: true }).click()
  await page.getByLabel('图层文字').fill('新品系列')
  await page.getByLabel('图层文字').press('Tab')
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path.endsWith('/tools') &&
          (call.body as { tool: string })?.tool === 'set_layer_text',
      ),
    )
    .toBe(true)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '水平翻转', exact: true }).click()
  await page.getByRole('button', { name: '撤销', exact: true }).first().click()
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounds')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2 + 16, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(() =>
      state.calls.some(
        (call) =>
          call.path.endsWith('/tools') && (call.body as { tool: string })?.tool === 'move_layer',
      ),
    )
    .toBe(true)
  await page.getByPlaceholder(/说明要怎么改/).fill('去背景再调亮一点')
  await page.getByPlaceholder(/说明要怎么改/).press('Enter')
  await page.getByRole('button', { name: '执行计划' }).click()
  await expect.poll(() => state.calls.some((call) => call.path.endsWith('/confirm'))).toBe(true)
  expect(state.errors).toEqual([])
  expect(state.unhandled).toEqual([])
})

test('营销生成、投放尺寸与打包交付', async ({ page }) => {
  const state = await mockBackend(page)
  await page.goto('/marketing/session-1')
  await page.getByLabel('营销图要求').fill('新品首发')
  await page.getByRole('button', { name: '生成', exact: true }).first().click()
  await page.getByRole('button', { name: '生成 1:1 / 4:5 / 9:16' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /打包 \d+ 张/ }).click()
  expect((await download).suggestedFilename()).toBe('delivery.zip')
  expect(state.errors).toEqual([])
  expect(state.unhandled).toEqual([])
})

test('批量保留多文件上传结果并导出', async ({ page }) => {
  const state = await mockBackend(page)
  await page.goto('/batch')
  await page.getByLabel('上传图片').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: png },
    { name: 'b.png', mimeType: 'image/png', buffer: png },
  ])
  await expect(page.getByRole('button', { name: '移除', exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: '开始处理' }).click()
  await expect(page.getByRole('heading', { name: '批量进度' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '打包下载' }).click()
  expect((await download).suggestedFilename()).toBe('delivery.zip')
  const payload = state.calls.find((call) => call.path === '/batches' && call.method === 'POST')
    ?.body as { asset_ids: string[] }
  expect(payload.asset_ids).toEqual(['upload-1', 'upload-2'])
  expect(state.errors).toEqual([])
  expect(state.unhandled).toEqual([])
})
