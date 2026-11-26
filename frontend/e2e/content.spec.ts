import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { mockBackend, test, type Mode } from './fixtures'

const { forbiddenText }: { forbiddenText: string[] } = JSON.parse(
  readFileSync(new URL('../../scripts/content-policy.json', import.meta.url), 'utf8'),
)

async function expectCleanDocument(page: Page) {
  const html = (await page.content()).normalize('NFKC').toLowerCase()
  expect(forbiddenText.filter((term) => html.includes(term.toLowerCase()))).toEqual([])
  const externalTargets = await page
    .locator('[href], [src], [action], [formaction], [poster], object[data]')
    .evaluateAll((elements) => {
      const targets: string[] = []
      for (const element of elements) {
        for (const attr of ['href', 'src', 'action', 'formaction', 'poster', 'data']) {
          const value = element.getAttribute(attr)
          if (!value) continue
          const url = new URL(value, location.href)
          if (['blob:', 'data:'].includes(url.protocol)) continue
          if (url.origin !== location.origin) targets.push(`${element.tagName}[${attr}]=${value}`)
        }
      }
      return targets
    })
  expect(externalTargets, '链接、图片、表单和嵌入资源必须属于当前应用').toEqual([])
  await expect(page.locator('iframe, object, embed')).toHaveCount(0)
}

for (const width of [1280, 390]) {
  test(`发布页面内容检查：工作台、登录、注册，${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const state = await mockBackend(page, 'normal', false)
    for (const [path, title] of [
      ['/', '图片工作台'],
      ['/auth', '欢迎回来'],
      ['/auth?mode=register', '创建账号'],
    ]) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expectCleanDocument(page)
    }
    expect(state.errors).toEqual([])
    expect(state.unhandled).toEqual([])
  })

  for (const mode of ['normal', 'empty', 'error'] satisfies Mode[]) {
    test(`发布页面内容检查：全部业务页面，${mode}，${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const state = await mockBackend(page, mode)
      for (const path of [
        '/create',
        '/candidates/run-1',
        '/editor',
        '/editor/session-1',
        '/marketing',
        '/marketing/session-1',
        '/batch',
        '/batch/batch-1',
      ]) {
        await page.goto(path)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
        await expect(page.getByText('加载中', { exact: true })).toHaveCount(0)
        if (mode === 'error') {
          if (path === '/editor' && width === 390) {
            await page.getByRole('button', { name: 'AI 对话 / 历史' }).click()
          }
          await expect(page.getByRole('alert').first()).toBeVisible()
        } else if (path === '/editor/session-1') {
          await expect(page.locator('canvas').first()).toBeVisible()
        } else if (path === '/candidates/run-1') {
          await expect(page.getByRole('button', { name: /方案 01/ })).toBeVisible()
        }
        await expectCleanDocument(page)
      }
      expect(state.errors).toEqual([])
      expect(state.unhandled).toEqual([])
    })
  }
}
