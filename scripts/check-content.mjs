import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const policy = JSON.parse(readFileSync(new URL('./content-policy.json', import.meta.url)))
const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  '.venv',
  '__pycache__',
  '.pytest_cache',
  '.ruff_cache',
  '.mypy_cache',
  '.data',
  '.idea',
  '.vscode',
])
const ignoredPaths = new Set([
  'frontend/dist',
  'frontend/test-results',
  'frontend/playwright-report',
  // 规则本身含禁止词；只豁免这一份文件，复制进发布包仍会被拦截。
  'scripts/content-policy.json',
])
const mediaExtensions = new Set([
  '.svg',
  '.svgz',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
])

export function normalizeText(text) {
  for (let pass = 0; pass < 2; pass++) {
    text = text
      .replace(
        /\\u\{([\da-f]{1,6})\}|\\u([\da-f]{4})|\\x([\da-f]{2})|&#x([\da-f]+);?/gi,
        (match, ...groups) => {
          const value = Number.parseInt(groups.slice(0, 4).find(Boolean), 16)
          return value <= 0x10ffff ? String.fromCodePoint(value) : match
        },
      )
      .replace(/&#(\d+);?/g, (match, digits) =>
        Number(digits) <= 0x10ffff ? String.fromCodePoint(Number(digits)) : match,
      )
      .replace(/(?:%[\da-f]{2})+/gi, (match) => {
        try {
          return decodeURIComponent(match)
        } catch {
          return match
        }
      })
      .replace(
        /&(?:amp|colon|sol|period);/gi,
        (match) =>
          ({ '&amp;': '&', '&colon;': ':', '&sol;': '/', '&period;': '.' })[match.toLowerCase()],
      )
      .replace(/\\\//g, '/')
  }
  return text
    .normalize('NFKC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .toLowerCase()
}

export function findForbiddenText(text, rules = policy) {
  const normalized = normalizeText(text)
  return rules.forbiddenText.filter((term) => normalized.includes(term.toLowerCase()))
}

function isTestFile(path) {
  return (
    path.startsWith('backend/tests/') ||
    path.startsWith('frontend/e2e/') ||
    /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path)
  )
}

/** 全量扫描第一方文件；发布扫描不复用开发目录豁免。 */
export function auditContent(root = projectRoot, { dist = false, rules = policy } = {}) {
  const issues = []
  let fileCount = 0
  const scannedAssets = new Set()
  const assets = Object.fromEntries(
    Object.entries(rules.reviewedAssets)
      .filter(([path]) => !dist || path.startsWith('frontend/public/'))
      .map(([path, hash]) => [
        dist ? path.replace('frontend/public/', 'frontend/dist/') : path,
        hash,
      ]),
  )
  const start = dist ? join(root, 'frontend/dist') : root
  if (dist && !existsSync(join(start, 'index.html'))) {
    return { fileCount, issues: ['frontend/dist/index.html: 缺少发布入口，请先构建'] }
  }

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name)
      const path = relative(root, fullPath).split('\\').join('/')
      if (
        !dist &&
        (ignoredDirectories.has(entry.name) ||
          ignoredPaths.has(path) ||
          entry.name === '.DS_Store' ||
          /\.(?:pyc|pyo|tsbuildinfo|log)$/.test(entry.name) ||
          (entry.name.startsWith('.env') && entry.name !== '.env.example'))
      )
        continue
      if (entry.isSymbolicLink()) {
        issues.push(`${path}: 不允许发布未检查的符号链接`)
        continue
      }
      if (entry.isDirectory()) {
        visit(fullPath)
        continue
      }
      fileCount++
      if (findForbiddenText(path, rules).length) issues.push(`${path}: 文件名含禁止的推广内容`)
      const bytes = readFileSync(fullPath)
      let text
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        /* 二进制走素材校验 */
      }
      if (
        text === undefined ||
        mediaExtensions.has(extname(path).toLowerCase()) ||
        path.startsWith('frontend/public/')
      ) {
        const digest = createHash('sha256').update(bytes).digest('hex')
        scannedAssets.add(path)
        if (assets[path] !== digest)
          issues.push(`${path}: 素材新增或已变化，请先检查内容再更新校验值`)
      }
      if (text === undefined) continue
      if (findForbiddenText(text, rules).length) issues.push(`${path}: 含禁止的推广内容`)
      if (!dist && (isTestFile(path) || ['package-lock.json', 'uv.lock'].includes(entry.name)))
        continue
      const normalized = normalizeText(text)
      const frontendRuntime =
        path.startsWith('frontend/src/') ||
        path.startsWith('frontend/public/') ||
        path === 'frontend/index.html'
      const allowedUrls = new Set(
        dist
          ? rules.allowedBundleUrls
          : frontendRuntime
            ? ['http://www.w3.org/2000/svg']
            : rules.allowedSourceUrls,
      )
      const urls =
        normalized.match(
          /https?:\/\/[^\s"'`<>()\]\\]+|(?<=["'`(=])\/\/(?=[a-z\d-]+(?:\.[a-z\d-]+)+)[^\s"'`<>()\]\\]+/g,
        ) ?? []
      for (const url of new Set(urls.map((value) => value.replace(/[.,;]+$/, '')))) {
        if (!allowedUrls.has(url)) {
          // 不输出 URL 内容，避免把配置里的凭据写入构建日志。
          issues.push(`${path}: 含未批准的外部地址，请检查用途`)
        }
      }
      if (
        /data:(?:image|audio|video|font|application)\/[^\s,]+,[a-z\d+/=%]{20,}/i.test(normalized)
      ) {
        issues.push(`${path}: 请将内嵌素材移为可检查的本地文件`)
      }
    }
  }
  visit(start)
  for (const path of Object.keys(assets)) {
    if (!scannedAssets.has(path)) issues.push(`${path}: 已登记素材缺失，请同步清单`)
  }
  return { fileCount, issues: [...new Set(issues)] }
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const dist = process.argv.includes('--dist')
  const result = auditContent(projectRoot, { dist })
  if (result.issues.length) {
    console.error(`内容检查失败（${result.fileCount} 个文件）：\n${result.issues.join('\n')}`)
    process.exitCode = 1
  } else {
    console.log(`${dist ? '发布包' : '模板'}内容检查通过：${result.fileCount} 个文件`)
  }
}
