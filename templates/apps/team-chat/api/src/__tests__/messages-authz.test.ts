/**
 * Regression tests for the channel-membership read/mutate gates across the
 * messages, threads, reactions, and members routers (broken-access-control /
 * cross-tenant IDOR fixes).
 *
 * Before the fix these routes were gated only by `requireAuth` (a valid
 * session) and addressed rows purely by client-supplied ids, so any
 * authenticated user could:
 *
 *   - TPL-001: GET /messages?channel_id=:any-channel and read its messages,
 *     or GET /messages (no scope) to dump every message; search returned hits
 *     from channels they could not see.
 *   - TPL-002: GET /messages/:id and read any message by id.
 *   - TPL-003: GET /threads / GET /threads/:messageId/replies and read any
 *     channel's thread content (or, unscoped, the whole thread_replies table).
 *   - TPL-004: GET /reactions/:messageId and list reactions on any message.
 *   - TPL-005: PUT/DELETE /members/:channelId/:memberId against a membership
 *     row belonging to a DIFFERENT channel (cross-channel membership mutation),
 *     because the row was addressed by id alone after an admin check on the
 *     PATH channel.
 *
 * These tests assert the secure behavior: non-members get 403, unscoped reads
 * get 400, cross-channel member mutations get 404, and legitimate members /
 * admins still succeed.
 *
 * No database is required: `@molecule/api-database` and the auth bond are
 * mocked with an in-memory store, and the real routers are exercised over HTTP.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

interface Row {
  [key: string]: unknown
}

const { store, searchState, resetStore } = vi.hoisted(() => {
  const tables: Record<string, Row[]> = {}
  const searchState: Record<string, Row[]> = { messages: [], channels: [] }
  const resetStore = (): void => {
    // Two channels in different tenants. `member` belongs to c1 only;
    // `other` belongs to c2 only; `outsider` belongs to nothing.
    tables.channels = [
      { id: 'c1', created_by: 'owner', is_private: false, name: 'general' },
      { id: 'c2', created_by: 'other', is_private: true, name: 'secret' },
    ]
    tables.channel_members = [
      { id: 'm1', channel_id: 'c1', user_id: 'owner', role: 'admin' },
      { id: 'm2', channel_id: 'c1', user_id: 'member', role: 'member' },
      { id: 'm3', channel_id: 'c2', user_id: 'other', role: 'admin' },
    ]
    tables.messages = [
      { id: 'msg1', channel_id: 'c1', user_id: 'owner', content: 'hi', reply_count: 0 },
      { id: 'msg2', channel_id: 'c2', user_id: 'other', content: 'secret', reply_count: 0 },
    ]
    tables.reactions = [
      { id: 'r1', message_id: 'msg1', user_id: 'owner', emoji: '👍' },
      { id: 'r2', message_id: 'msg2', user_id: 'other', emoji: '🤫' },
    ]
    tables.thread_replies = [
      { id: 'tr1', parent_message_id: 'msg1', channel_id: 'c1', user_id: 'owner', content: 'a' },
      { id: 'tr2', parent_message_id: 'msg2', channel_id: 'c2', user_id: 'other', content: 'b' },
    ]
    tables.users = [
      { id: 'owner', name: 'Owner' },
      { id: 'member', name: 'Member' },
      { id: 'other', name: 'Other' },
    ]
    searchState.messages = []
    searchState.channels = []
  }
  return { store: tables, searchState, resetStore }
})

const matches = (row: Row, where: { field: string; operator: string; value: unknown }[]): boolean =>
  where.every((c) => {
    const cell = row[c.field]
    if (c.operator === 'in') return (c.value as unknown[]).map(String).includes(String(cell))
    // Mirror the real bond's `ilike`: case-insensitive substring (contains) match.
    if (c.operator === 'ilike')
      return String(cell).toLowerCase().includes(String(c.value).toLowerCase())
    return String(cell) === String(c.value)
  })

vi.mock('@molecule/api-database', () => ({
  findById: async (table: string, id: string) =>
    (store[table] ?? []).find((r) => String(r.id) === String(id)) ?? null,
  findMany: async (
    table: string,
    opts?: { where?: { field: string; operator: string; value: unknown }[] },
  ) => {
    const where = opts?.where ?? []
    return (store[table] ?? []).filter((r) => matches(r, where))
  },
  count: async (table: string, where?: { field: string; operator: string; value: unknown }[]) =>
    (store[table] ?? []).filter((r) => matches(r, where ?? [])).length,
  create: async (table: string, data: Row) => {
    const row = { id: `${table}-${(store[table]?.length ?? 0) + 1}`, ...data }
    ;(store[table] ??= []).push(row)
    return { data: row }
  },
  updateById: async (table: string, id: string, patch: Row) => {
    const row = (store[table] ?? []).find((r) => String(r.id) === String(id))
    if (!row) return { data: null }
    Object.assign(row, patch)
    return { data: row }
  },
  deleteById: async (table: string, id: string) => {
    const list = store[table] ?? []
    const idx = list.findIndex((r) => String(r.id) === String(id))
    if (idx >= 0) list.splice(idx, 1)
    return { data: { id } }
  },
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string | undefined
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.locals.session = { userId }
    next()
  },
  getUserId: (res: express.Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: express.Request, name = 'id') => req.params[name],
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))

vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => undefined) }))

vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  search: vi.fn(async (collection: string) => ({
    hits: (searchState[collection] ?? []).map((document) => ({ document })),
  })),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

let server: Server
let baseUrl: string

const req = (method: string, path: string, userId?: string, body?: unknown): Promise<Response> =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

beforeAll(async () => {
  const { default: messagesRouter } = await import('../handlers/messages.js')
  const { default: threadsRouter } = await import('../handlers/threads.js')
  const { default: reactionsRouter } = await import('../handlers/reactions.js')
  const { default: membersRouter } = await import('../handlers/members.js')
  const app = express()
  app.use(express.json())
  app.use('/messages', messagesRouter)
  app.use('/threads', threadsRouter)
  app.use('/reactions', reactionsRouter)
  app.use('/members', membersRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server?.close()
})

beforeEach(() => {
  resetStore()
})

describe('messages read authorization (TPL-001 / TPL-002)', () => {
  it('400s GET /messages with no channel scope (no more dumping all messages)', async () => {
    const res = await req('GET', '/messages', 'member')
    expect(res.status).toBe(400)
  })

  it('403s GET /messages?channel_id for a non-member channel', async () => {
    const res = await req('GET', '/messages?channel_id=c2', 'member')
    expect(res.status).toBe(403)
  })

  it('returns scoped messages for a member of the channel', async () => {
    const res = await req('GET', '/messages?channel_id=c1', 'member')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['msg1'])
  })

  it('filters search hits to the caller member channels', async () => {
    searchState.messages = [
      { id: 'msg1', channel_id: 'c1', user_id: 'owner', content: 'hi' },
      { id: 'msg2', channel_id: 'c2', user_id: 'other', content: 'secret' },
    ]
    const res = await req('GET', '/messages?search=anything', 'member')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['msg1'])
  })

  it('403s GET /messages/:id for a message in a non-member channel', async () => {
    const res = await req('GET', '/messages/msg2', 'member')
    expect(res.status).toBe(403)
  })

  it('200s GET /messages/:id for a member, 404s a missing message', async () => {
    const ok = await req('GET', '/messages/msg1', 'member')
    expect(ok.status).toBe(200)
    expect(((await ok.json()) as Row).id).toBe('msg1')

    const missing = await req('GET', '/messages/nope', 'member')
    expect(missing.status).toBe(404)
  })
})

describe('mentions feed (notifications page) — GET /messages/mentions', () => {
  it('returns messages that @-mention the caller, scoped to channels they belong to', async () => {
    // A mention in c1 (the caller IS a member) and a mention in c2 (NOT a
    // member). Only the in-channel mention may surface — never the c2 one.
    store.messages.push(
      {
        id: 'mnt1',
        channel_id: 'c1',
        user_id: 'owner',
        content: 'hey @Member can you review?',
        created_at: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'mnt2',
        channel_id: 'c2',
        user_id: 'other',
        content: 'psst @member secret',
        created_at: '2026-01-03T00:00:00.000Z',
      },
    )
    const res = await req('GET', '/messages/mentions', 'member')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['mnt1'])
    // hydrateUsers fills in the author's display name from the users table.
    expect(rows[0]?.user_name).toBe('Owner')
  })

  it('returns an empty feed for a user with no @-mentions', async () => {
    const res = await req('GET', '/messages/mentions', 'member')
    expect(res.status).toBe(200)
    expect((await res.json()) as Row[]).toEqual([])
  })

  it('does not capture "mentions" as a message id (route ordering)', async () => {
    // GET /messages/mentions must hit the mentions handler, not /:id → 404.
    const res = await req('GET', '/messages/mentions', 'member')
    expect(res.status).toBe(200)
  })
})

describe('threads read authorization (TPL-003)', () => {
  it('400s GET /threads with no scope', async () => {
    const res = await req('GET', '/threads', 'member')
    expect(res.status).toBe(400)
  })

  it('403s GET /threads?channel_id for a non-member channel', async () => {
    const res = await req('GET', '/threads?channel_id=c2', 'member')
    expect(res.status).toBe(403)
  })

  it('403s GET /threads?message_id for a message in a non-member channel', async () => {
    const res = await req('GET', '/threads?message_id=msg2', 'member')
    expect(res.status).toBe(403)
  })

  it('returns replies for a member-scoped channel query', async () => {
    const res = await req('GET', '/threads?channel_id=c1', 'member')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['tr1'])
  })

  it('403s GET /threads/:messageId/replies for a non-member, 200s for a member', async () => {
    const denied = await req('GET', '/threads/msg2/replies', 'member')
    expect(denied.status).toBe(403)

    const allowed = await req('GET', '/threads/msg1/replies', 'member')
    expect(allowed.status).toBe(200)
    const rows = (await allowed.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['tr1'])
  })
})

describe('reactions read authorization (TPL-004)', () => {
  it('403s GET /reactions/:messageId for a message in a non-member channel', async () => {
    const res = await req('GET', '/reactions/msg2', 'member')
    expect(res.status).toBe(403)
  })

  it('200s GET /reactions/:messageId for a member', async () => {
    const res = await req('GET', '/reactions/msg1', 'member')
    expect(res.status).toBe(200)
    const rows = (await res.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['r1'])
  })
})

describe('members cross-channel mutation (TPL-005)', () => {
  it('404s PUT /members/:channelId/:memberId when the row belongs to another channel', async () => {
    // owner administers c1 but m3 is a membership of c2.
    const res = await req('PUT', '/members/c1/m3', 'owner', { role: 'member' })
    expect(res.status).toBe(404)
    expect(store.channel_members.find((r) => r.id === 'm3')?.role).toBe('admin')
  })

  it('404s DELETE /members/:channelId/:memberId when the row belongs to another channel', async () => {
    const res = await req('DELETE', '/members/c1/m3', 'owner')
    expect(res.status).toBe(404)
    expect(store.channel_members.some((r) => r.id === 'm3')).toBe(true)
  })

  it('still allows legitimate within-channel role update and removal', async () => {
    const upd = await req('PUT', '/members/c1/m2', 'owner', { role: 'admin' })
    expect(upd.status).toBe(200)
    expect(store.channel_members.find((r) => r.id === 'm2')?.role).toBe('admin')

    const del = await req('DELETE', '/members/c1/m2', 'owner')
    expect(del.status).toBe(204)
    expect(store.channel_members.some((r) => r.id === 'm2')).toBe(false)
  })
})

describe('archived channels are read-only (messages, reactions, thread replies)', () => {
  it('201s posting to an active channel', async () => {
    const res = await req('POST', '/messages', 'member', { channel_id: 'c1', content: 'hi' })
    expect(res.status).toBe(201)
  })

  it('403s posting to an archived channel and persists nothing', async () => {
    const c1 = store.channels.find((c) => c.id === 'c1')
    if (c1) c1.is_archived = true
    const res = await req('POST', '/messages', 'member', { channel_id: 'c1', content: 'nope' })
    expect(res.status).toBe(403)
    expect(store.messages.some((m) => m.content === 'nope')).toBe(false)
  })

  it('201s adding a reaction in an active channel', async () => {
    const res = await req('POST', '/reactions/msg1', 'member', { emoji: '🎉' })
    expect(res.status).toBe(201)
  })

  it('403s adding a reaction in an archived channel and persists nothing', async () => {
    const c1 = store.channels.find((c) => c.id === 'c1')
    if (c1) c1.is_archived = true
    const before = store.reactions.length
    const res = await req('POST', '/reactions/msg1', 'member', { emoji: '🎉' })
    expect(res.status).toBe(403)
    expect(store.reactions.length).toBe(before)
  })

  it('201s posting a thread reply in an active channel', async () => {
    const res = await req('POST', '/threads/msg1/replies', 'member', { content: 'yo' })
    expect(res.status).toBe(201)
  })

  it('403s posting a thread reply in an archived channel and persists nothing', async () => {
    const c1 = store.channels.find((c) => c.id === 'c1')
    if (c1) c1.is_archived = true
    const before = store.thread_replies.length
    const res = await req('POST', '/threads/msg1/replies', 'member', { content: 'nope' })
    expect(res.status).toBe(403)
    expect(store.thread_replies.length).toBe(before)
  })
})
