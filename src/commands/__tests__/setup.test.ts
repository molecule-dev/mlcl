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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Setup from '../setup.js'

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

// Setup starts the MCP server once after registering it (lib/mcp-warm.ts); never spawn npx here.
const warm = vi.hoisted(() => vi.fn(async () => ({ version: '9.9.9', tools: 76, ms: 1234 })))
vi.mock('../../lib/mcp-warm.js', () => ({ warmMcpServer: warm }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
// The skills go only to an agent setup writes no conventions for (Cursor and Trae keep user rules in
// their settings): the conventions say the same, and Codex opened a matching skill before every answer
// (harness eval find, 2026-11-23). capability-first is not among them: every Molecule project receives it
// in its own .agents/skills, and outside one it points at a capability map and src/bonds/ that do not exist.
const SKILL_NAMES = ['build-with-molecule', 'extend-with-packages']

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

  it('machine-wide: MCP and conventions for each chosen agent, skills for the one with no rules file', async () => {
    await run(['--yes', '--scope', 'machine', '--agent', 'claude-code,codex,cursor,kiro'])
    // Skills: only Cursor's, in the ~/.agents folder it shares with Codex.
    expect(existsSync(join(home, '.claude', 'skills'))).toBe(false)
    expect(skillsIn(join(home, '.agents', 'skills'))).toEqual(SKILL_NAMES)
    expect(existsSync(join(home, '.kiro', 'skills'))).toBe(false)
    expect(read(home, '.agents', 'skills', 'extend-with-packages', 'SKILL.md')).toBe(
      read(MLCL_ROOT, 'templates', 'host-skills', 'extend-with-packages', 'SKILL.md'),
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

  it('says nothing else needs installing once setup succeeds (OLD MUSTFAIL)', async () => {
    // Agents read a bare "Restart" as "now install the CLI" and fetched mlcl a second time.
    const out = await run(['--yes', '--scope', 'machine', '--agent', 'cursor'])
    expect(out).toContain(
      'Nothing else to install: agents call the molecule tools, or run `npx mlcl <command>`.',
    )
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
    // Every one of them reads a conventions file, so no skill is written.
    for (const dir of ['.claude', '.github', '.agents'])
      expect(existsSync(join(project, dir, 'skills')), dir).toBe(false)
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

  it('every project: Zed, Crush, Cline, Junie and Goose get their rules files (OLD MUSTFAIL)', async () => {
    await run(['--yes', '--scope', 'machine', '--agent', 'zed,crush,cline,junie,goose,continue'])
    expect(existsSync(join(home, '.agents', 'skills'))).toBe(false)
    expect(existsSync(join(home, '.continue', 'skills'))).toBe(false)
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
    expect(out).toContain('~/.agents/skills/')
    expect(out).not.toContain('~/.claude/skills/')
    expect(out).toContain('~/.cursor/mcp.json')
    expect(out).toContain('Dry run')
    expect(readdirSync(home)).toEqual([])
  })

  it('--skip leaves components out', async () => {
    const out = await run(['--yes', '--agent', 'cursor', '--skip', 'mcp,skills'])
    expect(existsSync(join(home, '.cursor', 'mcp.json'))).toBe(false)
    expect(existsSync(join(home, '.agents'))).toBe(false)
    expect(out).not.toContain('agents call the molecule tools')
  })

  it('a re-run changes nothing; an edited skill is kept until --force', async () => {
    await run(['--yes', '--agent', 'cursor'])
    const skill = join(home, '.agents', 'skills', 'extend-with-packages', 'SKILL.md')
    const mcp = read(home, '.cursor', 'mcp.json')
    writeFileSync(skill, 'my edits\n')
    const again = await run(['--yes', '--agent', 'cursor'])
    expect(again).toContain('kept your edited copy')
    expect(read(skill)).toBe('my edits\n')
    expect(read(home, '.cursor', 'mcp.json')).toBe(mcp)
    await run(['--yes', '--agent', 'cursor', '--force'])
    expect(read(skill)).toContain('name: extend-with-packages')
  })

  it('gives Claude Code the skills when the conventions are left out', async () => {
    await run(['--yes', '--agent', 'claude-code', '--skip', 'mcp,instructions'])
    expect(skillsIn(join(home, '.claude', 'skills'))).toEqual(SKILL_NAMES)
    expect(read(home, '.claude', 'skills', 'extend-with-packages', 'SKILL.md')).toBe(
      read(MLCL_ROOT, 'templates', 'host-skills', 'extend-with-packages', 'SKILL.md'),
    )
  })

  it('removes the skills an earlier setup installed once the conventions carry them (OLD MUSTFAIL)', async () => {
    // An earlier setup wrote these three; the user edited one of them.
    const skills = join(home, '.claude', 'skills')
    const earlier: Record<string, string> = {
      'extend-with-packages': read(
        MLCL_ROOT,
        'templates',
        'host-skills',
        'extend-with-packages',
        'SKILL.md',
      ),
      'capability-first': read(
        MLCL_ROOT,
        'templates',
        '.agents',
        'skills',
        'capability-first',
        'SKILL.md',
      ),
      'build-with-molecule': 'my edits\n',
    }
    for (const [name, text] of Object.entries(earlier)) {
      mkdirSync(join(skills, name), { recursive: true })
      writeFileSync(join(skills, name, 'SKILL.md'), text)
    }
    const out = await run(['--yes', '--agent', 'claude-code', '--skip', 'mcp'])
    expect(skillsIn(skills)).toEqual(['build-with-molecule'])
    expect(read(skills, 'build-with-molecule', 'SKILL.md')).toBe('my edits\n')
    expect(out).toContain('removed (setup no longer installs it)')
    expect(out).toContain('kept your edited copy')
    expect(read(home, '.claude', 'CLAUDE.md')).toContain('## Molecule')
  })

  it('prints the steps for an agent it cannot configure by file', async () => {
    const out = await run(['--yes', '--agent', 'claude-code', '--skip', 'skills,instructions'])
    expect(out).toContain('Install the claude CLI')
    expect(out).toContain('claude mcp add --scope user molecule -- npx -y molecule-mcp')
    expect(out).not.toContain('Nothing else to install')
    expect(out).toContain('Follow the manual setup instructions above.')
    expect(process.exitCode).toBeUndefined()
  })

  // 2026-11-22 smoke test: in a fresh home the first `npx -y molecule-mcp` downloaded the server
  // (9.5 s) and headless Claude Code started its session with no Molecule tool at all.
  describe('starts the registered MCP server once, so the first agent session finds it cached', () => {
    beforeEach(() => {
      warm.mockClear()
      warm.mockImplementation(async () => ({ version: '9.9.9', tools: 76, ms: 1234 }))
    })

    it('after registering it, and says which version answered', async () => {
      const out = await run(['--yes', '--agent', 'codex', '--skip', 'skills,instructions'])
      expect(warm).toHaveBeenCalledTimes(1)
      expect(warm).toHaveBeenCalledWith('npx', ['-y', 'molecule-mcp'])
      expect(out).toContain('npx -y molecule-mcp answers as in an agent session: 76 tools')
      expect(out).toContain('(9.9.9, 1.2 s)')
      expect(process.exitCode).toBeUndefined()
    })

    it('fails setup when the server does not start', async () => {
      warm.mockImplementation(async () => {
        throw new Error('exited with code 1 before answering')
      })
      const out = await run(['--yes', '--agent', 'codex', '--skip', 'skills,instructions'])
      expect(out).toContain('npx -y molecule-mcp did not start:')
      expect(out).toContain('exited with code 1 before answering')
      expect(out).toContain('1 step(s) failed')
      expect(out).not.toContain('Nothing else to install')
      expect(process.exitCode).toBe(1)
    })

    it('not when the MCP server was left out or only printed as manual steps', async () => {
      await run(['--yes', '--agent', 'codex', '--skip', 'mcp'])
      await run(['--yes', '--agent', 'claude-code', '--skip', 'skills,instructions'])
      expect(warm).not.toHaveBeenCalled()
    })
  })
})
