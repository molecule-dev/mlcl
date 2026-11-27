/**
 * Command-level coverage for `mlcl mcp install` — the file-writer paths run
 * for real against a temp HOME and project; PATH detection is off
 * (`MLCL_NO_PATH_DETECT=1`), so no agent CLI is ever spawned. The native
 * installer path is covered against an injected runner in agent-setup.test.ts.
 *
 * Every expected path and key is the agent vendor's documented one (see
 * src/lib/agent-harnesses.ts).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

import { Config } from '@oclif/core'
import { parse } from 'jsonc-parser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MOLECULE_SECTION_MARKER } from '../../lib/instruction-section.js'
import McpInstall from '../mcp/install.js'

// Exercise the real command-selection logic with a deterministic registry outage.
vi.mock(import('../../lib/mcp-machine-install.js'), async (importOriginal) => {
  const actual = await importOriginal()
  const unavailable = async (): Promise<never> => {
    throw new Error('registry unavailable in command fixture')
  }
  return {
    ...actual,
    useMachineMcp: (env: Parameters<typeof actual.useMachineMcp>[0]) =>
      actual.useMachineMcp(env, {
        latest: unavailable,
        install: unavailable,
        activate: unavailable,
      }),
  }
})

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const STANDARD = { command: 'npx', args: ['-y', 'molecule-mcp'] }

describe('mlcl mcp install', () => {
  let home: string
  let project: string
  let saved: Record<string, string | undefined>
  let prevCwd: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'mcp-install-home-'))
    project = mkdtempSync(join(tmpdir(), 'mcp-install-proj-'))
    saved = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      MLCL_NO_PATH_DETECT: process.env.MLCL_NO_PATH_DETECT,
      CODEX_HOME: process.env.CODEX_HOME,
      COPILOT_HOME: process.env.COPILOT_HOME,
    }
    prevCwd = process.cwd()
    process.env.HOME = home
    process.env.MLCL_NO_PATH_DETECT = '1'
    delete process.env.XDG_CONFIG_HOME
    delete process.env.CODEX_HOME
    delete process.env.COPILOT_HOME
    process.chdir(project)
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    process.chdir(prevCwd)
    rmSync(home, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  })

  async function run(flags: string[] = []): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    await new McpInstall(flags, config).run()
  }

  /** The value at `keys` inside the JSON(C) file at `path`, or undefined. */
  const at = (path: string, ...keys: string[]): unknown =>
    keys.reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      parse(readFileSync(path, 'utf8')),
    )

  it('writes Devin Desktop (formerly Windsurf) config at its current path', async () => {
    await run(['--agent', 'windsurf'])
    expect(at(join(home, '.config', 'devin', 'mcp_config.json'), 'mcpServers', 'molecule')).toEqual(
      STANDARD,
    )
  })

  it('keeps an old Windsurf install configured too, idempotently, preserving its servers', async () => {
    const path = join(home, '.codeium', 'windsurf', 'mcp_config.json')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify({ mcpServers: { existing: { command: 'foo' } } }))
    await run(['--agent', 'windsurf'])
    await run(['--agent', 'windsurf'])
    expect(at(path, 'mcpServers')).toEqual({ existing: { command: 'foo' }, molecule: STANDARD })
  })

  it('writes the project .mcp.json Copilot reads (OLD MUSTFAIL: deprecated .vscode/mcp.json)', async () => {
    await run(['--agent', 'vscode', '--project'])
    expect(at(join(project, '.mcp.json'), 'mcpServers', 'molecule')).toEqual({
      type: 'stdio',
      ...STANDARD,
      tools: ['*'],
    })
    expect(existsSync(join(project, '.vscode', 'mcp.json'))).toBe(false)
  })

  it('writes Copilot CLI user config with the required tools field', async () => {
    await run(['--agent', 'copilot'])
    expect(at(join(home, '.copilot', 'mcp-config.json'), 'mcpServers', 'molecule')).toEqual({
      type: 'local',
      ...STANDARD,
      tools: ['*'],
    })
  })

  it('writes Cursor config files directly: Cursor has no mcp add command', async () => {
    await run(['--agent', 'cursor'])
    expect(at(join(home, '.cursor', 'mcp.json'), 'mcpServers', 'molecule')).toEqual(STANDARD)
  })

  it('keeps an installed machine launcher when the registry is unavailable', async () => {
    const serverHome = join(home, '.mlcl', 'mcp')
    const launcher = join(serverHome, 'run.mjs')
    const bin = join(serverHome, 'versions', '1.0.0', 'node_modules', 'molecule-mcp', 'bin')
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, 'run.js'), '')
    writeFileSync(launcher, '')
    writeFileSync(join(serverHome, 'current.json'), JSON.stringify({ version: '1.0.0' }))

    await run(['--agent', 'cursor'])

    expect(at(join(home, '.cursor', 'mcp.json'), 'mcpServers', 'molecule')).toEqual({
      command: 'node',
      args: [launcher.split(sep).join('/')],
    })
  })

  it('detects a project set up for Cursor by its .cursor folder', async () => {
    mkdirSync(join(project, '.cursor'), { recursive: true })
    await run([])
    expect(existsSync(join(project, '.cursor', 'mcp.json'))).toBe(true)
  })

  it('errors with an actionable message when nothing is detectable', async () => {
    await expect(run([])).rejects.toThrow(/--agent/)
  })

  it('writes Zed context_servers, keeping comments and other settings (OLD MUSTFAIL: agent.mcp_servers)', async () => {
    const path = join(project, '.zed', 'settings.json')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(
      path,
      '{\n  // my theme\n  "theme": "one-dark",\n  "agent": { "enabled": true },\n}\n',
    )
    await run(['--agent', 'zed', '--project'])
    const text = readFileSync(path, 'utf8')
    expect(text).toContain('// my theme')
    const cfg = parse(text)
    expect(cfg.theme).toBe('one-dark')
    expect(cfg.agent).toEqual({ enabled: true })
    expect(cfg.context_servers.molecule).toEqual({ ...STANDARD, env: {} })
  })

  it('writes Zed user settings under the XDG config directory', async () => {
    await run(['--agent', 'zed'])
    expect(
      at(join(home, '.config', 'zed', 'settings.json'), 'context_servers', 'molecule'),
    ).toBeDefined()
  })

  it('writes kiro workspace config', async () => {
    await run(['--agent', 'kiro', '--project'])
    expect(at(join(project, '.kiro', 'settings', 'mcp.json'), 'mcpServers', 'molecule')).toEqual(
      STANDARD,
    )
  })

  it('writes Trae project config, and prints the steps for its settings-only global config', async () => {
    await run(['--agent', 'trae', '--project'])
    expect(at(join(project, '.trae', 'mcp.json'), 'mcpServers', 'molecule')).toEqual(STANDARD)
    await run(['--agent', 'trae'])
    expect(existsSync(join(home, '.trae', 'mcp.json'))).toBe(false)
  })

  it('writes OpenCode servers under mcp.servers (OLD MUSTFAIL: directly under mcp)', async () => {
    await run(['--agent', 'opencode', '--project'])
    const path = join(project, 'opencode.json')
    expect(at(path, 'mcp', 'servers', 'molecule')).toEqual({
      type: 'local',
      command: ['npx', '-y', 'molecule-mcp'],
    })
    expect(at(path, 'mcp', 'molecule')).toBeUndefined()
  })

  it('edits an existing opencode.jsonc instead of creating a second config', async () => {
    const dir = join(home, '.config', 'opencode')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'opencode.jsonc'),
      '{\n  // keep me\n  "$schema": "https://opencode.ai/config.json"\n}\n',
    )
    await run(['--agent', 'opencode'])
    expect(existsSync(join(dir, 'opencode.json'))).toBe(false)
    const text = readFileSync(join(dir, 'opencode.jsonc'), 'utf8')
    expect(text).toContain('// keep me')
    expect(parse(text).mcp.servers.molecule.type).toBe('local')
  })

  it('writes Amp settings under its flat amp.mcpServers key (OLD MUSTFAIL: mcpServers)', async () => {
    await run(['--agent', 'amp'])
    const path = join(home, '.config', 'amp', 'settings.json')
    expect(at(path, 'amp.mcpServers', 'molecule')).toEqual(STANDARD)
    expect(at(path, 'mcpServers')).toBeUndefined()
  })

  it('writes Crush JSON under mcp with type stdio (OLD MUSTFAIL: config.json mcpServers)', async () => {
    await run(['--agent', 'crush'])
    expect(at(join(home, '.config', 'crush', 'crush.json'), 'mcp', 'molecule')).toEqual({
      type: 'stdio',
      ...STANDARD,
    })
  })

  it('writes the Codex TOML table when the codex CLI is absent, once', async () => {
    await run(['--agent', 'codex'])
    await run(['--agent', 'codex'])
    const toml = readFileSync(join(home, '.codex', 'config.toml'), 'utf8')
    expect(toml.match(/\[mcp_servers\.molecule\]/g)).toHaveLength(1)
    expect(toml).toContain('args = ["-y", "molecule-mcp"]')
  })

  it('gives Codex the conventions in ~/.codex/AGENTS.md, once: it never shows server instructions (OLD MUSTFAIL)', async () => {
    // Codex connected a stub server, called its tool and saw none of its instructions (nonce probe,
    // 2026-11-24), so an MCP-only install left Codex with no Molecule guidance at all.
    mkdirSync(join(home, '.codex'), { recursive: true })
    writeFileSync(join(home, '.codex', 'AGENTS.md'), '# My own rules\n\nKeep this.\n')
    await run(['--agent', 'codex'])
    await run(['--agent', 'codex'])
    const agents = readFileSync(join(home, '.codex', 'AGENTS.md'), 'utf8')
    expect(agents).toContain('Keep this.')
    expect(agents.match(new RegExp(`^${MOLECULE_SECTION_MARKER}`, 'gm'))).toHaveLength(1)
    expect(agents).toContain('search_packages')
  })

  it('counterexample: Claude Code, which shows server instructions, gets no CLAUDE.md from it', async () => {
    await run(['--agent', 'claude-code'])
    expect(existsSync(join(home, '.claude', 'CLAUDE.md'))).toBe(false)
  })

  it('writes Claude Code project config to .mcp.json without the claude CLI', async () => {
    await run(['--agent', 'claude-code', '--project'])
    expect(at(join(project, '.mcp.json'), 'mcpServers', 'molecule', 'command')).toBe('npx')
  })

  it('refuses to rewrite a config it cannot parse, leaving it untouched', async () => {
    const path = join(home, '.cursor', 'mcp.json')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, '{ "mcpServers": ')
    await expect(run(['--agent', 'cursor'])).rejects.toThrow(/not valid JSON/)
    expect(readFileSync(path, 'utf8')).toBe('{ "mcpServers": ')
  })

  it('prints instructions instead of writing for YAML/UI agents', async () => {
    await run(['--agent', 'goose'])
    expect(existsSync(join(home, '.config', 'goose'))).toBe(false)
  })
})
