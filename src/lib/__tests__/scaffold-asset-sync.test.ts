/**
 * `syncProjectAssets` used to clear `public/fonts/` BEFORE copying the
 * replacement set, so a copy run that could not produce a file (the font
 * package absent from every node_modules candidate — the not-installed-yet
 * state right after `mlcl add --no-install`, or an unwritable target) left
 * the project's fonts directory emptied while the @font-face block still
 * referenced the removed files. The copy now runs first and only true
 * leftovers (files the new set does not name) are cleared afterwards — a
 * failed sync leaves the previous fonts in place instead of nothing.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRawRegistry } from '../registry.js'
import { syncProjectAssets } from '../scaffold.js'

describe('syncProjectAssets font sync failure ordering', () => {
  let projectDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-sync-'))
    mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
    // An app project declaring a font bond the registry knows.
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'font-app',
        dependencies: { '@molecule/app-fonts-inter': '1.0.0' },
      }),
    )
    // The files a PREVIOUS provider left: one the new set also names (stale
    // content) and one it does not (the swapped-out provider's leftover).
    writeFileSync(join(projectDir, 'public', 'fonts', 'Inter-Regular.ttf'), 'OLD-REGULAR')
    writeFileSync(join(projectDir, 'public', 'fonts', 'legacy-font.ttf'), 'LEGACY')
    // No node_modules anywhere above the temp dir: every copy of the new set
    // fails with a warning — the exact "provider not installed yet" state.
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('keeps a font file the copy run cannot replace instead of deleting it first', async () => {
    await syncProjectAssets(projectDir)

    // The file the new set names but the copy could not produce must still be
    // there with its old content — the @font-face block keeps resolving.
    expect(readFileSync(join(projectDir, 'public', 'fonts', 'Inter-Regular.ttf'), 'utf-8')).toBe(
      'OLD-REGULAR',
    )
    // The leftover the new set does NOT name is still cleared.
    expect(existsSync(join(projectDir, 'public', 'fonts', 'legacy-font.ttf'))).toBe(false)
  })

  it('replaces a font file when the copy succeeds and still clears the stale leftovers', async () => {
    // Give the walk-up node_modules search a package to copy from.
    const pkgFonts = join(projectDir, 'node_modules', '@molecule', 'app-fonts-inter', 'fonts')
    mkdirSync(pkgFonts, { recursive: true })
    for (const file of ['Inter-Regular.ttf', 'Inter-Bold.ttf']) {
      writeFileSync(join(pkgFonts, file), `NEW-${file}`)
    }

    await syncProjectAssets(projectDir)

    expect(readFileSync(join(projectDir, 'public', 'fonts', 'Inter-Regular.ttf'), 'utf-8')).toBe(
      'NEW-Inter-Regular.ttf',
    )
    expect(readFileSync(join(projectDir, 'public', 'fonts', 'Inter-Bold.ttf'), 'utf-8')).toBe(
      'NEW-Inter-Bold.ttf',
    )
    expect(existsSync(join(projectDir, 'public', 'fonts', 'legacy-font.ttf'))).toBe(false)
  })
})

/**
 * The sync owns only the families its DECLARED font packages provide.
 *
 * A template's `<!-- mol:fonts -->` block also carries curated families — a
 * display serif, the icon font, the icon-healer script — that no declared package
 * backs (every flagship template declares `app-fonts` + `app-fonts-arimo` while
 * its block declares five families). Rewriting the block from package metadata and
 * treating "the new set does not name it" as stale deleted those families'
 * declarations from `index.html` AND their files from `public/fonts/`: one
 * ordinary `mlcl add … --inject` left the app without its headline font and its
 * icon font. The block is now merged per family, and a file the merged document
 * still points at is never removed.
 */
const CURATED_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- mol:fonts -->
    <style>
      @font-face {
        font-family: 'Newsreader';
        src: url('/fonts/Newsreader-VariableFont.ttf') format('truetype-variations');
        font-weight: 400 700;
        font-display: swap;
      }
      @font-face {
        font-family: 'Arimo';
        src: local('Arimo Regular'), url('/fonts/Arimo-Regular.ttf') format('truetype');
        font-weight: 400;
        font-display: swap;
      }
      @supports (font-variation-settings: normal) {
        @font-face {
          font-family: 'Arimo';
          src: url('/fonts/Arimo-VariableFont_wght.ttf') format('truetype');
          font-weight: 100 1000;
          font-display: swap;
        }
      }
    </style>
    <!-- /mol:fonts -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

describe('syncProjectAssets font ownership', () => {
  let projectDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-merge-'))
    mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
    // The flagship shape: a declared sans bond, plus a display family the app
    // ships and declares for itself.
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'font-app',
        dependencies: { '@molecule/app-fonts-arimo': '1.0.0' },
      }),
    )
    writeFileSync(
      join(projectDir, 'public', 'fonts', 'Newsreader-VariableFont.ttf'),
      'CURATED-SERIF',
    )
    // Unreferenced by the document — a genuine leftover.
    writeFileSync(join(projectDir, 'public', 'fonts', 'Inter-Regular.ttf'), 'STALE')
    writeFileSync(join(projectDir, 'index.html'), CURATED_INDEX_HTML)
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('keeps a curated family the declared packages do not back', async () => {
    await syncProjectAssets(projectDir)

    const html = readFileSync(join(projectDir, 'index.html'), 'utf-8')
    // The curated declaration and the file behind it survive.
    expect(html).toContain("font-family: 'Newsreader'")
    expect(html).toContain('/fonts/Newsreader-VariableFont.ttf')
    expect(existsSync(join(projectDir, 'public', 'fonts', 'Newsreader-VariableFont.ttf'))).toBe(
      true,
    )
    // The managed family is still emitted (the sync's own job) …
    expect(html).toContain("font-family: 'Arimo'")
    expect(html).toContain('/fonts/Arimo-VariableFont_wght.ttf')
    // … and a file nothing points at is still cleared.
    expect(existsSync(join(projectDir, 'public', 'fonts', 'Inter-Regular.ttf'))).toBe(false)
  })

  it('is idempotent — a second sync leaves the merged document byte-identical', async () => {
    await syncProjectAssets(projectDir)
    const first = readFileSync(join(projectDir, 'index.html'), 'utf-8')

    await syncProjectAssets(projectDir)

    expect(readFileSync(join(projectDir, 'index.html'), 'utf-8')).toBe(first)
  })
})

/**
 * The icon font's utility class is a RULE, not an `@font-face`, so the
 * per-family strip never removes it — and it was re-emitted unguarded on every
 * sync, while the gate and healer beside it were already deduped by their
 * markers. `generateFontHtml` writes the rule into the document at create time,
 * so the very first `mlcl inject` duplicated it and every later one added
 * another copy, contradicting `updateHtmlFontBlock`'s "a second run strips
 * exactly what the first run added".
 */
describe('syncProjectAssets icon-font utility CSS', () => {
  const ICON_PACKAGE = '@molecule/app-fonts-material-symbols'
  let projectDir: string
  let utilityCss: string

  /** How many times the utility rule appears, whitespace collapsed. */
  const ruleCount = (html: string): number => {
    const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim()
    const needle = collapse(utilityCss)
    return collapse(html).split(needle).length - 1
  }

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-icon-font-'))
    mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({ name: 'icon-app', dependencies: { [ICON_PACKAGE]: '1.0.0' } }),
    )
    // The block `generateFontHtml` wrote at create time: the icon font's
    // `@font-face` and its utility rule inside the block's `<style>`.
    const font = getRawRegistry().packages[ICON_PACKAGE]?.font as
      { utilityCss?: string; faces?: Array<{ file: string }> } | undefined
    utilityCss = font?.utilityCss ?? ''
    expect(utilityCss).toContain('.material-symbols-outlined')
    const indented = utilityCss
      .split('\n')
      .map((line) => `      ${line}`)
      .join('\n')
    writeFileSync(
      join(projectDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- mol:fonts -->
    <style>
${indented}
    </style>
    <!-- /mol:fonts -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
    )
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('keeps the rule emitted once, however many times the sync runs', async () => {
    await syncProjectAssets(projectDir)
    const first = readFileSync(join(projectDir, 'index.html'), 'utf-8')

    await syncProjectAssets(projectDir)
    const second = readFileSync(join(projectDir, 'index.html'), 'utf-8')
    await syncProjectAssets(projectDir)
    const third = readFileSync(join(projectDir, 'index.html'), 'utf-8')

    // The bug this pins: the utility rule is a plain rule (no `@font-face`), so
    // the per-family strip never removed it and every sync appended another
    // copy — unbounded growth in the entry document of an app that declares an
    // icon font.
    expect(ruleCount(first)).toBe(1)
    expect(ruleCount(second)).toBe(1)
    expect(ruleCount(third)).toBe(1)
    // …and the managed rules are not duplicated either: one gate, one
    // `@supports` for the managed family. (The `mol:icon-gate` marker itself is
    // named twice by design — the healer's comment points at it.)
    expect(
      second.match(/html:not\(\.mol-icons-ready\) \.material-symbols-outlined/g) ?? [],
    ).toHaveLength(1)
    expect(second.match(/@supports \(font-variation-settings: normal\)/g) ?? []).toHaveLength(1)
    // The sync CONVERGES: the first pass emits the managed `@supports` next to
    // the gate it also emitted, so the second pass re-emits the `@supports`
    // after that gate — the same rules in a different order inside `<style>`,
    // which is semantically identical for both rules. From then on it is
    // byte-stable (a third pass changes nothing).
    expect(third).toBe(second)
  })
})

/**
 * The leftover cleanup deleted every file in `public/fonts` that the run did
 * not write and the entry DOCUMENT did not reference — so an app's own font,
 * declared with `@font-face` in a stylesheet (`src/index.css`) rather than in
 * `index.html`, was deleted from the project on the next `mlcl inject`.
 */
describe('syncProjectAssets keeps a stylesheet-referenced font', () => {
  let projectDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-css-font-'))
    mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
    mkdirSync(join(projectDir, 'src'), { recursive: true })
    // A declared font package, so the cleanup runs at all (it is skipped when
    // the project declares none).
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({
        name: 'css-font-app',
        dependencies: { '@molecule/app-fonts-inter': '1.0.0' },
      }),
    )
    writeFileSync(
      join(projectDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- mol:fonts -->
    <!-- /mol:fonts -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
    )
    // The app's OWN font: declared in CSS, referenced nowhere in index.html.
    writeFileSync(join(projectDir, 'public', 'fonts', 'App-Custom.ttf'), 'CUSTOM')
    writeFileSync(
      join(projectDir, 'src', 'index.css'),
      "@font-face { font-family: 'App Custom'; src: url('/fonts/App-Custom.ttf'); }\n",
    )
    // A genuine leftover — nothing points at it.
    writeFileSync(join(projectDir, 'public', 'fonts', 'stale.ttf'), 'STALE')
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('does not delete a font its stylesheets still point at', async () => {
    await syncProjectAssets(projectDir)

    expect(existsSync(join(projectDir, 'public', 'fonts', 'App-Custom.ttf'))).toBe(true)
    // …while a file nothing references is still cleared.
    expect(existsSync(join(projectDir, 'public', 'fonts', 'stale.ttf'))).toBe(false)
  })
})

/**
 * With neither the `<!-- mol:fonts -->` block nor the apple-touch-icon anchor
 * to insert one before, the generated block was dropped and the document
 * returned unchanged — a silent no-op the caller reports as a success.
 */
describe('syncProjectAssets reports a document it cannot place the block in', () => {
  let projectDir: string

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'mlcl-asset-noanchor-'))
    mkdirSync(join(projectDir, 'public', 'fonts'), { recursive: true })
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify({ name: 'bare-app', dependencies: { '@molecule/app-fonts-inter': '1.0.0' } }),
    )
    // No mol:fonts marker and no apple-touch-icon link.
    writeFileSync(
      join(projectDir, 'index.html'),
      '<!DOCTYPE html>\n<html lang="en">\n  <head>\n  </head>\n  <body></body>\n</html>\n',
    )
  })

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('warns instead of returning a document with no font wiring', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      await syncProjectAssets(projectDir)
      expect(warn.mock.calls.flat().map(String).join(' ')).toContain('font block was NOT written')
    } finally {
      warn.mockRestore()
    }
  })
})
