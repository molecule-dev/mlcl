import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import type { AuthContract } from '../auth-contract.js'
import type { InjectionPlan } from '../injector.js'
import { synthesizeProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const RESOURCE = '@molecule/api-resource-user'

interface TestRequest {
  body?: unknown
  params?: Record<string, string>
}
interface TestResponse {
  statusCode: number
  body: unknown
}
type TestHandler = (
  req: TestRequest,
  res: { locals?: { session?: { userId?: unknown } } },
) => Promise<TestResponse>

function plan(): InjectionPlan {
  const pkg = loadRegistry().find((entry) => entry.name === RESOURCE)!
  return {
    molecule: RESOURCE,
    moleculePackage: pkg,
    files: [],
    dependencies: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

function contract(): AuthContract {
  const route = (
    method: 'get' | 'post' | 'put',
    path: string,
    handler: string,
  ): AuthContract['routes'][number] => ({
    method,
    path,
    handler,
    middlewares: [],
  })
  return {
    origin: 'openapi',
    resourcePackage: RESOURCE,
    scheme: 'Session',
    tokenKey: 'accounts.session.v1',
    routes: [
      route('post', '/accounts', 'create'),
      route('post', '/sessions', 'logIn'),
      route('get', '/sessions/current', 'readSelf'),
      route('put', '/accounts/:id', 'update'),
      route('post', '/password/forgot', 'forgotPassword'),
      route('post', '/password/reset', 'resetPassword'),
      route('post', '/password/change', 'updatePassword'),
    ],
    requestEnvelopes: { login: 'credentials', register: 'account', profile: 'profile' },
    response: { envelope: 'session', accessTokenField: 'sessionToken' },
  }
}

describe('injector consumes the same auth contract as the app', () => {
  let root: string
  beforeEach(async () => {
    disableAI()
    root = await mkdtemp(join(tmpdir(), 'mlcl-inject-auth-contract-'))
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('changes the actual router and wraps the package handlers with working transport adapters', async () => {
    await writeFile(join(root, 'auth-contract.json'), JSON.stringify(contract()))
    const files = await synthesizeProjectFiles([plan()], [RESOURCE], root, undefined, 'express')
    const router = String(
      files.find((file) => file.targetPath.endsWith(join('App', 'router.ts')))!.content,
    )
    expect(router).toContain('verifyMiddleware({ scheme: "Session" })')
    expect(router).toContain('router.post(`/sessions`')
    expect(router).toContain('router.get(`/sessions/current`')
    expect(router).toContain('router.put(`/accounts/:id`')
    expect(router).toContain('router.post(`/password/change`,\n  User.auth,')
    expect(router).not.toContain('router.post(`/users/log-in`')

    const wrapper = String(
      files.find((file) => file.targetPath.endsWith(join('Resource', 'User', 'index.ts')))!.content,
    )
    expect(wrapper).toContain('contractHandlers.logIn(contractResource)')
    expect(wrapper).toContain('"sessionToken"')

    // Execute the generated wrapper against package-shaped raw handlers. The
    // adapter must unwrap credentials and remove the token from the wire user.
    let receivedBody: unknown
    let receivedParams: Record<string, string> | undefined
    const success = async (req: TestRequest): Promise<TestResponse> => {
      receivedBody = req.body
      receivedParams = req.params
      return {
        statusCode: 200,
        body: {
          props: { id: 'u1', email: 'a@b.c' },
          user: { id: 'u1', email: 'a@b.c' },
          accessToken: 'access',
        },
      }
    }
    const handlers = {
      logIn: () => success,
      create: () => success,
      readSelf: () => success,
      update: () => success,
      updatePassword: () => success,
    }
    const js = ts.transpileModule(wrapper, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    const module = {
      exports: {} as { requestHandlerMap: Record<string, TestHandler> },
    }
    const require = (name: string): unknown => {
      if (name === '@molecule/api-resource') {
        return { createRequestHandler: (handler: TestHandler): TestHandler => handler }
      }
      if (name === RESOURCE) {
        return {
          authorization: {},
          createRequestHandlerMap: () => ({}),
          handlers,
          resource: {},
        }
      }
      throw new Error(`Unexpected import ${name}`)
    }
    new Function('require', 'module', 'exports', js)(require, module, module.exports)
    const result = await module.exports.requestHandlerMap.logIn!(
      { body: { credentials: { email: 'a@b.c', password: 'pw' } } },
      {},
    )
    expect(receivedBody).toEqual({ email: 'a@b.c', password: 'pw' })
    expect(result.body).toEqual({
      session: { id: 'u1', email: 'a@b.c', sessionToken: 'access' },
    })
    await module.exports.requestHandlerMap.updatePassword!(
      { body: {}, params: {} },
      { locals: { session: { userId: 'u1' } } },
    )
    expect(receivedParams).toEqual({ id: 'u1' })
  })

  it('keeps the default package router and wrapper when no project contract exists', async () => {
    const files = await synthesizeProjectFiles([plan()], [RESOURCE], root, undefined, 'express')
    const router = String(
      files.find((file) => file.targetPath.endsWith(join('App', 'router.ts')))!.content,
    )
    const wrapper = String(
      files.find((file) => file.targetPath.endsWith(join('Resource', 'User', 'index.ts')))!.content,
    )
    expect(router).toContain('userAuthorization.verifyMiddleware()')
    expect(router).toContain('router.post(`/users/log-in`')
    expect(wrapper).toContain(
      'export const requestHandlerMap = createRequestHandlerMap(createRequestHandler)',
    )
    expect(wrapper).not.toContain('adaptAuthHandler')
  })
})
