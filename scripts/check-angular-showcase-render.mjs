import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { runInContext } from 'node:vm'

import { JSDOM, VirtualConsole } from 'jsdom'

test('the Angular showcase bootstraps and renders its controls', async () => {
  const appRequire = createRequire(resolve('package.json'))
  const { build } = await import(pathToFileURL(appRequire.resolve('vite')).href)
  const result = await build({
    configLoader: 'runner',
    cacheDir: '.vite-aot-check',
    // Emit a script that can run in jsdom's window, with all browser globals available.
    build: { write: false, rolldownOptions: { output: { format: 'iife' } } },
  })
  const entry = result.output.find((asset) => asset.type === 'chunk' && asset.isEntry)
  assert.ok(entry, 'Vite returned no showcase entry chunk')

  const errors = []
  const virtualConsole = new VirtualConsole()
  const recordError = (...args) => errors.push(args.map(String).join(' '))
  virtualConsole.on('error', recordError).on('jsdomError', recordError)
  const dom = new JSDOM(await readFile('index.html', 'utf8'), {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    virtualConsole,
  })
  try {
    runInContext(entry.code, dom.getInternalVMContext())
    const selectors = [
      '[data-component="Button"] button',
      '[data-component="Table"] td',
      '[data-component="Tabs"] [role="tab"]',
      '[data-component="Accordion"] button',
    ]
    const find = (selector) => dom.window.document.querySelector(`app-showcase ${selector}`)
    for (let attempt = 0; attempt < 50 && !errors.length && !selectors.every(find); attempt++) {
      await delay(20)
    }
    assert.deepEqual(errors, [], 'Angular reported errors during showcase bootstrap')
    for (const selector of selectors) {
      assert.ok(find(selector)?.textContent?.trim(), `Showcase did not render ${selector}`)
    }
  } finally {
    dom.window.close()
  }
})
