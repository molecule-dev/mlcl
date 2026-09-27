import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response as ExpressResponse } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for the admin-fetch SSRF guard: `POST /sources/:id/fetch`
// (and the cron fan-out) used to httpGet whatever endpoint the source config
// held — reachable from an admin session into private/loopback/link-local
// space, including the cloud metadata address. The sink now resolves the
// hostname first and refuses private/internal/metadata targets before any
// request is made.

process.env.ADMIN_EMAILS = 'owner@price-comparison.app'

const dnsLookup = vi.fn(
  (
    host: string,
    _options: unknown,
    callback: (err: Error | null, addresses?: Array<{ address: string; family: number }>) => void,
  ) => {
    const table: Record<string, Array<{ address: string; family: number }>> = {
      localhost: [{ address: '127.0.0.1', family: 4 }],
      'metadata.internal': [{ address: '169.254.169.254', family: 4 }],
      'bastion.internal': [{ address: '10.1.2.3', family: 4 }],
      'cdn.example.com': [{ address: '93.184.216.34', family: 4 }],
    }
    const hit = table[host]
    if (hit) callback(null, hit)
    else callback(new Error(`lookup ${host}: ENOTFOUND`))
  },
)

vi.mock('node:dns', () => ({
  lookup: (...a: unknown[]) =>
    dnsLookup(...(a as [string, unknown, (e: Error | null, addrs?: unknown[]) => void])),
}))

const httpGet = vi.fn(async (..._a: unknown[]) => ({ data: [{ id: 'p-1' }] }))

vi.mock('@molecule/api-http', () => ({
  get: (...a: unknown[]) => httpGet(...(a as [string])),
}))

// The source whose endpoint each test configures.
const sources: Record<string, Record<string, unknown>> = {
  'src-1': { id: 'src-1', base_url: 'https://cdn.example.com', fetch_config: {}, status: 'active' },
}

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'users') {
    if (id === 'admin-1') return { id, email: 'admin@example.com', role: 'admin' }
    return null
  }
  if (table === 'sources') return sources[id as keyof typeof sources] ?? null
  return null
})
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
const findMany = vi.fn(async (..._a: unknown[]) => [])
const create = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...(a as [string, string])),
  updateById: (...a: unknown[]) => updateById(...(a as [string, string, unknown])),
  findMany: (...a: unknown[]) => findMany(...a),
  create: (...a: unknown[]) => create(...a),
  count: vi.fn(async () => 0),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: ExpressResponse) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-cache', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-cron', () => ({
  schedule: vi.fn(async () => undefined),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const sourcesRouter = (await import('../handlers/sources.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: ExpressResponse, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/sources', sourcesRouter)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
  httpGet.mockClear().mockResolvedValue({ data: [{ id: 'p-1' }] })
  sources['src-1'] = {
    id: 'src-1',
    base_url: 'https://cdn.example.com',
    fetch_config: {},
    status: 'active',
  }
})

const fetchSource = async (): Promise<globalThis.Response> => {
  const res = await fetch(`${baseUrl}/sources/src-1/fetch`, {
    method: 'POST',
    headers: { 'x-test-user': 'admin-1' },
  })
  await res.json()
  return res
}

describe('admin source fetch refuses private/internal/metadata targets', () => {
  it('does NOT call httpGet for the cloud metadata address', async () => {
    sources['src-1'].fetch_config = { endpoint: 'http://metadata.internal/latest/meta-data/' }
    const res = await fetchSource()
    expect(res.status).toBe(500)
    expect(httpGet).not.toHaveBeenCalled()
    // The refusal is recorded like any other fetch failure.
    expect(updateById).toHaveBeenCalledWith(
      'sources',
      'src-1',
      expect.objectContaining({
        fetch_error_count: 1,
        last_fetch_error: expect.stringContaining('private/internal'),
      }),
    )
  })

  it('does NOT call httpGet for localhost', async () => {
    sources['src-1'].fetch_config = { endpoint: 'http://localhost:4000/api/products' }
    const res = await fetchSource()
    expect(res.status).toBe(500)
    expect(httpGet).not.toHaveBeenCalled()
  })

  it('does NOT call httpGet for a hostname resolving into private space', async () => {
    sources['src-1'].fetch_config = { endpoint: 'http://bastion.internal/admin' }
    const res = await fetchSource()
    expect(res.status).toBe(500)
    expect(httpGet).not.toHaveBeenCalled()
  })

  it('refuses non-http(s) schemes without a lookup', async () => {
    sources['src-1'].fetch_config = { endpoint: 'file:///etc/passwd' }
    const res = await fetchSource()
    expect(res.status).toBe(500)
    expect(httpGet).not.toHaveBeenCalled()
    expect(dnsLookup).not.toHaveBeenCalled()
  })

  it('calls httpGet for a public hostname', async () => {
    sources['src-1'].fetch_config = { endpoint: 'http://cdn.example.com/api/products' }
    const res = await fetch(`${baseUrl}/sources/src-1/fetch`, {
      method: 'POST',
      headers: { 'x-test-user': 'admin-1' },
    })
    expect(res.status).toBe(200)
    expect(httpGet).toHaveBeenCalledTimes(1)
    expect(httpGet).toHaveBeenCalledWith('http://cdn.example.com/api/products', {
      headers: undefined,
    })
    const body = (await res.json()) as { itemCount?: number }
    expect(body.itemCount).toBe(1)
  })
})

describe('isPrivateHost classification (IP literals, no DNS)', () => {
  it.each([
    ['169.254.169.254', true],
    ['127.0.0.1', true],
    ['10.0.0.9', true],
    ['192.168.1.1', true],
    ['172.16.0.1', true],
    ['::ffff:169.254.169.254', true],
    ['fd00::1', true],
    ['93.184.216.34', false],
    ['2606:2800:220:1:248:1893:25c8:1946', false],
  ])('%s → %s', async (ip, expected) => {
    const { isPrivateAddress } = await import('../lib/private-hosts.js')
    expect(isPrivateAddress(ip)).toBe(expected)
  })
})
