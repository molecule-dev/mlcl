/**
 * Start the MCP server once, the way the agents will, and wait for its `initialize` answer.
 *
 * An agent starts `npx -y molecule-mcp` itself. On a machine that has never run it, npx first
 * downloads the server, which took 9.5 s in a fresh home on 2026-11-22, and headless Claude Code
 * (`claude -p`) began its session with the server still "pending": no Molecule tool was offered
 * for the whole run. With the package already in npx's cache the same session connected at once
 * and listed all 74 tools. `mlcl setup` runs this after registering the server, so the first
 * agent session finds the server cached, and the user learns at setup time whether it starts.
 *
 * @module
 */

import { spawn } from 'node:child_process'

/** What a started server reported. */
export interface McpWarmResult {
  /** `serverInfo.version` from the `initialize` answer. */
  version: string
  /** Milliseconds from spawn to the answer. */
  ms: number
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

/**
 * Spawn the server, send `initialize`, and resolve with its version once it answers.
 *
 * @param command - The executable (`npx`).
 * @param args - Its arguments (`['-y', 'molecule-mcp']`).
 * @param opts - Options.
 * @param opts.timeoutMs - How long to wait for the answer (default 120 s, Codex's start limit).
 * @param opts.spawnImpl - Child-process factory (tests).
 * @returns The server's version and how long it took. Rejects when it exits, fails to spawn or
 *   does not answer in time; the child is killed in every case.
 */
export function warmMcpServer(
  command: string,
  args: readonly string[],
  opts: { timeoutMs?: number; spawnImpl?: McpSpawn } = {},
): Promise<McpWarmResult> {
  const timeoutMs = opts.timeoutMs ?? 120_000
  const spawnImpl: McpSpawn =
    opts.spawnImpl ?? ((cmd, argv) => spawn(cmd, [...argv], { stdio: ['pipe', 'pipe', 'ignore'] }))
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args)
    let buffer = ''
    let settled = false
    const finish = (error: Error | null, result?: McpWarmResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      if (error) reject(error)
      else resolve(result!)
    }
    const timer = setTimeout(
      () => finish(new Error(`no answer within ${Math.round(timeoutMs / 1000)} s`)),
      timeoutMs,
    )
    child.on('error', (error) => finish(error))
    child.on('exit', (code) => finish(new Error(`exited with code ${code} before answering`)))
    child.stdout?.on('data', (chunk) => {
      buffer += String(chunk)
      for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
        const line = buffer.slice(0, at).trim()
        buffer = buffer.slice(at + 1)
        if (!line.startsWith('{')) continue
        let message: { id?: unknown; result?: { serverInfo?: { version?: unknown } } }
        try {
          message = JSON.parse(line)
        } catch (_error) {
          // A non-JSON line on stdout is not the answer; keep reading.
          continue
        }
        if (message.id !== 1) continue
        const version = message.result?.serverInfo?.version
        if (typeof version !== 'string') {
          finish(new Error('answered initialize without a server version'))
          return
        }
        finish(null, { version, ms: Date.now() - started })
      }
    })
    child.stdin?.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'mlcl-setup', version: '0' },
        },
      })}\n`,
    )
  })
}
