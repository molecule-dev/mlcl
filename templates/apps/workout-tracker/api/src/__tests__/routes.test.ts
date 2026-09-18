import { describe, expect, it, vi } from 'vitest'

// Mock bonds and all @molecule/* dependencies. The mocks must surface
// the surface area called at module-evaluation time by handlers/* and
// `App/router.ts` (database / i18n / entitlements / validation).
vi.mock('../bonds/index.js', () => ({
  setupBonds: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  unbond: vi.fn(),
  unbondAll: vi.fn(),
  getAll: vi.fn(() => new Map()),
  unexpectBond: vi.fn(),
  getAnalytics: vi.fn(),
  bond: vi.fn(),
  expectBond: vi.fn(),
  isBonded: vi.fn(() => false),
  require: vi.fn(),
  get: vi.fn(),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  })),
}))

vi.mock('@molecule/api-database', () => ({
  updateById: vi.fn(),
  deleteById: vi.fn(),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  setPool: vi.fn(),
  setStore: vi.fn(),
  query: vi.fn(),
  findMany: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: null, affected: 0 })),
  updateMany: vi.fn(async () => ({ data: null, affected: 0 })),
  deleteMany: vi.fn(async () => ({ data: null, affected: 0 })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireCategory: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireCategoryAtLeast: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getEffectiveTier: vi.fn(),
  defineTiers: (cfg: unknown) => cfg,
  setProvider: vi.fn(),
  getProvider: vi.fn(),
  getCachedPlanKey: vi.fn(),
  invalidatePlanKeyCache: vi.fn(),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-search', () => ({
  search: vi.fn(async () => []),
  index: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-cron-node-cron', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

vi.mock('@molecule/api-import-export-csv', () => ({}))

vi.mock('@molecule/api-jwt-jsonwebtoken', () => ({}))

vi.mock('@molecule/api-locales-body-parser', () => ({}))

vi.mock('@molecule/api-locales-config', () => ({}))

vi.mock('@molecule/api-locales-device', () => ({}))

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

vi.mock('@molecule/api-push-notifications-web-push', () => ({}))

vi.mock('@molecule/api-reporting-database', () => ({}))

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
}))

vi.mock('@molecule/api-search-meilisearch', () => ({}))

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
