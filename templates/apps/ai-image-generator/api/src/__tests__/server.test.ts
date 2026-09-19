import { Router } from 'express'
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

// Mock domain handlers — these pull in @molecule/api-database / tiers / etc.
// which require real bonds at module-init. Server-shape tests shouldn't need
// to wire bonds.
vi.mock('../handlers/index.js', () => ({ default: Router() }))
vi.mock('../handlers/generations.js', () => ({ default: Router() }))
vi.mock('../handlers/gallery.js', () => ({ default: Router() }))
vi.mock('../routes/billing.js', () => ({ default: Router() }))

// Mock all @molecule/* packages
vi.mock('@molecule/api-ai-anthropic', () => ({}))

vi.mock('@molecule/api-ai-image-generation-openai', () => ({}))

vi.mock('@molecule/api-ai-image-generation-stability', () => ({}))

vi.mock('@molecule/api-ai-openai', () => ({}))

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
  // entitlements/database/encryption providers call `expectBond(...)` at
  // module-eval time — return no-ops so the import chain doesn't blow up.
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({
  // scripts/migrate.ts calls createMigrator(dir) at module load (re-exported
  // through @molecule/api-bonds-default-express) — it must return a runner fn.
  createMigrator: vi.fn(() => vi.fn(async () => undefined)),
  deriveSsl: vi.fn(() => undefined),
}))

vi.mock('@molecule/api-email-templates', () => ({}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  defineTiers: vi.fn(() => ({ tiers: [], getTier: vi.fn(), getDefaultTier: vi.fn() })),
  getEffectiveTier: vi.fn(async () => ({ planKey: 'free', isFree: true })),
  setProvider: vi.fn(),
  getProvider: vi.fn(),
}))

vi.mock('@molecule/api-image-sharp', () => ({}))

vi.mock('@molecule/api-jwt-jsonwebtoken', () => ({}))

vi.mock('@molecule/api-locales-ai-anthropic', () => ({}))

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
