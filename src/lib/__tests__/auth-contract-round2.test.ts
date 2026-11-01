import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthClientConfig, createJWTAuthClient } from '@molecule/app-auth'

import { authContractFromOpenApi } from '../auth-contract.js'
import { copyTemplateFiles } from '../scaffold.js'

const json = (schema: unknown): Record<string, unknown> => ({
  content: { 'application/json': { schema } },
})
interface TestOperation {
  operationId?: string
  requestBody?: unknown
  responses?: Record<string, unknown>
}
type TestPath = Record<string, TestOperation | undefined>

const operation = (operationId: string, response: unknown, request?: unknown): TestOperation => ({
  operationId,
  ...(request ? { requestBody: json(request) } : {}),
  responses: { '200': json(response) },
})
const credentials = { type: 'object', properties: { email: {}, password: {} } }
const user = { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } }
const ok = { type: 'object', properties: { ok: { type: 'boolean' } } }

function document(): Record<string, unknown> {
  const response = { type: 'object', properties: { accessToken: { type: 'string' }, user } }
  return {
    openapi: '3.1.0',
    info: { title: 'Member Directory', version: '1.0.0' },
    security: [{ bearer: [] }],
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    paths: {
      '/v2/members/sign-in': { post: operation('login', response, credentials) },
      '/v2/members': { post: operation('register', response, credentials) },
      '/v2/members/current': { get: operation('currentUser', response) },
      '/v2/members/{id}': { patch: operation('updateProfile', response, user) },
      '/v2/password/forgot': { post: operation('forgotPassword', ok) },
      '/v2/password/reset': { post: operation('resetPassword', ok) },
      '/v2/password/change': { post: operation('changePassword', ok) },
    },
  }
}

function pathsOf(value: Record<string, unknown>): Record<string, TestPath> {
  return value.paths as Record<string, TestPath>
}

interface EvaluatedConfig {
  baseURL: string
  authScheme: string
  loginEndpoint: string
  registerEndpoint: string
  logoutEndpoint?: string
  currentUserEndpoint: string
  changePasswordEndpoint: string | ((user: { id: string }) => string)
  changePasswordMethod?: 'POST' | 'PATCH'
  storage?: 'memory'
  cookieRestore?: 'always'
  autoRefresh: boolean
  mapAuthResponse?: (data: unknown) => Record<string, unknown>
}

function evaluate(source: string): EvaluatedConfig {
  const file = ts.createSourceFile('config.ts', source, ts.ScriptTarget.Latest, true)
  const declaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => item.name.getText(file) === 'authConfig')
  const js = ts.transpileModule(`const config = ${declaration!.initializer!.getText(file)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function('API_BASE_URL', `${js}; return config`)('/api') as EvaluatedConfig
}

async function generate(
  value: Record<string, unknown>,
): Promise<{ root: string; config: EvaluatedConfig }> {
  const root = await mkdtemp(join(tmpdir(), 'mlcl-auth-round2-'))
  const contract = authContractFromOpenApi(value)
  await copyTemplateFiles(root, 'react', 'contract-transport', {
    AUTH_CONTRACT_JSON: JSON.stringify(contract),
  })
  return { root, config: evaluate(await readFile(join(root, 'src/config.ts'), 'utf8')) }
}

const roots: string[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('round-two API contract transport', () => {
  it('preserves two-factor challenges in enveloped and sibling response mappers', async () => {
    const enveloped = document()
    pathsOf(enveloped)['/v2/members/sign-in']!.post = operation(
      'login',
      {
        type: 'object',
        properties: {
          session: {
            type: 'object',
            properties: { id: { type: 'string' }, sessionToken: { type: 'string' } },
          },
        },
      },
      credentials,
    )
    const sibling = document()
    pathsOf(sibling)['/v2/members/sign-in']!.post = operation(
      'login',
      { type: 'object', properties: { token: { type: 'string' }, user } },
      credentials,
    )
    for (const value of [enveloped, sibling]) {
      const { root, config } = await generate(value)
      roots.push(root)
      expect(
        config.mapAuthResponse?.({ twoFactorRequired: true, challengeId: 'second-factor' }),
      ).toEqual({ twoFactorRequired: true, challengeId: 'second-factor' })
    }
  })

  it('configures a cookie-only, tokenless API with the existing restore policy', async () => {
    const value = document()
    value.components = {
      securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'directory_session' } },
    }
    value.security = [{ session: [] }]
    const response = { type: 'object', properties: { user } }
    pathsOf(value)['/v2/members/sign-in']!.post = operation('login', response, credentials)
    const { root, config } = await generate(value)
    roots.push(root)
    expect(config).toMatchObject({ storage: 'memory', cookieRestore: 'always' })
    expect(config.mapAuthResponse?.({ user: { id: 'member-1' } })).toEqual({
      user: { id: 'member-1' },
    })
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ user: { id: 'member-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetch)
    const client = createJWTAuthClient(config as unknown as AuthClientConfig)
    await client.initialize()
    expect(client.getState().authenticated).toBe(true)
    expect(client.getAccessToken()).toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v2/members/current',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('keeps an accepted PATCH change-password method end to end', async () => {
    const value = document()
    const route = pathsOf(value)['/v2/password/change']!
    route.patch = route.post
    delete route.post
    const { root, config } = await generate(value)
    roots.push(root)
    expect(config.changePasswordMethod).toBe('PATCH')
  })

  it('resolves a resource password route from the signed-in account id', async () => {
    const value = document()
    const change = pathsOf(value)['/v2/password/change']!.post
    delete pathsOf(value)['/v2/password/change']
    pathsOf(value)['/v2/members/{id}/password'] = { patch: change }
    const { root, config } = await generate(value)
    roots.push(root)
    expect(typeof config.changePasswordEndpoint).toBe('function')
    expect((config.changePasswordEndpoint as (user: { id: string }) => string)({ id: 'a/b' })).toBe(
      '/v2/members/a%2Fb/password',
    )
    expect(config.changePasswordMethod).toBe('PATCH')
  })

  it('uses a declared logout operation instead of the built-in route', async () => {
    const value = document()
    pathsOf(value)['/v2/members/logout'] = { post: operation('logout', ok) }
    const { root, config } = await generate(value)
    roots.push(root)
    expect(config.logoutEndpoint).toBe('/v2/members/logout')
    const calls: Array<{ url: string; method: string }> = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET' })
      return new Response(JSON.stringify({ accessToken: 'token', user: { id: 'member-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    const client = createJWTAuthClient({
      ...(config as unknown as AuthClientConfig),
      storage: 'memory',
    })
    await client.login({ email: 'member@example.test', password: 'pw' })
    await client.logout()
    expect(calls.at(-1)).toEqual({ url: '/api/v2/members/logout', method: 'POST' })
  })
})
