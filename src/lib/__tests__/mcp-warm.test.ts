/**
 * `warmMcpServer`: `mlcl setup` starts `npx -y molecule-mcp` once and waits for its `initialize`
 * answer and its tool list, so the npx cache is warm before the first agent session (2026-11-22
 * smoke test: a cold first start left headless Claude Code with no Molecule tools), and setup can
 * say the tools are there (harness eval `install`, 2026-11-25: told only that the server started,
 * Codex wrote its own MCP client to check).
 *
 * @module
 */

import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { type McpSpawn, warmMcpServer } from '../mcp-warm.js'

/** The fake child's handles. */
interface FakeChild {
  spawnImpl: McpSpawn
  written: string[]
  killed: () => boolean
  say: (line: string) => void
  exit: (code: number) => void
}

/**
 * A fake child: records what was written and lets the test answer on stdout or exit.
 *
 * @returns Its handles.
 */
function fakeChild(): FakeChild {
  const events = new EventEmitter()
  const stdout = new EventEmitter()
  const written: string[] = []
  let killed = false
  const child = {
    stdin: { write: (chunk: string) => written.push(chunk), end: () => undefined },
    stdout: {
      on: (event: 'data', listener: (chunk: string) => void) => stdout.on(event, listener),
    },
    on: (event: string, listener: (...args: never[]) => void) => events.on(event, listener),
    kill: () => {
      killed = true
    },
  }
  const spawnImpl: McpSpawn = () => child as unknown as ReturnType<McpSpawn>
  return {
    spawnImpl,
    written,
    killed: () => killed,
    say: (line: string) => stdout.emit('data', line),
    exit: (code: number) => events.emit('exit', code),
  }
}

describe('warmMcpServer', () => {
  it('sends initialize, then lists the tools, and resolves with both answers (OLD MUSTFAIL)', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    expect(JSON.parse(child.written[0]).method).toBe('initialize')
    child.say('molecule-mcp ready\n') // a log line is not the answer
    child.say('{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"molecule",')
    child.say('"version":"0.3.4"}}}\n') // the answer can arrive in pieces
    expect(child.written.slice(1).map((line) => JSON.parse(line).method)).toEqual([
      'notifications/initialized',
      'tools/list',
    ])
    expect(child.killed()).toBe(false)
    child.say('{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"a"},{"name":"b"}]}}\n')
    await expect(pending).resolves.toMatchObject({ version: '0.3.4', tools: 2 })
    expect(child.killed()).toBe(true)
  })

  it('makes one search when the server lists search_packages, and says what it found (OLD MUSTFAIL)', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    child.say('{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"0.3.5"}}}\n')
    child.say(
      '{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"search_packages"},{"name":"b"}]}}\n',
    )
    const call = JSON.parse(child.written.at(-1) ?? '{}')
    expect(call).toMatchObject({
      id: 3,
      method: 'tools/call',
      params: { name: 'search_packages', arguments: { query: 'database', limit: 1 } },
    })
    expect(child.killed()).toBe(false)
    const hits = JSON.stringify([{ name: '@molecule/api-database', stack: 'api' }])
    child.say(
      `${JSON.stringify({ jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: hits }] } })}\n`,
    )
    await expect(pending).resolves.toMatchObject({
      version: '0.3.5',
      tools: 2,
      search: { tool: 'search_packages', query: 'database', found: '@molecule/api-database' },
    })
    expect(child.killed()).toBe(true)
  })

  it('rejects a search that fails or finds nothing', async () => {
    const answers = [
      { result: { isError: true, content: [{ type: 'text', text: 'registry.json not found' }] } },
      { result: { content: [{ type: 'text', text: '[]' }] } },
      { error: { code: -32603, message: 'internal error' } },
    ]
    const errors: string[] = []
    for (const answer of answers) {
      const child = fakeChild()
      const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
      child.say('{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"0.3.5"}}}\n')
      child.say('{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"search_packages"}]}}\n')
      child.say(`${JSON.stringify({ jsonrpc: '2.0', id: 3, ...answer })}\n`)
      errors.push(
        await pending.then(
          () => 'resolved',
          (error: Error) => error.message,
        ),
      )
    }
    expect(errors).toEqual([
      'search_packages failed: registry.json not found',
      'search_packages found nothing for "database"',
      'search_packages failed: internal error',
    ])
  })

  it('counterexample: a server without search_packages is listed, not searched', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    child.say('{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"0.3.4"}}}\n')
    child.say('{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"a"}]}}\n')
    const result = await pending
    expect(result).toMatchObject({ version: '0.3.4', tools: 1 })
    expect(result.search).toBeUndefined()
    expect(child.written.map((line) => JSON.parse(line).method)).not.toContain('tools/call')
  })

  it('rejects a server that lists no tools', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    child.say('{"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"version":"0.3.4"}}}\n')
    child.say('{"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n')
    await expect(pending).rejects.toThrow('answered tools/list with no tools')
  })

  it('rejects when the server exits before answering', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    child.exit(1)
    await expect(pending).rejects.toThrow('exited with code 1 before answering')
  })

  it('rejects and stops the server when it does not answer in time', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], {
      spawnImpl: child.spawnImpl,
      timeoutMs: 20,
    })
    await expect(pending).rejects.toThrow('no answer within 0 s')
    expect(child.killed()).toBe(true)
  })

  it('rejects an answer that names no version', async () => {
    const child = fakeChild()
    const pending = warmMcpServer('npx', ['-y', 'molecule-mcp'], { spawnImpl: child.spawnImpl })
    child.say('{"jsonrpc":"2.0","id":1,"result":{}}\n')
    await expect(pending).rejects.toThrow('without a server version')
  })
})
