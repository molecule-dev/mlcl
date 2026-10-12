/**
 * The font `<style>` block is built from `molecule.font` METADATA (for any
 * package the registry does not list, `syncProjectAssets` reads it from the
 * installed package's own `package.json`), then written back into `index.html`
 * by string replacement. A `$` sequence inside a value is special inside a
 * replacement STRING — `$&` splices the whole MATCHED block back in, `$'`
 * everything after it — so a family named `A$&B` duplicated the old
 * `<!-- mol:fonts -->` block in the document instead of replacing it. The brand
 * sync in the same file applies the function-replacement rule for exactly this
 * reason (`syncIdentityFromBranding`); the font block is the sibling that did
 * not.
 *
 * Two layers pin that now, at the two places the class can re-open:
 *
 * - `assertSafeFontMeta` refuses a `$` (like every character outside a plain
 *   family name) in the fields it renders as CSS/attributes — see
 *   scaffold-metadata-injection-guards.test.ts. A family can no longer carry
 *   the payload at all.
 * - the replacement itself stays literal for the values the guard DOES admit,
 *   and a declared URL legitimately can carry `$` — that is the case this file
 *   drives through the real `syncProjectAssets`: the generated `<link>` line
 *   rides the same block replacement, and a string replacement would corrupt
 *   the document with it.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { syncProjectAssets } from '../scaffold.js'

const FONT_PACKAGE = '@molecule/app-fonts-fixture'

/** The curated document the sync merges into: one managed block, one other family. */
const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <title>Fixture</title>
    <style>
      @font-face {
        font-family: 'Curated';
        src: url('/fonts/curated.woff2') format('woff2');
      }
    </style>
    <!-- mol:fonts -->
    <style>
      @font-face {
        font-family: 'Previous';
        src: url('/fonts/previous.woff2') format('woff2');
      }
    </style>
    <!-- /mol:fonts -->
  </head>
  <body></body>
</html>
`

let root: string
let project: string

/**
 * Every temp root this file created. A test below calls `makeProject` inside
 * its body to re-fixture the project; that call reassigns `root`, so an
 * `afterEach` that removed only the latest root leaked the directory
 * `beforeEach` had just made.
 */
const createdRoots: string[] = []

/** A project depending on a non-registry font package declaring `font`. */
function makeProject(font: Record<string, unknown>): void {
  root = mkdtempSync(join(tmpdir(), 'mlcl-font-block-'))
  createdRoots.push(root)
  project = join(root, 'app')
  mkdirSync(project, { recursive: true })
  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify(
      { name: 'app', version: '0.0.1', dependencies: { [FONT_PACKAGE]: '1.0.0' } },
      null,
      2,
    ),
  )
  writeFileSync(join(project, 'index.html'), INDEX_HTML)

  const pkgDir = join(project, 'node_modules', FONT_PACKAGE)
  mkdirSync(join(pkgDir, 'fonts'), { recursive: true })
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: FONT_PACKAGE,
      version: '1.0.0',
      molecule: {
        type: 'provider',
        category: 'fonts',
        label: 'Fixture Font',
        font,
      },
    }),
  )
  writeFileSync(join(pkgDir, 'fonts', 'fixture.woff2'), 'not really a font')
}

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1

afterEach(() => {
  // EVERY root, not just the latest — see `createdRoots`.
  for (const dir of createdRoots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('the font block replacement is not corrupted by $ sequences in metadata', () => {
  it('replaces the marker block exactly once when a declared URL carries $&', async () => {
    // The URL is inside the generated block, so it rides the same replacement
    // the family once corrupted — and `httpsUrl` admits `$`, so this reaches
    // the replacement instead of the guard.
    makeProject({
      family: 'Fixture Font',
      source: 'cdn',
      url: 'https://fonts.example/f$&x.css',
      preconnect: ['https://fonts.example'],
    })

    await syncProjectAssets(project)

    const html = readFileSync(join(project, 'index.html'), 'utf-8')
    // Pre-fix, `$&` spliced the MATCHED block back into the replacement, so the
    // document carried two `<!-- mol:fonts -->` markers and the previous font.
    expect(occurrences(html, '<!-- mol:fonts -->')).toBe(1)
    expect(occurrences(html, '<!-- /mol:fonts -->')).toBe(1)
    expect(html).toContain('https://fonts.example/f$&x.css')
    // The curated family outside the managed block is untouched.
    expect(html).toContain("font-family: 'Curated';")
  })

  it('still merges an ordinary family (no over-tightening)', async () => {
    makeProject({
      family: 'Fixture Font',
      source: 'local',
      fontsDir: 'fonts',
      faces: [{ file: 'fixture.woff2', weight: 400 }],
    })

    await syncProjectAssets(project)

    const html = readFileSync(join(project, 'index.html'), 'utf-8')
    expect(occurrences(html, '<!-- mol:fonts -->')).toBe(1)
    expect(html).toContain("font-family: 'Fixture Font';")
  })
})
