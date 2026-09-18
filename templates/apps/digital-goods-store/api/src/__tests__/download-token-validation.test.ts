import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// GET /api/downloads/:productId/file streamed the bytes after only checking purchase ownership —
// it never read req.query.token, req.query.expires, or the stored download_logs.expires_at, even
// though its docstring claimed a stale/stolen token couldn't fetch the file. The endpoint now
// validates the token against the most recent issued link and rejects expired / mismatched ones.

const db = {
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  findById: vi.fn(),
  create: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: { params?: Record<string, string> }, key: string) => req.params?.[key] ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/downloads.js'

function fileHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:productId/file' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /:productId/file not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
    setHeader(k: string, v: string) {
      this.headers[k] = v
      return this
    },
    send(o: unknown) {
      this.body = o
      return this
    },
  }
}

const ISSUED_TOKEN = 'deadbeefcafebabe'
const future = () => new Date(Date.now() + 3600_000)
const past = () => new Date(Date.now() - 1000)

function seed(log: Record<string, unknown> | null) {
  db.findMany.mockImplementation((table: unknown) => {
    if (table === 'purchases') return Promise.resolve([{ id: 'pur-1' }])
    if (table === 'download_logs') return Promise.resolve(log ? [log] : [])
    return Promise.resolve([])
  })
  db.findById.mockResolvedValue({ id: 'prod-1', name: 'Synth Pack', file_name: 'pack.zip' })
}
const run = (token: string) => {
  const res = makeRes()
  return fileHandler()(
    { params: { productId: 'prod-1' }, query: { token }, headers: {} } as unknown as Request,
    res as unknown as Response,
  ).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('download /file validates the signed token + expiry', () => {
  it('streams the file for a matching, unexpired token', async () => {
    seed({
      signed_url: `http://h/api/downloads/prod-1/file?token=${ISSUED_TOKEN}&expires=1`,
      expires_at: future(),
    })
    const res = await run(ISSUED_TOKEN)
    expect(res.statusCode).toBe(200)
    expect(res.headers['Content-Disposition']).toContain('pack.zip')
    expect(typeof res.body).toBe('string')
  })

  it('rejects a token that does not match the issued link (403)', async () => {
    seed({
      signed_url: `http://h/api/downloads/prod-1/file?token=${ISSUED_TOKEN}&expires=1`,
      expires_at: future(),
    })
    const res = await run('not-the-token')
    expect(res.statusCode).toBe(403)
  })

  it('rejects an expired link even with the right token (403)', async () => {
    seed({
      signed_url: `http://h/api/downloads/prod-1/file?token=${ISSUED_TOKEN}&expires=1`,
      expires_at: past(),
    })
    const res = await run(ISSUED_TOKEN)
    expect(res.statusCode).toBe(403)
  })

  it('rejects when no download link was ever issued (403)', async () => {
    seed(null)
    const res = await run(ISSUED_TOKEN)
    expect(res.statusCode).toBe(403)
  })

  it('rejects a missing token (403)', async () => {
    seed({
      signed_url: `http://h/api/downloads/prod-1/file?token=${ISSUED_TOKEN}&expires=1`,
      expires_at: future(),
    })
    const res = await run('')
    expect(res.statusCode).toBe(403)
  })
})
