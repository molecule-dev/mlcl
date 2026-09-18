/**
 * Per-app handler unit tests for the alerts surface — focused on the V1-e
 * cross-tenant-write fix.
 *
 * The old `POST /alerts/expire` route let ANY authenticated user sweep + UPDATE
 * up to 1000 past-due alerts across EVERY tenant per call (no ownership
 * scoping). The fix removes that route and runs expiry as a server-side cron
 * job (`registerAlertExpiryCron` → `expireDueAlerts`, registered once from
 * `setupBonds`). These tests assert:
 *   1. the user-facing `POST /expire` route is gone (404), and
 *   2. the cron-driven sweep still works as system maintenance, and
 *   3. the cron job is registered with a stable name.
 *
 * We avoid supertest by spinning up an ephemeral `http.createServer` on port 0
 * and using global `fetch`, mirroring the other handler tests in this fleet.
 */
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  findById: vi.fn() as ReturnType<typeof vi.fn>,
  findMany: vi.fn() as ReturnType<typeof vi.fn>,
  create: vi.fn() as ReturnType<typeof vi.fn>,
  updateById: vi.fn() as ReturnType<typeof vi.fn>,
  deleteById: vi.fn() as ReturnType<typeof vi.fn>,
}))

const cronMock = vi.hoisted(() => ({
  schedule: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('@molecule/api-database', () => dbMock)
vi.mock('@molecule/api-cron', () => cronMock)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
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

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.findMany.mockImplementation(async () => [])
  dbMock.updateById.mockImplementation(async () => ({ data: {} }))
  cronMock.schedule.mockImplementation(async () => 'job-id')
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

describe('alerts handler — POST /expire is removed (V1-e)', () => {
  it('returns 404 for an authenticated user (the cross-tenant route is gone)', async () => {
    const router = (await import('../handlers/alerts.js')).default
    const url = await listen(router, 'u1')
    const res = await fetch(`${url}/expire`, { method: 'POST' })
    // Before the fix this matched a real route and returned 200 with a global
    // sweep result; now no such route exists, so Express 404s.
    expect(res.status).toBe(404)
    // And crucially: no user-triggered cross-tenant write happened.
    expect(dbMock.updateById).not.toHaveBeenCalled()
  })
})

describe('alerts expiry cron — system maintenance', () => {
  it('expireDueAlerts sweeps active past-due alerts and marks them expired', async () => {
    const now = new Date('2026-06-19T00:00:00.000Z')
    // Candidates can span multiple tenants — this is system maintenance run
    // with system authority on a cron tick, not a user request.
    dbMock.findMany.mockImplementationOnce(async () => [
      { id: 'a1', ends_at: '2026-06-18T00:00:00.000Z' },
      { id: 'a2', ends_at: '2026-06-18T12:00:00.000Z' },
      { id: 'a3', ends_at: null }, // no ends_at → skipped
    ])
    const { expireDueAlerts } = await import('../cron/expire-alerts.js')
    const expired = await expireDueAlerts(now)

    expect(expired).toBe(2)
    expect(dbMock.findMany).toHaveBeenCalledWith(
      'alerts',
      expect.objectContaining({
        where: [
          { field: 'status', operator: '=', value: 'active' },
          { field: 'ends_at', operator: '<=', value: now },
        ],
        limit: 1000,
      }),
    )
    expect(dbMock.updateById).toHaveBeenCalledTimes(2)
    expect(dbMock.updateById).toHaveBeenCalledWith('alerts', 'a1', {
      status: 'expired',
      updated_at: now,
    })
    expect(dbMock.updateById).toHaveBeenCalledWith('alerts', 'a2', {
      status: 'expired',
      updated_at: now,
    })
  })

  it('registerAlertExpiryCron schedules a stable named job', async () => {
    const { registerAlertExpiryCron } = await import('../cron/expire-alerts.js')
    await registerAlertExpiryCron()
    expect(cronMock.schedule).toHaveBeenCalledTimes(1)
    const [name, expression, handler] = cronMock.schedule.mock.calls[0]
    expect(name).toBe('expire-alerts')
    expect(typeof expression).toBe('string')
    expect(typeof handler).toBe('function')
  })
})
