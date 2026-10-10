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
