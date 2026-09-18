import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// [M4-2] regression: the public GET /uploads/:id serve route streams stored bytes
// INLINE with the client-declared mimetype, so it MUST send X-Content-Type-Options:
// nosniff or a benign-typed file with HTML bytes could be sniffed into executable
// markup. Guard the guard so a refactor can't silently drop the header.

vi.mock('connect-busboy', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-uploads', () => ({ getProvider: vi.fn(), hasProvider: vi.fn(() => true) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-database', () => ({ create: vi.fn(), findById: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? 'up-1',
  getUserId: vi.fn(() => 'user-1'),
}))

import { findById } from '@molecule/api-database'
import { getProvider as getUploads, hasProvider } from '@molecule/api-uploads'

import router from '../handlers/uploads.js'

interface MockRes {
  statusCode: number
  headers: Record<string, string>
  body: unknown
  setHeader: (k: string, v: string) => MockRes
  getHeader: (k: string) => string | undefined
  status: (c: number) => MockRes
  json: (o: unknown) => MockRes
  end: () => MockRes
}
function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v
      return this
    },
    getHeader(k) {
      return this.headers[k.toLowerCase()]
    },
    status(c) {
      this.statusCode = c
      return this
    },
    json(o) {
      this.body = o
      return this
    },
    end() {
      return this
    },
  }
  return res
}

// Pull the GET /:id serve handler out of the router stack (last handler on the route).
function getServeHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /:id serve route not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}

describe('rental-marketplace uploads serve route (XSS hardening)', () => {
  beforeEach(() => {
    vi.mocked(findById).mockReset()
    vi.mocked(getUploads).mockReset()
    vi.mocked(hasProvider).mockReturnValue(true)
  })

  it('sends X-Content-Type-Options: nosniff when streaming a stored image', async () => {
    vi.mocked(findById).mockResolvedValue({ id: 'up-1', file_id: 'f-1', mimetype: 'image/png' })
    vi.mocked(getUploads).mockReturnValue({
      // Fake stream: pipe() is a no-op sink so the assertion is only on headers.
      getFile: async () => ({ pipe: (dest: { end: () => void }) => dest.end() }),
    } as unknown as ReturnType<typeof getUploads>)

    const res = mockRes()
    await getServeHandler()(
      { params: { id: 'up-1' } } as unknown as Request,
      res as unknown as Response,
    )

    expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff')
    expect(res.getHeader('Content-Type')).toBe('image/png')
  })
})
