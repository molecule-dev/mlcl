/**
 * A project scaffolded on a developer's machine must carry the same agent
 * guidance a molecule-dev sandbox project carries: the canonical shared skills
 * and the framework-scoped `@molecule` package catalog.
 *
 * These drive the REAL oclif command against a temp directory — the flagship
 * `--template` fast path, a custom Vue full-stack build, and an api-only build —
 * so a loader that is never called, a catalog scoped to the wrong stack, or a
 * write that clobbers a user file fails here. The MCP `scaffold_project` tool is
 * a thin argument builder over this same command (`mlcl/mcp/src/server.ts`), so
 * it inherits the delivery; the last case pins that delegation shape.
 *
 * `--skip-install` keeps npm out of it; the scaffold itself writes files only.
 *
 * @module
 */

import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const CANONICAL_SKILL = join(
  MLCL_ROOT,
  'templates',
  '.agents',
  'skills',
  'capability-first',
  'SKILL.md',
)
const MCP_SERVER = join(MLCL_ROOT, 'mcp', 'src', 'server.ts')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-create-agent-skills-'))
  prevCwd = process.cwd()
  process.chdir(dir)
})

afterEach(async () => {
  process.chdir(prevCwd)
  await rm(dir, { recursive: true, force: true })
})

/** Run the real command with its progress output captured instead of printed. */
async function runCreate(argv: string[]): Promise<void> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(argv, config)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  await cmd.run()
}

function readSkill(projectRoot: string, relative: string): string {
  return readFileSync(join(projectRoot, '.agents', 'skills', relative), 'utf8')
}

describe('mlcl create delivers the shared skills and package catalog', () => {
  it('does it for a flagship --template scaffold', async () => {
    await runCreate(['proj', '--template', 'blog', '--skip-install'])
    const projectRoot = join(dir, 'proj')

    // The authored workflow, byte-for-byte — not a summary or a keyword list.
    expect(readSkill(projectRoot, 'capability-first/SKILL.md')).toBe(
      readFileSync(CANONICAL_SKILL, 'utf8'),
    )

    const catalog = readSkill(projectRoot, 'molecule-packages/SKILL.md')
    // `blog` is a React full-stack template, so its catalog is react-scoped and
    // carries both stacks.
    expect(catalog).toMatch(/^# @molecule\/\* packages — react\/full-stack$/m)
    expect(catalog).toContain('`@molecule/api-database`')
    expect(catalog).toContain('@molecule/app-')

    // The corpora are not skills and must not be indexed as such.
    expect(existsSync(join(projectRoot, '.agents', 'skills', 'examples'))).toBe(false)
    expect(existsSync(join(projectRoot, '.agents', 'skills', 'patterns'))).toBe(false)

    // Claude Code discovers project skills from `.claude/skills`.
    expect(lstatSync(join(projectRoot, '.claude')).isSymbolicLink()).toBe(true)
    expect(readlinkSync(join(projectRoot, '.claude'))).toBe('.agents')
    expect(
      readFileSync(join(projectRoot, '.claude', 'skills', 'capability-first', 'SKILL.md'), 'utf8'),
    ).toBe(readFileSync(CANONICAL_SKILL, 'utf8'))

    // The AGENTS.md every harness reads on open points at them.
    expect(readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8')).toContain(
      '.agents/skills/capability-first/SKILL.md',
    )
  })

  it('does it for a custom Vue full-stack scaffold', async () => {
    await runCreate([
      'proj',
      '--type',
      'full-stack',
      '--framework',
      'vue',
      '--packages',
      '@molecule/api-database-postgresql,@molecule/app-vue',
      '--skip-install',
      '--no-interactive',
    ])
    const projectRoot = join(dir, 'proj')

    expect(readSkill(projectRoot, 'capability-first/SKILL.md')).toBe(
      readFileSync(CANONICAL_SKILL, 'utf8'),
    )
    const catalog = readSkill(projectRoot, 'molecule-packages/SKILL.md')
    expect(catalog).toMatch(/^# @molecule\/\* packages — vue\/full-stack$/m)
    expect(catalog).toContain('`@molecule/app-vue`')
    expect(catalog).not.toContain('@molecule/app-oauth-logos-react')
  })

  it('scopes an api-only scaffold to backend packages', async () => {
    await runCreate([
      'proj',
      '--type',
      'api',
      '--packages',
      '@molecule/api-database-postgresql',
      '--skip-install',
      '--no-interactive',
    ])
    const projectRoot = join(dir, 'proj')

    expect(existsSync(join(projectRoot, '.agents', 'skills', 'capability-first', 'SKILL.md'))).toBe(
      true,
    )
    const catalog = readSkill(projectRoot, 'molecule-packages/SKILL.md')
    expect(catalog).toMatch(/^# @molecule\/\* packages — express\/api$/m)
    expect(catalog).toContain('`@molecule/api-database`')
    expect(catalog).not.toContain('`@molecule/app-')
  })

  it('leaves a user-owned skill untouched when scaffolding over it', async () => {
    await runCreate(['proj', '--template', 'blog', '--skip-install'])
    const projectRoot = join(dir, 'proj')
    const skillPath = join(projectRoot, '.agents', 'skills', 'capability-first', 'SKILL.md')
    const edited = `${readFileSync(skillPath, 'utf8')}\n<!-- tuned for this project -->\n`
    const { writeFileSync } = await import('node:fs')
    writeFileSync(skillPath, edited)

    await runCreate(['proj', '--template', 'blog', '--skip-install', '--force'])

    expect(readFileSync(skillPath, 'utf8')).toBe(edited)
  })
})

describe('MCP scaffold_project inherits the delivery', () => {
  it('delivers through the exact argv the MCP tool builds', async () => {
    // `scaffold_project` spawns `mlcl create <name> --no-interactive --json`
    // and forwards the template/skip-install flags. Running that argv here
    // proves the inherited stdio-MCP path without a second implementation.
    await runCreate(['proj', '--no-interactive', '--json', '--template', 'blog', '--skip-install'])
    expect(existsSync(join(dir, 'proj', '.agents', 'skills', 'capability-first', 'SKILL.md'))).toBe(
      true,
    )
    expect(
      existsSync(join(dir, 'proj', '.agents', 'skills', 'molecule-packages', 'SKILL.md')),
    ).toBe(true)
  })

  it('delegates to `mlcl create --no-interactive` instead of re-implementing it', () => {
    const source = readFileSync(MCP_SERVER, 'utf8')
    const at = source.indexOf("server.registerTool(\n  'scaffold_project',")
    expect(at, 'scaffold_project is expected in the MCP server').toBeGreaterThan(0)
    const handler = source.slice(at, source.indexOf('server.registerTool(', at + 10))
    expect(handler, 'the tool must spawn the CLI').toContain("['create', name, '--no-interactive'")
    expect(handler, 'and forward the template/type/framework/packages flags').toContain(
      "args.push('--template', template)",
    )
    // Any skill writing here would be a second delivery path that the local CLI
    // would then not share.
    expect(handler).not.toContain('.agents/skills')
  })
})
