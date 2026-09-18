#!/usr/bin/env node
/**
 * One-shot rewrite to clean up the polished UI's typing mistakes against
 * @molecule/app-ui's UIClassMap signatures.
 *
 * Patterns fixed (each is a separate, narrowly-scoped regex over .tsx files
 * under app/src/):
 *
 *   - cm.w("8")            → cm.w(8)
 *   - cm.h("8")            → cm.h(8)
 *   - cm.w("1.5")          → cm.w(1.5)        (handles fractional spacing)
 *   - cm.w("px")           → cm.w('[1px]')    (TailwindArbitraryBracket)
 *   - cm.h("px")           → cm.h('[1px]')
 *   - cm.sp(<axis>, "8")   → cm.sp(<axis>, 8)
 *   - cm.spacing("8")      → cm.spacing(8)
 *   - { wrap: true }       → { wrap: 'wrap' }
 *   - { wrap: false }      → { wrap: 'nowrap' }
 *
 * Anything outside these patterns is left untouched. Run from this script's
 * directory or anywhere — the script resolves the app/src dir relative to
 * its own location.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '..', 'app', 'src')

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) yield* walk(p)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) yield p
  }
}

const NUMERIC_FNS = ['w', 'h']
const PX_TO_BRACKET = (m, fn) => `cm.${fn}('[1px]')`

function rewrite(src) {
  let out = src
  let n = 0

  // cm.w("123"), cm.h("12.5") → cm.w(123)
  for (const fn of NUMERIC_FNS) {
    const re = new RegExp(`cm\\.${fn}\\((['"])(\\d+(?:\\.\\d+)?)\\1\\)`, 'g')
    out = out.replace(re, (_m, _q, num) => {
      n++
      return `cm.${fn}(${num})`
    })
  }
  // cm.w("px") → cm.w('[1px]')
  for (const fn of NUMERIC_FNS) {
    const re = new RegExp(`cm\\.${fn}\\((['"])px\\1\\)`, 'g')
    out = out.replace(re, (_m) => {
      n++
      return PX_TO_BRACKET(_m, fn)
    })
  }

  // cm.sp("axis", "8") → cm.sp("axis", 8)  — second arg is the numeric one
  out = out.replace(
    /cm\.sp\((['"][a-zA-Z]+['"])\s*,\s*(['"])(\d+(?:\.\d+)?)\2\)/g,
    (_m, axis, _q, num) => {
      n++
      return `cm.sp(${axis}, ${num})`
    },
  )

  // cm.spacing("8") → cm.spacing(8)
  out = out.replace(/cm\.spacing\((['"])(\d+(?:\.\d+)?)\1\)/g, (_m, _q, num) => {
    n++
    return `cm.spacing(${num})`
  })

  // { wrap: true } / { wrap: false } in cm.flex options.
  // We match within inline option objects (single-line and multi-line).
  out = out.replace(/(\bwrap\s*:\s*)true\b/g, (_m, lhs) => {
    n++
    return `${lhs}'wrap'`
  })
  out = out.replace(/(\bwrap\s*:\s*)false\b/g, (_m, lhs) => {
    n++
    return `${lhs}'nowrap'`
  })

  return { out, n }
}

let totalFiles = 0
let totalEdits = 0
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8')
  const { out, n } = rewrite(src)
  if (n > 0 && out !== src) {
    writeFileSync(file, out)
    totalFiles += 1
    totalEdits += n
    console.log(`fixed ${n} in ${file.replace(SRC + '/', '')}`)
  }
}
console.log(`\nTotal: ${totalEdits} edits across ${totalFiles} file(s)`)
