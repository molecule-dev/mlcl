import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  authContractFromOpenApi,
  authContractFromRegistry,
  readOpenApiAuthContract,
  renderAuthContract,
} from '../auth-contract.js'
import { loadRegistry } from '../registry.js'
import { copyTemplateFiles } from '../scaffold.js'

const json = (schema: unknown): Record<string, unknown> => ({
  content: { 'application/json': { schema } },
})
const operation = (response: unknown, request?: unknown): Record<string, unknown> => ({
  ...(request ? { requestBody: json(request) } : {}),
  responses: { '200': json(response) },
})
const credentials = { type: 'object', properties: { email: {}, password: {} } }
const wireSession = {
  type: 'object',
  properties: {
    session: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        displayName: { type: 'string' },
        sessionToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  },
}
const simpleResponse = { type: 'object', properties: { ok: { type: 'boolean' } } }

/** A generic session/account API; no benchmark routes, names or debug globals. */
function contractDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: { title: 'Accounts API', version: '1.0.0' },
    'x-molecule-auth': { tokenKey: 'accounts.session.v1' },
    components: { securitySchemes: { sessionAuth: { type: 'http', scheme: 'Session' } } },
    security: [{ sessionAuth: [] }],
    paths: {
      '/sessions': {
        post: {
          operationId: 'createSession',
          ...operation(wireSession, {
            type: 'object',
            properties: { credentials },
          }),
        },
      },
      '/accounts': {
        post: {
          operationId: 'register',
          ...operation(wireSession, {
            type: 'object',
            properties: { account: credentials },
          }),
        },
      },
      '/sessions/current': { get: { operationId: 'getSession', ...operation(wireSession) } },
      '/accounts/{id}': {
        put: {
          operationId: 'updateProfile',
          ...operation(wireSession, {
            type: 'object',
            properties: { profile: { type: 'object', properties: { displayName: {} } } },
          }),
        },
      },
      '/password/forgot': {
        post: { operationId: 'forgotPassword', ...operation(simpleResponse) },
      },
      '/password/reset': { post: { operationId: 'resetPassword', ...operation(simpleResponse) } },
      '/password/change': {
        post: { operationId: 'changePassword', ...operation(simpleResponse) },
      },
    },
  }
}

function evaluateConfig(source: string): {
  authScheme: string
  tokenKey: string
  loginEndpoint: string
  registerEndpoint: string
  currentUserEndpoint: string
  profileEndpoint: (user: { id: string }) => string
  profileUpdateMethod: string
  forgotPasswordEndpoint: string
  resetPasswordEndpoint: string
  changePasswordEndpoint: string
  requestBody: (kind: 'login' | 'register', payload: Record<string, unknown>) => unknown
  profileRequestBody: (payload: Record<string, unknown>) => unknown
  mapAuthResponse: (data: unknown) => {
    accessToken?: string
    refreshToken?: string
    user: Record<string, unknown>
  }
} {
  const file = ts.createSourceFile('config.ts', source, ts.ScriptTarget.Latest, true)
  const declaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => item.name.getText(file) === 'authConfig')
  const fields = declaration!.initializer!.getText(file).slice(1, -1)
  const js = ts.transpileModule(`const config = {${fields}}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function('API_BASE_URL', `${js}; return config`)('/api') as ReturnType<
    typeof evaluateConfig
  >
}

describe('API-derived app-auth configuration', () => {
  it('keeps the default registry contract byte-identical to the previous generated config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mlcl-default-auth-'))
    try {
      await copyTemplateFiles(root, 'react', 'default-contract')
      const actual = await readFile(join(root, 'src/config.ts'), 'utf8')
      const golden = await readFile(
        new URL('./fixtures/default-auth-config.txt', import.meta.url),
        'utf8',
      )
      expect(actual).toBe(golden)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('delivers a non-default OpenAPI contract through the real app template and working adapters', async () => {
    const contract = authContractFromOpenApi(contractDocument())
    const root = await mkdtemp(join(tmpdir(), 'mlcl-openapi-auth-'))
    try {
      await copyTemplateFiles(root, 'react', 'session-contract', {
        AUTH_CONTRACT_JSON: JSON.stringify(contract),
      })
      const source = await readFile(join(root, 'src/config.ts'), 'utf8')
      expect(source).toContain('The auth bond is configured from the declared API contract')
      const config = evaluateConfig(source)
      expect(config).toMatchObject({
        authScheme: 'Session',
        tokenKey: 'accounts.session.v1',
        loginEndpoint: '/sessions',
        registerEndpoint: '/accounts',
        currentUserEndpoint: '/sessions/current',
        profileUpdateMethod: 'PUT',
        forgotPasswordEndpoint: '/password/forgot',
        resetPasswordEndpoint: '/password/reset',
        changePasswordEndpoint: '/password/change',
      })
      expect(config.profileEndpoint({ id: 'reader/space ?' })).toBe(
        '/accounts/reader%2Fspace%20%3F',
      )
      expect(config.requestBody('login', { email: 'a@b.c', password: 'pw' })).toEqual({
        credentials: { email: 'a@b.c', password: 'pw' },
      })
      expect(config.requestBody('register', { email: 'a@b.c', password: 'pw' })).toEqual({
        account: { email: 'a@b.c', password: 'pw' },
      })
      expect(config.profileRequestBody({ displayName: 'Reader' })).toEqual({
        profile: { displayName: 'Reader' },
      })
      expect(
        config.mapAuthResponse({
          session: {
            id: 'u1',
            email: 'a@b.c',
            displayName: 'Reader',
            sessionToken: 'access',
            refreshToken: 'refresh',
          },
        }),
      ).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 'u1', email: 'a@b.c', displayName: 'Reader' },
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('uses registry auth options together with changed package routes', () => {
    const pkg = loadRegistry().find((entry) => entry.name === '@molecule/api-resource-user')!
    const custom = {
      ...pkg,
      molecule: {
        ...pkg.molecule!,
        authContract: { scheme: 'Session', tokenKey: 'accounts.session.v1' },
      },
      routes: pkg.routes.map((route) =>
        route.handler === 'logIn' ? { ...route, path: '/sessions' } : route,
      ),
    }
    const rendered = renderAuthContract(authContractFromRegistry(custom))
    expect(rendered.routeFields).toContain("authScheme: 'Session'")
    expect(rendered.routeFields).toContain("tokenKey: 'accounts.session.v1'")
    expect(rendered.routeFields).toContain("loginEndpoint: '/sessions'")
    expect(rendered.guidance).toContain('keep it and use the shared HTTP client')
  })

  it('reads a JSON document from the caller-supplied path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mlcl-openapi-file-'))
    try {
      const path = join(root, 'contract.json')
      await writeFile(path, JSON.stringify(contractDocument()))
      const contract = await readOpenApiAuthContract(path)
      expect(contract.origin).toBe('openapi')
      expect(contract.scheme).toBe('Session')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects an incomplete contract instead of silently emitting default auth routes', () => {
    const document = contractDocument()
    delete (document.paths as Record<string, unknown>)['/sessions/current']
    expect(() => authContractFromOpenApi(document)).toThrow(
      'missing the currentUser auth operation',
    )
  })
})
