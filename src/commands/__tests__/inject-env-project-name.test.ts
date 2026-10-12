/**
 * `mlcl inject` appends the injected packages' secrets to the project's `.env`,
 * and the `DATABASE_URL` it writes carries the project's name in the db slot —
 * a name read from the TARGET project's own `package.json`. A manifest name
 * carrying a newline therefore wrote whatever followed it as NEW `.env`
 * assignments (`{"name": "app\nMOLECULE_ACTIVITY_URL=https://evil.example"}`
 * pointed the scaffolded activity sink at an attacker's endpoint for every
 * process that sources the file), and `$`/regex metacharacters reached the
 * db-slot replacement as replacement patterns and a dynamic RegExp.
 *
 * Runs the REAL oclif command against a temp project whose manifest name is
 * hostile (`execa` mocked, `collectSecrets` pinned to one DATABASE_URL so the
 * append has something to write) and asserts the file that comes back carries
 * no assignment the name could inject. The sanitize helper itself is pinned
 * unit-side at the bottom.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { execa } from 'execa'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Inject, { envProjectName } from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))
const execaMock = vi.mocked(execa)

// The append must have something to write regardless of what the registry
// declares for the planned packages — one DATABASE_URL with the generic
// `myapp` slot is the deterministic fixture.
vi.mock('../../lib/features.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    collectSecrets: () => [{ name: 'DATABASE_URL', default: 'postgres://localhost:5432/myapp' }],
  }
})

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

/** A manifest name whose newline and `=` would be assignments of their own. */
const HOSTILE_NAME = 'app\nMOLECULE_ACTIVITY_URL=https://evil.example\n'

let dir: string | null = null

afterEach(async () => {
  execaMock.mockReset()
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function writeApiProject(name: string): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-inject-envname-'))
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: { '@molecule/api-database-postgresql': '1.0.5' },
      devDependencies: { '@molecule/api-database-pglite': '1.0.3' },
    }),
  )
  // A pre-existing .env takes the append path through its "existing file"
  // branch — the one a real re-inject walks.
  await writeFile(join(dir, '.env'), 'EXISTING=1\n')
  return dir
}

describe('mlcl inject writes a manifest name into .env as a value, never as assignments', () => {
  it('a name with a newline adds no env line the name dictated', async () => {
    const project = await writeApiProject(HOSTILE_NAME)
    execaMock.mockResolvedValue({ stdout: '', stderr: '' } as never)

    const config = await Config.load(MLCL_ROOT)
    const cmd = new Inject(
      ['-m', '@molecule/api-database-pglite', '-p', project, '--no-test', '--no-format', '--no-ai'],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()

    const env = await readFile(join(project, '.env'), 'utf8')
    // The injected assignment must not exist — with the raw name it landed as
    // its own line inside the DATABASE_URL value's newlines.
    expect(env).not.toMatch(/^MOLECULE_ACTIVITY_URL=/m)
    expect(env).not.toContain('https://evil.example')
    // …the append itself still happened.
    expect(env).toMatch(/^DATABASE_URL=/m)
    // …and every assignment line in the file is one of the two the flow owns.
    const assignments = env
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => line.split('=')[0])
    expect(new Set(assignments)).toEqual(new Set(['EXISTING', 'DATABASE_URL']))
  })

  it('a plain name is passed through byte for byte', () => {
    expect(envProjectName('my-blog')).toBe('my-blog')
    expect(envProjectName('app_v2.1')).toBe('app_v2.1')
  })

  it('a hostile name is reduced to characters a db-name slot accepts', () => {
    const safe = envProjectName(HOSTILE_NAME)
    expect(safe).not.toMatch(/[\n\r$()[\]{}?*+|\\^/]/)
    expect(safe.startsWith('app')).toBe(true)
    // Whatever the hostile value carried, the sanitized one is one line.
    expect(safe.includes('\n')).toBe(false)
  })
})
