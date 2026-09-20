import { describe, expect, it, vi } from 'vitest'

// Mock bonds and all @molecule/* dependencies
vi.mock('../bonds/index.js', () => ({
  setupBonds: vi.fn(),
}))

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

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

vi.mock('@molecule/api-email-templates', () => ({}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  defineTiers: vi.fn(() => ({ tiers: [], getTier: vi.fn(), getDefaultTier: vi.fn() })),
  getEffectiveTier: vi.fn(async () => ({ planKey: 'free', isFree: true })),
  setProvider: vi.fn(),
  getProvider: vi.fn(),
}))

vi.mock('@molecule/api-jwt-jsonwebtoken', () => ({}))

vi.mock('@molecule/api-locales-body-parser', () => ({}))

vi.mock('@molecule/api-locales-config', () => ({}))

vi.mock('@molecule/api-locales-device', () => ({}))

vi.mock('@molecule/api-locales-payment', () => ({}))

vi.mock('@molecule/api-locales-payments-stripe', () => ({}))

vi.mock('@molecule/api-locales-resource', () => ({}))

vi.mock('@molecule/api-locales-secrets', () => ({}))

vi.mock('@molecule/api-locales-secrets-doppler', () => ({}))

vi.mock('@molecule/api-locales-user', () => ({}))

vi.mock('@molecule/api-locales-user-payments', () => ({}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock(
  '@molecule/api-middleware-body-parser',
  () =>
    new Proxy(
      {},
      {
        get: () => () => (_req: unknown, _res: unknown, next: () => void) => next(),
      },
    ),
)

vi.mock('@molecule/api-middleware-body-parser-express', () => ({}))

vi.mock(
  '@molecule/api-middleware-cookie-parser',
  () =>
    new Proxy(
      {},
      {
        get: () => () => (_req: unknown, _res: unknown, next: () => void) => next(),
      },
    ),
)

vi.mock('@molecule/api-middleware-cookie-parser-express', () => ({}))

vi.mock(
  '@molecule/api-middleware-cors',
  () =>
    new Proxy(
      {},
      {
        get: () => () => (_req: unknown, _res: unknown, next: () => void) => next(),
      },
    ),
)

vi.mock('@molecule/api-middleware-cors-express', () => ({}))

vi.mock('@molecule/api-password-bcrypt', () => ({}))

vi.mock('@molecule/api-payments-stripe', () => ({}))

vi.mock('@molecule/api-resource', () => ({
  createRequestHandler: (fn: unknown) => fn,
}))

vi.mock('@molecule/api-resource-device', () => ({
  createRequestHandlerMap: () => ({
    auth: vi.fn(),
    query: vi.fn(),
    authUser: vi.fn(),
    read: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
  }),
}))

vi.mock('@molecule/api-resource-payment', () => ({}))

vi.mock('@molecule/api-resource-user', () => ({
  createRequestHandlerMap: () => ({
    create: vi.fn(),
    logIn: vi.fn(),
    logInOAuth: vi.fn(),
    forgotPassword: vi.fn(),
    authSelf: vi.fn(),
    read: vi.fn(),
    update: vi.fn(),
    del: vi.fn(),
    updatePassword: vi.fn(),
    verifyTwoFactor: vi.fn(),
    updatePlan: vi.fn(),
    verifyPayment: vi.fn(),
    handlePaymentNotification: vi.fn(),
  }),
  authorization: {
    verifyMiddleware: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  },
  authorizers: {
    auth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authUser: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}))

vi.mock('@molecule/api-database', () => ({
  findOne: vi.fn(),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  query: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _vars?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  // Echo the registry through so the tiers tests assert the real ladder.
  defineTiers: (registry: unknown) => registry,
  setProvider: vi.fn(),
  getEffectiveTier: vi.fn(async () => ({
    planKey: 'free',
    category: 'free',
    name: 'Free',
    limits: {},
  })),
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

vi.mock('@molecule/api-secrets', () => ({
  // Credentialed provider packages self-register their secret definitions at
  // module init (molecule e649a9be), so the mock must expose registerSecrets.
  registerSecrets: vi.fn(),
  resolveAll: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-secrets-env', () => ({}))

vi.mock('@molecule/api-two-factor-otplib', () => ({}))

vi.mock('@molecule/api-utilities-validation', () => ({}))

describe('Resource: Device', () => {
  it('exports requestHandlerMap', async () => {
    const mod = await import('../App/Resource/Device/index.js')
    expect(mod.requestHandlerMap).toBeDefined()
  })

  it('requestHandlerMap has expected handlers', async () => {
    const { requestHandlerMap } = await import('../App/Resource/Device/index.js')
    const keys = Object.keys(requestHandlerMap)
    expect(keys).toContain('auth')
    expect(keys).toContain('query')
    expect(keys).toContain('authUser')
    expect(keys).toContain('read')
    expect(keys).toContain('update')
  })
})

describe('Resource: User', () => {
  it('exports requestHandlerMap', async () => {
    const mod = await import('../App/Resource/User/index.js')
    expect(mod.requestHandlerMap).toBeDefined()
  })

  it('requestHandlerMap has expected handlers', async () => {
    const { requestHandlerMap } = await import('../App/Resource/User/index.js')
    const keys = Object.keys(requestHandlerMap)
    expect(keys).toContain('create')
    expect(keys).toContain('logIn')
    expect(keys).toContain('forgotPassword')
    expect(keys).toContain('authSelf')
    expect(keys).toContain('read')
  })
})

describe('handlers', () => {
  it('donors exports a router', async () => {
    const mod = await import('../handlers/donors.js')
    expect(mod.default).toBeDefined()
  })

  it('gifts exports a router', async () => {
    const mod = await import('../handlers/gifts.js')
    expect(mod.default).toBeDefined()
  })

  it('campaigns exports a router', async () => {
    const mod = await import('../handlers/campaigns.js')
    expect(mod.default).toBeDefined()
  })

  it('receipts exports a router', async () => {
    const mod = await import('../handlers/receipts.js')
    expect(mod.default).toBeDefined()
  })

  it('dashboard exports a router', async () => {
    const mod = await import('../handlers/dashboard.js')
    expect(mod.default).toBeDefined()
  })

  it('handlers index mounts every domain router', async () => {
    const mod = await import('../handlers/index.js')
    expect(mod.default).toBeDefined()
  })
})

describe('tiers', () => {
  it('defines the free / plus / org ladder with donor limits', async () => {
    const tiers = await import('../tiers.js')
    expect(tiers.donorManagementPlanKeys.free).toBe('free')
    // The entitlements mock echoes defineTiers' raw input, so assert on the
    // literal registry shape (methods are the real package's, tested there).
    const raw = tiers.tierRegistry as unknown as {
      tiers: Record<string, unknown>
      defaultPlanKey: string
    }
    expect(Object.keys(raw.tiers)).toEqual(
      expect.arrayContaining(['free', 'stripeMonthly', 'orgMonthly']),
    )
    expect(raw.defaultPlanKey).toBe('free')
    const pricing = tiers.getPricingTiers()
    expect(pricing.map((p) => p.key)).toEqual(['free', 'plus', 'org'])
  })
})
