import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  injectPreviewInteractBridge,
  injectPreviewNavBridge,
  injectPreviewRuntimeBridge,
  injectPreviewSnapshotBridge,
} from '../scaffold.js'

const injectors = [
  ['nav-bridge', injectPreviewNavBridge],
  ['snapshot-bridge', injectPreviewSnapshotBridge],
  ['runtime-bridge', injectPreviewRuntimeBridge],
  ['interact-bridge', injectPreviewInteractBridge],
] as const

const documents = [
  ['compact', '<!doctype html><html><head></head><body><main>app</main></body></html>'],
  ['mixed', '<!doctype html>\n<html><head></head>\n<body>\n  <main>app</main></body></html>'],
  [
    'formatted',
    '<!doctype html>\n<html>\n  <head></head>\n  <body>\n    <main>app</main>\n  </body>\n</html>\n',
  ],
] as const

describe.each(injectors)('%s document placement', (name, inject) => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mlcl-bridge-placement-'))
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it.each(documents)('inserts inside the %s body after app content', async (_layout, html) => {
    const path = join(root, 'index.html')
    await writeFile(path, html)
    expect(await inject(path)).toBe(true)
    const output = await readFile(path, 'utf8')
    expect(output.indexOf(`mol:${name}`)).toBeGreaterThan(output.indexOf('</main>'))
    expect(output.indexOf(`mol:${name}`)).toBeLessThan(output.indexOf('</body>'))
    const dom = new JSDOM(output)
    try {
      const script = dom.window.document.querySelector(`script[src$="/${name}.js"]`)
      expect(script?.parentElement?.tagName).toBe('BODY')
      expect(script?.previousElementSibling?.tagName).toBe('MAIN')
    } finally {
      dom.window.close()
    }
    // Keep every original byte and make a second injection a no-op.
    expect(
      output.replace(
        `    <!-- mol:${name} -->\n    <script src="/__mol/bridges/${name}.js"></script>\n`,
        '',
      ),
    ).toBe(html)
    expect(await inject(path)).toBe(false)
    expect(await readFile(path, 'utf8')).toBe(output)
  })
})
