import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: a medical record's attachment storage key must never be taken from
// the client. Persisting a client-chosen `attachment_s3_key` defeats
// server-minted keys — a future record download/preview route streaming
// getFile(<that key>) would let one patient address another patient's PHI object
// (cross-tenant read IDOR). The handler must IGNORE a body `attachment_s3_key`
// (the schema strips it; the create call never writes a client value).

const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'rec-1' } }))

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  updateById: vi.fn(async () => ({ data: { id: 'rec-1' } })),
  deleteById: vi.fn(async () => ({ data: { ok: true } })),
  findById: vi.fn(async (_t: string, id: string) => ({ id, patient_user_id: 'patient-1' })),
  findMany: vi.fn(async () => [] as unknown[]),
}))

vi.mock('../handlers/_lib/shared.js', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('../handlers/_lib/decorate.js', () => ({
  decorateRecords: vi.fn(async (rows: unknown[]) => rows),
}))

vi.mock('../handlers/_seed.js', () => ({
  seedForUser: vi.fn(async () => {}),
}))

// Real validateBody so the zod schema (no longer declaring attachment_s3_key)
// strips the malicious field before the handler runs.
vi.unmock('@molecule/api-middleware-validation')

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const records = (await import('../handlers/records.js')).default
  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/records', records)
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
})

describe('records POST ignores a client-supplied attachment_s3_key', () => {
  it('never persists a client storage key (stored null, not the client value)', async () => {
    const res = await fetch(`${baseUrl}/records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'patient-1' },
      body: JSON.stringify({
        title: 'Lab result',
        kind: 'lab',
        attachment_s3_key: '../another-patients-phi.pdf', // malicious — must be ignored
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.attachment_s3_key).not.toBe('../another-patients-phi.pdf')
    expect(written.attachment_s3_key).toBeNull()
    // Legitimate fields + server-set identity still persisted.
    expect(written.title).toBe('Lab result')
    expect(written.patient_user_id).toBe('patient-1')
  })
})
