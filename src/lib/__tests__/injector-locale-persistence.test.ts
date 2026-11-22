/**
 * A generated app's i18n bond saves the chosen locale through the storage provider and restores
 * it, and a storage call that fails never becomes an unhandled rejection.
 *
 * The restore read sat unreturned inside the storage import's `.then`, so when it rejected (no
 * storage provider bonded yet) the trailing `.catch` never saw it. A fresh React app's own
 * bonds test reported two unhandled rejections once it loaded the real storage core
 * (2026-11-22). These checks run the bond file the injector writes for every app.
 */
import process from 'node:process'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

/** The i18n bond the injector writes for an app (its default bond, `i18n-default.ts`). */
function i18nBondSource(): string {
  const files = synthesizeAppProjectFiles([], ['@molecule/app-i18n'], '/app', loadRegistry())
  const bond = files.find((file) => file.targetPath.endsWith('/src/bonds/i18n-default.ts'))
  expect(bond, 'the injector writes src/bonds/i18n-default.ts').toBeDefined()
  return bond!.content
}

/** What the storage core's `get` and `set` do in one run. */
interface Storage {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
}

/** What one run of the bond's setup did. */
interface SetupRun {
  provider: { setLocale: ReturnType<typeof vi.fn> }
  listeners: Array<(locale: string) => void>
  unhandled: unknown[]
}

/**
 * Runs the bond's setup against a stand-in i18n provider and the given storage, then lets every
 * pending promise settle.
 *
 * @param storage - The storage core's `get` and `set`.
 * @returns The provider's calls and every rejection nothing handled.
 */
async function runSetup(storage: Storage): Promise<SetupRun> {
  const listeners: Array<(locale: string) => void> = []
  const provider = {
    getLocale: () => 'en',
    setLocale: vi.fn(async (_locale: string) => {}),
    onLocaleChange: (listener: (locale: string) => void) => listeners.push(listener),
  }
  const modules: Record<string, unknown> = {
    '@molecule/app-i18n': { createSimpleI18nProvider: () => provider, setProvider: () => {} },
    '@molecule/app-storage': storage,
    '../locales/en/ui.js': { ui: {} },
  }
  const compiled = ts.transpileModule(i18nBondSource(), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const unhandled: unknown[] = []
  const record = (reason: unknown): void => {
    unhandled.push(reason)
  }
  process.on('unhandledRejection', record)
  try {
    const exports: Record<string, () => void> = {}
    const load = (name: string): unknown => {
      if (!(name in modules)) throw new Error(`the i18n bond imports ${name}`)
      return modules[name]
    }
    new Function('require', 'exports', compiled.outputText)(load, exports)
    const setup = Object.entries(exports).find(([name]) => name.startsWith('setup'))?.[1]
    expect(setup, 'the bond exports its setup function').toBeTypeOf('function')
    setup!()
    for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setImmediate(resolve))
    for (const listener of listeners) listener('fr')
    for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setImmediate(resolve))
  } finally {
    process.off('unhandledRejection', record)
  }
  return { provider, listeners, unhandled }
}

describe('a fresh app’s i18n bond', () => {
  it('handles a storage read and write that reject (no storage provider bonded)', async () => {
    const noProvider = (): Promise<never> => Promise.reject(new Error('No storage provider bonded'))
    const { provider, unhandled } = await runSetup({ get: noProvider, set: noProvider })
    expect(unhandled).toEqual([])
    expect(provider.setLocale).not.toHaveBeenCalled()
  })

  it('restores a saved locale and saves the next one', async () => {
    const set = vi.fn(async (_key: string, _value: string) => {})
    const { provider, listeners, unhandled } = await runSetup({
      get: async (key) => (key === 'molecule-locale' ? 'de' : null),
      set,
    })
    expect(unhandled).toEqual([])
    expect(provider.setLocale).toHaveBeenCalledWith('de')
    expect(listeners).toHaveLength(1)
    expect(set).toHaveBeenCalledWith('molecule-locale', 'fr')
  })
})
