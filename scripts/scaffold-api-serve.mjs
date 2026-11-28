/**
 * A built scaffold API starts with its own `start` script and answers `GET /health` with 200 and
 * `{ status: 'ok' }`.
 *
 *   node scripts/scaffold-api-serve.mjs <built api dir>
 *
 * It runs this checkout's `mlcl check --steps serve` (build the CLI first): the check starts the
 * script with PORT set, waits for the URL, runs the assertion against the live process and stops
 * it. A start script that exits before it answers (a bond setup that throws at boot) fails, and
 * so does any status but 200. Scaffolds used to write a mocked server test in place of this,
 * which passed with a bond setup that throws.
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The assertion, run as `node <file> <url>` once the URL answers. */
const HEALTH_ASSERTION = `import assert from 'node:assert/strict'

const url = process.argv[2]
const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) })
assert.equal(response.status, 200, \`GET \${url}\`)
assert.equal((await response.json()).status, 'ok', \`GET \${url} JSON\`)
`

/**
 * A free TCP port on loopback.
 *
 * @returns {Promise<number>} The port.
 */
async function freePort() {
  const server = createServer()
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  await new Promise((done) => server.close(done))
  if (!address || typeof address === 'string') throw new Error('no TCP port')
  return address.port
}

/**
 * Starts the built API and asks its `/health`.
 *
 * @param {string} apiDir - The API workspace, built (`npm run build`).
 * @returns {Promise<{ ok: boolean, output: string }>} Whether it answered 200 `{ status: 'ok' }`,
 *   and what the check printed.
 */
export async function checkApiServes(apiDir) {
  const port = await freePort()
  const url = `http://127.0.0.1:${port}/health`
  const scratch = mkdtempSync(join(tmpdir(), 'mlcl-api-serve-'))
  const assertion = join(scratch, 'health.mjs')
  writeFileSync(assertion, HEALTH_ASSERTION)
  try {
    const result = spawnSync(
      process.execPath,
      [
        join(MLCL, 'bin', 'run.js'),
        'check',
        '--steps',
        'serve',
        '--ready',
        url,
        '--run',
        `node ${JSON.stringify(assertion)} ${url}`,
      ],
      {
        cwd: apiDir,
        env: { ...process.env, PORT: String(port) },
        encoding: 'utf8',
        maxBuffer: 1 << 26,
      },
    )
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
    return { ok: result.status === 0, output }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: scaffold-api-serve.mjs <built api dir>')
    process.exit(2)
  }
  const result = await checkApiServes(resolve(dir))
  console.log(result.output.trim())
  process.exit(result.ok ? 0 : 1)
}
