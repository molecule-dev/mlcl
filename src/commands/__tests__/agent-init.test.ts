/**
 * Command-level coverage for `mlcl agent init`.
 *
 * The command's whole value is writing the RIGHT files for the detected
 * harness, idempotently. These tests run the REAL oclif command against a
 * throwaway project dir and assert:
 *
 *  - generic projects (no harness markers) get the AGENTS.md section — the
 *    cross-harness standard every major agent reads;
 *  - a second run is a no-op (user edits preserved) unless --force replaces
 *    exactly the molecule section, leaving surrounding content intact;
 *  - an agent that reads its own file gets the section there too (GEMINI.md,
 *    a CLAUDE.md that does not import AGENTS.md), and nothing it does not load;
 *  - the written section carries the load-bearing commands (mlcl create
 *    --no-interactive, search, add --inject, swap) an agent needs in context.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AgentInit from '../agent/init.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl agent init', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-agent-init-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  async function run(flags: string[] = []): Promise<AgentInit> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new AgentInit(flags, config)
    await cmd.run()
    return cmd
  }

  it('writes the AGENTS.md section in a generic project', async () => {
    await run()
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('## Molecule')
    expect(agents).toContain('npx mlcl create <name> --template <slug> --no-interactive')
    expect(agents).toContain('npx mlcl add @molecule/<name> --inject')
    expect(agents).not.toMatch(/^## Declared capability map$/m)
    expect(agents).not.toContain('@molecule/app-auth')
    expect(agents).not.toContain('@molecule/app-http')
  })

  it('writes and returns the declared capability map with its API configuration', async () => {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@molecule/app-auth': '1.0.0',
          '@molecule/app-http': '1.0.0',
          '@molecule/app-react': '1.0.0',
        },
      }),
    )
    const config = await Config.load(MLCL_ROOT)
    const cmd = new AgentInit([], config)
    const lines: string[] = []
    vi.spyOn(cmd, 'log').mockImplementation((input) => {
      lines.push(String(input ?? ''))
    })
    await cmd.run()

    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    const output = lines.join('\n')
    for (const text of [agents, output]) {
      expect(text).toContain('## Declared capability map')
      expect(text).toContain('`@molecule/app-auth`')
      expect(text).toContain('`@molecule/app-http`')
      expect(text).toContain("authScheme: 'Token'")
      expect(text).toContain('mapAuthResponse')
      expect(text).toContain('currentUserEndpoint')
      expect(text).toContain('profileUpdateMethod')
      expect(text).toContain("storage: 'memory'")
      expect(text).toContain('withCredentials: true')
    }
    expect(agents).not.toContain('### React —')

    await run()
    await run(['--force'])
    const refreshed = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(refreshed.match(/^## Declared capability map$/gm)).toHaveLength(1)
    expect(refreshed.match(/## Molecule/g)).toHaveLength(1)

    // A freshly scaffolded AGENTS.md already has the map but not the generic
    // `## Molecule` section. agent_init adds only the missing section.
    await writeFile(
      join(dir, 'AGENTS.md'),
      `# AGENTS.md\n\n${refreshed.slice(refreshed.indexOf('## Declared capability map'))}`,
    )
    await run()
    const scaffolded = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(scaffolded.match(/^## Declared capability map$/gm)).toHaveLength(1)
    expect(scaffolded.match(/## Molecule/g)).toHaveLength(1)
  })

  it('is idempotent — a second run preserves user edits between sections', async () => {
    await run()
    const afterFirst = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    await writeFile(
      join(dir, 'AGENTS.md'),
      afterFirst.replace('## Molecule\n', '## Molecule\n\nUSER NOTE: keep this line\n'),
    )
    await run()
    const afterSecond = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(afterSecond).toContain('USER NOTE: keep this line')
    expect(afterSecond.match(/## Molecule/g)).toHaveLength(1)
  })

  it('--force replaces only the molecule section, keeping surrounding headings', async () => {
    await run()
    // The first run wrote only the molecule section — embed it in a larger
    // doc so --force has surrounding content it must preserve.
    const sectionBody = (await readFile(join(dir, 'AGENTS.md'), 'utf8')).trimEnd()
    const withSection =
      '# Project X\n\nExisting intro.\n\n## Other\n\nOther section body.\n\n' +
      sectionBody +
      '\n\n## Tail\n\nTail body.\n'
    await writeFile(join(dir, 'AGENTS.md'), withSection)
    await run(['--force'])
    const out = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(out).toContain('# Project X')
    expect(out).toContain('## Other')
    expect(out).toContain('## Tail')
    expect(out.match(/## Molecule/g)).toHaveLength(1)
    expect(out.indexOf('## Molecule')).toBeLessThan(out.indexOf('## Tail'))
  })

  it('--force removes an empty generated map and preserves neighbouring sections', async () => {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/app-auth': '3.0.2' } }),
    )
    await run()
    const generated = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(generated).toContain('### Authentication')
    await writeFile(
      join(dir, 'AGENTS.md'),
      `# Project\n\n## Before\n\nKeep before.\n\n${generated}\n## After\n\nKeep after.\n`,
    )
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dependencies: {} }))

    await run(['--force'])
    const refreshed = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(refreshed).not.toMatch(/^## Declared capability map$/m)
    expect(refreshed).not.toContain('### Authentication')
    expect(refreshed).not.toContain('@molecule/app-auth')
    expect(refreshed).toContain('## Before\n\nKeep before.')
    expect(refreshed).toContain('## After\n\nKeep after.')
    expect(refreshed.match(/## Molecule/g)).toHaveLength(1)
  })

  it('carries the capability-first order into the written instructions', async () => {
    // The host loading path for the shared workflow: this section IS what
    // `mlcl agent init` writes into AGENTS.md, the cursor/windsurf rules, the
    // gemini extension and `.claude/skills/molecule/SKILL.md`, and
    // `mcp/assets/conventions.md` serves the same bytes. An agent that never
    // sees the order re-implements a capability the fleet already ships.
    await run()
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('**Before you build a capability**')
    // The four steps, in order, each naming its own action — a weak model reads
    // the headings as the procedure.
    const order = [
      '**Inspect.**',
      '**Reuse.**',
      '**Adapt.**',
      '**Create only for a reusable gap.**',
    ]
    const positions = order.map((step) => agents.indexOf(step))
    for (const [i, pos] of positions.entries()) {
      expect(pos, `the section names ${order[i]}`).toBeGreaterThan(-1)
    }
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    // The counterexample half: without it, "create a package" reads as the
    // answer for a one-off helper too.
    expect(agents).toMatch(/one-off scripts stay local/)
    // And the discovery command the first step depends on.
    expect(agents).toContain('npx mlcl search <capability>')
  })

  it('the MCP conventions copy is the same text agent init writes', async () => {
    // `molecule-mcp` serves a bundled COPY of the section template, so the two
    // can drift silently: an MCP client would keep reading yesterday's
    // conventions after a host-side edit. This is the invariant mlcl/AGENTS.md
    // states in prose ("update both together"); here it is enforced.
    const { readFileSync } = await import('node:fs')
    const template = readFileSync(
      join(MLCL_ROOT, 'templates', 'shared', 'agent-init-section.md.tpl'),
      'utf8',
    )
    const conventions = readFileSync(join(MLCL_ROOT, 'mcp', 'assets', 'conventions.md'), 'utf8')
    expect(conventions).toBe(template)
  })

  it('writes only AGENTS.md for cursor, which reads it — no duplicate rule file', async () => {
    await mkdir(join(dir, '.cursor'), { recursive: true })
    await run()
    expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toContain('npx mlcl swap')
    expect(existsSync(join(dir, '.cursor', 'rules', 'molecule.mdc'))).toBe(false)
  })

  it('writes the section into a CLAUDE.md that does not import AGENTS.md', async () => {
    await writeFile(join(dir, 'CLAUDE.md'), '# Project rules\n\nUse tabs.\n')
    await run()
    const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf8')
    expect(claude).toContain('# Project rules\n\nUse tabs.')
    expect(claude).toContain('## Molecule')
    expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toContain('## Molecule')
  })

  it('gives a Claude Code project with no CLAUDE.md one that imports AGENTS.md (OLD MUSTFAIL)', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true })
    await run()
    expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
    expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toContain('## Molecule')
    await run()
    expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
  })

  it('leaves a CLAUDE.md that imports AGENTS.md alone (OLD MUSTFAIL: a second copy)', async () => {
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n')
    await run()
    expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
    expect(await readFile(join(dir, 'AGENTS.md'), 'utf8')).toContain('## Molecule')
    expect(existsSync(join(dir, '.claude', 'skills', 'molecule'))).toBe(false)
  })

  it('writes GEMINI.md for gemini, never an extension folder Gemini does not load', async () => {
    await mkdir(join(dir, '.gemini'), { recursive: true })
    await run()
    const gemini = await readFile(join(dir, 'GEMINI.md'), 'utf8')
    expect(gemini).toContain('## Molecule')
    expect(gemini).toContain('npx mlcl create <name> --template <slug> --no-interactive')
    expect(existsSync(join(dir, '.gemini', 'extensions'))).toBe(false)
  })

  it('--global writes the agent-wide file, and refuses an agent that has none', async () => {
    const home = await mkdtemp(join(tmpdir(), 'mlcl-agent-init-home-'))
    const prevHome = process.env.HOME
    process.env.HOME = home
    try {
      await run(['--agent', 'claude-code', '--global'])
      expect(await readFile(join(home, '.claude', 'CLAUDE.md'), 'utf8')).toContain('## Molecule')
      await run(['--agent', 'gemini', '--global'])
      expect(await readFile(join(home, '.gemini', 'GEMINI.md'), 'utf8')).toContain('## Molecule')
      await expect(run(['--agent', 'cursor', '--global'])).rejects.toThrow(/--global is supported/)
      expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false)
    } finally {
      process.env.HOME = prevHome
      await rm(home, { recursive: true, force: true })
    }
  })

  it('detects codex via .codex marker and relies on AGENTS.md alone', async () => {
    await mkdir(join(dir, '.codex'), { recursive: true })
    const cmd = await run()
    expect(cmd).toBeDefined()
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
  })

  it('writes Zed’s section into the file it reads and adds no AGENTS.md that would replace it (OLD MUSTFAIL)', async () => {
    await writeFile(join(dir, 'CLAUDE.md'), '# house rules\n')
    await run(['--agent', 'zed'])
    const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf8')
    expect(claude).toMatch(/^# house rules\n/)
    expect(claude).toContain('## Molecule')
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false)
  })

  it('detects Trae and Continue projects and writes the always-on rule files they read', async () => {
    await mkdir(join(dir, '.trae'), { recursive: true })
    await run()
    const trae = await readFile(join(dir, '.trae', 'rules', 'molecule.md'), 'utf8')
    expect(trae).toMatch(/^---\nalwaysApply: true\n---\n\n## Molecule\n/)
    await rm(join(dir, '.trae'), { recursive: true })
    await rm(join(dir, 'AGENTS.md'))
    await mkdir(join(dir, '.continue'), { recursive: true })
    await run()
    const rule = await readFile(join(dir, '.continue', 'rules', 'molecule.md'), 'utf8')
    expect(rule).toMatch(/^---\nname: Molecule\nalwaysApply: true\n---\n\n## Molecule\n/)
    // Continue's CLI reads only the first of AGENTS.md, CLAUDE.md, …: none is created.
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false)
  })

  it('--global writes the rules file of every agent that has one', async () => {
    const home = await mkdtemp(join(tmpdir(), 'mlcl-agent-init-home-'))
    const prevHome = process.env.HOME
    const prevXdg = process.env.XDG_CONFIG_HOME
    process.env.HOME = home
    delete process.env.XDG_CONFIG_HOME
    try {
      for (const [agent, path] of [
        ['zed', ['.config', 'zed', 'AGENTS.md']],
        ['crush', ['.config', 'crush', 'CRUSH.md']],
        ['cline', ['Documents', 'Cline', 'Rules', 'molecule.md']],
        ['junie', ['.junie', 'AGENTS.md']],
        ['continue', ['.continue', 'rules', 'molecule.md']],
        ['goose', ['.config', 'goose', '.goosehints']],
      ] as const) {
        await run(['--agent', agent, '--global'])
        expect(await readFile(join(home, ...path), 'utf8'), agent).toContain('## Molecule')
      }
      await expect(run(['--agent', 'trae', '--global'])).rejects.toThrow(/--global is supported/)
    } finally {
      process.env.HOME = prevHome
      if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME
      else process.env.XDG_CONFIG_HOME = prevXdg
      await rm(home, { recursive: true, force: true })
    }
  })
})
