/**
 * The theme bond's generated palette comes from an app's own
 * `<workspace>/src/theme.css` — but only if the light `:root` block is actually
 * read. Two shapes every real theme.css ships used to defeat that read, and
 * both resolved to "this app has no color overrides", so `mlcl inject` of a
 * theme provider emitted the provider's generic palettes over an app palette
 * the file plainly declares:
 *
 * 1. A header COMMENT that names the dark-mode selector while explaining it —
 *    which is exactly what mlcl itself stamps on every theme.css it writes
 *    (scaffold.ts's THEME_CSS_HEADER_TEMPLATE / THEME_CSS_HEADER_CUSTOM) and
 *    what most flagship templates carry. The block boundary search ran over the
 *    raw file, matched that mention ABOVE the palette, and sliced the "light
 *    block" down to nothing.
 * 2. The light palette declared as a selector LIST — `:root,
 *    [data-mol-mode='light'] { … }` (voting-polling among others). The boundary
 *    matched the light-mode selector itself, cutting the block at its opening
 *    brace.
 *
 * Both are pinned here through the REAL `generateBondSetupCode`, on a temp
 * workspace whose theme.css carries the shape; a light palette must be read AND
 * the dark block's values must not leak into it.
 *
 * @module
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { generateBondSetupCode } from '../injector.js'
import { loadRegistry } from '../registry.js'

const themePkg = loadRegistry().find((p) => p.name === '@molecule/app-theme-css-variables')

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mlcl-theme-palette-'))
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

/** Generate the theme bond for a workspace whose theme.css is `css`. */
async function bondFor(css: string): Promise<string> {
  const workspace = await mkdtemp(join(root, 'ws-'))
  await mkdir(join(workspace, 'src'), { recursive: true })
  await writeFile(join(workspace, 'src', 'theme.css'), css)
  return generateBondSetupCode(
    themePkg!,
    'app-theme-css-variables',
    '@molecule/app-theme',
    workspace,
  )
}

describe('the theme bond reads the light :root block of theme.css', () => {
  it('reads past the file header, which names the dark-mode selector in a comment', async () => {
    // Byte-for-byte the header mlcl stamps (scaffold.ts THEME_CSS_HEADER_CUSTOM
    // for a custom app; the template variant differs only in wording).
    const css = `/* =============================================================================
 * APP COLOR PALETTE — recolor the app by adding \`--color-*\` overrides here.
 *
 * To customize, add overrides here — they win over the bond:
 *   :root { --color-primary: #1565c0; … }   → light theme
 *   [data-mol-mode='dark'] { --color-primary: #42a5f5; … } → dark theme
 * ============================================================================= */

:root {
  --mol-color-primary: #111111;
  --mol-color-background: #ffffff;
}

[data-mol-mode='dark'] {
  --mol-color-primary: #999999;
  --mol-color-background: #000000;
}
`
    const content = await bondFor(css)
    expect(content, 'the light palette must be read past the header comment').toContain(
      "primary: '#111111'",
    )
    expect(content).toContain("background: '#ffffff'")
    // The dark block is an OVERRIDE of light-mode tokens, never the palette.
    expect(content).not.toContain('#999999')
    expect(content).not.toContain('#000000')
  })

  it('does not read a dark-only palette as the light one (a match at index 0)', async () => {
    // `css.search(darkStart)` returns 0 when the dark selector OPENS the file —
    // what a hand-written, dark-only theme.css looks like. Reading that 0 as "no
    // dark block found" (the old `rootEnd > 0`) made the whole file the light
    // block, so the dark overrides were emitted as the app's light palette.
    const css = `[data-mol-mode='dark'] {
  --mol-color-primary: #999999;
}
`
    const content = await bondFor(css)
    expect(content, 'a dark block is never the light palette').not.toContain('#999999')
  })

  it('reads a light palette declared on a :root, [data-mol-mode=light] selector list', async () => {
    const css = `:root,
[data-mol-mode='light'] {
  --mol-color-primary: #0e7490;
  --mol-color-secondary: #059669;
}

[data-mol-mode='dark'] {
  --mol-color-primary: #67e8f9;
}
`
    const content = await bondFor(css)
    expect(content, 'a leading light-mode selector is not the dark boundary').toContain(
      "primary: '#0e7490'",
    )
    expect(content).toContain("secondary: '#059669'")
    expect(content).not.toContain('#67e8f9')
  })
})
