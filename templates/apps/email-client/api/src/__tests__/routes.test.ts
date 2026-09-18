import express from 'express'
import { describe, expect, it, vi } from 'vitest'

// Reusable mocks: every handler imports @molecule/api-database directly, plus
// @molecule/api-i18n, @molecule/api-emails (emails handler), and
// @molecule/api-search (emails handler search path). Testing them in isolation
// without spinning up Postgres requires shimming these modules.

const fakeStore = {
  emails: new Map<string, Record<string, unknown>>(),
  email_folders: new Map<string, Record<string, unknown>>(),
  email_labels: new Map<string, Record<string, unknown>>(),
  email_label_assignments: new Map<string, Record<string, unknown>>(),
}

const reset = (): void => {
  for (const map of Object.values(fakeStore)) map.clear()
}

let nextId = 1
const newId = (): string => `00000000-0000-0000-0000-${String(nextId++).padStart(12, '0')}`

const matchesWhere = (
  row: Record<string, unknown>,
  where: Array<{ field: string; operator: string; value: unknown }>,
): boolean => {
  for (const w of where) {
    const v = row[w.field]
    if (w.operator === '=' && v !== w.value) return false
    if (w.operator === '!=' && v === w.value) return false
  }
  return true
}

vi.mock('@molecule/api-database', () => ({
  deleteById: vi.fn(),
  query: vi.fn(() => ({ rows: [] })),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  findById: vi.fn(
    async (table: keyof typeof fakeStore, id: string) => fakeStore[table].get(id) ?? null,
  ),
  findOne: vi.fn(
    async (
      table: keyof typeof fakeStore,
      where: Array<{ field: string; operator: string; value: unknown }>,
    ) => {
      for (const row of fakeStore[table].values()) if (matchesWhere(row, where)) return row
      return null
    },
  ),
  findMany: vi.fn(
    async (
      table: keyof typeof fakeStore,
      opts?: { where?: Array<{ field: string; operator: string; value: unknown }>; limit?: number },
    ) => {
      const rows = Array.from(fakeStore[table].values()).filter((r) =>
        opts?.where ? matchesWhere(r, opts.where) : true,
      )
      return opts?.limit ? rows.slice(0, opts.limit) : rows
    },
  ),
  count: vi.fn(async () => 0),
  create: vi.fn(async (table: keyof typeof fakeStore, data: Record<string, unknown>) => {
    const id = (data.id as string | undefined) ?? newId()
    const row = { ...data, id }
    fakeStore[table].set(id, row)
    return { data: row, affected: 1 }
  }),
  updateById: vi.fn(
    async (table: keyof typeof fakeStore, id: string, data: Record<string, unknown>) => {
      const existing = fakeStore[table].get(id)
      if (!existing) return { data: null, affected: 0 }
      const updated = { ...existing, ...data, id }
      fakeStore[table].set(id, updated)
      return { data: updated, affected: 1 }
    },
  ),
  updateMany: vi.fn(async () => ({ data: [], affected: 0 })),
  deleteMany: vi.fn(
    async (
      table: keyof typeof fakeStore,
      where: Array<{ field: string; operator: string; value: unknown }>,
    ) => {
      let n = 0
      for (const [id, row] of fakeStore[table]) {
        if (matchesWhere(row, where)) {
          fakeStore[table].delete(id)
          n++
        }
      }
      return { data: null, affected: n }
    },
  ),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn(async () => undefined),
  setProvider: vi.fn(),
}))

vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  search: vi.fn(async () => ({ hits: [] })),
  setProvider: vi.fn(),
}))

// The create routes now carry enforceLimit middleware; this suite exercises CRUD, not entitlement
// enforcement (that lives in tier-limits.test.ts), so pass the limit through here.
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: express.Request, _res: express.Response, next: () => void) => next(),
}))

const buildApp = async (sessionUserId: string | null): Promise<express.Express> => {
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    res.locals.session = sessionUserId ? { userId: sessionUserId } : undefined
    next()
  })
  const emails = (await import('../handlers/emails.js')).default
  const folders = (await import('../handlers/folders.js')).default
  const labels = (await import('../handlers/labels.js')).default
  const drafts = (await import('../handlers/drafts.js')).default
  app.use('/emails', emails)
  app.use('/folders', folders)
  app.use('/labels', labels)
  app.use('/drafts', drafts)
  return app
}

const send = async (
  app: express.Express,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> => {
  return await new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = (server.address() as { port: number }).port
      const data = body !== undefined ? JSON.stringify(body) : undefined
      const headers: Record<string, string> = {}
      if (data) {
        headers['content-type'] = 'application/json'
        headers['content-length'] = String(Buffer.byteLength(data))
      }
      import('node:http').then((http) => {
        const req2 = http.request(
          { hostname: '127.0.0.1', port, path, method: method.toUpperCase(), headers },
          (res) => {
            const chunks: Buffer[] = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => {
              server.close()
              const text = Buffer.concat(chunks).toString('utf8')
              let parsed: unknown = text
              try {
                parsed = text ? JSON.parse(text) : ''
              } catch (_error) {
                // keep as text — response body is not JSON
              }
              resolve({ status: res.statusCode ?? 0, body: parsed })
            })
          },
        )
        req2.on('error', reject)
        if (data) req2.write(data)
        req2.end()
      })
    })
  })
}

describe('emails handler', () => {
  it('rejects unauthenticated GET /emails with 401', async () => {
    reset()
    const app = await buildApp(null)
    const res = await send(app, 'get', '/emails')
    expect(res.status).toBe(401)
  })

  it('returns owner-scoped list (no IDOR)', async () => {
    reset()
    const userA = 'user-A'
    const userB = 'user-B'
    const appA = await buildApp(userA)
    const appB = await buildApp(userB)
    await send(appA, 'post', '/emails/send', { to: 'x@y.com', subject: 'hi', body: '' })
    await send(appB, 'post', '/emails/send', { to: 'x@y.com', subject: 'theirs', body: '' })
    const listA = await send(appA, 'get', '/emails?folder=sent')
    expect(Array.isArray(listA.body)).toBe(true)
    const subjects = (listA.body as Array<{ subject: string }>).map((r) => r.subject)
    // Real IDOR check: userB's subject must not leak into userA's list.
    // (userA's listing may also contain seed-data emails for the Sent
    // folder, which is fine — they belong to userA.)
    expect(subjects).toContain('hi')
    expect(subjects).not.toContain('theirs')
  })

  it('rejects POST /emails/send with invalid body (400)', async () => {
    reset()
    const app = await buildApp('user-A')
    const res = await send(app, 'post', '/emails/send', { subject: '', body: '' })
    expect(res.status).toBe(400)
  })

  it("returns 404 when reading another user's email (no IDOR)", async () => {
    reset()
    const appA = await buildApp('user-A')
    const appB = await buildApp('user-B')
    const created = await send(appA, 'post', '/emails/send', {
      to: 'x@y.com',
      subject: 'hi',
      body: '',
    })
    const id = (created.body as { id: string }).id
    const res = await send(appB, 'get', `/emails/${id}`)
    expect(res.status).toBe(404)
  })
})

describe('drafts handler', () => {
  it('CRUDs an owner-scoped draft', async () => {
    reset()
    const app = await buildApp('user-A')
    const created = await send(app, 'post', '/drafts', { subject: 'wip' })
    expect(created.status).toBe(201)
    const id = (created.body as { id: string }).id
    const list = await send(app, 'get', '/drafts')
    // The handler seeds a welcome draft on first-use, so the list will
    // contain the seed + the newly-created draft. Verify the new draft
    // is present rather than asserting an exact length.
    const ids = (list.body as Array<{ id: string }>).map((r) => r.id)
    expect(ids).toContain(id)
    const updated = await send(app, 'put', `/drafts/${id}`, { body: 'now with content' })
    expect(updated.status).toBe(200)
    const del = await send(app, 'delete', `/drafts/${id}`)
    expect(del.status).toBe(204)
  })

  it('rejects unauthenticated draft list with 401', async () => {
    reset()
    const app = await buildApp(null)
    const res = await send(app, 'get', '/drafts')
    expect(res.status).toBe(401)
  })
})

describe('folders handler', () => {
  it('creates folder and rejects validation failure', async () => {
    reset()
    const app = await buildApp('user-A')
    const ok = await send(app, 'post', '/folders', { name: 'Work' })
    expect(ok.status).toBe(201)
    const bad = await send(app, 'post', '/folders', { name: '' })
    expect(bad.status).toBe(400)
  })
})

describe('labels handler', () => {
  it("forbids assigning another user's label (no IDOR)", async () => {
    reset()
    const appA = await buildApp('user-A')
    const appB = await buildApp('user-B')
    const labelB = await send(appB, 'post', '/labels', { name: 'B-only' })
    const emailA = await send(appA, 'post', '/emails/send', {
      to: 'x@y.com',
      subject: 'mine',
      body: '',
    })
    const labelId = (labelB.body as { id: string }).id
    const emailId = (emailA.body as { id: string }).id
    const assign = await send(appA, 'post', `/labels/${labelId}/emails/${emailId}`)
    expect(assign.status).toBe(404)
  })
})
