import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks for all @molecule/* deps the team handler imports --------------

let currentUserId: string | null = 'owner-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
}))

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => db.findById(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  create: (...args: unknown[]) => db.create(...args),
  query: (...args: unknown[]) => db.query(...args),
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

// --- Test helpers ---------------------------------------------------------

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  locals: Record<string, unknown>
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    locals: {},
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
  reqBody: Record<string, unknown>,
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

describe('team invite — cross-tenant ownership (TPL-003)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'owner-1'
    const mod = await import('../handlers/team.js')
    router = mod.default as unknown as typeof router
  })

  it('rejects an invite to a project the caller does not own with 404 and writes no row', async () => {
    // invitee lookup (by email) returns a registered user
    db.findMany.mockResolvedValue([{ id: 'invitee-9' }])
    // projects table: the supplied projectId belongs to someone else
    db.findById.mockResolvedValue({ id: 'victim-project', user_id: 'someone-else' })

    const res = await dispatch(router, 'POST', '/invite', {
      email: 'mallory@example.com',
      role: 'admin',
      projectId: 'victim-project',
    })

    expect(res.statusCode).toBe(404)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows an invite to a project the caller owns (201)', async () => {
    db.findMany.mockResolvedValue([{ id: 'invitee-9' }])
    db.findById.mockResolvedValue({ id: 'my-project', user_id: 'owner-1' })
    db.create.mockResolvedValue({
      data: { id: 'collab-1', project_id: 'my-project', user_id: 'invitee-9', role: 'admin' },
    })

    const res = await dispatch(router, 'POST', '/invite', {
      email: 'friend@example.com',
      role: 'admin',
      projectId: 'my-project',
    })

    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledTimes(1)
    const [table, payload] = db.create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('project_collaborators')
    expect(payload.project_id).toBe('my-project')
    expect(payload.user_id).toBe('invitee-9')
  })

  it('still allows the fallback path (no projectId) into the caller-owned project (201)', async () => {
    // invitee lookup
    db.findMany.mockImplementation((table: string) => {
      if (table === 'users') return Promise.resolve([{ id: 'invitee-9' }])
      // fallback project selection (scoped to caller's own user_id)
      if (table === 'projects') return Promise.resolve([{ id: 'fallback-project' }])
      return Promise.resolve([])
    })
    // ownership re-check against the fallback project
    db.findById.mockResolvedValue({ id: 'fallback-project', user_id: 'owner-1' })
    db.create.mockResolvedValue({
      data: {
        id: 'collab-2',
        project_id: 'fallback-project',
        user_id: 'invitee-9',
        role: 'editor',
      },
    })

    const res = await dispatch(router, 'POST', '/invite', {
      email: 'friend@example.com',
      role: 'editor',
    })

    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledTimes(1)
  })

  it('rejects an unauthenticated invite with 401 before any DB write', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/invite', {
      email: 'mallory@example.com',
      projectId: 'victim-project',
    })
    expect(res.statusCode).toBe(401)
    expect(db.create).not.toHaveBeenCalled()
  })
})
