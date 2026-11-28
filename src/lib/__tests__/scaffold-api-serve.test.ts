/**
 * A scaffolded API is judged by booting it and asking `/health`, never by a mocked test.
 *
 * Scaffolds used to write `server.test.ts` and `routes.test.ts`, which mocked every package: they
 * passed with a bond setup that throws at boot and failed once an app replaced the starter routes
 * (harness smoke run 4, 2026-11-28). What replaces them is `mlcl check --steps serve`: it runs the
 * project's start script, waits for the ready URL and runs an assertion against the live process.
 * Here it runs on the server, router and bonds the injector generates, with an assertion that
 * `GET /health` answers 200 with `{ status: 'ok' }`.
 *
 * It fails on a bond setup that throws and on a 500 from `/health`, and passes after the app
 * replaces the route table or bonds a different provider.
 *
 * @module
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import { runCheckLocal } from '../check.js'
import { synthesizeProjectFiles } from '../injector.js'

// The directory that holds `express` and the linked `@molecule/*` packages (hoisted to the
// workspace root in the polyrepo checkout, local to mlcl in a standalone clone).
const modules = dirname(dirname(createRequire(import.meta.url).resolve('express/package.json')))

/** The assertion, run as `node health.mjs <url>`. */
const HEALTH_ASSERTION = `import assert from 'node:assert/strict'

const url = process.argv[2]
const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2_000) })
assert.equal(response.status, 200, \`GET \${url}\`)
assert.equal((await response.json()).status, 'ok', \`GET \${url} JSON\`)
`

let generated: Map<string, string>
const roots: string[] = []

beforeAll(async () => {
  disableAI()
  const files = await synthesizeProjectFiles([], [], '/project', undefined, 'express')
  generated = new Map(
    files.map((file) => [file.targetPath.replace('/project/src/', ''), String(file.content)]),
  )
})

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

/** A free TCP port on loopback. */
async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  if (!address || typeof address === 'string') throw new Error('no TCP port')
  return address.port
}

/**
 * Write the generated API, with any of its files replaced, compiled to JavaScript as its build
 * does, and serve-check it.
 */
async function serveCheck(replace: Record<string, string> = {}): Promise<{
  status: string
  errors: string[]
}> {
  const root = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-serve-'))
  roots.push(root)
  const port = await freePort()
  const sources = new Map([...generated, ...Object.entries(replace)])
  for (const [path, source] of sources) {
    const target = join(root, path.replace(/\.ts$/, '.js'))
    await mkdir(dirname(target), { recursive: true })
    await writeFile(
      target,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    )
  }
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ type: 'module', scripts: { start: `PORT=${port} node server.js` } }),
  )
  await writeFile(join(root, 'health.mjs'), HEALTH_ASSERTION)
  await symlink(modules, join(root, 'node_modules'), 'dir')
  const url = `http://127.0.0.1:${port}/health`
  const result = await runCheckLocal(root, {
    steps: 'serve',
    ready: url,
    run: `node health.mjs ${url}`,
  })
  if ('error' in result) throw new Error(result.error)
  const serve = result.results.find((step) => step.kind === 'serve')!
  return { status: serve.status, errors: serve.errors }
}

describe('the serve check on a scaffolded API', () => {
  it('passes the API as generated', async () => {
    expect(generated.get('server.ts')).toContain("app.get('/health'")
    expect(await serveCheck()).toMatchObject({ status: 'passed' })
  }, 60_000)

  it('fails when a bond setup throws at boot (OLD MUSTFAIL: the mocked server test passed)', async () => {
    const result = await serveCheck({
      'bonds/index.ts':
        'export async function setupBonds(): Promise<void> {\n' +
        "  throw new Error('the email bond needs EMAIL_API_KEY')\n}\n",
    })
    expect(result.status).toBe('failed')
    expect(result.errors.join('\n')).toContain('the email bond needs EMAIL_API_KEY')
  }, 60_000)

  it('fails when /health answers 500', async () => {
    const server = generated.get('server.ts')!
    const health = "res.json({ status: 'ok', timestamp: new Date().toISOString() })"
    expect(server).toContain(health)
    const result = await serveCheck({
      'server.ts': server.replace(health, "res.status(500).json({ status: 'error' })"),
    })
    expect(result.status).toBe('failed')
    expect(result.errors.join('\n')).toMatch(/GET http:\/\/127\.0\.0\.1:\d+\/health/)
  }, 60_000)

  it('passes after the app replaces the route table (OLD MUSTFAIL: the routes test failed)', async () => {
    expect(
      await serveCheck({
        'App/router.ts':
          "import { Router } from 'express'\n\nexport const router = Router()\n\n" +
          "router.get('/loans', (_req, res) => {\n  res.json([])\n})\n",
      }),
    ).toMatchObject({ status: 'passed' })
  }, 60_000)

  it('passes with a different provider bonded at boot', async () => {
    expect(
      await serveCheck({
        'bonds/index.ts':
          "import { bond } from '@molecule/api-bond'\n\n" +
          'export async function setupBonds(): Promise<void> {\n' +
          "  bond('logger', { info: () => undefined, error: () => undefined })\n}\n",
      }),
    ).toMatchObject({ status: 'passed' })
  }, 60_000)
})
