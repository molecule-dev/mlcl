import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-ai', () => ({
  requireProvider: () => ({
    name: 'mock',
    chat: () =>
      (async function* () {
        yield { type: 'text', content: 'Hello body.' }
        yield { type: 'done', usage: { inputTokens: 5, outputTokens: 5 } }
      })(),
  }),
}))

vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn(async () => ({ accepted: ['x@y.test'], rejected: [], messageId: 'msg-1' })),
}))

vi.mock('@molecule/api-templating', () => ({
  render: vi.fn(async (template: string, vars: Record<string, unknown>) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) => String(vars[k] ?? ''))
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
  it('drafts router exposes routes', async () => {
    const mod = await import('../handlers/drafts.js')
    expect(mod.default).toBeDefined()
  })

  it('templates router exposes routes', async () => {
    const mod = await import('../handlers/templates.js')
    expect(mod.default).toBeDefined()
  })

  it('sentEmails router exposes routes', async () => {
    const mod = await import('../handlers/sentEmails.js')
    expect(mod.default).toBeDefined()
  })

  it('contacts router exposes routes', async () => {
    const mod = await import('../handlers/contacts.js')
    expect(mod.default).toBeDefined()
  })

  it('webhooks router exposes routes', async () => {
    const mod = await import('../handlers/webhooks.js')
    expect(mod.default).toBeDefined()
  })
})
