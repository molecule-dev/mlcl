#!/usr/bin/env node

/**
 * Verify every scaffolded template's locale placeholders against its own English.
 *
 * `templates/apps/<app>/app/src/locales/` is what `mlcl create` copies into a
 * user's project, so a mangled placeholder here ships to every app built from
 * that template. The `@molecule/*` locale bonds are guarded separately by
 * molecule's `check-locale-placeholders.js`; this tree needed its own check
 * because it differs in both ways that matter:
 *
 * 1. **Shape.** It nests by language (`locales/<code>/ui.ts`) rather than using
 *    flat `locales/<code>.ts` files.
 * 2. **Authority.** `locales/en/ui.ts` is EMPTY on purpose (126 of 133 apps).
 *    English is written inline at the call site —
 *    `t('key', { days }, { defaultValue: '{{days}} days ago' })` — so the
 *    COMPONENT SOURCE is what a translation must agree with. Checking against
 *    the empty `en/ui.ts` marks every placeholder wrong and finds nothing real.
 *
 * ## What goes wrong
 *
 * A `{{title}}` is a VARIABLE REFERENCE, not prose: `t()` substitutes the value
 * whose key matches the NAME. An upstream machine-translation step translated
 * the names along with the sentences (`{{days}}` → `{{dae}}`) and leaked its own
 * `<x>…</x>` protection markup. `@molecule/app-i18n` renders an unmatched
 * placeholder LITERALLY, so the scaffolded app shows the raw token where a value
 * belongs — and most of these are `aria-*` labels, so it lands on screen-reader
 * users. 161,000+ problems across 133 of 156 template locale trees.
 *
 * ## Branding is NOT a defect
 *
 * `mlcl create` substitutes `{{appName}}` and friends at scaffold time, so BOTH
 * forms are correct: a locale holding `'Tessera'` where English still holds
 * `'{{appName}}'`, and a locale that keeps `'{{appName}}'` verbatim. Those tokens
 * are therefore excluded from BOTH sides before counts are compared.
 *
 * Excluding them from English alone — which this did until 2026-07-26 — inverts
 * the rule for the second form: a translation retaining `{{app}}` reads as one
 * placeholder against English's zero and is reported as
 * `has [app] but English has []`, for a value that is byte-identical to English.
 * 10,854 correct translations across 82 apps were deleted on that report before
 * the asymmetry was found (mlcl `00185ba5e8`); without the exclusion at all,
 * 47,296 correct values look broken and "repairing" them would replace every
 * flagship's brand with a raw token. Both directions of this rule are load-bearing.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const TEMPLATES = join(ROOT, 'templates')

const LINE = /^(\s*)('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*)(\s*:\s*)(.*)$/
const T_CALL =
  /\bt\(\s*['"`]([^'"`]+)['"`][\s\S]{0,200}?defaultValue:\s*(['"`])((?:[^\\]|\\.)*?)\2/g

/** Substituted at SCAFFOLD time, so a locale may legitimately lack them. */
const BRANDING = new Set(['appName', 'app', 'brandName', 'tagline'])

const placeholders = (text) => [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1])

/**
 * The English authority for one app: every `t()` call's `defaultValue`.
 *
 * @param appSrc - The app's `src` directory.
 * @returns Translation key → its English default string.
 */
function englishDefaults(appSrc) {
  const found = new Map()
  const visit = (dir) => {
    let entries
    try {
      entries = readdirSync(dir)
    } catch (_error) {
      // Intentional noop: an unreadable directory contributes no defaults.
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry)
      let stats
      try {
        stats = statSync(path)
      } catch (_error) {
        // Intentional noop: a vanished entry is not a failure.
        continue
      }
      if (stats.isDirectory()) {
        if (entry !== 'locales' && entry !== 'node_modules' && entry !== 'dist') visit(path)
        continue
      }
      if (!/\.(tsx?|jsx?)$/.test(entry)) continue
      for (const match of readFileSync(path, 'utf8').matchAll(T_CALL)) {
        // A NESTED `t()` — one call supplying an interpolation value to another
        // — lets this regex run past the outer call's own options and capture
        // the INNER call's defaultValue instead:
        //
        //   t('x.merchantName', { name: t('x.demo', {}, { defaultValue: 'Salary Deposit' }) },
        //     { defaultValue: '{{name}}' })
        //
        // read as `x.merchantName === 'Salary Deposit'`, so a translation
        // correctly holding '{{name}}' was reported as having a placeholder
        // English lacks — 78 false failures across one key. Skip the ambiguous
        // match; a later unambiguous call site for the same key still counts.
        if (/\bt\(/.test(match[0].slice(2))) continue
        if (!found.has(match[1])) found.set(match[1], match[3])
      }
    }
  }
  visit(appSrc)
  return found
}

/**
 * Read every key and the raw text of its value, including prettier-wrapped ones.
 *
 * @param source - File contents.
 * @returns Key → raw value text.
 */
function valuesByKey(source) {
  const map = new Map()
  let pending = null
  for (const line of source.split('\n')) {
    const parsed = LINE.exec(line)
    if (parsed) {
      const key = parsed[2].replace(/^['"]|['"]$/g, '')
      if (parsed[4].trim() === '') pending = key
      else {
        map.set(key, parsed[4])
        pending = null
      }
      continue
    }
    if (pending !== null && /^\s*['"`]/.test(line)) {
      map.set(pending, line)
      pending = null
    }
  }
  return map
}

const problems = []
let treesScanned = 0
let filesScanned = 0

/**
 * Check one app's locale tree against its own English defaults.
 *
 * @param localesDir - Absolute path of `src/locales`.
 * @param appSrc - Absolute path of the app's `src`.
 */
function checkTree(localesDir, appSrc) {
  const english = englishDefaults(appSrc)
  let codes
  try {
    codes = readdirSync(localesDir)
  } catch (_error) {
    // Intentional noop: an unreadable directory is not a locale tree.
    return
  }
  treesScanned += 1

  for (const code of codes) {
    if (code === 'en') continue
    const codeDir = join(localesDir, code)
    let stats
    try {
      stats = statSync(codeDir)
    } catch (_error) {
      // Intentional noop: a vanished entry is not a failure.
      continue
    }
    if (!stats.isDirectory()) continue

    for (const file of readdirSync(codeDir)) {
      if (!file.endsWith('.ts')) continue
      const path = join(codeDir, file)
      if (!existsSync(path) || !statSync(path).isFile()) continue
      filesScanned += 1
      const source = readFileSync(path, 'utf8')
      const where = `${localesDir.slice(ROOT.length + 1)}/${code}/${file}`

      if (/<\/?x>/.test(source)) problems.push(`${where}: leaked <x> translation-tool markup`)
      if (/&(?:#\d+|amp|quot|lt|gt|#x[0-9a-f]+);/i.test(source)) {
        problems.push(`${where}: HTML entity in translated text`)
      }

      for (const [key, value] of valuesByKey(source)) {
        const englishValue = english.get(key)
        if (englishValue === undefined) continue
        const want = placeholders(englishValue).filter((name) => !BRANDING.has(name))
        // Filtered on BOTH sides. Excluding branding from English only made a
        // translation that correctly KEEPS `{{app}}` look like it had a spare
        // placeholder — `has [app] but English has []` — for a value byte-identical
        // to English. See the BRANDING note above for what that cost.
        const have = placeholders(value).filter((name) => !BRANDING.has(name))
        if (want.length !== have.length) {
          problems.push(
            `${where}: '${key}' has [${have.join(', ')}] but English has [${want.join(', ')}]`,
          )
        } else if (want.some((w, i) => w !== have[i])) {
          problems.push(
            `${where}: '${key}' renames [${have.join(', ')}] → must be [${want.join(', ')}]`,
          )
        }
      }
    }
  }
}

/**
 * Find every app that has a `src/locales` tree.
 *
 * @param dir - Directory to walk.
 * @param depth - Current recursion depth.
 */
function walk(dir, depth = 0) {
  if (depth > 8) return
  let entries
  try {
    entries = readdirSync(dir)
  } catch (_error) {
    // Intentional noop: an unreadable directory contributes no locale trees.
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const path = join(dir, entry)
    let stats
    try {
      stats = statSync(path)
    } catch (_error) {
      // Intentional noop: a vanished entry is not a failure.
      continue
    }
    if (!stats.isDirectory()) continue
    if (entry === 'locales' && dir.endsWith('src')) checkTree(path, dir)
    else walk(path, depth + 1)
  }
}

walk(TEMPLATES)

if (problems.length === 0) {
  console.log(
    `✓ template locale placeholders intact (${filesScanned} file(s) across ${treesScanned} tree(s))`,
  )
} else {
  console.error(`\n✗ template locale placeholder problems (${problems.length}):\n`)
  for (const problem of problems.slice(0, 30)) console.error(`  ${problem}`)
  if (problems.length > 30) console.error(`  … and ${problems.length - 30} more`)
  console.error(
    `\nA placeholder name is a VARIABLE, not prose: it must match the English\n` +
      `defaultValue byte for byte, or the scaffolded app renders the raw token.\n` +
      `Fix the NAME in the translation — keep the translated words. Never replace\n` +
      `the value with English to make this pass: that was done once across the\n` +
      `locale bonds, it destroyed 277 real translations, and it was reverted.\n`,
  )
}

process.exit(problems.length === 0 ? 0 : 1)
