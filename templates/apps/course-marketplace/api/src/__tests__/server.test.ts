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

vi.mock('@molecule/api-middleware-validation', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-search', () => ({
  search: vi.fn(async () => ({ hits: [], total: 0 })),
  index: vi.fn(),
  remove: vi.fn(),
  hasProvider: vi.fn(() => false),
  setProvider: vi.fn(),
}))

vi.mock('@molecule/api-pdf', () => ({
  fromHTML: vi.fn(async () => Buffer.from('')),
  hasProvider: vi.fn(() => false),
  setProvider: vi.fn(),
}))

vi.mock('@molecule/api-payments', () => ({
  setProvider: vi.fn(),
  getProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  refund: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({
  // scripts/migrate.ts calls createMigrator(dir) at module load (re-exported
  // through @molecule/api-bonds-default-express) — it must return a runner fn.
  createMigrator: vi.fn(() => vi.fn(async () => undefined)),
}))

vi.mock('@molecule/api-email-templates', () => ({}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireCategory: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requireCategoryAtLeast: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getEffectiveTier: vi.fn(async () => ({
    planKey: 'free',
    category: 'free',
    name: 'Free',
    limits: {},
  })),
  defineTiers: (cfg: unknown) => cfg,
  setProvider: vi.fn(),
  getProvider: vi.fn(),
  getCachedPlanKey: vi.fn(),
  invalidatePlanKeyCache: vi.fn(),
}))

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

vi.mock('@molecule/api-media-streaming-hls', () => ({}))

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

vi.mock('@molecule/api-pdf-pdfkit', () => ({}))

vi.mock('@molecule/api-reporting-database', () => ({}))

vi.mock('@molecule/api-resource', () => ({
  createRequestHandler: (fn: unknown) => fn,
}))

vi.mock('@molecule/api-resource-bookmark', () => ({
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

vi.mock('@molecule/api-resource-order', () => ({
  requestHandlerMap: {},
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

vi.mock('@molecule/api-resource-tag', () => ({
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
