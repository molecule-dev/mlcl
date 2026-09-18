import { Router } from 'express'
import { describe, expect, it, vi } from 'vitest'

// Mock bonds and all @molecule/* dependencies
vi.mock('../bonds/index.js', () => ({
  setupBonds: vi.fn(),
}))

vi.mock('../handlers/index.js', () => ({ default: Router() }))
vi.mock('../handlers/listings.js', () => ({ default: Router() }))
vi.mock('../handlers/bids.js', () => ({ default: Router() }))
vi.mock('../handlers/watchlist.js', () => ({ default: Router() }))
vi.mock('../routes/billing.js', () => ({ default: Router() }))

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

vi.mock('@molecule/api-cron-node-cron', () => ({}))

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

vi.mock('@molecule/api-realtime-socketio', () => ({}))

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

vi.mock('@molecule/api-resource-product', () => ({}))

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

vi.mock('@molecule/api-uploads-s3', () => ({}))

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

describe('Route auth: verify-payment (M3-2)', () => {
  const VERIFY_PATH = '/users/:id/verify-payment/:provider'

  it('gates the POST receipt-crediting route with authSelf', async () => {
    const { router } = await import('../App/router.js')
    const { requestHandlerMap: User } = await import('../App/Resource/User/index.js')

    const postRoute = router.stack.find(
      (layer) =>
        layer.route?.path === VERIFY_PATH &&
        layer.route.stack.some((handler) => handler.method === 'post'),
    )?.route
    expect(postRoute).toBeDefined()

    const postHandles: unknown[] = postRoute!.stack.map((handler) => handler.handle)
    // Exploit blocked: an anonymous caller can no longer reach the crediting
    // handler — authSelf runs first and rejects callers acting on someone
    // else's :id.
    expect(postHandles).toContain(User.authSelf)
    expect(postHandles.indexOf(User.authSelf)).toBeLessThan(postHandles.indexOf(User.verifyPayment))
  })

  it('gates the GET browser-redirect route with authSelf (M3-1)', async () => {
    const { router } = await import('../App/router.js')
    const { requestHandlerMap: User } = await import('../App/Resource/User/index.js')

    const getRoute = router.stack.find(
      (layer) =>
        layer.route?.path === VERIFY_PATH &&
        layer.route.stack.some((handler) => handler.method === 'get'),
    )?.route
    expect(getRoute).toBeDefined()

    const getHandles: unknown[] = getRoute!.stack.map((handler) => handler.handle)
    // [M3-1] The GET grants the plan to :id and echoes the user row, so an
    // unauthenticated/cross-user GET must not reach verifyPayment. authSelf runs
    // first; the Stripe success_url is a top-level browser navigation carrying
    // the session cookie, so the legitimate redirect still works.
    expect(getHandles).toContain(User.authSelf)
    expect(getHandles).toContain(User.verifyPayment)
  })
})
