/**
 * Regression tests for notification authorization (L2-1 mark-read IDOR,
 * L2-3 create-side recipient spoofing).
 *
 * Drives the real notifications router over a live ephemeral express server
 * with the DataStore mocked, so the actual route + validation behavior is
 * exercised end-to-end.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// i18n: return the provided defaultValue so error bodies are deterministic.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

const create = vi.fn()
const findById = vi.fn()
const findMany = vi.fn()
const updateById = vi.fn()
const deleteById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => create(...args),
  findById: (...args: unknown[]) => findById(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  deleteById: (...args: unknown[]) => deleteById(...args),
}))

const SESSION_USER = 'session-user-1'
const VICTIM_USER = 'victim-user-2'

let server: Server
let baseUrl: string

beforeEach(async () => {
  vi.resetAllMocks()
  const router = (await import('../handlers/notifications.js')).default
  const app = express()
  app.use(express.json())
  // Simulate the authenticated router: populate the session as the auth
  // middleware would for a logged-in caller.
  app.use((_req, res, next) => {
    res.locals.session = { userId: SESSION_USER }
    next()
  })
  app.use('/notifications', router)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('POST /notifications — recipient spoofing (L2-3)', () => {
  it('forces the recipient to the session user, ignoring an attacker-supplied target_user_id', async () => {
    create.mockResolvedValue({ data: { id: 'n1' } })

    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'mention',
        target_user_id: VICTIM_USER,
        payload: { text: 'fake mention' },
      }),
    })

    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [table, row] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('notifications')
    // The exploit attempt MUST NOT land in the victim's feed.
    expect(row.user_id).toBe(SESSION_USER)
    expect(row.user_id).not.toBe(VICTIM_USER)
    // actor is also the session user (no third-party impersonation).
    expect(row.actor_id).toBe(SESSION_USER)
  })

  it('still creates a legitimate self-notification', async () => {
    create.mockResolvedValue({ data: { id: 'n2' } })

    const res = await fetch(`${baseUrl}/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'reply', payload: { text: 'hi' } }),
    })

    expect(res.status).toBe(201)
    const [, row] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(row.user_id).toBe(SESSION_USER)
    expect(row.kind).toBe('reply')
  })

  it('rejects an unauthenticated caller with 401', async () => {
    // No session → requireSession returns 401. Re-mount without the session mw.
    const router = (await import('../handlers/notifications.js')).default
    const app = express()
    app.use(express.json())
    app.use('/notifications', router)
    const anon = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    const { port } = anon.address() as AddressInfo
    const res = await fetch(`http://127.0.0.1:${port}/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'reply' }),
    })
    await new Promise<void>((resolve) => anon.close(() => resolve()))
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('POST /notifications/:id/read — mark-read IDOR (L2-1)', () => {
  it('returns 404 and does not mutate when the notification belongs to another user', async () => {
    findById.mockResolvedValue({ id: 'victim-notif', user_id: VICTIM_USER })

    const res = await fetch(`${baseUrl}/notifications/victim-notif/read`, { method: 'POST' })

    // Denied with a non-leaking 4xx (this template uses requireOwner → 403),
    // and crucially the victim's row is NOT mutated.
    expect([403, 404]).toContain(res.status)
    expect(res.status).not.toBe(200)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('marks the caller’s own notification as read', async () => {
    findById.mockResolvedValue({ id: 'own-notif', user_id: SESSION_USER })
    updateById.mockResolvedValue({ data: { id: 'own-notif', read_at: 'now' } })

    const res = await fetch(`${baseUrl}/notifications/own-notif/read`, { method: 'POST' })

    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledTimes(1)
    const [table, id] = updateById.mock.calls[0] as [string, string]
    expect(table).toBe('notifications')
    expect(id).toBe('own-notif')
  })
})
