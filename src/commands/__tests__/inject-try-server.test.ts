/**
 * The command `mlcl inject` names for trying an API with a start script ({@link TRY_SERVER}), run
 * as an agent runs it: one `bash -c` that starts `npm start` in the background, calls a route, and
 * ends. When the command ends, the listener npm started must be gone, and the command's own exit
 * status must be the call's.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { TRY_SERVER } from '../inject.js'

let dir: string | null = null
let leftover: number | null = null
afterEach(async () => {
  // The counterexample leaves its listener running: stop it by the pid it wrote.
  if (leftover) process.kill(leftover)
  leftover = null
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

/** A port nothing listens on, found by listening on port 0. */
async function freePort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done))
  const { port } = probe.address() as AddressInfo
  await new Promise<void>((done) => probe.close(() => done()))
  return port
}

/** Whether something answers on the port. */
function answers(port: number): Promise<boolean> {
  return new Promise((done) => {
    const req = request({ host: '127.0.0.1', port, path: '/health', timeout: 1000 }, (res) => {
      res.resume()
      done(true)
    })
    req.on('error', () => done(false))
    req.end()
  })
}

/** A project whose `npm start` serves `ok` on PORT and writes its pid to server.pid. */
async function project(): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-try-server-'))
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'try-server', private: true, scripts: { start: 'node server.mjs' } }),
  )
  await writeFile(
    join(dir, 'server.mjs'),
    "import { writeFileSync } from 'node:fs'\nimport { createServer } from 'node:http'\n" +
      "writeFileSync('server.pid', String(process.pid))\n" +
      "createServer((_req, res) => res.end('ok')).listen(Number(process.env.PORT), '127.0.0.1')\n",
  )
  return dir
}

/** Runs one command the way an agent's shell tool does, and settles with its status and output. */
function bash(cwd: string, command: string): Promise<{ code: number; stdout: string }> {
  return new Promise((done) => {
    execFile('bash', ['-c', command], { cwd, timeout: 20_000 }, (error, stdout) =>
      done({ code: error ? Number(error.code ?? 1) : 0, stdout }),
    )
  })
}

describe('the try-a-route command inject names', () => {
  it('calls the route and leaves no listener behind', async () => {
    const cwd = await project()
    const port = await freePort()
    const command = `export PORT=${port}; ${TRY_SERVER.replace('<port>', String(port)).replace('<route>', 'health')}`
    const { code, stdout } = await bash(cwd, command)
    expect(code).toBe(0)
    expect(stdout).toContain('ok')
    expect(await answers(port)).toBe(false)
  }, 30_000)

  it('counterexample: killing npm alone leaves its listener running', async () => {
    const cwd = await project()
    const port = await freePort()
    const command = `export PORT=${port}; npm start & server=$!; trap 'kill "$server"' EXIT; sleep 2; curl -fsS localhost:${port}/health`
    const { code } = await bash(cwd, command)
    expect(code).toBe(0)
    leftover = Number(await readFile(join(cwd, 'server.pid'), 'utf8'))
    expect(await answers(port)).toBe(true)
  }, 30_000)
})
