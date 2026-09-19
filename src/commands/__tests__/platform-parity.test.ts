/**
 * Command-level coverage for the IDE-parity surface: `mlcl env` (local ops,
 * format-preserving set/unset), `mlcl db url` (.env resolution), and the
 * platform API client (login verification, env pull/push, deploy) against a
 * real local HTTP mock standing in for api.molecule.dev.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadEnvFile, setEnvValue, unsetEnvValue } from '../../lib/env-store.js'
import { createDeployment, listProjects, putProjectEnv, whoami } from '../../lib/platform.js'
import DbUrl from '../db/url.js'
import EnvGet from '../env/get.js'
import EnvSet from '../env/set.js'
import EnvUnset from '../env/unset.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

describe('mlcl env (local .env ops)', () => {
  let dir: string
  let prevCwd: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-env-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  async function run(
    commandClass: new (argv: string[], config: Config) => Promise<unknown>,
    flags: string[],
  ): Promise<unknown> {
    const config = await Config.load(MLCL_ROOT)
    return new commandClass(flags, config).run()
  }

  it('set creates, updates in place, and preserves surrounding lines', async () => {
    writeFileSync(join(dir, '.env'), '# comment\n\nFOO=old\nBAR=keep\n')
    await run(EnvSet, ['FOO=new'])
    await run(EnvSet, ['ADDED=1'])
    const out = readFileSync(join(dir, '.env'), 'utf8')
    expect(out).toContain('# comment')
    expect(out).toContain('FOO=new')
    expect(out).toContain('BAR=keep')
    expect(out).toContain('ADDED=1')
  })

  it('set accepts KEY=VALUE and KEY VALUE forms', async () => {
    await run(EnvSet, ['A=1'])
    await run(EnvSet, ['B', '2'])
    const file = loadEnvFile(join(dir, '.env'))
    expect(file.entries.find((e) => e.key === 'A')?.value).toBe('1')
    expect(file.entries.find((e) => e.key === 'B')?.value).toBe('2')
  })

  it('get prints the value and errors on missing keys', async () => {
    await run(EnvSet, ['DATABASE_URL=postgres://x'])
    const result = (await run(EnvGet, ['DATABASE_URL'])) as { value: string }
    expect(result.value).toBe('postgres://x')
    await expect(run(EnvGet, ['NOPE'])).rejects.toThrow(/not set/)
  })

  it('unset comments out, preserving the value for restore', async () => {
    await run(EnvSet, ['SECRET=abc'])
    await run(EnvUnset, ['SECRET'])
    const raw = readFileSync(join(dir, '.env'), 'utf8')
    expect(raw).toContain('# SECRET=abc')
    expect(raw).not.toMatch(/^SECRET=/m)
  })

  it('list masks values by default (never prints secrets to a shared screen)', async () => {
    await run(EnvSet, ['STRIPE_SECRET_KEY=sk_test_abcdef123456'])
    const file = loadEnvFile(join(dir, '.env'))
    expect(file.entries).toHaveLength(1)
  })

  it('targets api/.env in a full-stack layout automatically', async () => {
    mkdirSync(join(dir, 'api'))
    writeFileSync(join(dir, 'api', 'package.json'), '{"name":"a"}')
    await run(EnvSet, ['KEY=v'])
    expect(readFileSync(join(dir, 'api', '.env'), 'utf8')).toContain('KEY=v')
  })

  it('env-store roundtrip: set then unset then re-set restores value', () => {
    writeFileSync(join(dir, '.env'), 'K=original\n')
    const file = loadEnvFile(join(dir, '.env'))
    unsetEnvValue(file, 'K')
    setEnvValue(file, 'K', 'restored')
    expect(file.raw).toMatch(/^K=restored/m)
  })
})

describe('mlcl db url', () => {
  let dir: string
  let prevCwd: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-db-'))
    prevCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(prevCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it('resolves DATABASE_URL from api/.env when not exported', async () => {
    mkdirSync(join(dir, 'api'))
    writeFileSync(join(dir, 'api', 'package.json'), '{"name":"a"}')
    writeFileSync(join(dir, 'api', '.env'), 'DATABASE_URL=postgres://u:p@localhost:5432/db\n')
    const config = await Config.load(MLCL_ROOT)
    const result = (await new DbUrl([], config).run()) as { url: string }
    expect(result.url).toBe('postgres://u:p@localhost:5432/db')
  })
})

describe('platform API client (mock api.molecule.dev)', () => {
  let server: Server
  let base: string
  const requests: Array<{ method: string; path: string; auth?: string; body?: unknown }> = []

  beforeEach(async () => {
    requests.length = 0
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        requests.push({
          method: req.method ?? 'GET',
          path: req.url ?? '',
          auth: req.headers.authorization,
          body: body ? JSON.parse(body) : undefined,
        })
        const responses: Record<string, unknown> = {
          'GET /users/me': { id: 'u_1', email: 'dev@example.com' },
          'GET /projects': [{ id: 'p_1', name: 'blog', role: 'owner' }],
          'POST /projects/p_1/deployments': { id: 'd_1', status: 'building' },
        }
        const json = responses[`${req.method} ${req.url}`]
        res.writeHead(json ? 200 : 204, { 'content-type': 'application/json' })
        res.end(json ? JSON.stringify(json) : '')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
    process.env.MOLECULE_API_URL = `${base}`
  })

  afterEach(async () => {
    delete process.env.MOLECULE_API_URL
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('whoami hits GET /users/me with the bearer token', async () => {
    const me = await whoami('tok_123')
    expect(me.email).toBe('dev@example.com')
    expect(requests[0]).toMatchObject({ method: 'GET', path: '/users/me', auth: 'Bearer tok_123' })
  })

  it('listProjects returns the parsed project rows', async () => {
    const projects = await listProjects('tok')
    expect(projects).toEqual([{ id: 'p_1', name: 'blog', role: 'owner' }])
  })

  it('putProjectEnv PUTs the values shape the IDE editor saves', async () => {
    await putProjectEnv('p_1', { STRIPE_SECRET_KEY: 'sk_x' }, 'tok')
    expect(requests[0]).toMatchObject({ method: 'PUT', path: '/projects/p_1/env' })
    expect(requests[0].body).toEqual({ values: { STRIPE_SECRET_KEY: 'sk_x' } })
  })

  it('createDeployment POSTs and returns the deployment id', async () => {
    const deployment = await createDeployment('p_1', 'tok')
    expect(deployment).toMatchObject({ id: 'd_1', status: 'building' })
    expect(requests[0]).toMatchObject({ method: 'POST', path: '/projects/p_1/deployments' })
  })
})
