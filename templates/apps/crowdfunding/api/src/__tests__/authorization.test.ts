import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression tests for PASS-5 broken-access-control findings:
//   [P5TPL-1] POST /campaigns/:id/feature must be admin-only (editorial
//             curation), not a creator/any-user self-service toggle.
//   [P5TPL-2] GET /updates/campaign/:campaignId and GET /updates/:id must hide
//             `backers_only` updates from anyone who isn't the campaign creator
//             or an active backer.

// --- Shared mock state -----------------------------------------------------

let currentUserId: string | null = 'caller'
let paramId = 'entity-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: () => paramId,
}))

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => db.findById(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
  create: (...args: unknown[]) => db.create(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  count: (...args: unknown[]) => db.count(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn() }))

vi.mock('@molecule/api-image', () => ({ resize: vi.fn(async (b: unknown) => b) }))

vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))

// --- Test helpers ----------------------------------------------------------

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res
}

async function dispatch(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  reqBody: Record<string, unknown> = {},
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body: reqBody, query: {}, params: {} } as unknown as Request
    router(req, res as unknown as Response, (err?: unknown) => {
      if (err) reject(err)
      else resolve()
    })
    const start = Date.now()
    const check = (): void => {
      if (res.ended || res.body !== undefined) resolve()
      else if (Date.now() - start > 2000) reject(new Error('handler timeout'))
      else setTimeout(check, 5)
    }
    check()
  })
  return res
}

type RouterFn = (req: Request, res: Response, next: (err?: unknown) => void) => void

// --- [P5TPL-1] feature toggle is admin-only --------------------------------

describe('campaigns: POST /:id/feature authorization', () => {
  let router: RouterFn

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'caller'
    paramId = 'camp-1'
    const mod = await import('../handlers/campaigns.js')
    router = mod.default as unknown as RouterFn
  })

  it('rejects a non-admin authenticated user with 403 and does not toggle', async () => {
    db.findById.mockImplementation((table: string) =>
      table === 'users' ? Promise.resolve({ id: 'caller', role: 'user' }) : Promise.resolve(null),
    )
    const res = await dispatch(router, 'POST', '/camp-1/feature')
    expect(res.statusCode).toBe(403)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('rejects the campaign owner (non-admin) from featuring their own campaign', async () => {
    db.findById.mockImplementation((table: string) =>
      table === 'users'
        ? Promise.resolve({ id: 'caller', role: 'user' })
        : Promise.resolve({ id: 'camp-1', creator_id: 'caller', featured: false }),
    )
    const res = await dispatch(router, 'POST', '/camp-1/feature')
    expect(res.statusCode).toBe(403)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated caller with 401 (before any role lookup)', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/camp-1/feature')
    expect(res.statusCode).toBe(401)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('allows an admin to toggle the featured flag', async () => {
    db.findById.mockImplementation((table: string) =>
      table === 'users'
        ? Promise.resolve({ id: 'caller', role: 'admin' })
        : Promise.resolve({ id: 'camp-1', creator_id: 'someone', featured: false }),
    )
    db.updateById.mockResolvedValue({ data: { id: 'camp-1', featured: true } })
    const res = await dispatch(router, 'POST', '/camp-1/feature')
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledTimes(1)
    expect(db.updateById.mock.calls[0][2]).toMatchObject({ featured: true })
  })
})

// --- [P5TPL-2] backers_only updates are gated ------------------------------

describe('updates: backers_only visibility', () => {
  let router: RouterFn

  const publicUpdate = { id: 'u-pub', campaign_id: 'camp-1', backers_only: false, title: 'Public' }
  const privateUpdate = {
    id: 'u-priv',
    campaign_id: 'camp-1',
    backers_only: true,
    title: 'Backers only',
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'caller'
    paramId = 'u-priv'
    const mod = await import('../handlers/updates.js')
    router = mod.default as unknown as RouterFn
  })

  it('hides backers_only updates from a non-backer in the campaign list', async () => {
    db.findMany.mockImplementation((table: string) => {
      if (table === 'campaign_updates') return Promise.resolve([publicUpdate, privateUpdate])
      if (table === 'pledges') return Promise.resolve([]) // no active pledge
      return Promise.resolve([])
    })
    db.findById.mockImplementation((table: string) =>
      table === 'campaigns'
        ? Promise.resolve({ id: 'camp-1', creator_id: 'other' })
        : Promise.resolve(null),
    )
    const res = await dispatch(router, 'GET', '/campaign/camp-1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([publicUpdate])
  })

  it('hides backers_only updates from anonymous callers in the campaign list', async () => {
    currentUserId = null
    db.findMany.mockImplementation((table: string) =>
      table === 'campaign_updates'
        ? Promise.resolve([publicUpdate, privateUpdate])
        : Promise.resolve([]),
    )
    const res = await dispatch(router, 'GET', '/campaign/camp-1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([publicUpdate])
    // Anonymous: no campaign/pledge lookup needed.
    expect(db.findById).not.toHaveBeenCalled()
  })

  it('shows backers_only updates to an active backer in the campaign list', async () => {
    db.findMany.mockImplementation((table: string) => {
      if (table === 'campaign_updates') return Promise.resolve([publicUpdate, privateUpdate])
      if (table === 'pledges') return Promise.resolve([{ id: 'p-1', status: 'active' }])
      return Promise.resolve([])
    })
    db.findById.mockImplementation((table: string) =>
      table === 'campaigns'
        ? Promise.resolve({ id: 'camp-1', creator_id: 'other' })
        : Promise.resolve(null),
    )
    const res = await dispatch(router, 'GET', '/campaign/camp-1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([publicUpdate, privateUpdate])
  })

  it('shows backers_only updates to the campaign creator in the campaign list', async () => {
    db.findMany.mockImplementation((table: string) =>
      table === 'campaign_updates'
        ? Promise.resolve([publicUpdate, privateUpdate])
        : Promise.resolve([]),
    )
    db.findById.mockImplementation((table: string) =>
      table === 'campaigns'
        ? Promise.resolve({ id: 'camp-1', creator_id: 'caller' })
        : Promise.resolve(null),
    )
    const res = await dispatch(router, 'GET', '/campaign/camp-1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([publicUpdate, privateUpdate])
  })

  it('404s a backers_only update detail for a non-backer', async () => {
    db.findById.mockImplementation((table: string) => {
      if (table === 'campaign_updates') return Promise.resolve(privateUpdate)
      if (table === 'campaigns') return Promise.resolve({ id: 'camp-1', creator_id: 'other' })
      return Promise.resolve(null)
    })
    db.findMany.mockResolvedValue([]) // no active pledge
    const res = await dispatch(router, 'GET', '/u-priv')
    expect(res.statusCode).toBe(404)
  })

  it('returns a public update detail to anyone', async () => {
    paramId = 'u-pub'
    db.findById.mockImplementation((table: string) =>
      table === 'campaign_updates' ? Promise.resolve(publicUpdate) : Promise.resolve(null),
    )
    const res = await dispatch(router, 'GET', '/u-pub')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(publicUpdate)
  })

  it('returns a backers_only update detail to an active backer', async () => {
    db.findById.mockImplementation((table: string) => {
      if (table === 'campaign_updates') return Promise.resolve(privateUpdate)
      if (table === 'campaigns') return Promise.resolve({ id: 'camp-1', creator_id: 'other' })
      return Promise.resolve(null)
    })
    db.findMany.mockResolvedValue([{ id: 'p-1', status: 'active' }])
    const res = await dispatch(router, 'GET', '/u-priv')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(privateUpdate)
  })
})
