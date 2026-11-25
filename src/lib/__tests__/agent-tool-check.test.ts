/**
 * Asking an agent itself whether its next session gets the molecule server's tools: Codex through
 * `codex app-server` (`mcpServerStatus/list`), Claude Code through `claude mcp get`. The fake
 * app-server answers in the shapes Codex 0.166 printed for a stub server, a server that exited
 * before its handshake, and a config without the server (2026-11-25).
 *
 * @module
 */

import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { claudeServerStatus, codexServerTools } from '../agent-tool-check.js'
import type { McpSpawn } from '../mcp-warm.js'

type Answer = (message: Record<string, unknown>) => Record<string, unknown>[]

/**
 * A fake `codex app-server`: each line written to it is answered by `answer`.
 *
 * @param answer - The lines it prints for one message it receives.
 * @param seen - Collects the command and each message received.
 * @returns A spawn factory.
 */
function fakeAppServer(answer: Answer, seen: unknown[] = []): McpSpawn {
  return (command, args) => {
    seen.push([command, ...args])
    const child = new EventEmitter() as EventEmitter & {
      stdin: { write(chunk: string): boolean; end(): void }
      stdout: EventEmitter
      kill(): boolean
    }
    child.stdout = new EventEmitter()
    child.stdin = {
      write(chunk) {
        for (const line of chunk.split('\n').filter(Boolean)) {
          const message = JSON.parse(line)
          seen.push(message)
          const lines = answer(message)
          queueMicrotask(() =>
            child.stdout.emit('data', lines.map((l) => `${JSON.stringify(l)}\n`).join('')),
          )
        }
        return true
      },
      end() {},
    }
    child.kill = () => true
    return child as unknown as ReturnType<McpSpawn>
  }
}

/**
 * Codex's answers, with `servers` as the `mcpServerStatus/list` data.
 *
 * @param servers - The server list.
 * @returns The answer function.
 */
const codexWith =
  (servers: unknown[]): Answer =>
  (message) => {
    if (message.method === 'initialize')
      return [
        { id: message.id, result: { userAgent: 'mlcl-setup/0.166.0', codexHome: '/h/.codex' } },
        { method: 'remoteControl/status/changed', params: { status: 'disabled' } },
      ]
    if (message.method === 'mcpServerStatus/list')
      return [{ id: message.id, result: { data: servers, nextCursor: null } }]
    return []
  }

const tool = (name: string): Record<string, unknown> => ({ name, inputSchema: { type: 'object' } })

describe('codexServerTools', () => {
  it('counts the tools Codex lists for the server', async () => {
    const seen: unknown[] = []
    const spawnImpl = fakeAppServer(
      codexWith([
        { name: 'other', tools: { a: tool('a') }, toolsError: null },
        {
          name: 'molecule',
          tools: {
            search_packages: tool('search_packages'),
            read_package_doc: tool('read_package_doc'),
          },
          toolsError: null,
        },
      ]),
      seen,
    )
    const report = await codexServerTools('molecule', { spawnImpl })
    expect(report).toMatchObject({ ok: true, detail: '2 tools', via: 'codex app-server' })
    expect(seen[0]).toEqual(['codex', 'app-server'])
    expect(seen.slice(1).map((m) => (m as { method: string }).method)).toEqual([
      'initialize',
      'initialized',
      'mcpServerStatus/list',
    ])
  })

  it('is not ok when the server failed to start', async () => {
    const error =
      'MCP startup failed: handshaking with MCP server failed: connection closed: initialize response'
    const spawnImpl = fakeAppServer(codexWith([{ name: 'molecule', tools: {}, toolsError: error }]))
    expect(await codexServerTools('molecule', { spawnImpl })).toMatchObject({
      ok: false,
      detail: error,
    })
  })

  it('is not ok when the server is not in its config, or lists no tools', async () => {
    expect(
      await codexServerTools('molecule', { spawnImpl: fakeAppServer(codexWith([])) }),
    ).toMatchObject({ ok: false, detail: 'no molecule server in its config' })
    expect(
      await codexServerTools('molecule', {
        spawnImpl: fakeAppServer(codexWith([{ name: 'molecule', tools: {}, toolsError: null }])),
      }),
    ).toMatchObject({ ok: false, detail: 'the molecule server lists no tools' })
  })

  // Setup registers the server twice for Codex: the first-step tools up front, the rest deferred.
  it('counts the tools of the second registration and fails on its failure', async () => {
    const up = {
      name: 'molecule',
      tools: { search_packages: tool('search_packages') },
      toolsError: null,
    }
    const more = {
      name: 'molecule_more',
      tools: { whoami: tool('whoami'), login: tool('login') },
      toolsError: null,
    }
    expect(
      await codexServerTools('molecule', {
        more: 'molecule_more',
        spawnImpl: fakeAppServer(codexWith([up, more])),
      }),
    ).toMatchObject({ ok: true, detail: '3 tools, 1 of them up front' })
    // A config without the split (a command the user set) reports the one table.
    expect(
      await codexServerTools('molecule', {
        more: 'molecule_more',
        spawnImpl: fakeAppServer(codexWith([up])),
      }),
    ).toMatchObject({ ok: true, detail: '1 tools' })
    const failed = { name: 'molecule_more', tools: {}, toolsError: 'MCP startup failed' }
    expect(
      await codexServerTools('molecule', {
        more: 'molecule_more',
        spawnImpl: fakeAppServer(codexWith([up, failed])),
      }),
    ).toMatchObject({ ok: false, detail: 'MCP startup failed' })
    expect(
      await codexServerTools('molecule', {
        more: 'molecule_more',
        spawnImpl: fakeAppServer(codexWith([up, { ...more, tools: {} }])),
      }),
    ).toMatchObject({ ok: false, detail: 'the molecule_more server lists no tools' })
  })

  it('rejects when the app-server cannot be asked: an error answer, or no answer', async () => {
    const older = fakeAppServer((message) =>
      message.method === 'initialize'
        ? [{ id: message.id, result: {} }]
        : message.id === 2
          ? [{ id: 2, error: { code: -32601, message: 'unknown method mcpServerStatus/list' } }]
          : [],
    )
    await expect(codexServerTools('molecule', { spawnImpl: older })).rejects.toThrow(
      'unknown method mcpServerStatus/list',
    )
    const silent = fakeAppServer(() => [])
    await expect(
      codexServerTools('molecule', { spawnImpl: silent, timeoutMs: 50 }),
    ).rejects.toThrow('no answer within')
  })
})

describe('claudeServerStatus', () => {
  const printed =
    (status: string, ok = true) =>
    async (bin: string, args: string[]) => ({
      ok,
      output: `molecule:\n  Scope: User config (available in all your projects)\n  Status: ${status}\n  Type: stdio\n  Command: node\n\nTo remove this server, run: claude mcp remove molecule -s user\n`,
      bin,
      args,
    })

  it('is ok when Claude Code connects to the server', async () => {
    const calls: string[][] = []
    const report = await claudeServerStatus('molecule', {
      run: async (bin, args) => {
        calls.push([bin, ...args])
        return printed('✔ Connected')(bin, args)
      },
    })
    expect(report).toMatchObject({ ok: true, detail: 'Connected', via: 'claude mcp get' })
    expect(calls).toEqual([['claude', 'mcp', 'get', 'molecule']])
  })

  it('is not ok when it does not connect', async () => {
    expect(
      await claudeServerStatus('molecule', { run: printed('✘ Failed to connect') }),
    ).toMatchObject({
      ok: false,
      detail: 'Failed to connect',
    })
  })

  it('rejects when the CLI fails or prints no status', async () => {
    await expect(
      claudeServerStatus('molecule', {
        run: async () => ({ ok: false, output: 'No MCP server found with name: molecule' }),
      }),
    ).rejects.toThrow('No MCP server found with name: molecule')
  })
})
