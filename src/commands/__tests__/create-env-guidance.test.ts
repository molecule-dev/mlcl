/**
 * `mlcl create` lists only the environment variables the developer still has to set: the
 * required ones it left empty, with the file that holds them.
 *
 * It used to print every declared secret as "Required environment variables" and to say
 * "Generate JWT keys: openssl genrsa …" whenever a JWT package was in. The scaffold writes the JWT
 * key pair into `api/.env` itself, gives SQLITE_PATH a default, and the CORS origins are optional.
 * In the 2026-11-23 scaffold eval, Claude passed the lines on as fact: "Before `npm run dev`: the
 * JWT keys and `.env` values aren't set. Generate the keys with `openssl genrsa …`".
 *
 * Runs the REAL oclif command against a temp directory, with `--skip-install` and the inject child
 * replaced (a project with no installed package cannot be injected).
 *
 * @module
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const AUTH = [
  '@molecule/api-resource-user',
  '@molecule/api-jwt-jsonwebtoken',
  '@molecule/api-password-bcrypt',
  '@molecule/api-database-sqlite',
  '@molecule/app-auth',
]

describe('mlcl create — environment guidance', () => {
  let dir: string
  let prevCwd: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-create-env-guidance-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Scaffold a full-stack React app with the given packages and collect what it printed.
   *
   * @param packages - The `--packages` list.
   * @param extra - More flags.
   * @returns Every line printed to stdout.
   */
  async function create(packages: string[], extra: string[] = []): Promise<string[]> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        'proj',
        '--type',
        'full-stack',
        '--framework',
        'react',
        '--packages',
        packages.join(','),
        '--no-interactive',
        '--skip-install',
        ...extra,
      ],
      config,
    )
    const printed: string[] = []
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation((message) => {
      printed.push(String(message ?? ''))
    })
    vi.spyOn(cmd, 'logToStderr').mockImplementation(() => undefined)
    vi.spyOn(cmd as unknown as { runInject: () => Promise<void> }, 'runInject').mockResolvedValue(
      undefined,
    )
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      await cmd.run()
    } finally {
      write.mockRestore()
    }
    return printed
  }

  it('asks for nothing the scaffold generated, defaulted or left optional', async () => {
    const printed = (await create(AUTH)).join('\n')

    expect(printed).not.toMatch(/openssl|Generate JWT/i)
    expect(printed).not.toContain('Required environment variables')
    expect(printed).not.toContain('Set the required variables')
    // The keys it no longer asks for are really in the file.
    const env = await readFile(join(dir, 'proj', 'api', '.env'), 'utf-8')
    expect(env).toMatch(/^JWT_PRIVATE_KEY=\S+/m)
    expect(env).toMatch(/^JWT_PUBLIC_KEY=\S+/m)
    expect(env).toMatch(/^SQLITE_PATH=\S+/m)
  })

  it('lists a required variable it could not fill, with its file', async () => {
    const printed = await create([...AUTH, '@molecule/api-payments-stripe'])

    const heading = printed.indexOf('Required environment variables, empty in api/.env:')
    expect(heading).toBeGreaterThan(-1)
    const listed = printed.slice(heading + 1).filter((line) => /^ {2}[A-Z][A-Z0-9_]*$/.test(line))
    expect(listed.map((line) => line.trim())).toEqual([
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ])
    expect(printed).toContain('  # Set the required variables above in api/.env')
  })

  it('reports the same under --json', async () => {
    const printed = await create([...AUTH, '@molecule/api-payments-stripe'], ['--json'])

    const result = JSON.parse(printed.at(-1)!) as { envToSet: Record<string, string[]> }
    expect(result.envToSet).toEqual({ 'api/.env': ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  })
})
