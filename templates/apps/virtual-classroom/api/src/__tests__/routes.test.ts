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
  expectBond: vi.fn(),
  unexpectBond: vi.fn(),
  getAnalytics: vi.fn(),
  getLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
  registerBond: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(() => []),
  findOne: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(() => 0),
  query: vi.fn(() => ({ rows: [] })),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  defineTiers: vi.fn((cfg: unknown) => cfg),
  setProvider: vi.fn(),
  getProvider: vi.fn(() => ({ getLimits: () => ({}), allows: () => true })),
  getEffectiveTier: vi.fn(() => ({ key: 'free', limits: {} })),
}))

vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-payments', () => ({}))

vi.mock('@molecule/api-payments-stripe', () => ({}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-cron-node-cron', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

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

vi.mock('@molecule/api-permissions-custom', () => ({}))

vi.mock('@molecule/api-realtime-socketio', () => ({}))

vi.mock('@molecule/api-reporting-database', () => ({}))

vi.mock('@molecule/api-resource', () => ({
  createRequestHandler: (fn: unknown) => fn,
}))

vi.mock('@molecule/api-resource-comment', () => ({}))

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
