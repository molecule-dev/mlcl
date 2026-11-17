/**
 * `mlcl setup` end to end: the real oclif command against a temp HOME and a
 * temp project, non-interactive (`--yes`), with PATH detection off so no
 * agent CLI is spawned. Covers both scopes, detection, `--skip`, `--dry-run`,
 * re-runs and `--force`.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import Setup from '../setup.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const SKILL_NAMES = ['build-with-molecule', 'capability-first', 'extend-with-packages']

describe('mlcl setup', () => {
  let home: string
  let project: string
  let saved: Record<string, string | undefined>
  let prevCwd: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'setup-home-'))
    project = mkdtempSync(join(tmpdir(), 'setup-proj-'))
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
    for (const key of ['XDG_CONFIG_HOME', 'CODEX_HOME', 'COPILOT_HOME']) delete process.env[key]
    process.chdir(project)
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    process.chdir(prevCwd)
    process.exitCode = undefined
    rmSync(home, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
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

  const read = (...parts: string[]): string => readFileSync(join(...parts), 'utf8')
  const skillsIn = (dir: string): string[] => readdirSync(dir).sort()

  it('machine-wide: MCP, skills and conventions for each chosen agent, nothing in the project', async () => {
    await run(['--yes', '--scope', 'machine', '--agent', 'claude-code,codex,cursor,kiro'])
    // Skills: Claude Code's own folder, the shared ~/.agents folder (Codex,
    // Cursor), and Kiro's.
    expect(skillsIn(join(home, '.claude', 'skills'))).toEqual(SKILL_NAMES)
    expect(skillsIn(join(home, '.agents', 'skills'))).toEqual(SKILL_NAMES)
    expect(skillsIn(join(home, '.kiro', 'skills'))).toEqual(SKILL_NAMES)
    expect(read(home, '.agents', 'skills', 'capability-first', 'SKILL.md')).toBe(
      read(MLCL_ROOT, 'templates', '.agents', 'skills', 'capability-first', 'SKILL.md'),
    )
    // MCP: Cursor's file, Codex's TOML (no CLI on PATH), Kiro's file.
    expect(JSON.parse(read(home, '.cursor', 'mcp.json')).mcpServers.molecule.command).toBe('npx')
    expect(read(home, '.codex', 'config.toml')).toContain('[mcp_servers.molecule]')
    expect(
      JSON.parse(read(home, '.kiro', 'settings', 'mcp.json')).mcpServers.molecule,
    ).toBeDefined()
    // Conventions.
    expect(read(home, '.claude', 'CLAUDE.md')).toContain('## Molecule')
    expect(read(home, '.codex', 'AGENTS.md')).toContain('## Molecule')
    expect(read(home, '.kiro', 'steering', 'molecule.md')).toMatch(
      /^---\ninclusion: always\n---\n\n## Molecule/,
    )
    expect(readdirSync(project)).toEqual([])
  })

  it('this project only: files in the project, nothing in HOME', async () => {
    writeFileSync(join(project, 'CLAUDE.md'), '@AGENTS.md\n')
    await run(['--yes', '--scope', 'project', '--agent', 'claude-code,copilot,gemini'])
    const mcp = JSON.parse(read(project, '.mcp.json')).mcpServers.molecule
    expect(mcp).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'molecule-mcp'],
      tools: ['*'],
    })
    expect(skillsIn(join(project, '.claude', 'skills'))).toEqual(SKILL_NAMES)
    expect(skillsIn(join(project, '.github', 'skills'))).toEqual(SKILL_NAMES)
    expect(skillsIn(join(project, '.agents', 'skills'))).toEqual(SKILL_NAMES)
    expect(read(project, 'AGENTS.md')).toContain('## Molecule')
    expect(read(project, 'GEMINI.md')).toContain('## Molecule')
    expect(read(project, 'CLAUDE.md')).toBe('@AGENTS.md\n')
    expect(JSON.parse(read(project, '.gemini', 'settings.json')).mcpServers.molecule).toBeDefined()
    expect(readdirSync(home)).toEqual([])
  })

  it('this project only, no CLAUDE.md yet: Claude Code gets one that imports AGENTS.md', async () => {
    const out = await run(['--yes', '--scope', 'project', '--agent', 'claude-code'])
    expect(read(project, 'CLAUDE.md')).toBe('@AGENTS.md\n')
    expect(read(project, 'AGENTS.md')).toContain('## Molecule')
    expect(out).toContain('CLAUDE.md (imports AGENTS.md)')
  })

  it('every project: Zed, Crush, Cline, Junie and Goose get the skills and their rules files (OLD MUSTFAIL)', async () => {
    await run(['--yes', '--scope', 'machine', '--agent', 'zed,crush,cline,junie,goose,continue'])
    expect(skillsIn(join(home, '.agents', 'skills'))).toEqual(SKILL_NAMES)
    expect(skillsIn(join(home, '.continue', 'skills'))).toEqual(SKILL_NAMES)
    for (const path of [
      ['.config', 'zed', 'AGENTS.md'],
      ['.config', 'crush', 'CRUSH.md'],
      ['Documents', 'Cline', 'Rules', 'molecule.md'],
      ['.junie', 'AGENTS.md'],
      ['.config', 'goose', '.goosehints'],
    ])
      expect(read(home, ...path), path.join('/')).toMatch(/^## Molecule\n/)
    expect(read(home, '.continue', 'rules', 'molecule.md')).toMatch(
      /^---\nname: Molecule\nalwaysApply: true\n---\n\n## Molecule\n/,
    )
    expect(
      JSON.parse(read(home, '.config', 'zed', 'settings.json')).context_servers.molecule,
    ).toEqual(expect.objectContaining({ command: 'npx' }))
    expect(readdirSync(project)).toEqual([])
  })

  it('defaults to the agents found on this machine', async () => {
    mkdirSync(join(home, '.cursor'))
    const out = await run(['--yes'])
    expect(existsSync(join(home, '.cursor', 'mcp.json'))).toBe(true)
    expect(existsSync(join(home, '.claude'))).toBe(false)
    expect(out).toContain('Cursor')
  })

  it('names the --agent flag when no agent is found', async () => {
    await expect(run(['--yes'])).rejects.toThrow(/--agent/)
  })

  it('--dry-run lists the plan and writes nothing', async () => {
    const out = await run(['--dry-run', '--agent', 'claude-code,cursor'])
    expect(out).toContain('~/.claude/skills/')
    expect(out).toContain('~/.cursor/mcp.json')
    expect(out).toContain('Dry run')
    expect(readdirSync(home)).toEqual([])
  })

  it('--skip leaves components out', async () => {
    await run(['--yes', '--agent', 'cursor', '--skip', 'mcp,skills'])
    expect(existsSync(join(home, '.cursor', 'mcp.json'))).toBe(false)
    expect(existsSync(join(home, '.agents'))).toBe(false)
  })

  it('a re-run changes nothing; an edited skill is kept until --force', async () => {
    await run(['--yes', '--agent', 'codex'])
    const skill = join(home, '.agents', 'skills', 'capability-first', 'SKILL.md')
    const toml = read(home, '.codex', 'config.toml')
    writeFileSync(skill, 'my edits\n')
    const again = await run(['--yes', '--agent', 'codex'])
    expect(again).toContain('kept your edited copy')
    expect(read(skill)).toBe('my edits\n')
    expect(read(home, '.codex', 'config.toml')).toBe(toml)
    await run(['--yes', '--agent', 'codex', '--force'])
    expect(read(skill)).toContain('name: capability-first')
  })

  it('prints the steps for an agent it cannot configure by file', async () => {
    const out = await run(['--yes', '--agent', 'claude-code', '--skip', 'skills,instructions'])
    expect(out).toContain('claude mcp add --scope user molecule -- npx -y molecule-mcp')
    expect(process.exitCode).toBeUndefined()
  })
})
