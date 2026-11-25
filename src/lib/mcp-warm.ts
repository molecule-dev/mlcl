/**
 * Start the MCP server once, the way the agents will, and wait for its `initialize` answer and its
 * tool list.
 *
 * An agent starts the server itself, with the command setup registered: the installed copy in
 * `~/.mlcl/mcp` for the whole machine (`mcp-machine-install.ts`), `npx -y molecule-mcp` in a
 * project. On a machine that has never run it, npx first downloads the server, which took 9.5 s
 * in a fresh home on 2026-11-22, and headless Claude Code (`claude -p`) began its session with the
 * server still "pending": no Molecule tool was offered for the whole run. With the package already
 * in npx's cache the same session connected at once and listed all 74 tools. `mlcl setup` runs
 * this after registering the server, so the first agent session finds it ready, and the user
 * learns at setup time whether it starts.
 *
 * It also lists the tools, as a session does next, and setup says so: told only that the server
 * "starts", Codex wrote its own MCP client to confirm the tools were there (harness eval `install`,
 * 2026-11-25: four of five runs, 4-6 steps each). Then it makes one search, as an agent's first
 * Molecule call would: told the tools were listed, Codex still wrote a client to call
 * `search_packages` itself, 7-14 s at the end of four of five installs (the same eval, later run).
 *
 * @module
 */

import { spawn } from 'node:child_process'

/** The search setup makes once the tools are listed: the tool, and what it asks. */
export const WARM_SEARCH = { tool: 'search_packages', query: 'database' } as const

/** What a started server reported. */
export interface McpWarmResult {
  /** `serverInfo.version` from the `initialize` answer. */
  version: string
  /** How many tools its `tools/list` answer names. */
  tools: number
  /**
   * Its {@link WARM_SEARCH} and the first package that found; absent when the server lists no such
   * tool (a server older than this check).
   */
  search?: { tool: string; query: string; found: string }
  /** Milliseconds from spawn to the last answer. */
  ms: number
}

/**
 * The first package name in a `search_packages` answer.
 *
 * @param result - The `tools/call` result.
 * @returns The name, or an error saying what the answer was instead.
 */
function firstFound(result: unknown): string | Error {
  const answer = result as { isError?: unknown; content?: { text?: unknown }[] } | undefined
  const text = (answer?.content ?? [])
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
  if (answer?.isError) return new Error(`${WARM_SEARCH.tool} failed: ${text.slice(0, 200)}`)
  let hits: unknown
  try {
    hits = JSON.parse(text)
  } catch (_error) {
    return new Error(`${WARM_SEARCH.tool} answered: ${text.slice(0, 200)}`)
  }
  const name = Array.isArray(hits) ? (hits[0] as { name?: unknown } | undefined)?.name : undefined
  return typeof name === 'string'
    ? name
    : new Error(`${WARM_SEARCH.tool} found nothing for "${WARM_SEARCH.query}"`)
}

/** The child-process surface this needs, so tests run without a network. */
export type McpSpawn = (
  command: string,
  args: readonly string[],
) => {
  stdin: { write(chunk: string): unknown; end(): unknown } | null
  stdout: { on(event: 'data', listener: (chunk: Buffer | string) => void): unknown } | null
  on(event: 'exit', listener: (code: number | null) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  kill(): unknown
}

/** Sends one message to the child, as a line of JSON. */
export type SendJson = (message: Record<string, unknown>) => void

/** Settles an exchange: an error, or its result. */
export type FinishExchange<T> = (error: Error | null, result?: T) => void

/**
 * Talk newline-delimited JSON with a child process: `start` sends the first message, and
 * `onMessage` gets each JSON line the child prints, sends more and finishes. Settles once, and
 * kills the child in every case.
 *
 * @param command - The executable.
 * @param args - Its arguments.
 * @param handlers - What to send first, and what to do with each answer.
 * @param handlers.start - Sends the first message.
 * @param handlers.onMessage - Handles one message the child printed.
 * @param opts - Options.
 * @param opts.timeoutMs - How long to wait for the exchange to finish.
 * @param opts.spawnImpl - Child-process factory (tests).
 * @returns What `onMessage` finished with. Rejects when the child exits first, fails to spawn or
 *   does not finish in time.
 */
export function exchangeJsonLines<T>(
  command: string,
  args: readonly string[],
  handlers: {
    start: (send: SendJson) => void
    onMessage: (message: Record<string, unknown>, send: SendJson, finish: FinishExchange<T>) => void
  },
  opts: { timeoutMs: number; spawnImpl?: McpSpawn },
): Promise<T> {
  const spawnImpl: McpSpawn =
    opts.spawnImpl ?? ((cmd, argv) => spawn(cmd, [...argv], { stdio: ['pipe', 'pipe', 'ignore'] }))
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args)
    let buffer = ''
    let settled = false
    const send: SendJson = (message) => {
      child.stdin?.write(`${JSON.stringify(message)}\n`)
    }
    const finish: FinishExchange<T> = (error, result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      if (error) reject(error)
      else resolve(result as T)
    }
    const timer = setTimeout(
      () => finish(new Error(`no answer within ${Math.round(opts.timeoutMs / 1000)} s`)),
      opts.timeoutMs,
    )
    child.on('error', (error) => finish(error))
    child.on('exit', (code) => finish(new Error(`exited with code ${code} before answering`)))
    child.stdout?.on('data', (chunk) => {
      buffer += String(chunk)
      for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
        const line = buffer.slice(0, at).trim()
        buffer = buffer.slice(at + 1)
        if (!line.startsWith('{')) continue
        let message: Record<string, unknown>
        try {
          message = JSON.parse(line)
        } catch (_error) {
          // A non-JSON line on stdout is not the answer; keep reading.
          continue
        }
        handlers.onMessage(message, send, finish)
      }
    })
    handlers.start(send)
  })
}

/**
 * Spawn the server, send `initialize` and then `tools/list`, call {@link WARM_SEARCH} when it is
 * listed, and resolve once it has answered them all.
 *
 * @param command - The executable (`npx`).
 * @param args - Its arguments (`['-y', 'molecule-mcp']`).
 * @param opts - Options.
 * @param opts.timeoutMs - How long to wait for the answer (default 120 s, Codex's start limit).
 * @param opts.spawnImpl - Child-process factory (tests).
 * @returns The server's version, its tool count, what the search found and how long it took.
 *   Rejects when it exits, fails to spawn, does not answer in time or its search fails; the child
 *   is killed in every case.
 */
export function warmMcpServer(
  command: string,
  args: readonly string[],
  opts: { timeoutMs?: number; spawnImpl?: McpSpawn } = {},
): Promise<McpWarmResult> {
  const started = Date.now()
  let version = ''
  let tools = 0
  return exchangeJsonLines<McpWarmResult>(
    command,
    args,
    {
      start: (send) =>
        send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'mlcl-setup', version: '0' },
          },
        }),
      onMessage: (message, send, finish) => {
        const result = message.result as
          { serverInfo?: { version?: unknown }; tools?: unknown } | undefined
        if (message.id === 1) {
          const answered = result?.serverInfo?.version
          if (typeof answered !== 'string') {
            finish(new Error('answered initialize without a server version'))
            return
          }
          version = answered
          send({ jsonrpc: '2.0', method: 'notifications/initialized' })
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
        } else if (message.id === 2) {
          const listed = result?.tools
          if (!Array.isArray(listed) || listed.length === 0) {
            finish(new Error('answered tools/list with no tools'))
            return
          }
          tools = listed.length
          if (!listed.some((t) => (t as { name?: unknown } | null)?.name === WARM_SEARCH.tool)) {
            finish(null, { version, tools, ms: Date.now() - started })
            return
          }
          send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: WARM_SEARCH.tool, arguments: { query: WARM_SEARCH.query, limit: 1 } },
          })
        } else if (message.id === 3) {
          const error = (message.error as { message?: unknown } | undefined)?.message
          const found =
            error === undefined
              ? firstFound(message.result)
              : new Error(`${WARM_SEARCH.tool} failed: ${String(error)}`)
          if (found instanceof Error) finish(found)
          else
            finish(null, {
              version,
              tools,
              search: { ...WARM_SEARCH, found },
              ms: Date.now() - started,
            })
        }
      },
    },
    { timeoutMs: opts.timeoutMs ?? 120_000, spawnImpl: opts.spawnImpl },
  )
}
