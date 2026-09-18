import type { Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create, findById, findMany, updateById } from '@molecule/api-database'

/**
 * [RVALL-2 SSRF] End-to-end regression proving the execute + monitor-run
 * handlers refuse a saved (attacker-controlled) URL that targets an
 * internal/cloud-metadata address, while a public URL still works. safe-fetch
 * is NOT mocked here — the real guard runs, so this exercises the full block
 * path (an IP-literal metadata host is rejected synchronously, before any
 * socket is opened).
 */

// The molecule DataStore funcs the handlers call — controlled per test.
vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  findMany: vi.fn(),
  deleteById: vi.fn(),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(() => 'user-1'),
  getParamId: vi.fn((req: { params?: { id?: string } }) => req.params?.id ?? 'req-1'),
}))

vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

const METADATA_URL = 'http://169.254.169.254/latest/meta-data/iam/security-credentials/role'
const LOOPBACK_URL = 'http://127.0.0.1:5432/'
const PUBLIC_URL = 'http://93.184.216.34/data' // public IP literal → no DNS, passes guard

interface ReqLike {
  params: Record<string, string>
  body: Record<string, unknown>
}

interface ResLike {
  statusCode: number
  body: unknown
  status(code: number): ResLike
  json(payload: unknown): ResLike
  end(): ResLike
}

function makeRes(): ResLike {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    end() {
      return this
    },
  }
}

interface RouteLayer {
  route?: {
    path: string
    stack: Array<{ method?: string; handle: (req: ReqLike, res: ResLike) => unknown }>
  }
}

function getHandler(
  router: Router,
  method: string,
  path: string,
): (req: ReqLike, res: ResLike) => Promise<unknown> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  for (const layer of stack) {
    if (layer.route?.path === path) {
      const sub =
        layer.route.stack.find((s) => s.method === method) ??
        layer.route.stack[layer.route.stack.length - 1]
      return sub.handle as (req: ReqLike, res: ResLike) => Promise<unknown>
    }
  }
  throw new Error(`route not found: ${method.toUpperCase()} ${path}`)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /requests/:id/execute — SSRF guard [RVALL-2]', () => {
  it.each([
    ['cloud metadata', METADATA_URL],
    ['loopback', LOOPBACK_URL],
  ])('blocks an internal target (%s) and never opens a socket', async (_label, url) => {
    vi.mocked(findById).mockResolvedValue({
      id: 'req-1',
      user_id: 'user-1',
      method: 'GET',
      url,
      headers: '{}',
      body_content: '',
    } as never)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { default: requestsRouter } = await import('../handlers/requests.js')
    const res = makeRes()
    await getHandler(
      requestsRouter,
      'post',
      '/:id/execute',
    )({ params: { id: 'req-1' }, body: {} }, res)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(502)
    expect((res.body as { error: string }).error).toMatch(/private|internal|blocked/i)
    // The failed run is still recorded, with a zero status code + the error.
    expect(vi.mocked(create)).toHaveBeenCalledWith(
      'history',
      expect.objectContaining({ status_code: 0, error: expect.stringMatching(/private|blocked/i) }),
    )
    fetchSpy.mockRestore()
  })

  it('still executes a public URL and reflects the response', async () => {
    vi.mocked(findById).mockResolvedValue({
      id: 'req-1',
      user_id: 'user-1',
      method: 'GET',
      url: PUBLIC_URL,
      headers: '{}',
      body_content: '',
    } as never)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const { default: requestsRouter } = await import('../handlers/requests.js')
    const res = makeRes()
    await getHandler(
      requestsRouter,
      'post',
      '/:id/execute',
    )({ params: { id: 'req-1' }, body: {} }, res)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(200)
    const body = res.body as { status: number; body: unknown }
    expect(body.status).toBe(200)
    expect(body.body).toEqual({ ok: true })
    expect(vi.mocked(create)).toHaveBeenCalledWith(
      'history',
      expect.objectContaining({ status_code: 200 }),
    )
    fetchSpy.mockRestore()
  })
})

describe('POST /monitors/:id/run — SSRF guard [RVALL-2]', () => {
  function wireChain(savedUrl: string): void {
    vi.mocked(findById).mockImplementation((async (table: string) => {
      if (table === 'monitors') return { id: 'mon-1', user_id: 'user-1', test_id: 'test-1' }
      if (table === 'tests')
        return { id: 'test-1', user_id: 'user-1', request_id: 'req-1', assertions: '[]' }
      if (table === 'requests')
        return {
          id: 'req-1',
          user_id: 'user-1',
          method: 'GET',
          url: savedUrl,
          headers: '{}',
          body_content: '',
        }
      return null
    }) as never)
    vi.mocked(findMany).mockResolvedValue([] as never)
    vi.mocked(updateById).mockResolvedValue({ data: {} } as never)
  }

  it('blocks an internal target (cloud metadata) and never opens a socket', async () => {
    wireChain(METADATA_URL)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const { default: monitorsRouter } = await import('../handlers/monitors.js')
    const res = makeRes()
    await getHandler(monitorsRouter, 'post', '/:id/run')({ params: { id: 'mon-1' }, body: {} }, res)

    expect(fetchSpy).not.toHaveBeenCalled()
    const body = res.body as { status: string; statusCode: number; networkError: string | null }
    expect(body.status).toBe('failed')
    expect(body.statusCode).toBe(0)
    expect(body.networkError).toMatch(/private|internal|blocked/i)
    expect(vi.mocked(create)).toHaveBeenCalledWith(
      'history',
      expect.objectContaining({ status_code: 0, error: expect.stringMatching(/private|blocked/i) }),
    )
    fetchSpy.mockRestore()
  })

  it('still runs against a public URL', async () => {
    wireChain(PUBLIC_URL)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const { default: monitorsRouter } = await import('../handlers/monitors.js')
    const res = makeRes()
    await getHandler(monitorsRouter, 'post', '/:id/run')({ params: { id: 'mon-1' }, body: {} }, res)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const body = res.body as { status: string; statusCode: number }
    expect(body.statusCode).toBe(200)
    expect(body.status).toBe('passed')
    fetchSpy.mockRestore()
  })
})
