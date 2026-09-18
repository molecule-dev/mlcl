/**
 * Security regressions for the files handler.
 *
 * Verifies the cross-tenant S3-read IDOR fix: the object-storage key is
 * NEVER taken from the client. A client-supplied `storage_key` in the
 * create body must be IGNORED — the server always mints its own key.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture every `create('files', …)` payload so we can assert on the
// persisted storage_key.
const createCalls: Array<{ table: string; data: Record<string, unknown> }> = []

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async (table: string, data: Record<string, unknown>) => {
    createCalls.push({ table, data })
    return { data: { id: 'row-1', ...data } }
  }),
  count: vi.fn(async () => 0),
  findById: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  findOne: vi.fn(async () => null),
  updateById: vi.fn(async (_t: string, _id: string, data: Record<string, unknown>) => ({
    data: { id: _id, ...data },
  })),
  deleteById: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}))

vi.mock('@molecule/api-uploads', () => ({
  getProvider: vi.fn(() => ({ getFile: vi.fn(), deleteFile: vi.fn(), upload: vi.fn() })),
  hasProvider: vi.fn(() => true),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeEach(async () => {
  createCalls.length = 0
  const { default: filesRouter } = await import('../handlers/files.js')
  const app = express()
  app.use(express.json())
  // Stand in for the auth middleware: every request is user "alice".
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'alice' }
    next()
  })
  app.use('/files', filesRouter)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('files.create — storage_key IDOR fix', () => {
  it('IGNORES a client-supplied storage_key and mints a server-side key', async () => {
    const res = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'evil.txt',
        size: 10,
        // Attacker tries to point the row at another tenant's object.
        storage_key: 'victims-secret-object-key',
      }),
    })

    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
    const persisted = createCalls[0]
    expect(persisted.table).toBe('files')
    // The attacker's key must NOT be persisted.
    expect(persisted.data.storage_key).not.toBe('victims-secret-object-key')
    // The server minted a UUID instead.
    expect(persisted.data.storage_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(persisted.data.owner_id).toBe('alice')
  })

  it('mints a server-side key even when no storage_key is provided', async () => {
    const res = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'doc.txt', size: 5 }),
    })

    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0].data.storage_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })
})
