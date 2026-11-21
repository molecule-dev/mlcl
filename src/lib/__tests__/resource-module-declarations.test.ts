/**
 * A generated API resource module (`src/App/Resource/<Name>/index.ts`) opens with the service
 * declarations its package lists in `declare`.
 *
 * P381–P382: most runs read these modules about a minute in, then looked up
 * `node_modules/@molecule/api-resource-*\/dist/*.d.ts` for `createAccount`, `signIn` and the
 * article, comment and follow services anyway (api-resource-user: 6 of 8 runs, 20 calls). The
 * header puts those signatures in the file they already read. These cases pin the header, its
 * absence for a resource that lists nothing, and the rule that every API resource lists the
 * functions its service module exports.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import type { InjectionPlan } from '../injector.js'
import { synthesizeProjectFiles } from '../injector.js'
import { getRawRegistry, loadRegistry } from '../registry.js'

const mlclRoot = join(import.meta.dirname, '..', '..', '..')
let root: string

beforeEach(async () => {
  disableAI()
  root = await mkdtemp(join(tmpdir(), 'resource-declarations-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function plan(name: string): InjectionPlan {
  const pkg = loadRegistry().find((entry) => entry.name === name)
  if (!pkg) throw new Error(`${name} is not in the registry`)
  return {
    molecule: name,
    moleculePackage: pkg,
    files: [],
    dependencies: [],
    migrations: [],
    bondSetup: null,
    conflicts: [],
  }
}

async function wrapperOf(name: string, resource: string): Promise<string> {
  const injection = plan(name)
  const entry = injection.moleculePackage!
  // Exercise the legacy wrapper path explicitly for packages without editable
  // Express source, independently of the current default for User.
  injection.moleculePackage = {
    ...entry,
    molecule: { ...entry.molecule, expressRouter: undefined },
  }
  const files = await synthesizeProjectFiles([injection], [name], root, undefined, 'express')
  const wrapper = files.find((file) =>
    file.targetPath.endsWith(join('Resource', resource, 'index.ts')),
  )
  if (wrapper?.content === undefined) throw new Error(`no ${resource} resource module generated`)
  return wrapper.content
}

describe('generated resource module declarations', () => {
  it('opens the user module with the account service and the types it returns', async () => {
    const wrapper = await wrapperOf('@molecule/api-resource-user', 'User')
    expect(wrapper.startsWith('/**\n * @molecule/api-resource-user\n')).toBe(true)
    expect(wrapper).toContain(
      ' *   function createAccount(input: CreateAccountInput, context: SessionContext',
    )
    expect(wrapper).toContain(' *   function signIn(input: SignInInput, context: SessionContext')
    // The union a caller branches on, and what each branch holds.
    expect(wrapper).toContain(' *   type AccountResult = AccountSession | AccountFailure;')
    expect(wrapper).toContain(' *   interface AccountSession {')
    expect(wrapper).toContain(' *   interface AccountFailure {')
    // The comment is one block, then the module code as before.
    const end = wrapper.indexOf(' */\n\n')
    expect(wrapper.indexOf('*/')).toBe(end + 1)
    expect(wrapper.slice(end + 5)).toContain(
      'export const requestHandlerMap = createRequestHandlerMap(createRequestHandler)',
    )
  })

  it('writes no header for a resource that lists nothing', async () => {
    expect(getRawRegistry().packages['@molecule/api-resource-tag']?.declare).toBeUndefined()
    const wrapper = await wrapperOf('@molecule/api-resource-tag', 'Tag')
    expect(wrapper).not.toContain('/**')
  })
})

describe('API resource declare lists', () => {
  it('lists every function an API resource service module exports', () => {
    // molecule is a sibling checkout (data only); a standalone mlcl clone has nothing to scan,
    // and the workspace run covers it.
    const moleculeRoot = join(mlclRoot, '..', 'molecule')
    if (!existsSync(join(moleculeRoot, 'packages'))) return
    const packages = getRawRegistry().packages
    let checked = 0
    for (const [name, entry] of Object.entries(packages)) {
      if (entry.type !== 'resource' || entry.stack !== 'api') continue
      const src = join(moleculeRoot, entry.path, 'src')
      const service = join(src, 'service.ts')
      const files = existsSync(service)
        ? [service]
        : ['accounts.ts', 'profiles.ts'].map((file) => join(src, file)).filter(existsSync)
      const exported = new Set(entry.exports)
      const functions = files.flatMap((file) =>
        ts
          .createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
          .statements.flatMap((statement) => {
            const isExported =
              ts.canHaveModifiers(statement) &&
              (ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
            if (!isExported) return []
            if (ts.isFunctionDeclaration(statement) && statement.name) return [statement.name.text]
            if (!ts.isVariableStatement(statement)) return []
            return statement.declarationList.declarations.flatMap((d) =>
              ts.isIdentifier(d.name) &&
              d.initializer &&
              (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))
                ? [d.name.text]
                : [],
            )
          }),
      )
      const service_ = functions.filter((fn) => exported.has(fn))
      if (service_.length === 0) continue
      checked++
      const missing = service_.filter((fn) => !(entry.declare ?? []).includes(fn))
      expect(missing, `${name} declare`).toEqual([])
    }
    expect(checked).toBeGreaterThanOrEqual(30)
  })
})
