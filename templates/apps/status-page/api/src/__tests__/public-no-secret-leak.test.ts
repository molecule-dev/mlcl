import express, { type Express } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The public status endpoints are UNAUTHENTICATED. They used to return whole
// `status_components` rows, which was harmless until the row gained
// `heartbeat_key` — the credential that lets its holder beat on behalf of a
// dead service and keep a real outage displaying green.
//
// This is the exact failure that cannot be caught by reading the handler: the
// leak is in what the query RETURNS, not in what the code says. So these assert
// against the response body, and against the select the handler actually issues.

const HEARTBEAT_KEY = 'super-secret-heartbeat-key'

const db = vi.hoisted(() => ({
  create: vi.fn(async () => ({ data: null, affected: 1 })),
  findMany: vi.fn(async (_table: string, _options?: { select?: string[] }) => [] as unknown[]),
}))
const heartbeats = vi.hoisted(() => ({ recordHeartbeat: vi.fn(async () => true) }))

vi.mock('@molecule/api-database', () => db)
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../lib/heartbeats.js', () => heartbeats)

const publicRoutes = (await import('../handlers/public.js')).default

function buildApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/public', publicRoutes)
  return app
}

/** Drive a real listening server — no supertest dependency in the template. */
async function call(method: string, path: string): Promise<{ status: number; body: string }> {
  const app = buildApp()
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const addr = server.address()
        const port = typeof addr === 'object' && addr ? addr.port : 0
        const response = await fetch(`http://127.0.0.1:${port}${path}`, { method })
        const body = await response.text()
        server.close()
        resolve({ status: response.status, body })
      } catch (error) {
        server.close()
        reject(error)
      }
    })
  })
}

const selectsFor = (table: string) =>
  db.findMany.mock.calls
    .filter((c) => c[0] === table)
    .map((c) => (c[1] as { select?: string[] } | undefined)?.select)

beforeEach(() => {
  vi.resetAllMocks()
  heartbeats.recordHeartbeat.mockResolvedValue(true)
  // Table-aware, because /public/status reads three tables and only components
  // carries the credential. For components it returns the key EVEN THOUGH a
  // `select` was passed — modelling the worse provider, one that ignores the
  // hint — so these assertions prove the endpoint's own contract, not the mock's.
  db.findMany.mockImplementation(async (table: string) => {
    if (table === 'status_components') {
      return [
        {
          id: 'c1',
          name: 'API',
          status: 'operational',
          monitor_url: 'https://api.example.com/health',
          heartbeat_key: HEARTBEAT_KEY,
          heartbeat_interval_seconds: 60,
        },
      ]
    }
    return [{ id: 'x1', title: 'Unrelated row' }]
  })
})

describe('public endpoints never expose heartbeat credentials', () => {
  it('GET /public/components asks only for public columns', async () => {
    const res = await call('GET', '/public/components')
    expect(res.status).toBe(200)

    const selects = selectsFor('status_components')
    expect(selects.length).toBeGreaterThan(0)
    for (const select of selects) {
      expect(select).toBeDefined()
      expect(select).not.toContain('heartbeat_key')
      expect(select).toContain('status')
    }
  })

  it('GET /public/status asks only for public columns', async () => {
    const res = await call('GET', '/public/status')
    expect(res.status).toBe(200)

    const selects = selectsFor('status_components')
    expect(selects.length).toBeGreaterThan(0)
    for (const select of selects) {
      expect(select).not.toContain('heartbeat_key')
    }
  })

  it('never serializes a heartbeat key in a public response body', async () => {
    for (const path of ['/public/components', '/public/status']) {
      const res = await call('GET', path)
      expect(res.body).not.toContain(HEARTBEAT_KEY)
    }
  })
})

describe('heartbeat receiver', () => {
  it('accepts POST and GET, answering 204', async () => {
    expect((await call('POST', '/public/heartbeat/some-key')).status).toBe(204)
    expect((await call('GET', '/public/heartbeat/some-key')).status).toBe(204)
  })

  it('404s an unknown key', async () => {
    heartbeats.recordHeartbeat.mockResolvedValue(false)

    expect((await call('POST', '/public/heartbeat/nope')).status).toBe(404)
  })
})
