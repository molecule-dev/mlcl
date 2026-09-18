/**
 * Regression tests for the channel authorization gate (IDOR / multi-tenant fix).
 *
 * Before the fix, every channels PUT/DELETE/archive/unarchive only checked for
 * a session and mutated by URL id — so any authenticated user could rename,
 * delete, or archive ANY channel (including another workspace's), and GET
 * listed/exposed every channel. These tests assert the secure behavior:
 *
 *   - non-members get 403 on read/mutate, 404 on missing channels
 *   - non-admin members can rename but cannot flip privacy or delete
 *   - creators/admins succeed
 *   - GET /channels is scoped to channels the caller belongs to
 *
 * No database is required: `@molecule/api-database` and the auth bond are
 * mocked with an in-memory store, and the real channels router is exercised
 * over HTTP.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

interface Row {
  [key: string]: unknown
}

const { store, resetStore } = vi.hoisted(() => {
  const tables: Record<string, Row[]> = {}
  const resetStore = (): void => {
    tables.channels = [{ id: 'c1', created_by: 'owner', is_private: false, name: 'general' }]
    tables.channel_members = [
      { id: 'm1', channel_id: 'c1', user_id: 'owner', role: 'admin' },
      { id: 'm2', channel_id: 'c1', user_id: 'member', role: 'member' },
    ]
    tables.messages = []
    tables.reactions = []
    tables.thread_replies = []
  }
  return { store: tables, resetStore }
})

const matches = (row: Row, where: { field: string; operator: string; value: unknown }[]): boolean =>
  where.every((c) => {
    const cell = row[c.field]
    if (c.operator === 'in') return (c.value as unknown[]).map(String).includes(String(cell))
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

vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  search: vi.fn(async () => ({ hits: [] })),
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
  const { default: channelsRouter } = await import('../handlers/channels.js')
  const app = express()
  app.use(express.json())
  app.use('/channels', channelsRouter)
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

describe('channels authorization (IDOR / multi-tenant)', () => {
  it('scopes GET /channels to channels the caller is a member of', async () => {
    const outsider = await req('GET', '/channels', 'outsider')
    expect(outsider.status).toBe(200)
    expect(await outsider.json()).toEqual([])

    const member = await req('GET', '/channels', 'member')
    expect(member.status).toBe(200)
    const rows = (await member.json()) as Row[]
    expect(rows.map((r) => r.id)).toEqual(['c1'])
  })

  it('403s GET /channels/:id for a non-member', async () => {
    const res = await req('GET', '/channels/c1', 'outsider')
    expect(res.status).toBe(403)
  })

  it('403s PUT (rename) for a non-member', async () => {
    const res = await req('PUT', '/channels/c1', 'outsider', { name: 'hacked' })
    expect(res.status).toBe(403)
    expect(store.channels[0].name).toBe('general')
  })

  it('allows a non-admin member to rename', async () => {
    const res = await req('PUT', '/channels/c1', 'member', { name: 'renamed' })
    expect(res.status).toBe(200)
    expect(store.channels[0].name).toBe('renamed')
  })

  it('403s a non-admin member flipping is_private, but lets an admin', async () => {
    const denied = await req('PUT', '/channels/c1', 'member', { is_private: true })
    expect(denied.status).toBe(403)
    expect(store.channels[0].is_private).toBe(false)

    const allowed = await req('PUT', '/channels/c1', 'owner', { is_private: true })
    expect(allowed.status).toBe(200)
    expect(store.channels[0].is_private).toBe(true)
  })

  it('403s DELETE for a non-admin member and a non-member, but lets the creator', async () => {
    const member = await req('DELETE', '/channels/c1', 'member')
    expect(member.status).toBe(403)
    expect(store.channels).toHaveLength(1)

    const outsider = await req('DELETE', '/channels/c1', 'outsider')
    expect(outsider.status).toBe(403)
    expect(store.channels).toHaveLength(1)

    const owner = await req('DELETE', '/channels/c1', 'owner')
    expect(owner.status).toBe(204)
    expect(store.channels).toHaveLength(0)
  })

  it('404s DELETE/PUT for a missing channel (no more silent 204)', async () => {
    const del = await req('DELETE', '/channels/does-not-exist', 'owner')
    expect(del.status).toBe(404)

    const put = await req('PUT', '/channels/does-not-exist', 'owner', { name: 'x' })
    expect(put.status).toBe(404)
  })

  it('403s archive/unarchive for a non-member, allows a member', async () => {
    const denied = await req('POST', '/channels/c1/archive', 'outsider')
    expect(denied.status).toBe(403)

    const allowed = await req('POST', '/channels/c1/archive', 'member')
    expect(allowed.status).toBe(200)
    expect(store.channels[0].is_archived).toBe(true)
  })
})
