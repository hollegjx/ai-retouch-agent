import { expect, it } from 'vitest'
import { EMPTY_DRAFT, draftReady, operationsOf } from './batch'

it('批量保留选定的执行顺序并序列化对应参数', () => {
  const draft = {
    ...EMPTY_DRAFT,
    selected: ['replace_background', 'remove_background'] as const,
    prompt: '  木桌  ',
  }
  expect(operationsOf({ ...draft, selected: [...draft.selected] })).toEqual([
    { tool: 'replace_background', params: { prompt: '木桌' } },
    { tool: 'remove_background', params: {} },
  ])
})
it('必须有素材、处理步骤、描述和导出格式', () => {
  expect(draftReady(EMPTY_DRAFT, 0)).toContain('先选')
  expect(draftReady({ ...EMPTY_DRAFT, formats: [] }, 1)).toContain('格式')
  expect(draftReady({ ...EMPTY_DRAFT, selected: ['replace_background'] }, 1)).toContain('描述')
  expect(draftReady(EMPTY_DRAFT, 1)).toBeNull()
})
