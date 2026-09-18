/**
 * Unit tests for new IoT handler modules. Mocks bonds/dependencies so
 * the routers can be imported without a live database/realtime stack.
 *
 * The full e2e/ specs cover behaviour against a real Postgres + scaffolded
 * project; these unit tests verify each module exports a router and is
 * importable in isolation (catches typos, missing mocks, broken imports).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  unbond: vi.fn(),
  unbondAll: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(() => new Map()),
  isBonded: vi.fn(() => false),
  require: vi.fn(),
  getAnalytics: vi.fn(),
  expectBond: vi.fn(),
  unexpectBond: vi.fn(),
  getLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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
  findById: vi.fn(async () => null),
  findOne: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: {} })),
  updateMany: vi.fn(async () => ({ data: 0 })),
  deleteMany: vi.fn(async () => ({ data: 0 })),
}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  defineTiers: (cfg: unknown) => cfg,
  setProvider: vi.fn(),
  getEffectiveTier: vi.fn(async () => ({
    planKey: 'free',
    category: 'free',
    name: 'Free',
    limits: {},
  })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(async () => undefined),
  send: vi.fn(async () => undefined),
}))

describe('iot handlers', () => {
  it('devices router exports default', async () => {
    const mod = await import('../handlers/devices.js')
    expect(mod.default).toBeDefined()
  })

  it('telemetry router exports default', async () => {
    const mod = await import('../handlers/telemetry.js')
    expect(mod.default).toBeDefined()
  })

  it('commands router exports default', async () => {
    const mod = await import('../handlers/commands.js')
    expect(mod.default).toBeDefined()
  })

  it('firmware router exports default', async () => {
    const mod = await import('../handlers/firmware.js')
    expect(mod.default).toBeDefined()
  })

  it('fleets router exports default', async () => {
    const mod = await import('../handlers/fleets.js')
    expect(mod.default).toBeDefined()
  })

  it('alerts router exports default', async () => {
    const mod = await import('../handlers/alerts.js')
    expect(mod.default).toBeDefined()
  })

  it('logs router exports default', async () => {
    const mod = await import('../handlers/logs.js')
    expect(mod.default).toBeDefined()
  })
})

describe('device-token-auth middleware', () => {
  it('exports requireDeviceToken + helpers', async () => {
    const mod = await import('../middleware/device-token-auth.js')
    expect(typeof mod.requireDeviceToken).toBe('function')
    expect(typeof mod.generateDeviceToken).toBe('function')
    expect(typeof mod.hashDeviceToken).toBe('function')
  })

  it('generateDeviceToken produces unique non-empty strings', async () => {
    const { generateDeviceToken } = await import('../middleware/device-token-auth.js')
    const a = generateDeviceToken()
    const b = generateDeviceToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(20)
  })

  it('hashDeviceToken is deterministic and never returns plaintext', async () => {
    const { generateDeviceToken, hashDeviceToken } =
      await import('../middleware/device-token-auth.js')
    const tok = generateDeviceToken()
    const h1 = hashDeviceToken(tok)
    const h2 = hashDeviceToken(tok)
    expect(h1).toBe(h2)
    expect(h1).not.toBe(tok)
    expect(h1.length).toBeGreaterThan(20)
  })
})
