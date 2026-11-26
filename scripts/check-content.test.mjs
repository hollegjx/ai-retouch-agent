import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { auditContent, findForbiddenText, policy } from './check-content.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'template-content-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const rules = { ...policy, reviewedAssets: {} }
  return {
    root,
    rules,
    write(path, content) {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
    },
    scan(dist = false) {
      return auditContent(root, { dist, rules })
    },
  }
}

test('正文、Unicode / URL / HTML 编码及零宽字符均不能隐藏禁止词', () => {
  const term = policy.forbiddenText[0]
  for (const text of [
    term,
    encodeURIComponent(term),
    [...term].map((char) => `\\u${char.codePointAt(0).toString(16)}`).join(''),
    [...term].map((char) => `&#${char.codePointAt(0)};`).join(''),
    [...term].join('\u200b'),
  ]) {
    assert.ok(findForbiddenText(text).length)
  }
  assert.deepEqual(findForbiddenText('营销图生成、投放尺寸、批量交付'), [])
})

test('隐藏文件也扫描；规则豁免仅限原路径，发布包不豁免', (t) => {
  const f = fixture(t)
  f.write('scripts/content-policy.json', policy.forbiddenText[0])
  assert.deepEqual(f.scan().issues, [])
  f.write('.template-note', policy.forbiddenText[0])
  assert.ok(f.scan().issues.some((issue) => issue.startsWith('.template-note:')))
  f.write('frontend/dist/index.html', '<main>图片工作台</main>')
  f.write('frontend/dist/scripts/content-policy.json', policy.forbiddenText[0])
  assert.ok(f.scan(true).issues.some((issue) => issue.includes('禁止的推广内容')))
})

test('未知品牌的外链、外部脚本、协议相对地址也被拦截', (t) => {
  const f = fixture(t)
  for (const content of [
    '<a href="https://campaign.invalid/join">访问</a>',
    '<script src="//campaign.invalid/script.js"></script>',
    'a{background:url(https://campaign.invalid/banner.png)}',
  ]) {
    f.write('frontend/src/page.tsx', content)
    assert.ok(f.scan().issues.some((issue) => issue.includes('外部地址')))
  }
  f.write('frontend/src/page.tsx', '<a href="/create">开始创作</a>')
  assert.deepEqual(f.scan().issues, [])
})

test('新增、替换及内嵌素材必须检查，发布副本必须和已检查素材一致', (t) => {
  const f = fixture(t)
  const icon = Buffer.from([0x89, 0x50, 0x4e, 0x47])
  const path = 'frontend/public/icon.png'
  f.write(path, icon)
  assert.ok(f.scan().issues.some((issue) => issue.includes('素材新增或已变化')))
  f.rules.reviewedAssets[path] = createHash('sha256').update(icon).digest('hex')
  assert.deepEqual(f.scan().issues, [])
  f.write('frontend/dist/index.html', '<main>图片工作台</main>')
  f.write('frontend/dist/icon.png', Buffer.concat([icon, Buffer.from('changed')]))
  assert.ok(f.scan(true).issues.some((issue) => issue.includes('素材新增或已变化')))
  f.write('frontend/src/icon.ts', `const icon = 'data:image/png;base64,${'A'.repeat(32)}'`)
  assert.ok(f.scan().issues.some((issue) => issue.includes('内嵌素材')))
})

test('发布入口缺失不能误报通过；锁文件中的禁止词仍被检查', (t) => {
  const f = fixture(t)
  assert.ok(f.scan(true).issues.some((issue) => issue.includes('缺少发布入口')))
  f.write('frontend/package-lock.json', JSON.stringify({ description: policy.forbiddenText[0] }))
  assert.ok(f.scan().issues.some((issue) => issue.includes('禁止的推广内容')))
})

test('构建调用的命令行检查遇到残留返回失败退出码', (t) => {
  const f = fixture(t)
  f.write(
    'scripts/check-content.mjs',
    readFileSync(new URL('./check-content.mjs', import.meta.url)),
  )
  f.write('scripts/content-policy.json', JSON.stringify(f.rules))
  f.write('README.md', '图片编辑工作台')
  const run = () => spawnSync(process.execPath, [join(f.root, 'scripts/check-content.mjs')])
  assert.equal(run().status, 0)
  f.write('README.md', policy.forbiddenText[0])
  assert.equal(run().status, 1)
})
