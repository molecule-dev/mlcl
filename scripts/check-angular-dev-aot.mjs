import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const [url, component] = process.argv.slice(2)
if (!url || !component) throw new Error('usage: check-angular-dev-aot.mjs <url> <component>')

test(`Vite dev serves ${component} with an AOT definition`, async () => {
  const appRequire = createRequire(resolve('package.json'))
  const { createServer } = await import(pathToFileURL(appRequire.resolve('vite')).href)
  const server = await createServer({
    // The runner loads the generated config without writing into node_modules.
    configLoader: 'runner',
    cacheDir: '.vite-aot-check',
    server: { middlewareMode: true, ws: false, watch: null },
  })
  try {
    const result = await server.transformRequest(url)
    assert.ok(result, `Vite returned no module for ${url}`)
    const definition = new RegExp(`ɵɵdefineComponent\\(\\s*\\{\\s*type:\\s*${component}\\b`)
    const legacyDecorators = /\b__decorate\b/.test(result.code)
    assert.ok(
      definition.test(result.code),
      `${url} has no ɵɵdefineComponent for ${component} (__decorate: ${legacyDecorators})`,
    )
    assert.ok(!legacyDecorators, `${url} still contains runtime decorator emit`)
  } finally {
    await server.close()
  }
})
