/**
 * A scaffolded entry document must not carry the preview bridges.
 *
 * X0 flash-m77 lost ~3 minutes of its plan phase to a 63 KB `app/index.html`:
 * five platform bridge scripts — 59 KB of the 63 KB — were either baked into the
 * document or inlined into it at scaffold time, so the first look at the app
 * shell cost the executor ~60 KB of context it could never act on. The trim that
 * followed cut the e2e specs it had just read down to summaries and it read the
 * whole suite again (findings, +01:23 and +02:56).
 *
 * The fix keeps the PAGE identical and moves the BYTES: each bridge is written to
 * `<publicDir>/__mol/bridges/<name>.js` and the document keeps a two-line
 * reference (sentinel comment + `<script src>`). A classic blocking `<script src>`
 * executes in document order, exactly where the inline `<script>` ran, so
 * readiness/navigation/snapshot/interaction all behave as before.
 *
 * These tests fail on the pre-fix scaffolder (the document carries the code and no
 * reference) and on any fix that drops a bridge, empties a file, or adds back an
 * inline copy.
 *
 * @module
 */

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  injectPreviewInteractBridge,
  injectPreviewLivenessBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const MLCL_ROOT = join(HERE, '..', '..', '..')
const TEMPLATES = join(MLCL_ROOT, 'templates')

/** Every bridge a scaffolded app must end up loading, and its file name. */
const BRIDGES = [
  'preview-bridge',
  'nav-bridge',
  'snapshot-bridge',
  'runtime-bridge',
  'interact-bridge',
]

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-bridge-assets-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** The document `mlcl create` writes for a CUSTOM app: the shipped template, filled. */
async function renderSharedTemplate(): Promise<string> {
  return (await readFile(join(TEMPLATES, 'app', 'shared', 'index.html.tpl'), 'utf8'))
    .replace(/\{\{PROJECT_NAME\}\}/g, 'Demo')
    .replace(/\{\{APP_DESCRIPTION\}\}/g, 'A demo app')
    .replace(/\{\{BRAND_COLOR\}\}/g, '#4070e0')
    .replace(/\{\{FONT_LINKS\}\}/g, '')
    .replace(/\{\{ROOT_ELEMENT\}\}/g, '<div id="root"></div>')
    .replace(/\{\{MAIN_ENTRY\}\}/g, '/src/main.tsx')
}

/** Run every injector over `html`, exactly as both scaffold paths do. */
async function scaffold(html: string): Promise<string> {
  const path = join(dir, 'index.html')
  await writeFile(path, html)
  expect(await injectPreviewNavBridge(path)).toBe(true)
  expect(await injectPreviewSnapshotBridge(path)).toBe(true)
  expect(await injectPreviewRuntimeBridge(path)).toBe(true)
  expect(await injectPreviewInteractBridge(path)).toBe(true)
  // The liveness bridge is MOVED (it is baked into the document), so it is only
  // moved when the document has it — true for the shared template and for every
  // flagship template that carries the delimited region.
  await injectPreviewLivenessBridge(path)
  return readFile(path, 'utf-8')
}

const assetPath = (name: string): string => join(dir, 'public', '__mol', 'bridges', `${name}.js`)

describe('a scaffolded entry document references the bridges instead of carrying them', () => {
  it('is ~6 KB, not 63 KB — the whole point of the split', async () => {
    const document = await scaffold(await renderSharedTemplate())

    // Pre-fix this document is 63,735 chars (measured on flash-m77's project);
    // post-fix it is the head, the body and five two-line references. The bound
    // is deliberately far below 63 KB and far above what the references need, so
    // it fails if the code ever comes back without being brittle about formatting.
    expect(document.length).toBeLessThan(12 * 1024)
    // …and the bytes have not simply vanished: they are on disk, together.
    let moved = 0
    for (const name of BRIDGES) moved += (await stat(assetPath(name))).size
    expect(moved).toBeGreaterThan(40 * 1024)
  })

  it('references every bridge by sentinel + one <script src>, in order', async () => {
    const document = await scaffold(await renderSharedTemplate())

    for (const name of BRIDGES) {
      expect(document, `${name} reference`).toContain(`<!-- mol:${name} -->`)
      expect(document, `${name} tag`).toContain(`<script src="/__mol/bridges/${name}.js"></script>`)
    }
    // Exactly one script tag per bridge, plus the app's own module entry.
    expect(document.match(/<script src="\/__mol\/bridges\//g)).toHaveLength(BRIDGES.length)
    expect(document.match(/<script/g)).toHaveLength(BRIDGES.length + 1)
  })

  it('leaves no bridge code in the document', async () => {
    const document = await scaffold(await renderSharedTemplate())

    // The property that matters: none of the protocol is in the entry document.
    expect(document).not.toContain('postMessage')
    expect(document).not.toContain('window.parent')
    expect(document).not.toContain('__molecule_log')
    // Protocol names are checked against the MARKUP, not the prose: the shared
    // template carries a comment naming `molecule:navigate` to explain where the
    // nav bridge comes from, and a comment executes nothing.
    const markup = document.replace(/<!--[\s\S]*?-->/g, '')
    expect(markup).not.toMatch(/molecule:(ready|snapshot|navigate|ui-command|blank|heartbeat)/)
    // The liveness script's own prose is gone with it.
    expect(document).not.toContain('Signal the parent IDE when the app renders')
  })

  it('keeps the liveness bridge a BLOCKING script before the app module (no FOUC/ordering change)', async () => {
    const document = await scaffold(await renderSharedTemplate())

    const liveness = document.indexOf('<!-- mol:preview-bridge -->')
    const module = document.indexOf('<script type="module"')
    expect(liveness).toBeGreaterThan(-1)
    // It ran inline, before the module, and must still run before it: the bridge
    // wraps fetch/console and observes #root from first paint.
    expect(liveness).toBeLessThan(module)
    // A classic blocking script — not deferred, not async, not a module — so it
    // executes in document order exactly as the inline script did.
    const tag = /<script src="\/__mol\/bridges\/preview-bridge\.js"><\/script>/.exec(document)
    expect(tag).not.toBeNull()
    expect(tag?.[0]).not.toMatch(/\b(defer|async|type=)/)
  })

  it('does not add the liveness bridge to a document that never carried one', async () => {
    const withoutRegion = `<!doctype html>
<html lang="en">
  <head><title>demo</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
    const path = join(dir, 'index.html')
    await writeFile(path, withoutRegion)
    await injectPreviewNavBridge(path)
    expect(await injectPreviewLivenessBridge(path)).toBe(false)
    const document = await readFile(path, 'utf-8')
    expect(document).not.toContain('mol:preview-bridge')
    // Other bridges still land: only the MOVED one is conditional.
    expect(document).toContain('mol:nav-bridge')
  })

  it('is idempotent — a second scaffold run adds no reference and rewrites nothing', async () => {
    const html = await renderSharedTemplate()
    const first = await scaffold(html)

    const path = join(dir, 'index.html')
    await writeFile(path, first)
    expect(await injectPreviewNavBridge(path)).toBe(false)
    expect(await injectPreviewSnapshotBridge(path)).toBe(false)
    expect(await injectPreviewRuntimeBridge(path)).toBe(false)
    expect(await injectPreviewInteractBridge(path)).toBe(false)
    expect(await injectPreviewLivenessBridge(path)).toBe(false)
    expect(await readFile(path, 'utf-8')).toBe(first)
  })

  it('writes each bridge file with the exact body the inline copy carried', async () => {
    await scaffold(await renderSharedTemplate())

    // The liveness script is extracted from the DOCUMENT (it is the single source
    // of it), so this proves the extraction found the right region.
    const liveness = await readFile(assetPath('preview-bridge'), 'utf-8')
    expect(liveness).toContain("post('molecule:ready')")
    expect(liveness).toContain("post('molecule:blank'")
    expect(liveness).toContain('MutationObserver')
    // …and is pure JavaScript — no leftover markup from the region it came from.
    expect(liveness).not.toContain('<script')
    expect(liveness).not.toContain('<!--')

    // The injected ones come from the scaffold's own literals.
    expect(await readFile(assetPath('nav-bridge'), 'utf-8')).toContain("type: 'molecule:navigate'")
    expect(await readFile(assetPath('snapshot-bridge'), 'utf-8')).toContain(
      "type: 'molecule:snapshot'",
    )
    expect(await readFile(assetPath('runtime-bridge'), 'utf-8')).toContain('molecule:heartbeat')
    expect(await readFile(assetPath('interact-bridge'), 'utf-8')).toContain('molecule:ui-result')
  })

  it('shrinks a flagship template the same way, from the one shared injector', async () => {
    // The 152 flagship templates each bake the liveness region into their own
    // index.html; this is the shared change that reaches all of them — no sweep.
    for (const slug of ['blog', 'static-site']) {
      const source = await readFile(join(TEMPLATES, 'apps', slug, 'app', 'index.html'), 'utf8')
      // The region that must leave the document, measured from the document
      // itself so the bound tracks the template rather than a magic number.
      const region =
        /[ \t]*<!--\s*mol:preview-bridge:start\s*-->[\s\S]*?<!--\s*mol:preview-bridge:end\s*-->/.exec(
          source,
        )
      expect(region, `${slug} bakes the liveness region`).not.toBeNull()

      const tiny = await scaffold(source)

      // The document lost the region and gained only four one-line references
      // (2 KB of slack is far more than they can take).
      expect(tiny.length, `${slug} kept the baked bridge`).toBeLessThan(
        source.length - (region?.[0].length ?? 0) + 2 * 1024,
      )
      expect(tiny, `${slug} kept an inline bridge`).not.toContain('postMessage')
      for (const name of BRIDGES) {
        expect(tiny, `${slug} is missing the ${name} reference`).toContain(
          `<script src="/__mol/bridges/${name}.js"></script>`,
        )
      }
    }
  })
})
