import { afterEach, expect, it, vi } from 'vitest'
import { safeRedirect } from './navigation'

afterEach(() => vi.unstubAllGlobals())
it('登录仅回跳同源内部页面', () => {
  vi.stubGlobal('window', { location: { origin: 'http://app.local' } })
  for (const url of ['//external.test', '/\\external.test', 'https://external.test', '/auth', null])
    expect(safeRedirect(url)).toBe('/create')
  expect(safeRedirect('/editor/123?tab=layers')).toBe('/editor/123?tab=layers')
})
