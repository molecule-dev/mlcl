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

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
