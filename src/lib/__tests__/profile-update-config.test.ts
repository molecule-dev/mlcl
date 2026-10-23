import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getRawRegistry } from '../registry.js'
import { copyTemplateFiles, userProfileUpdateConfig } from '../scaffold.js'

/** Evaluate only the generated pure configuration, without creating a provider. */
function evaluate(fields: string): {
  profileEndpoint: (user: { id: string }) => string
  profileUpdateMethod: string
} {
  const js = ts.transpileModule('const config = {' + fields + '}', {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function('const API_BASE_URL = "/api";' + js + '; return config')() as ReturnType<
    typeof evaluate
  >
}

describe('standard profile transport uses the canonical user resource write contract', () => {
  it('delivers the write transport through the actual generated React config', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mlcl-profile-config-'))
    try {
      await copyTemplateFiles(root, 'react', 'profile-config')
      const content = await readFile(join(root, 'src', 'config.ts'), 'utf8')
      const source = ts.createSourceFile('config.ts', content, ts.ScriptTarget.Latest, true)
      const declaration = source.statements
        .filter(ts.isVariableStatement)
        .flatMap((statement) => [...statement.declarationList.declarations])
        .find((item) => item.name.getText(source) === 'authConfig')
      expect(
        declaration?.initializer && ts.isObjectLiteralExpression(declaration.initializer),
      ).toBe(true)
      const fields = declaration!.initializer!.getText(source).slice(1, -1)
      const config = evaluate(fields)
      const route = getRawRegistry().packages['@molecule/api-resource-user']!.routes!.find(
        (route) => route.handler === 'update',
      )!
      expect(config.profileEndpoint({ id: 'reader/space ?' })).toBe(
        route.path.replace(':id', 'reader%2Fspace%20%3F'),
      )
      expect(config.profileUpdateMethod).toBe(route.method.toUpperCase())
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('binds the actual registry update route, independent of current-user reads', () => {
    const routes = getRawRegistry().packages['@molecule/api-resource-user']!.routes!
    const route = routes.find((route) => route.handler === 'update')!
    const config = evaluate(userProfileUpdateConfig(routes))
    expect(config.profileEndpoint({ id: 'reader/space ?' })).toBe(
      route.path.replace(':id', 'reader%2Fspace%20%3F'),
    )
    expect(config.profileUpdateMethod).toBe(route.method.toUpperCase())
  })
  it('supports another canonical resource path and method without a built-in URL', () => {
    const config = evaluate(
      userProfileUpdateConfig([
        { handler: 'readSelf', path: '/viewer', method: 'get' },
        { handler: 'update', path: '/identities/:id/profile', method: 'put' },
      ]),
    )
    expect(config.profileEndpoint({ id: 'member' })).toBe('/identities/member/profile')
    expect(config.profileUpdateMethod).toBe('PUT')
  })
  it.each([
    [],
    [{ handler: 'update', path: '/accounts/:id', method: 'get' }],
    [{ handler: 'update', path: '/accounts/:other', method: 'patch' }],
    [{ handler: 'update', path: '/accounts/:id/:other', method: 'patch' }],
    [
      { handler: 'update', path: '/accounts/:id', method: 'patch' },
      { handler: 'update', path: '/other/:id', method: 'put' },
    ],
  ])('refuses missing, ambiguous or unbindable write contracts', (routes) => {
    expect(() =>
      userProfileUpdateConfig(routes as Parameters<typeof userProfileUpdateConfig>[0]),
    ).toThrow()
  })
})
