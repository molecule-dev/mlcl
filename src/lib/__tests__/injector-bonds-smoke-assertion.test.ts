/**
 * The app's generated `bonds.test.ts` checked `setupProviders` with
 * `expect(() => setupProviders()).not.toThrow()`. That only sees a synchronous
 * throw: once a project makes `setupProviders` async (98 flagship templates
 * have), a rejected setup passes the test and escapes as an unhandled
 * rejection. The emitted assertion must fail on both, and still pass the
 * synchronous `setupProviders` the generator itself writes.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const plan: InjectionPlan = {
  molecule: '@molecule/app-auth',
  moleculePackage: {
    name: '@molecule/app-auth',
    version: '1.0.0',
    type: 'core',
    routes: [],
    tables: [],
    exports: [],
    path: '/tmp/test-app',
  },
  files: [],
  dependencies: [],
  migrations: [],
  bondSetup: null,
  conflicts: [],
}

/** Returns the generated app bonds smoke test. */
function generatedBondsTest(includeSharedSetup = false): string {
  const molecules = [
    '@molecule/app-auth',
    ...(includeSharedSetup
      ? ['@molecule/app-bonds-default-react', '@molecule/app-i18n-default-react']
      : []),
  ]
  const files = synthesizeAppProjectFiles([plan], molecules, '/tmp/test-app', loadRegistry())
  const bondsTest = files.find((f) => f.targetPath.endsWith('__tests__/bonds.test.ts'))
  expect(bondsTest).toBeDefined()
  return bondsTest!.content
}

/** Returns the emitted setup assertion as a runnable check. */
function emittedSetupAssertion(): (setupProviders: () => unknown) => Promise<unknown> {
  const bondsTest = generatedBondsTest()
  const block = bondsTest.match(
    /it\('setupProviders completes without error'[\s\S]*?\n {2}\}\)/,
  )?.[0]
  expect(block).toBeDefined()
  const assertion = block!
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.includes('setupProviders()') && /^(await )?expect\(/.test(line))
  expect(assertion).toBeDefined()
  const run = new Function('expect', 'setupProviders', `return (async () => { ${assertion} })()`)
  return (setupProviders) => run(expect, setupProviders) as Promise<unknown>
}

describe('generated bonds smoke test: setupProviders assertion', () => {
  const check = emittedSetupAssertion()

  it('passes a synchronous setupProviders, the shape the generator writes', async () => {
    await expect(check(() => undefined)).resolves.toBeUndefined()
  })

  it('passes an async setupProviders that resolves', async () => {
    await expect(check(async () => undefined)).resolves.toBeUndefined()
  })

  it('fails when a synchronous setupProviders throws', async () => {
    await expect(
      check(() => {
        throw new Error('bond wiring failed')
      }),
    ).rejects.toThrow()
  })

  it('fails when an async setupProviders rejects', async () => {
    await expect(
      check(async () => {
        throw new Error('bond wiring failed')
      }),
    ).rejects.toThrow()
  })

  it('mocks shared setup boundaries once in both linked and npm-installed layouts', () => {
    const content = generatedBondsTest(true)

    expect(content.match(/vi\.mock\('@molecule\/app-bonds-default-react'/g)).toHaveLength(1)
    expect(content.match(/vi\.mock\('@molecule\/app-i18n-default-react'/g)).toHaveLength(1)
    expect(content).toContain('addEventListener: vi.fn()')
  })

  it('does not mock shared packages a minimal project does not import', () => {
    const content = generatedBondsTest()

    expect(content).not.toContain("vi.mock('@molecule/app-bonds-default-react'")
    expect(content).not.toContain("vi.mock('@molecule/app-i18n-default-react'")
  })
})
