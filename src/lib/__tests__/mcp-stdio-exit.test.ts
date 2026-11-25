import { spawn } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** A telemetry collector that accepts the connection and never answers. */
async function silentCollector(): Promise<{ url: string; server: Server }> {
  const server = createServer(() => undefined)
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/t`, server }
}

/**
 * Start the stdio server, make one tool call, close stdin as a client does when it exits, and
 * time how long the server takes to exit after that.
 */
async function exitAfterClientLeaves(collector: string): Promise<number> {
  const child = spawn(process.execPath, ['--import', 'tsx', 'mcp/src/index.ts'], {
    cwd: MLCL,
    stdio: ['pipe', 'pipe', 'ignore'],
    env: {
      ...process.env,
      MOLECULE_TELEMETRY: '1',
      MOLECULE_TELEMETRY_URL: collector,
      DO_NOT_TRACK: '',
    },
  })
  const send = (message: object): void => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
  }
  const answered = new Map<number, () => void>()
  let buffer = ''
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
      const message = JSON.parse(buffer.slice(0, end)) as { id?: number }
      buffer = buffer.slice(end + 1)
      if (message.id !== undefined) answered.get(message.id)?.()
    }
  })
  const request = (id: number, method: string, params: object): Promise<void> =>
    new Promise((done) => {
      answered.set(id, done)
      send({ id, method, params })
    })
  const exited = new Promise<void>((done) => child.once('exit', () => done()))
  await request(1, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '1' },
  })
  send({ method: 'notifications/initialized' })
  // list_templates reads the bundled catalog only, so the one telemetry POST is all that is in flight.
  await request(2, 'tools/call', { name: 'list_templates', arguments: {} })
  const leftAt = performance.now()
  child.stdin.end()
  await exited
  return performance.now() - leftAt
}

describe('the stdio MCP server', () => {
  let collector: Server | undefined
  afterEach(() => collector?.close())

  it('exits when its client closes stdin, without waiting on a telemetry POST (OLD MUSTFAIL)', async () => {
    const silent = await silentCollector()
    collector = silent.server
    // The emit's own timeout is 5 s; the old server stayed alive until it fired.
    expect(await exitAfterClientLeaves(silent.url)).toBeLessThan(1_000)
  }, 30_000)
})
