import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Security regression test (2026-10-04 audit): certificate numbers must come
// from crypto.randomBytes (unguessable), not Math.random (predictable and
// seed-recoverable) — a cert number is the identifier printed on a credential.
// Same CERT-<timestamp>-<8 chars of [0-9A-Z]> shape as before, now via
// rejection-sampled randomBytes (36 is not a power of two).

const db = {
  // findOne('enrollments', …): completed enrollment. findOne('certificates',
  // …): the idempotency probe (no existing certificate). Creates succeed.
  findOne: vi.fn(async (...args: unknown[]) =>
    args[0] === 'enrollments'
      ? { id: 'enr-1', user_id: 'u1', course_id: 'c-1', completed_at: new Date() }
      : null,
  ),
  create: vi.fn(async (...args: unknown[]) => ({ data: args[1] })),
  findById: vi.fn(async (..._args: unknown[]) => null),
  findMany: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
  updateById: vi.fn(async (..._args: unknown[]) => ({})),
}
vi.mock('@molecule/api-database', () => ({
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  uuidParamSchema: { parse: (v: unknown) => v },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  validateParams: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))
vi.mock('@molecule/api-pdf', () => ({
  fromHTML: vi.fn(async () => new Uint8Array()),
  hasProvider: () => false,
}))
vi.mock('../handlers/_decorate.js', () => ({
  decorateCertificate: async (c: Record<string, unknown>) => c,
}))

let server: Server
let baseUrl: string
const FROZEN_TS = new Date('2026-10-04T12:00:00.000Z').getTime()

beforeAll(async () => {
  // Freeze the clock BEFORE importing the router: with Date.now pinned, any
  // difference between two certificate numbers must come from the random
  // suffix (the uniqueness shape under test).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'))

  const certificates = (await import('../handlers/certificates.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/certificates', certificates)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const issue = async (): Promise<string> => {
  const res = await fetch(`${baseUrl}/certificates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-user': 'u1' },
    body: JSON.stringify({ course_id: 'c-1' }),
  })
  expect(res.status).toBe(201)
  const body = (await res.json()) as { certificate_number?: string }
  expect(body.certificate_number).toBeTruthy()
  return body.certificate_number as string
}

describe('certificate numbers are cryptographically random', () => {
  it('keeps the CERT-<ts>-<8 chars [0-9A-Z]> shape', async () => {
    const number = await issue()
    expect(number).toMatch(new RegExp(`^CERT-${FROZEN_TS}-[0-9A-Z]{8}$`))
  })

  it('issues distinct numbers even within the same millisecond', async () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      seen.add(await issue())
    }
    // Date is frozen — every difference is the randomBytes suffix. 20 draws
    // from 36^8 ≈ 2.8e12 possibilities must not collide.
    expect(seen.size).toBe(20)
  })

  it('does not contain the legacy Math.random lowercase base36 shape untransformed', async () => {
    // The old suffix could be any base36 string; the new one is strictly
    // uppercase alphanumeric (the rejection sampler's alphabet). Assert the
    // stored row's number suffix has no lowercase characters.
    const number = await issue()
    const suffix = number.split('-')[2]
    expect(suffix).toMatch(/^[0-9A-Z]{8}$/)
    expect(suffix).not.toMatch(/[a-z]/)
  })
})
