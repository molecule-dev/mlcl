import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { extendAppBonds } from '../extend-app-bonds.js'
import { planInjection, synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'extend-app-bonds-'))
  await mkdir(join(root, 'src/bonds'), { recursive: true })
  await symlink(
    dirname(dirname(fileURLToPath(import.meta.resolve('vitest/package.json')))),
    join(root, 'node_modules'),
  )
})
afterEach(() => rm(root, { recursive: true, force: true }))

/** Execute the emitted startup against its real imported setup boundaries. */
function evaluate(source: string, modules: Record<string, unknown>): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  new Function(
    'require',
    'exports',
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  )((name: string) => modules[name], exports)
  return exports
}

describe('adding a provider to an app that already has startup wiring', () => {
  it('preserves the template exports, custom configuration and async startup through the real synthesizer', async () => {
    const existing = `import { authClient, configureAuth } from './auth.js'
export { authClient }
export const themeProvider = { name: 'custom-theme' }
export async function setupProviders(): Promise<string> {
  await configureAuth({ storageKey: 'custom-session' })
  return 'ready'
}
`
    await writeFile(join(root, 'src/bonds/index.ts'), existing)
    const plan = await planInjection('@molecule/app-query-memory', root)
    const files = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-query-memory'],
      root,
      loadRegistry(),
    )
    const index = files.find(
      (file) => file.targetPath === join(root, 'src/bonds/index.ts'),
    )!.content!
    expect(index).toContain('export { authClient }')
    expect(index).toContain('export async function setupProviders')
    expect(index).toContain('setupAppQueryMemory')
    const calls: unknown[] = []
    const client = { key: 'same-client' }
    const mod = evaluate(index, {
      './auth.js': {
        authClient: client,
        configureAuth: async (input: unknown) => {
          calls.push(input)
        },
      },
      './app-query-memory.js': { setupAppQueryMemory: () => calls.push('query') },
    })
    expect(await (mod.setupProviders as () => Promise<string>)()).toBe('ready')
    expect(mod.authClient).toBe(client)
    expect(mod.themeProvider).toEqual({ name: 'custom-theme' })
    expect(calls).toEqual([{ storageKey: 'custom-session' }, 'query'])
    expect(await readFile(join(root, 'src/bonds/index.ts'), 'utf8')).toBe(existing)
  })

  it('keeps an already wired alias and does not initialize that provider twice', () => {
    const existing = `import { setupQuery as startCache } from './query.js'
export function setupProviders(): void { startCache({ capacity: 7 }) }
`
    const generated = `import { setupQuery } from './query.js'
export function setupProviders(): void { setupQuery() }
`
    const merged = extendAppBonds(existing, generated)
    const calls: unknown[] = []
    const mod = evaluate(merged, {
      './query.js': { setupQuery: (input: unknown) => calls.push(input) },
    })
    ;(mod.setupProviders as () => void)()
    expect(calls).toEqual([{ capacity: 7 }])
    expect(extendAppBonds(merged, generated)).toBe(merged)
  })

  it('avoids local name collisions while preserving tracking object keys and existing exports', () => {
    const existing = `import { authClient } from './custom-auth.js'
export { authClient }
export function setupProviders(): void {}
`
    const generated = `import { authClient } from './added-auth.js'
import { setupTracking } from './tracking.js'
export { authClient }
export function setupProviders(): void { setupTracking({ authClient }) }
`
    const added = { key: 'added' }
    const custom = { key: 'custom' }
    const calls: unknown[] = []
    const merged = extendAppBonds(existing, generated)
    const mod = evaluate(merged, {
      './added-auth.js': { authClient: added },
      './custom-auth.js': { authClient: custom },
      './tracking.js': { setupTracking: (input: unknown) => calls.push(input) },
    })
    ;(mod.setupProviders as () => void)()
    expect(calls).toEqual([{ authClient: added }])
    expect(mod.authClient).toBe(custom)
  })

  it('merges missing names into an existing import without duplicate declarations', () => {
    const merged = extendAppBonds(
      `import { first } from './setups.js'\nexport function setupProviders(): void { first() }`,
      `import { first, second } from './setups.js'\nexport function setupProviders(): void { first(); second() }`,
    )
    const calls: string[] = []
    const mod = evaluate(merged, {
      './setups.js': { first: () => calls.push('first'), second: () => calls.push('second') },
    })
    ;(mod.setupProviders as () => void)()
    expect(calls).toEqual(['first', 'second'])
    expect(merged.match(/from ['"]\.\/setups\.js['"]/g)).toHaveLength(1)
  })

  it('still writes the complete index for a fresh app', async () => {
    const plan = await planInjection('@molecule/app-query-memory', root)
    const files = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-query-memory'],
      root,
      loadRegistry(),
    )
    const index = files.find(
      (file) => file.targetPath === join(root, 'src/bonds/index.ts'),
    )!.content!
    expect(index).toContain('export function setupProviders(): void')
    expect(index).toContain('  setupAppQueryMemory()')
  })
})
