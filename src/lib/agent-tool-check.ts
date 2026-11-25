/**
 * Ask a coding agent itself whether its next session gets the molecule server's tools, so
 * `mlcl setup` can say so for each agent it set up for the whole machine.
 *
 * Setup already starts the server once, as an agent will (`mcp-warm.ts`). In the harness eval
 * `install` Codex then still wrote its own client for `codex app-server` to see the tools from
 * Codex's side, in all 15 runs of 2026-11-25 (15–25 s each, and once a failed step on a `python`
 * that was not installed), and checked Claude Code with `claude mcp get`. Codex's app-server
 * answers `mcpServerStatus/list` in about 0.2 s, with no login.
 *
 * At project scope there is nothing to ask yet: each agent first asks the user to trust the
 * project's servers.
 *
 * @module
 */

import { execa } from 'execa'

import { exchangeJsonLines, type McpSpawn } from './mcp-warm.js'

/** What an agent said about the server. */
export interface AgentToolReport {
  /** Whether its next session gets the server's tools. */
  ok: boolean
  /** What it said: the tool count, its connection status, or why not. */
  detail: string
  /** How the agent was asked, for the line setup prints (`codex app-server`). */
  via: string
  /** Milliseconds the answer took. */
  ms: number
}

/** One server as Codex's `mcpServerStatus/list` reports it. */
interface CodexServerStatus {
  name?: unknown
  tools?: unknown
  toolsError?: unknown
}

/**
 * Ask Codex, through `codex app-server`, which tools a new session gets from a server.
 *
 * @param server - The server's name in Codex's config (`molecule`).
 * @param opts - Options.
 * @param opts.timeoutMs - How long to wait (default 60 s; Codex waits for the server to start).
 * @param opts.spawnImpl - Child-process factory (tests).
 * @param opts.more - The second registration of the same server, holding the tools Codex defers
 *   (`molecule_more`): when Codex lists it, its tools count too, and its failure is a failure.
 * @returns Codex's answer: ok with the tool count, or not ok when the server is missing, failed
 *   to start or lists no tools. Rejects when the app-server could not be asked (an older Codex,
 *   or no answer in time).
 */
export async function codexServerTools(
  server: string,
  opts: { timeoutMs?: number; spawnImpl?: McpSpawn; more?: string } = {},
): Promise<AgentToolReport> {
  const started = Date.now()
  const via = 'codex app-server'
  const data = await exchangeJsonLines<CodexServerStatus[]>(
    'codex',
    ['app-server'],
    {
      start: (send) =>
        send({
          id: 1,
          method: 'initialize',
          params: { clientInfo: { name: 'mlcl-setup', version: '0' } },
        }),
      onMessage: (message, send, finish) => {
        if (message.id !== 1 && message.id !== 2) return
        if (message.error !== undefined) {
          const error = message.error as { message?: unknown }
          finish(new Error(String(error.message ?? JSON.stringify(message.error))))
          return
        }
        if (message.id === 1) {
          send({ method: 'initialized' })
          send({ id: 2, method: 'mcpServerStatus/list', params: {} })
          return
        }
        const listed = (message.result as { data?: unknown } | undefined)?.data
        if (!Array.isArray(listed)) {
          finish(new Error('answered mcpServerStatus/list without a server list'))
          return
        }
        finish(null, listed as CodexServerStatus[])
      },
    },
    { timeoutMs: opts.timeoutMs ?? 60_000, spawnImpl: opts.spawnImpl },
  )
  const ms = Date.now() - started
  const found = data.find((entry) => entry.name === server)
  if (!found) return { ok: false, detail: `no ${server} server in its config`, via, ms }
  const more = opts.more === undefined ? undefined : data.find((entry) => entry.name === opts.more)
  const counts: number[] = []
  for (const [name, entry] of [
    [server, found] as const,
    ...(more ? [[opts.more, more] as const] : []),
  ]) {
    if (typeof entry.toolsError === 'string' && entry.toolsError)
      return { ok: false, detail: entry.toolsError, via, ms }
    const tools =
      entry.tools && typeof entry.tools === 'object' ? Object.keys(entry.tools).length : 0
    if (tools === 0) return { ok: false, detail: `the ${name} server lists no tools`, via, ms }
    counts.push(tools)
  }
  const [first, rest = 0] = counts
  const detail = more ? `${first + rest} tools, ${first} of them up front` : `${first} tools`
  return { ok: true, detail, via, ms }
}

/** Runs an agent's CLI; resolves with its exit status and combined output. */
export type AgentCliRunner = (
  bin: string,
  args: string[],
) => Promise<{ ok: boolean; output: string }>

/**
 * Ask Claude Code, through `claude mcp get`, whether it connects to a server.
 *
 * @param server - The server's name in Claude Code's config (`molecule`).
 * @param opts - Options.
 * @param opts.run - Runs the CLI (tests).
 * @returns Claude Code's answer: ok when its status is Connected. Rejects when the CLI failed or
 *   printed no status.
 */
export async function claudeServerStatus(
  server: string,
  opts: { run?: AgentCliRunner } = {},
): Promise<AgentToolReport> {
  const started = Date.now()
  const via = 'claude mcp get'
  const run: AgentCliRunner =
    opts.run ??
    (async (bin, args) => {
      const result = await execa(bin, args, { reject: false, all: true, timeout: 60_000 })
      return { ok: result.exitCode === 0, output: String(result.all ?? '') }
    })
  const { ok, output } = await run('claude', ['mcp', 'get', server])
  const status = /^\s*Status:\s*(.+)$/m.exec(output)?.[1]?.trim()
  if (!ok || !status)
    throw new Error(
      output.trim().split('\n').at(-1) || `claude mcp get ${server} printed no status`,
    )
  return {
    ok: /\bconnected\b/i.test(status),
    detail: status.replace(/^[^\p{L}]+/u, ''),
    via,
    ms: Date.now() - started,
  }
}
