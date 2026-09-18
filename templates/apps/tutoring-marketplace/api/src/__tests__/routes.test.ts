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
  hasBond: vi.fn(() => false),
  getBond: vi.fn(),
  resetBonds: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-cron-node-cron', () => ({}))

vi.mock('@molecule/api-database', () => ({
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  setPool: vi.fn(),
  getPool: vi.fn(),
  query: vi.fn(),
  setStore: vi.fn(),
  getStore: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn(),
}))

vi.mock('@molecule/api-emails-mailgun', () => ({}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
  registerTranslations: vi.fn(),
}))

vi.mock('@molecule/api-image', () => ({
  resize: vi.fn(),
  thumbnail: vi.fn(),
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

vi.mock('@molecule/api-locales-tag', () => ({}))

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

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-password-bcrypt', () => ({}))

vi.mock('@molecule/api-payments', () => ({
  createCharge: vi.fn(async () => ({ id: 'ch_test', status: 'succeeded' })),
  createRefund: vi.fn(async () => ({ id: 're_test', status: 'succeeded' })),
}))

vi.mock('@molecule/api-payments-stripe', () => ({}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(),
  getRealtimeServer: vi.fn(),
}))

vi.mock('@molecule/api-realtime-socketio', () => ({}))

vi.mock('@molecule/api-resource', () => ({
  createRequestHandler: (fn: unknown) => fn,
}))

vi.mock('@molecule/api-resource-booking', () => ({}))

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

vi.mock('@molecule/api-resource-review', () => ({}))

vi.mock('@molecule/api-resource-tag', () => ({}))

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

vi.mock('@molecule/api-search', () => ({
  search: vi.fn(),
  index: vi.fn(),
  removeFromIndex: vi.fn(),
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

vi.mock('@molecule/api-uploads', () => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getSignedUrl: vi.fn(),
}))

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

describe('handlers/tutors', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/tutors.js')
    expect(mod.default).toBeDefined()
  })
})

describe('handlers/bookings', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/bookings.js')
    expect(mod.default).toBeDefined()
  })
})

describe('handlers/sessions', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/sessions.js')
    expect(mod.default).toBeDefined()
  })
})

describe('handlers/reviews', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/reviews.js')
    expect(mod.default).toBeDefined()
  })
})

describe('handlers/subjects', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/subjects.js')
    expect(mod.default).toBeDefined()
  })
})

describe('handlers/messages', () => {
  it('exports a router', async () => {
    const mod = await import('../handlers/messages.js')
    expect(mod.default).toBeDefined()
  })
})
