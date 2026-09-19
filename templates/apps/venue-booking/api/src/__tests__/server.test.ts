import { describe, expect, it, vi } from 'vitest'

// Mock bonds to avoid requiring real connections
vi.mock('../bonds/index.js', () => ({
  setupBonds: vi.fn(),
}))

// Mock middleware to avoid loading @molecule/* middleware packages
vi.mock('../middleware/body-parser.js', () => ({
  bodyParserMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../middleware/cookie-parser.js', () => ({
  cookieParserMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../middleware/cors.js', () => ({
  corsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Mock all @molecule/* packages
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

vi.mock('@molecule/api-database-postgresql', () => ({
  // scripts/migrate.ts calls createMigrator(dir) at module load (re-exported
  // through @molecule/api-bonds-default-express) — it must return a runner fn.
  createMigrator: vi.fn(() => vi.fn(async () => undefined)),
  deriveSsl: vi.fn(() => undefined),
}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-geolocation-mapbox', () => ({}))

vi.mock('@molecule/api-image-sharp', () => ({}))

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

vi.mock('@molecule/api-resource-booking', () => ({
  requestHandlerMap: {},
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

vi.mock('@molecule/api-resource-payment', () => ({
  types: vi.fn(),
  resource: vi.fn(),
  stripeMonthly: vi.fn(),
  stripeYearly: vi.fn(),
  appleMonthly: vi.fn(),
  appleYearly: vi.fn(),
  googleMonthly: vi.fn(),
  googleYearly: vi.fn(),
  plans: vi.fn(),
  getPeriodTime: vi.fn(),
  planService: vi.fn(),
  paymentRecordService: vi.fn(),
  i18nRegistered: vi.fn(),
}))

vi.mock('@molecule/api-resource-review', () => ({
  requestHandlerMap: {},
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
    // The default route mounter fronts credential/2FA routes with these
    // rate limiters unconditionally; Express throws on undefined middleware.
    rateLimitAuth: vi.fn(),
    rateLimitTwoFactor: vi.fn(),
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

vi.mock('@molecule/api-uploads-s3', () => ({}))

vi.mock('@molecule/api-utilities-validation', () => ({}))

// Domain handlers (handlers/venues.ts, etc.) call enforceLimit({...}) at
// router-construction time, so api-entitlements must be mocked to a no-op
// middleware factory or `import('../App/router.js')` blows up.
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getEffectiveTier: vi.fn(),
  setProvider: vi.fn(),
  defineTiers: vi.fn(() => ({
    provider: { getTier: vi.fn(), getCachedPlanKey: vi.fn() },
  })),
  buildLimitError: vi.fn(),
  configurePlanCache: vi.fn(),
  clearPlanCache: vi.fn(),
}))

// Domain handlers also import the request-validation helper from
// @molecule/api-middleware-validation; mock it as a passthrough so the
// route is wired without needing the real Zod stack.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Mock all abstract @molecule/api-* surfaces used by domain handlers as a
// Proxy returning vi.fn() for every property access, so that any function
// imported (count, create, deleteById, findById, findMany, updateById,
// search, index, deleteDocument, geocode, etc.) just yields a no-op stub.
// vi.mock is hoisted, so the Proxy factory must be inlined per call.
vi.mock(
  '@molecule/api-database',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-search',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-geolocation',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-image',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-emails',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-uploads',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)
vi.mock(
  '@molecule/api-payments',
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'then' ? undefined : vi.fn()),
      },
    ),
)

// i18n surface used by the public handlers for translating error messages.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

describe('server', () => {
  it('exports a create function', async () => {
    const { create } = await import('../server.js')
    expect(typeof create).toBe('function')
  })
})

describe('bonds/index', () => {
  it('exports setupBonds function', async () => {
    const bonds = (await import('../bonds/index.js')) as Record<string, unknown>
    expect(typeof bonds.setupBonds).toBe('function')
  })
})

describe('router', () => {
  it('exports a router', async () => {
    const { router } = await import('../App/router.js')
    expect(router).toBeDefined()
  })
})
