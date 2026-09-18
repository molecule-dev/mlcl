import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const srcDir = path.join(appRoot, 'src')

function walkTsx(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkTsx(p, acc)
    else if (ent.name.endsWith('.tsx')) acc.push(p)
  }
  return acc
}

function tokenFor(cls) {
  let h = 0
  for (let i = 0; i < cls.length; i++) h = (h * 31 + cls.charCodeAt(i)) >>> 0
  return `fv${h.toString(16).padStart(8, '0')}`
}

const files = walkTsx(srcDir)
const classToToken = new Map()
const classNameRe = /className=(["'`])([\s\S]*?)\1/g

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  let m
  while ((m = classNameRe.exec(text))) {
    const quote = m[1]
    const inner = m[2]
    if (quote !== '"' && quote !== "'") continue
    if (
      inner.includes('${') ||
      inner.includes('{') ||
      inner.includes('cm.') ||
      inner.includes('getClassMap')
    )
      continue
    const trimmed = inner.trim()
    if (!trimmed || trimmed.length > 800) continue
    if (!classToToken.has(trimmed)) classToToken.set(trimmed, tokenFor(trimmed))
  }
}

const entries = [...classToToken.entries()].sort((a, b) => a[1].localeCompare(b[1]))
if (entries.length === 0) {
  console.log(
    JSON.stringify({ skipped: true, reason: 'no static className strings found' }, null, 2),
  )
  process.exit(0)
}
const tsPath = path.join(srcDir, 'generatedVisualClassMap.ts')

const tsLines = [
  '/** AUTO-GENERATED — token keys map to original Tailwind class strings */',
  "import type { UIClassMap } from '@molecule/app-ui'",
  '',
  'export const generatedVisualClassMapTokens = {',
]
for (const [cls, tok] of entries) {
  const esc = cls.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  tsLines.push(`  ${tok}: '${esc}',`)
}
tsLines.push(
  '} as const',
  '',
  'export function applyGeneratedVisualTokens(base: UIClassMap): UIClassMap {',
  '  return { ...base, ...generatedVisualClassMapTokens } as UIClassMap',
  '}',
)
fs.writeFileSync(tsPath, tsLines.join('\n') + '\n')

let replaceCount = 0
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  const orig = text
  text = text.replace(classNameRe, (full, quote, inner) => {
    if (quote !== '"' && quote !== "'") return full
    if (
      inner.includes('${') ||
      inner.includes('{') ||
      inner.includes('cm.') ||
      inner.includes('getClassMap')
    )
      return full
    const trimmed = inner.trim()
    const tok = classToToken.get(trimmed)
    if (!tok) return full
    replaceCount++
    return `className={cm.${tok}}`
  })
  if (text !== orig) fs.writeFileSync(file, text)
}

console.log(JSON.stringify({ tokens: entries.length, replaceCount }, null, 2))
