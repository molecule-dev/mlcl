import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const json = (schema: unknown): Record<string, unknown> => ({
  content: { 'application/json': { schema } },
})
const operation = (
  operationId: string,
  response: unknown,
  request?: unknown,
): Record<string, unknown> => ({
  operationId,
  ...(request ? { requestBody: json(request) } : {}),
  responses: { '200': json(response) },
})
const credentials = { type: 'object', properties: { email: {}, password: {} } }
const session = {
  type: 'object',
  properties: {
    session: {
      type: 'object',
      properties: { id: { type: 'string' }, sessionToken: { type: 'string' } },
    },
  },
}
const ok = { type: 'object', properties: { ok: { type: 'boolean' } } }
const document = {
  openapi: '3.1.0',
  info: { title: 'Accounts API', version: '1.0.0' },
  components: { securitySchemes: { sessionAuth: { type: 'http', scheme: 'Session' } } },
  security: [{ sessionAuth: [] }],
  paths: {
    '/sessions': {
      post: operation('createSession', session, {
        type: 'object',
        properties: { credentials },
      }),
    },
    '/accounts': {
      post: operation('register', session, {
        type: 'object',
        properties: { account: credentials },
      }),
    },
    '/sessions/current': { get: operation('getSession', session) },
    '/accounts/{id}': {
      put: operation('updateProfile', session, {
        type: 'object',
        properties: { profile: { type: 'object', properties: { displayName: {} } } },
      }),
    },
    '/password/forgot': { post: operation('forgotPassword', ok) },
    '/password/reset': { post: operation('resetPassword', ok) },
    '/password/change': { post: operation('changePassword', ok) },
  },
}

function authBlock(source: string): string {
  return /export const authConfig = \{[\s\S]*?\n\}/.exec(source)?.[0] ?? ''
}

describe('mlcl create --template --api-contract', () => {
  let dir: string
  let previous: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-template-auth-'))
    previous = process.cwd()
    process.chdir(dir)
  })
  afterEach(async () => {
    process.chdir(previous)
    await rm(dir, { recursive: true, force: true })
  })

  async function create(name: string, contract = false): Promise<void> {
    const args = [name, '--template', 'blog', '--skip-install']
    if (contract) args.push('--api-contract', join(dir, 'contract.json'))
    const cmd = new Create(args, await Config.load(MLCL_ROOT))
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    await cmd.run()
  }

  it('derives the copied app from the supplied contract and retains cookie security', async () => {
    await writeFile(join(dir, 'contract.json'), JSON.stringify(document))
    await create('contract-template', true)
    const config = await readFile(join(dir, 'contract-template', 'app', 'src', 'config.ts'), 'utf8')
    expect(config).toContain("authScheme: 'Session'")
    expect(config).toContain("loginEndpoint: '/sessions'")
    expect(config).toContain("currentUserEndpoint: '/sessions/current'")
    expect(config).toContain("profileUpdateMethod: 'PUT'")
    expect(config).toContain("storage: 'memory' as const")
    const persisted = await readFile(
      join(dir, 'contract-template', 'api', 'auth-contract.json'),
      'utf8',
    )
    expect(JSON.parse(persisted).resourcePackage).toBe('@molecule/api-resource-user')
  })

  it('leaves the default template auth block byte-identical', async () => {
    await create('default-template')
    const generated = await readFile(
      join(dir, 'default-template', 'app', 'src', 'config.ts'),
      'utf8',
    )
    const source = await readFile(
      join(MLCL_ROOT, 'templates', 'apps', 'blog', 'app', 'src', 'config.ts'),
      'utf8',
    )
    expect(authBlock(generated)).toBe(authBlock(source))
  })
})
