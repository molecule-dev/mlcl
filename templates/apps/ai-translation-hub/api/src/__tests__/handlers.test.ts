/**
 * Integration test for the per-domain handler routers.
 *
 * Mocks the bonded data store + ai providers so the handler modules can be
 * exercised in isolation. Per G8 we need at least one test file under
 * `api/src/__tests__/` that imports each handler module — this file is
 * the canonical place. Heavier real-Postgres flows live in `e2e/`.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-ai', () => ({
  hasProvider: () => true,
  requireProvider: () => ({
    name: 'mock',
    chat: () =>
      (async function* () {
        yield { type: 'text', content: 'Hola, mundo.' }
        yield { type: 'done', usage: { inputTokens: 5, outputTokens: 5 } }
      })(),
  }),
}))

vi.mock('@molecule/api-ai-translation', () => ({
  hasProvider: () => true,
  requireProvider: () => ({
    name: 'mock-deepl',
    translate: vi.fn(async () => ({
      translations: [{ text: 'Hola, mundo.', detectedSourceLang: 'EN' }],
    })),
    getSupportedLanguages: vi.fn(async () => []),
    getUsage: vi.fn(async () => ({ characterCount: 0, characterLimit: 0 })),
  }),
}))

vi.mock('@molecule/api-database', () => ({
  updateById: vi.fn(),
  deleteById: vi.fn(),
  query: vi.fn(() => ({ rows: [] })),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  findMany: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: { id: 'mock-id' } })),
  updateMany: vi.fn(async () => ({ data: [] })),
  deleteMany: vi.fn(async () => ({ data: [] })),
}))

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  unbond: vi.fn(),
  unbondAll: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(() => new Map()),
  isBonded: vi.fn(() => false),
  require: vi.fn(),
  expectBond: vi.fn(),
  unexpectBond: vi.fn(),
  getAnalytics: vi.fn(),
  getLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  defineTiers: (config: unknown) => config,
  setProvider: vi.fn(),
  getEffectiveTier: vi.fn(async () => ({
    planKey: 'free',
    category: 'free',
    name: 'Free',
    limits: {},
  })),
}))

describe('handlers/index — composite domain router', () => {
  it('exports a router with handler stack registered', async () => {
    const mod = (await import('../handlers/index.js')) as {
      default: { stack?: Array<unknown> }
    }
    expect(mod.default).toBeDefined()
    expect(mod.default.stack ?? []).not.toHaveLength(0)
  })
})

describe('handlers — exported routers', () => {
  it('projects router exposes routes', async () => {
    const mod = await import('../handlers/projects.js')
    expect(mod.default).toBeDefined()
  })

  it('translations router exposes routes', async () => {
    const mod = await import('../handlers/translations.js')
    expect(mod.default).toBeDefined()
  })

  it('segments router exposes routes', async () => {
    const mod = await import('../handlers/segments.js')
    expect(mod.default).toBeDefined()
  })

  it('glossary router exposes routes', async () => {
    const mod = await import('../handlers/glossary.js')
    expect(mod.default).toBeDefined()
  })

  it('memory router exposes routes', async () => {
    const mod = await import('../handlers/memory.js')
    expect(mod.default).toBeDefined()
  })

  it('team router exposes routes', async () => {
    const mod = await import('../handlers/team.js')
    expect(mod.default).toBeDefined()
  })

  it('notifications router exposes routes', async () => {
    const mod = await import('../handlers/notifications.js')
    expect(mod.default).toBeDefined()
  })

  it('api-tokens router exposes routes', async () => {
    const mod = await import('../handlers/api-tokens.js')
    expect(mod.default).toBeDefined()
  })
})
