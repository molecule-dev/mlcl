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
 *  - cursor marker dirs additionally get .cursor/rules/molecule.mdc with rule
 *    frontmatter; claude-code markers get .claude/skills/molecule/SKILL.md
 *    with skill frontmatter;
 *  - the written section carries the load-bearing commands (mlcl create
 *    --no-interactive, search, add --inject, swap) an agent needs in context.
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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

  it('adds a cursor rule when .cursor/ exists', async () => {
    await mkdir(join(dir, '.cursor'), { recursive: true })
    await run()
    const rule = await readFile(join(dir, '.cursor', 'rules', 'molecule.mdc'), 'utf8')
    expect(rule).toMatch(/^---\ndescription: .+\nalwaysApply: true\n---/)
    expect(rule).toContain('npx mlcl swap')
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
  })

  it('adds a claude skill when .claude/ exists', async () => {
    await mkdir(join(dir, '.claude'), { recursive: true })
    await run()
    const skill = await readFile(join(dir, '.claude', 'skills', 'molecule', 'SKILL.md'), 'utf8')
    expect(skill).toMatch(/^---\nname: molecule\ndescription: .+\n---/)
    expect(skill).toContain('node_modules/@molecule/<name>/README.md')
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

  it('adds a gemini extension when .gemini/ exists', async () => {
    await mkdir(join(dir, '.gemini'), { recursive: true })
    await run()
    const ext = await readFile(join(dir, '.gemini', 'extensions', 'molecule', 'GEMINI.md'), 'utf8')
    expect(ext).toContain('# Molecule')
    expect(ext).toContain('npx mlcl create <name> --template <slug> --no-interactive')
  })

  it('adds a windsurf rule when .windsurf/ exists', async () => {
    await mkdir(join(dir, '.windsurf'), { recursive: true })
    await run()
    const rule = await readFile(join(dir, '.windsurf', 'rules', 'molecule.md'), 'utf8')
    expect(rule).toMatch(/^---\ntrigger: always_on\ndescription: .+\n---/)
    expect(rule).toContain('npx mlcl swap')
  })

  it('detects codex via .codex marker and relies on AGENTS.md alone', async () => {
    await mkdir(join(dir, '.codex'), { recursive: true })
    const cmd = await run()
    expect(cmd).toBeDefined()
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
  })
})
