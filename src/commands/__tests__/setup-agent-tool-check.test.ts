/**
 * `mlcl setup` for the whole machine asks each agent it set up whether that agent's next session
 * gets the molecule server's tools, and says what it answered. Told only that the server answers,
 * Codex wrote its own `codex app-server` client to check, in all 15 runs of the harness eval
 * `install` on 2026-11-25 (15–25 s each).
 *
 * The agents' CLIs are fake scripts on PATH (`mcp add` succeeds); the server start, the machine
 * copy and the agents' answers are mocked.
 *
 * @module
 */

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Setup from '../setup.js'

const mocks = vi.hoisted(() => ({
  warm: vi.fn(async () => ({ version: '9.9.9', tools: 76, ms: 100 })),
  codex: vi.fn(),
  claude: vi.fn(),
}))
vi.mock('../../lib/mcp-warm.js', () => ({ warmMcpServer: mocks.warm }))
vi.mock('../../lib/mcp-machine-install.js', () => ({
  useMachineMcp: async () => ({ ok: false, line: 'no machine copy in this test: npx' }),
}))
vi.mock('../../lib/agent-tool-check.js', () => ({
  codexServerTools: mocks.codex,
  claudeServerStatus: mocks.claude,
}))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl setup --scope machine: what each agent sees', () => {
  let home: string
  let bin: string
  let saved: Record<string, string | undefined>
  let prevCwd: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'setup-agents-home-'))
    bin = join(home, 'bin')
    mkdirSync(bin)
    for (const name of ['codex', 'claude']) {
      writeFileSync(join(bin, name), '#!/bin/sh\nexit 0\n')
      chmodSync(join(bin, name), 0o755)
    }
    saved = {
      HOME: process.env.HOME,
      PATH: process.env.PATH,
      MLCL_NO_PATH_DETECT: process.env.MLCL_NO_PATH_DETECT,
      CODEX_HOME: process.env.CODEX_HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    }
    prevCwd = process.cwd()
    process.env.HOME = home
    process.env.PATH = `${bin}:/usr/bin:/bin`
    delete process.env.MLCL_NO_PATH_DETECT
    delete process.env.CODEX_HOME
    delete process.env.XDG_CONFIG_HOME
    process.chdir(home)
    mocks.warm.mockClear()
    mocks.warm.mockImplementation(async () => ({ version: '9.9.9', tools: 76, ms: 100 }))
    mocks.codex.mockReset()
    mocks.codex.mockResolvedValue({
      ok: true,
      detail: '76 tools',
      via: 'codex app-server',
      ms: 200,
    })
    mocks.claude.mockReset()
    mocks.claude.mockResolvedValue({
      ok: true,
      detail: 'Connected',
      via: 'claude mcp get',
      ms: 400,
    })
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    process.chdir(prevCwd)
    process.exitCode = undefined
    rmSync(home, { recursive: true, force: true })
  })

  async function run(flags: string[]): Promise<string> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Setup(flags, config)
    const lines: string[] = []
    cmd.log = (message?: string) => {
      lines.push(String(message ?? ''))
    }
    await cmd.run()
    return lines.join('\n')
  }

  const machine = ['--yes', '--scope', 'machine', '--skip', 'skills,instructions']

  it('says that Codex and Claude Code see the server (OLD MUSTFAIL)', async () => {
    const out = await run([...machine, '--agent', 'claude-code,codex'])
    expect(mocks.codex).toHaveBeenCalledTimes(1)
    expect(mocks.codex).toHaveBeenCalledWith('molecule')
    expect(mocks.claude).toHaveBeenCalledWith('molecule')
    expect(out).toContain('Codex sees the molecule server: 76 tools')
    expect(out).toContain('(codex app-server, 0.2 s)')
    expect(out).toContain('Claude Code sees the molecule server: Connected')
    expect(process.exitCode).toBeUndefined()
  })

  it('fails setup when an agent does not see the server', async () => {
    mocks.codex.mockResolvedValue({
      ok: false,
      detail: 'MCP startup failed: handshaking with MCP server failed',
      via: 'codex app-server',
      ms: 200,
    })
    const out = await run([...machine, '--agent', 'codex'])
    expect(out).toContain('Codex does not see the molecule server:')
    expect(out).toContain('MCP startup failed')
    expect(out).toContain('1 step(s) failed')
    expect(process.exitCode).toBe(1)
  })

  it('an agent it could not ask is a note, not a failure', async () => {
    mocks.codex.mockRejectedValue(new Error('unknown method mcpServerStatus/list'))
    const out = await run([...machine, '--agent', 'codex'])
    expect(out).toContain('Could not ask Codex which tools it sees (codex): unknown method')
    expect(out).not.toContain('step(s) failed')
    expect(process.exitCode).toBeUndefined()
  })

  it('counterexample: asks no agent at project scope, after a failed server start, or when its CLI is absent', async () => {
    await run(['--yes', '--scope', 'project', '--skip', 'skills,instructions', '--agent', 'codex'])
    mocks.warm.mockImplementationOnce(async () => {
      throw new Error('exited with code 1 before answering')
    })
    await run([...machine, '--agent', 'codex'])
    rmSync(join(bin, 'codex'))
    await run([...machine, '--agent', 'codex'])
    expect(mocks.codex).not.toHaveBeenCalled()
  })
})
