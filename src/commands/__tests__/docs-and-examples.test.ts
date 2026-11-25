/**
 * `mlcl docs` and `mlcl examples`: how an agent in any harness reads a package's docs and finds a
 * working example slice, the way the Molecule harness's `read_molecule_doc` and `find_example`
 * tools do.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { format, stripVTControlCharacters } from 'node:util'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { PACKUMENT_README_LIMIT, registryFetch } from '../../lib/__tests__/helpers/npm-registry.js'
import Docs from '../docs.js'
import Examples from '../examples.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let config: Config
beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})

const cwd = process.cwd()
const dirs: string[] = []
afterEach(() => {
  process.chdir(cwd)
  vi.unstubAllGlobals()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Run a real command; return what it printed and how it ended. */
async function run(
  command: typeof Docs | typeof Examples,
  argv: string[],
): Promise<{ out: string; exit: number }> {
  let out = ''
  const log = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    out += `${format(...args)}\n`
  })
  let exit = 0
  try {
    await command.run(argv, config)
  } catch (error) {
    const code = (error as { oclif?: { exit?: number } }).oclif?.exit
    if (code === undefined) throw error
    exit = code
  } finally {
    log.mockRestore()
  }
  return { out: stripVTControlCharacters(out), exit }
}

/** A project with one installed package whose README is `readme`. */
function project(readme: string): string {
  const root = mkdtempSync(join(tmpdir(), 'mlcl-docs-'))
  dirs.push(root)
  const pkg = join(root, 'node_modules', '@molecule', 'api-demo')
  mkdirSync(join(pkg, 'dist'), { recursive: true })
  writeFileSync(join(pkg, 'README.md'), readme)
  writeFileSync(
    join(pkg, 'dist', 'index.d.ts'),
    'export declare function demoQuery(table: string): Promise<unknown[]>\n',
  )
  mkdirSync(join(root, 'api'), { recursive: true })
  return root
}

const README = `# @molecule/api-demo\n\nDemo overview.\n\n## API\n\n#### \`demoQuery(table)\`\n\nRuns the demo query.\n\n## Injection Notes\n\nWire it first.\n`

describe('mlcl docs', () => {
  it('reads the installed copy from a workspace below the project root, one section at a time', async () => {
    process.chdir(join(project(README), 'api'))
    const { out, exit } = await run(Docs, ['@molecule/api-demo', '--section', 'demoQuery'])
    expect(exit).toBe(0)
    expect(out).toContain('# @molecule/api-demo (installed copy)')
    expect(out).toContain('Runs the demo query.')
    expect(out).not.toContain('Wire it first.')
  })

  it('searches the type declarations of the installed copy', async () => {
    process.chdir(project(README))
    const { out } = await run(Docs, ['api-demo', '--search', 'demoQuery'])
    expect(out).toContain('dist/index.d.ts')
  })

  it('reads the published README from npm when the package is not installed', async () => {
    process.chdir(project(README))
    const published = { readme: '# @molecule/api-other\n\nFrom npm.\n', version: '1.2.3' }
    const fetch = vi.fn(registryFetch(published))
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('npm_config_registry', '')
    const { out, exit } = await run(Docs, ['api-other'])
    expect(exit).toBe(0)
    expect(fetch.mock.calls.map((call) => String(call[0]))).toEqual([
      'https://registry.npmjs.org/@molecule%2Fapi-other/latest',
      'https://registry.npmjs.org/@molecule/api-other/-/api-other-1.2.3.tgz',
    ])
    expect(out).toContain('# @molecule/api-other (npm, 1.2.3)')
    expect(out).toContain('From npm.')
    // Under npm or npx the registry npm is configured with answers (a company mirror, a local one).
    // A new directory: npm's answer is kept per directory for the life of the process.
    process.chdir(project(README))
    const local = vi.fn(registryFetch(published, 'http://127.0.0.1:4873/'))
    vi.stubGlobal('fetch', local)
    vi.stubEnv('npm_config_registry', 'http://127.0.0.1:4873')
    expect((await run(Docs, ['api-other'])).out).toContain('From npm.')
    expect(local.mock.calls[0]?.[0]).toBe('http://127.0.0.1:4873/@molecule%2Fapi-other/latest')
    vi.unstubAllEnvs()
  })

  // Scaffold eval, 2026-11-23: npm cuts a packument's `readme` at 65,536 characters, so
  // `mlcl docs @molecule/app-react --section useLogin` (README 123 kB, the section at 94 kB) failed
  // and Codex read the package's dist files instead.
  it('reads a long published README whole, from the tarball', async () => {
    process.chdir(project(README))
    const filler = `${'filler line\n'.repeat(Math.ceil(PACKUMENT_README_LIMIT / 12) + 100)}`
    const readme = `# @molecule/api-long\n\nLong.\n\n## API\n\n${filler}\n#### \`lateFunction()\`\n\nPast the cut.\n`
    expect(readme.length).toBeGreaterThan(PACKUMENT_README_LIMIT)
    vi.stubGlobal('fetch', vi.fn(registryFetch({ readme })))
    vi.stubEnv('npm_config_registry', '')
    const { out, exit } = await run(Docs, ['api-long', '--section', 'lateFunction'])
    expect(exit).toBe(0)
    expect(out).toContain('Past the cut.')
    vi.unstubAllEnvs()
  })

  it('reads an unquoted section name of several words as one section (OLD MUSTFAIL)', async () => {
    // `--section Quick Start` without quotes reached the command as a second package "Start", and
    // it exited 2 (harness eval `add`, 2026-11-25, Codex).
    process.chdir(project(README))
    const { out, exit } = await run(Docs, ['@molecule/api-demo', '--section', 'Injection', 'Notes'])
    expect(exit).toBe(0)
    expect(out).toContain('Wire it first.')
    expect(out).not.toContain('Runs the demo query.')
  })

  it('joins a lowercase word that names no package, and refuses a section with no package', async () => {
    // glm-5.4 review, 2026-11-25: `--section Editing translations` read a package "translations", and
    // `mlcl docs --section Quick Start` printed nothing and exited 0.
    process.chdir(project(README))
    const lower = await run(Docs, ['api-demo', '--section', 'Injection', 'notes'])
    expect(lower.exit).toBe(0)
    expect(lower.out).toContain('Wire it first.')
    const none = await run(Docs, ['--section', 'Quick', 'Start'])
    expect(none.exit).toBe(2)
  })

  it('counterexample: a package name after the section is still a package', async () => {
    process.chdir(project(README))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    )
    const { out, exit } = await run(Docs, ['--section', 'demoQuery', 'api-demo', 'api-missing'])
    expect(exit).toBe(1)
    expect(out).toContain('Runs the demo query.')
    expect(out).toContain('npm has no README')
  })

  it('exits 1 for a missing section or package, and 2 for a name that is not a package name', async () => {
    process.chdir(project(README))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 })),
    )
    expect((await run(Docs, ['api-demo', '--section', 'nothing'])).exit).toBe(1)
    const missing = await run(Docs, ['api-missing'])
    expect(missing.exit).toBe(1)
    expect(missing.out).toContain('npm has no README')
    expect((await run(Docs, ['../escape'])).exit).toBe(2)
  })
})

describe('mlcl examples', () => {
  it('ranks the slices for a plain-words feature, with the slug to print', async () => {
    const { out } = await run(Examples, ['let', 'people', 'log', 'in', 'with', 'Google'])
    expect(out).toContain('auth/oauth-google-login')
    expect(out).not.toContain('compound/audit-log')
    expect(out).toContain('npx mlcl examples auth/oauth-google-login')
  })

  it("prints a slice's README and file list, and one file", async () => {
    const slice = await run(Examples, ['auth/oauth-google-login'])
    expect(slice.out).toContain('# OAuth: Sign in with Google')
    expect(slice.out).toContain('  api/bonds/oauth-google.ts')
    const file = await run(Examples, [
      'auth/oauth-google-login',
      '--file',
      'api/bonds/oauth-google.ts',
    ])
    expect(file.out).toContain('@molecule/api-oauth-google')
  })

  it('refuses a file outside the slice', async () => {
    const { exit } = await run(Examples, ['auth/oauth-google-login', '--file', '../../INDEX.md'])
    expect(exit).toBe(2)
  })

  it('says so when nothing matches, and points at search', async () => {
    const { out, exit } = await run(Examples, ['3d', 'printer', 'farm', 'telemetry'])
    expect(exit).toBe(0)
    expect(out).toContain('No example slice matched')
    expect(out).toContain('npx mlcl search <capability>')
  })

  it('lists every slice with no query', async () => {
    const list = JSON.parse((await run(Examples, ['--json'])).out) as Array<{ slug: string }>
    expect(list.length).toBeGreaterThan(20)
    expect(list.map((slice) => slice.slug)).toContain('auth/oauth-google-login')
  })
})
