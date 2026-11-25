// @vitest-environment node
/**
 * A command's telemetry event never holds the CLI open. The event used to be POSTed from the
 * command's own process: "fire-and-forget", but Node does not exit while a request is open, so
 * every `mlcl` command (and every MCP tool call that runs one) ended only when the collector
 * answered, up to the 5 s timeout behind a firewall that drops packets (harness eval `add`,
 * 2026-11-25: 0.4 s of each `mlcl add` after its last line of output). Driven through the real
 * module in a child process, against a collector that takes 3 s to answer.
 *
 * @module
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TELEMETRY = join(ROOT, 'src', 'lib', 'telemetry.ts')
const VERSION = (
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
).version

const dirs: string[] = []
let server: Server | undefined
afterAll(() => {
  server?.closeAllConnections()
  server?.close()
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

/** A collector that records each body and answers 3 s later. */
async function slowCollector(): Promise<{ url: string; bodies: string[] }> {
  const bodies: string[] = []
  server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk: Buffer) => (body += chunk.toString()))
    req.on('end', () => {
      bodies.push(body)
      setTimeout(() => res.end('{}'), 3_000)
    })
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('collector has no port')
  return { url: `http://127.0.0.1:${address.port}/v1/telemetry/cli`, bodies }
}

/** Run `trackCliEvent` in a child process; resolves with how long the child took to exit. */
function track(url: string): Promise<number> {
  const home = mkdtempSync(join(tmpdir(), 'mlcl-telemetry-exit-'))
  dirs.push(home)
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, MOLECULE_TELEMETRY_URL: url }
  delete env.DO_NOT_TRACK
  delete env.MOLECULE_TELEMETRY
  const started = Date.now()
  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `const m = await import(${JSON.stringify(TELEMETRY)}); m.trackCliEvent({ command: 'add', ok: true, durationMs: 5, packages: '@molecule/api-uploads' })`,
    ],
    { cwd: ROOT, env, stdio: 'ignore' },
  )
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', () => resolve(Date.now() - started))
  })
}

describe('CLI telemetry', () => {
  it('lets the command exit before the collector answers, and still delivers the event (OLD MUSTFAIL)', async () => {
    const collector = await slowCollector()
    const exitMs = await track(collector.url)
    // Node and tsx start-up alone is well under this; the old code exited after the 3 s answer.
    expect(exitMs).toBeLessThan(2_500)
    const deadline = Date.now() + 10_000
    while (collector.bodies.length === 0 && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 100))
    expect(collector.bodies).toHaveLength(1)
    const sent = JSON.parse(collector.bodies[0]!) as {
      event: { name: string; properties: Record<string, unknown> }
    }
    expect(sent.event.name).toBe('cli.command')
    expect(sent.event.properties.command).toBe('add')
    expect(sent.event.properties.packages).toBe('@molecule/api-uploads')
    // The version of this CLI, not a fixed string.
    expect(sent.event.properties.cliVersion).toBe(VERSION)
  }, 20_000)
})
