/**
 * Per-app handler unit tests for the wiki page search surface — focused on the
 * TPL-001 cross-tenant-read fix.
 *
 * Before the fix, `GET /search` authenticated the caller but, when the optional
 * `space_id` query param was absent, scoped the result set to NOTHING — both
 * the Meilisearch branch (`filters: undefined`) and the Postgres fallback
 * (no `space_id`/owner condition) returned EVERY tenant's pages. An
 * authenticated user could therefore read another user's PRIVATE pages by
 * omitting `space_id`.
 *
 * The fix scopes the unscoped branch to the caller's accessible spaces (owned +
 * member + public). These tests assert:
 *   1. user B searching with no space_id gets ZERO of user A's private pages
 *      (the regression — fails before the fix, passes after), via both the
 *      Postgres fallback and the Meilisearch branch, and
 *   2. legitimate self-search still works (user A finds their own page), and
 *   3. a caller with no readable spaces fails closed (empty result).
 *
 * We avoid supertest by spinning up an ephemeral `http.createServer` on port 0
 * and using global `fetch`, mirroring the other handler tests in this fleet.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
type WhereCond = { field: string; operator: string; value: unknown }

// In-memory fixture tables, keyed by table name. The mocked findMany evaluates
// real WhereCondition operators against these rows so the handler's scoping
// logic is exercised end-to-end (not stubbed away).
const tables: Record<string, Row[]> = {}

const matches = (row: Row, cond: WhereCond): boolean => {
  const v = row[cond.field]
  switch (cond.operator) {
    case '=':
      return v === cond.value
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(v)
    case 'ilike':
      return String(v ?? '')
        .toLowerCase()
        .includes(String(cond.value ?? '').toLowerCase())
    case 'is_null':
      return v === null || v === undefined
    case 'is_not_null':
      return v !== null && v !== undefined
    default:
      return false
  }
}

const dbMock = vi.hoisted(() => ({
  findMany: vi.fn() as ReturnType<typeof vi.fn>,
  findById: vi.fn() as ReturnType<typeof vi.fn>,
  findOne: vi.fn() as ReturnType<typeof vi.fn>,
  create: vi.fn() as ReturnType<typeof vi.fn>,
  updateById: vi.fn() as ReturnType<typeof vi.fn>,
  deleteById: vi.fn() as ReturnType<typeof vi.fn>,
  count: vi.fn() as ReturnType<typeof vi.fn>,
}))

const searchMock = vi.hoisted(() => ({
  hasProvider: vi.fn(() => false),
  search: vi.fn() as ReturnType<typeof vi.fn>,
  index: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-search', () => searchMock)
vi.mock('@molecule/api-ai-summarization', () => ({
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) => res.locals?.session?.userId,
}))

interface SessionLocals {
  session?: { userId?: string }
}

let server: http.Server | null = null
async function listen(handler: express.Router, userId: string | null): Promise<string> {
  const app = express()
  app.use(express.json())
  app.use((_req, res: express.Response & { locals: SessionLocals }, next) => {
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use(handler)
  server = http.createServer(app)
  await new Promise<void>((resolve) => server?.listen(0, resolve))
  const addr = server?.address() as AddressInfo
  return `http://127.0.0.1:${String(addr.port)}`
}

const USER_A = '11111111-1111-1111-1111-111111111111'
const USER_B = '22222222-2222-2222-2222-222222222222'
const SPACE_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' // private, owned by A
const SPACE_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' // private, owned by B
const PAGE_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc' // A's private page

beforeEach(() => {
  vi.clearAllMocks()
  searchMock.hasProvider.mockReturnValue(false)

  tables.wiki_spaces = [
    { id: SPACE_A, owner_id: USER_A, is_public: false, visibility: 'private' },
    { id: SPACE_B, owner_id: USER_B, is_public: false, visibility: 'private' },
  ]
  tables.wiki_space_members = []
  tables.wiki_pages = [
    {
      id: PAGE_A,
      space_id: SPACE_A,
      author_id: USER_A,
      title: 'Secret Roadmap',
      content: 'Confidential plans',
      trashed_at: null,
    },
  ]

  dbMock.findMany.mockImplementation(async (table: string, options?: { where?: WhereCond[] }) => {
    const rows = tables[table] ?? []
    const where = options?.where ?? []
    return rows.filter((row) => where.every((cond) => matches(row, cond)))
  })
})

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })
  server = null
})

describe('pages search — cross-tenant read fix (TPL-001), Postgres fallback', () => {
  it("user B's no-space_id search returns ZERO of user A's private pages", async () => {
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_B)
    const res = await fetch(`${url}/search?q=Roadmap`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    // Before the fix this leaked PAGE_A (A's private page) to user B.
    expect(body.hits).toHaveLength(0)
    expect(body.total).toBe(0)
    expect(body.hits.find((h) => h.id === PAGE_A)).toBeUndefined()
  })

  it('user A can still find their own page (functionality preserved)', async () => {
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_A)
    const res = await fetch(`${url}/search?q=Roadmap`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.hits[0]?.id).toBe(PAGE_A)
  })

  it('member of a space can search pages in that space', async () => {
    tables.wiki_space_members = [{ space_id: SPACE_A, user_id: USER_B, role: 'editor' }]
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_B)
    const res = await fetch(`${url}/search?q=Roadmap`)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.hits[0]?.id).toBe(PAGE_A)
  })

  it('public spaces are searchable by any authenticated user', async () => {
    tables.wiki_spaces = [
      { id: SPACE_A, owner_id: USER_A, is_public: true, visibility: 'public' },
      { id: SPACE_B, owner_id: USER_B, is_public: false, visibility: 'private' },
    ]
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_B)
    const res = await fetch(`${url}/search?q=Roadmap`)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.hits[0]?.id).toBe(PAGE_A)
  })

  it('a caller with no readable spaces fails closed (empty result)', async () => {
    tables.wiki_spaces = [
      { id: SPACE_A, owner_id: USER_A, is_public: false, visibility: 'private' },
    ]
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_B)
    const res = await fetch(`${url}/search?q=Roadmap`)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    expect(body.total).toBe(0)
    expect(body.hits).toHaveLength(0)
  })
})

describe('pages search — cross-tenant read fix (TPL-001), Meilisearch branch', () => {
  it("scopes Meilisearch hits so user B never sees user A's private page", async () => {
    searchMock.hasProvider.mockReturnValue(true)
    // Meilisearch (via the bond) can only express single-value equality
    // filters, so an unscoped multi-space search returns hits across tenants;
    // the handler must scope them in-process.
    searchMock.search.mockResolvedValue({
      hits: [
        {
          id: PAGE_A,
          score: 1,
          document: { id: PAGE_A, title: 'Secret Roadmap', space_id: SPACE_A },
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
      processingTimeMs: 1,
    })
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_B)
    const res = await fetch(`${url}/search?q=Roadmap`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    // The bond returned A's page, but B may not read SPACE_A → scoped out.
    expect(body.hits).toHaveLength(0)
    expect(body.total).toBe(0)
  })

  it('keeps Meilisearch hits the caller is allowed to read', async () => {
    searchMock.hasProvider.mockReturnValue(true)
    searchMock.search.mockResolvedValue({
      hits: [
        {
          id: PAGE_A,
          score: 1,
          document: { id: PAGE_A, title: 'Secret Roadmap', space_id: SPACE_A },
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
      processingTimeMs: 1,
    })
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, USER_A)
    const res = await fetch(`${url}/search?q=Roadmap`)
    const body = (await res.json()) as { hits: Array<{ id: string }>; total: number }
    expect(body.total).toBe(1)
    expect(body.hits[0]?.id).toBe(PAGE_A)
  })

  it('requires unauthenticated callers to be rejected (401)', async () => {
    const router = (await import('../handlers/pages.js')).default
    const url = await listen(router, null)
    const res = await fetch(`${url}/search?q=Roadmap`)
    expect(res.status).toBe(401)
  })
})
