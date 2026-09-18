/**
 * Broken-access-control regression tests.
 *
 * TPL-001 — GET /hosts/:id must NOT leak sensitive `users` columns (email,
 *           oauthServer/oauthId/oauthData, planKey/planExpiresAt/planAutoRenews,
 *           twoFactorEnabled) on the unauthenticated public host profile.
 * TPL-005 — GET /listings?host=<id> must only drop the status='active' filter
 *           for the OWNER (resolved session user); a public read of another
 *           host's id must stay scoped to active listings only.
 *
 * Drives the real Express routers through an ephemeral HTTP server so the
 * middleware chain (validateQuery defaults, session resolution) runs exactly
 * as in production.
 */
import express from 'express'
import type { Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// ---- in-memory fixtures -----------------------------------------------------
const usersTable: Record<string, Record<string, unknown>> = {}
let listingsRows: Record<string, unknown>[] = []

type Where = { field: string; operator?: string; value: unknown }

function matchWhere(rows: Record<string, unknown>[], where?: Where[]): Record<string, unknown>[] {
  if (!where || where.length === 0) return rows
  return rows.filter((row) =>
    where.every((w) => {
      const v = row[w.field]
      switch (w.operator) {
        case '>=':
          return Number(v) >= Number(w.value)
        case '<=':
          return Number(v) <= Number(w.value)
        default:
          return v === w.value
      }
    }),
  )
}

// ---- mocks ------------------------------------------------------------------
vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(async (table: string, id: string) =>
    table === 'users' ? (usersTable[id] ?? null) : null,
  ),
  findMany: vi.fn(async (table: string, opts?: { where?: Where[] }) =>
    table === 'listings' ? matchWhere(listingsRows, opts?.where) : [],
  ),
  count: vi.fn(async (table: string, where?: Where[]) =>
    table === 'listings' ? matchWhere(listingsRows, where).length : 0,
  ),
  create: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _vals?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// Mirror the real middleware: parse with the zod schema and install the
// coerced value via defineProperty (Express 5 makes req.query getter-only).
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery:
    (schema: { parse: (v: unknown) => unknown }) =>
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      Object.defineProperty(req, 'query', { value: schema.parse(req.query), writable: true })
      next()
    },
  validateBody:
    (schema: { parse: (v: unknown) => unknown }) =>
    (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.body = schema.parse(req.body)
      next()
    },
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-geolocation', () => ({ geocode: vi.fn(async () => []) }))

vi.mock('@molecule/api-search', () => ({
  search: vi.fn(async () => {
    throw new Error('no search bond')
  }),
  index: vi.fn(),
  deleteDocument: vi.fn(),
}))

vi.mock('../tiers.js', () => ({}))

vi.mock('./_decorate.js', () => ({
  decorateListing: vi.fn(async (l: unknown) => l),
  decorateListings: vi.fn(async (l: unknown) => l),
}))

// ---- server harness ---------------------------------------------------------
let server: Server
let baseUrl: string

beforeAll(async () => {
  const hostsRouter = (await import('../handlers/hosts.js')).default
  const listingsRouter = (await import('../handlers/listings.js')).default

  const app = express()
  app.use(express.json())
  // Test session middleware: `x-test-user` header → res.locals.session.userId.
  app.use((req, res, next) => {
    const uid = req.header('x-test-user')
    res.locals.session = uid ? { userId: uid } : undefined
    next()
  })
  app.use('/hosts', hostsRouter)
  app.use('/listings', listingsRouter)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(() => {
  server?.close()
})

const HOST_A = '11111111-1111-1111-1111-111111111111'
const HOST_B = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  for (const k of Object.keys(usersTable)) delete usersTable[k]
  usersTable[HOST_A] = {
    id: HOST_A,
    name: 'Ada Host',
    username: 'ada',
    email: 'ada@example.com',
    twoFactorEnabled: true,
    oauthServer: 'google',
    oauthId: 'goog-12345',
    oauthData: { accessToken: 'super-secret-token', phone: '+15551234567' },
    planKey: 'pro',
    planExpiresAt: '2030-01-01T00:00:00.000Z',
    planAutoRenews: true,
    createdAt: '2022-03-01T00:00:00.000Z',
  }
  listingsRows = [
    {
      id: 'la1',
      host_id: HOST_A,
      status: 'active',
      total_bookings: 3,
      reviews_count: 2,
      rating: 5,
    },
    {
      id: 'lp1',
      host_id: HOST_A,
      status: 'paused',
      total_bookings: 0,
      reviews_count: 0,
      rating: 0,
    },
    {
      id: 'lx1',
      host_id: HOST_A,
      status: 'archived',
      total_bookings: 0,
      reviews_count: 0,
      rating: 0,
    },
  ]
})

describe('TPL-001 — public host profile sanitization', () => {
  const SENSITIVE = [
    'email',
    'oauthServer',
    'oauthId',
    'oauthData',
    'planKey',
    'planExpiresAt',
    'planAutoRenews',
    'twoFactorEnabled',
  ]

  it('omits every sensitive users column from the unauthenticated profile', async () => {
    const res = await fetch(`${baseUrl}/hosts/${HOST_A}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>

    for (const field of SENSITIVE) {
      expect(body, `leaked sensitive field: ${field}`).not.toHaveProperty(field)
    }
  })

  it('still returns the public host-card fields', async () => {
    const res = await fetch(`${baseUrl}/hosts/${HOST_A}`)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe(HOST_A)
    expect(body.name).toBe('Ada Host')
    expect(body.username).toBe('ada')
    expect(body).toHaveProperty('member_since')
    expect(body).toHaveProperty('stats')
    expect(body).toHaveProperty('is_superhost')
    expect(body).toHaveProperty('photo')
  })
})

describe('TPL-005 — host listing-status scoping', () => {
  async function hostListing(host: string, sessionUser?: string) {
    const res = await fetch(`${baseUrl}/listings?host=${host}`, {
      headers: sessionUser ? { 'x-test-user': sessionUser } : {},
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Record<string, unknown>[] }
    return body.data.map((l) => l.status as string).sort()
  }

  it('public read of another host returns ACTIVE listings only', async () => {
    // unauthenticated
    expect(await hostListing(HOST_A)).toEqual(['active'])
    // authenticated as a DIFFERENT host
    expect(await hostListing(HOST_A, HOST_B)).toEqual(['active'])
  })

  it('owner via host=me sees paused/archived too', async () => {
    expect(await hostListing('me', HOST_A)).toEqual(['active', 'archived', 'paused'])
  })

  it('owner passing their own UUID also sees all statuses', async () => {
    expect(await hostListing(HOST_A, HOST_A)).toEqual(['active', 'archived', 'paused'])
  })
})
