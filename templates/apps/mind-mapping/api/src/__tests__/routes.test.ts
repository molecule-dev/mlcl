import { describe, expect, it, vi } from 'vitest'

// Mock bonds and all @molecule/* dependencies so importing the router
// doesn't require real connections / providers.
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

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(),
  setProvider: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({}))

vi.mock('@molecule/api-config-env', () => ({}))

vi.mock('@molecule/api-database-postgresql', () => ({}))

vi.mock('@molecule/api-jwt-jsonwebtoken', () => ({}))

vi.mock('@molecule/api-locales-body-parser', () => ({}))

vi.mock('@molecule/api-locales-config', () => ({}))

vi.mock('@molecule/api-locales-device', () => ({}))

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

vi.mock('@molecule/api-password-bcrypt', () => ({}))

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

describe('Mind-mapping handlers', () => {
  it('exports a router from each handler module', async () => {
    const maps = await import('../handlers/maps.js')
    const nodes = await import('../handlers/nodes.js')
    const connections = await import('../handlers/connections.js')
    const versions = await import('../handlers/versions.js')
    const collaborators = await import('../handlers/collaborators.js')
    const templates = await import('../handlers/templates.js')
    expect(maps.default).toBeDefined()
    expect(nodes.default).toBeDefined()
    expect(connections.default).toBeDefined()
    expect(versions.default).toBeDefined()
    expect(collaborators.default).toBeDefined()
    expect(templates.default).toBeDefined()
  })

  it('mounts every domain router under index', async () => {
    const { default: router } = await import('../handlers/index.js')
    expect(router).toBeDefined()
    // Express routers expose a `stack` array of layers — at minimum we
    // expect six mounted child routers (one per domain entity).
    const layers = (router as { stack: unknown[] }).stack
    expect(Array.isArray(layers)).toBe(true)
    expect(layers.length).toBeGreaterThanOrEqual(6)
  })
})

describe('CSPRNG public-share slug [L2-1]', () => {
  it('generatePublicSlug uses a CSPRNG, not predictable Math.random', async () => {
    const { generatePublicSlug } = await import('../handlers/maps.js')
    // randomBytes(16).toString('base64url') → 22 url-safe chars. The previous
    // Math.random implementation produced only 12 lowercase-alphanumeric chars,
    // so the length assertion fails loudly on any revert to it.
    const slug = generatePublicSlug()
    expect(slug).toMatch(/^[A-Za-z0-9_-]{20,}$/)
    // ~128 bits of entropy → no collisions across a large sample.
    const seen = new Set<string>()
    for (let i = 0; i < 5000; i += 1) seen.add(generatePublicSlug())
    expect(seen.size).toBe(5000)
  })
})
