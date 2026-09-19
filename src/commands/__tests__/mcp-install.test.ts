/**
 * Command-level coverage for `mlcl mcp install` — the file-writer paths run
 * for real against a tmp HOME; the CLI-shelling paths are asserted on their
 * argument tables only (spawning real harness CLIs is not testable here).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import McpInstall from '../mcp/install.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl mcp install', () => {
  let home: string
  let project: string
  let prevHome: string
  let prevCwd: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'mcp-install-home-'))
    project = mkdtempSync(join(tmpdir(), 'mcp-install-proj-'))
    prevHome = process.env.HOME ?? ''
    prevCwd = process.cwd()
    process.env.HOME = home
    process.chdir(project)
  })

  afterEach(() => {
    process.env.HOME = prevHome
    process.chdir(prevCwd)
    rmSync(home, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  })

  async function run(flags: string[] = []): Promise<void> {
    const config = await Config.load(MLCL_ROOT)
    await new McpInstall(flags, config).run()
  }

  it('writes the windsurf config with the standard server entry', async () => {
    await run(['--agent', 'windsurf'])
    const cfg = JSON.parse(
      readFileSync(join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8'),
    )
    expect(cfg.mcpServers.molecule).toEqual({ command: 'npx', args: ['-y', 'molecule-mcp'] })
  })

  it('is idempotent and preserves existing windsurf servers', async () => {
    const path = join(home, '.codeium', 'windsurf', 'mcp_config.json')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify({ mcpServers: { existing: { command: 'foo' } } }))
    await run(['--agent', 'windsurf'])
    await run(['--agent', 'windsurf'])
    const cfg = JSON.parse(readFileSync(path, 'utf8'))
    expect(Object.keys(cfg.mcpServers)).toEqual(['existing', 'molecule'])
  })

  it('writes the vscode project config under the servers key', async () => {
    await run(['--agent', 'vscode', '--project'])
    const cfg = JSON.parse(readFileSync(join(project, '.vscode', 'mcp.json'), 'utf8'))
    expect(cfg.servers.molecule.command).toBe('npx')
  })

  it('detects cursor-project via .cursor marker', async () => {
    process.env.MLCL_NO_PATH_DETECT = '1'
    mkdirSync(join(project, '.cursor'), { recursive: true })
    await run([])
    expect(existsSync(join(project, '.cursor', 'mcp.json'))).toBe(true)
    delete process.env.MLCL_NO_PATH_DETECT
  })

  it('errors with an actionable message when nothing is detectable', async () => {
    process.env.MLCL_NO_PATH_DETECT = '1'
    await expect(run([])).rejects.toThrow(/--agent/)
    delete process.env.MLCL_NO_PATH_DETECT
  })

  it('writes zed config under the nested agent.mcp_servers key, preserving settings', async () => {
    const path = join(project, '.zed', 'settings.json')
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, JSON.stringify({ theme: 'one-dark', agent: { enabled: true } }))
    await run(['--agent', 'zed'])
    const cfg = JSON.parse(readFileSync(path, 'utf8'))
    expect(cfg.theme).toBe('one-dark')
    expect(cfg.agent.enabled).toBe(true)
    expect(cfg.agent.mcp_servers.molecule).toEqual({ command: 'npx', args: ['-y', 'molecule-mcp'] })
  })

  it('writes kiro workspace config', async () => {
    await run(['--agent', 'kiro', '--project'])
    const cfg = JSON.parse(readFileSync(join(project, '.kiro', 'settings', 'mcp.json'), 'utf8'))
    expect(cfg.mcpServers.molecule.command).toBe('npx')
  })

  it('writes trae global config', async () => {
    await run(['--agent', 'trae'])
    const cfg = JSON.parse(readFileSync(join(home, '.trae', 'mcp.json'), 'utf8'))
    expect(cfg.mcpServers.molecule.args).toEqual(['-y', 'molecule-mcp'])
  })

  it('writes opencode config in its command-array shape', async () => {
    await run(['--agent', 'opencode', '--project'])
    const cfg = JSON.parse(readFileSync(join(project, 'opencode.json'), 'utf8'))
    expect(cfg.mcp.molecule).toEqual({ type: 'local', command: ['npx', '-y', 'molecule-mcp'] })
  })

  it('prints instructions instead of writing for YAML/UI harnesses', async () => {
    await run(['--agent', 'goose'])
    expect(existsSync(join(home, '.config', 'goose'))).toBe(false)
  })
})
