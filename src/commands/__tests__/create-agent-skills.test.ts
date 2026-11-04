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
async function runCreate(argv: string[]): Promise<string> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(argv, config)
  let output = ''
  vi.spyOn(cmd, 'log').mockImplementation((input) => {
    output += `${String(input ?? '')}\n`
  })
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  await cmd.run()
  return output
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

    // The AGENTS.md every harness reads on open points at them and maps the
    // packages this template actually declares to their configuration.
    const agents = readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('.agents/skills/capability-first/SKILL.md')
    expect(agents).toContain('## Declared capability map')
    expect(agents).toContain('`@molecule/app-auth`')
    expect(agents).toContain('`@molecule/app-http`')
    expect(agents).toContain("authScheme: 'Token'")
    expect(agents).toContain('mapAuthResponse')
    expect(agents).toContain("storage: 'memory'")

    // A copied flagship bond gets the same header as an injected one.
    const authBond = readFileSync(join(projectRoot, 'app/src/bonds/auth-default.ts'), 'utf8')
    expect(authBond).toContain('Declared capability:')
    expect(authBond).toContain('currentUserEndpoint')
    expect(authBond).toContain('profileUpdateMethod')
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
    const agents = readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('## Declared capability map')
    expect(agents).toContain('`@molecule/app-auth`')
    expect(agents).toContain('`@molecule/app-http`')
    expect(agents).toContain('Wired bond: `app/src/bonds/auth-default.ts`')
    expect(agents).toContain('`useAuth()` from `@molecule/app-vue`')
    expect(agents).not.toContain('@molecule/app-react')
    for (const match of agents.matchAll(/Wired bond: `([^`]+)`/g)) {
      expect(existsSync(join(projectRoot, match[1]!)), match[1]).toBe(true)
    }
  })

  it('names the actual app/ HTTP bond in a static scaffold', async () => {
    await runCreate([
      'proj',
      '--type',
      'static',
      '--framework',
      'react',
      '--packages',
      '@molecule/app-http',
      '--skip-install',
      '--no-interactive',
    ])
    const projectRoot = join(dir, 'proj')
    const bond = join(projectRoot, 'app/src/bonds/http-default.ts')
    expect(readFileSync(bond, 'utf8')).toContain('setClient')
    const agents = readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('Wired bond: `app/src/bonds/http-default.ts`')
    expect(agents).toContain('Configure in `app/src/config.ts`')
  })

  it('scopes an api-only scaffold to backend packages', async () => {
    const output = await runCreate([
      'proj',
      '--type',
      'api',
      '--packages',
      '@molecule/api-database-postgresql',
      '--skip-install',
      '--no-interactive',
      '--json',
    ])
    const projectRoot = join(dir, 'proj')

    expect(existsSync(join(projectRoot, '.agents', 'skills', 'capability-first', 'SKILL.md'))).toBe(
      true,
    )
    const catalog = readSkill(projectRoot, 'molecule-packages/SKILL.md')
    expect(catalog).toMatch(/^# @molecule\/\* packages — express\/api$/m)
    expect(catalog).toContain('`@molecule/api-database`')
    expect(catalog).not.toContain('`@molecule/app-')
    const agents = readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8')
    expect(agents).not.toMatch(/^## Declared capability map$/m)
    expect(agents).not.toContain('@molecule/app-auth')
    expect(agents).not.toContain('@molecule/app-http')
    const result = JSON.parse(output) as { capabilityMap?: unknown[] }
    expect(result.capabilityMap).toEqual([])
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
    const output = await runCreate([
      'proj',
      '--no-interactive',
      '--json',
      '--template',
      'blog',
      '--skip-install',
    ])
    const result = JSON.parse(output) as {
      capabilityMap?: Array<{ name: string; configuration: string[]; guidance: string[] }>
    }
    expect(result.capabilityMap?.map((entry) => entry.name)).toEqual([
      '@molecule/app-auth',
      '@molecule/app-http',
      '@molecule/app-routing',
      '@molecule/app-state',
    ])
    const routing = result.capabilityMap?.find((entry) => entry.name === '@molecule/app-routing')
    expect(routing?.guidance.join('\n')).toContain('useListRoute')
    const state = result.capabilityMap?.find((entry) => entry.name === '@molecule/app-state')
    expect(state?.guidance.join('\n')).toContain('useOptimisticValue')
    expect(result.capabilityMap?.[0].configuration.join('\n')).toContain('mapAuthResponse')
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
    expect(handler, 'the tool must spawn the CLI through the shared argv builder').toContain(
      'runCli(scaffoldProjectCliArgs(options), directory)',
    )
    // Any skill writing here would be a second delivery path that the local CLI
    // would then not share.
    expect(handler).not.toContain('.agents/skills')
  })
})
