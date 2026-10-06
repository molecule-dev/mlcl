/**
 * The deduped template font pool (`templates/shared/fonts/`) holds real font
 * files — every scaffold copies them into `app/public/fonts/` from its
 * `fonts.json`, and each app's index.html `@font-face` rules point at them.
 *
 * Four of them (Inter Regular/Bold, JetBrains Mono Regular/Bold) were once
 * saved GitHub/HTML error pages with a `.ttf` name: every app shipped them, the
 * browser fetched them, failed to decode them and fell back to a system font,
 * and nothing noticed. A font is checked by its first bytes.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const POOL = join(dirname(fileURLToPath(import.meta.url)), '../../../templates/shared/fonts')
const APPS = join(dirname(fileURLToPath(import.meta.url)), '../../../templates/apps')

/** Magic numbers of the font formats the pool may hold. */
const FONT_SIGNATURES = [
  [0x00, 0x01, 0x00, 0x00], // TrueType
  [0x4f, 0x54, 0x54, 0x4f], // 'OTTO' (OpenType/CFF)
  [0x74, 0x72, 0x75, 0x65], // 'true' (Apple TrueType)
  [0x77, 0x4f, 0x46, 0x46], // 'wOFF'
  [0x77, 0x4f, 0x46, 0x32], // 'wOF2'
]

const isFont = (bytes: Buffer): boolean =>
  FONT_SIGNATURES.some((sig) => sig.every((b, i) => bytes[i] === b))

describe('template font pool', () => {
  const files = readdirSync(POOL).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f))

  it('holds font files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files)('%s is a real font, not a saved web page', (file) => {
    const head = readFileSync(join(POOL, file)).subarray(0, 4)
    expect(isFont(head), `${file} starts with ${head.toString('hex')}`).toBe(true)
  })

  it('every font a template manifest lists exists in the pool', () => {
    const pool = new Set(files)
    const missing: string[] = []
    for (const app of readdirSync(APPS)) {
      let manifest: string[]
      try {
        manifest = JSON.parse(readFileSync(join(APPS, app, 'fonts.json'), 'utf8')) as string[]
      } catch (_error) {
        continue // no fonts.json (or not a template dir) — nothing to materialize
      }
      for (const entry of manifest) {
        const name = entry.split('/').pop() ?? entry
        if (!pool.has(name)) missing.push(`${app}: ${name}`)
      }
    }
    expect(missing).toEqual([])
  })
})
