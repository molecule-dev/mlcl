import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression test for [TPL-1]: pet-care sitters must NOT be able to self-assign
// the operator-only `is_verified` trust flag (mass-assignment / privilege
// escalation) via POST /sitters or PUT /sitters/:id. The handler must always
// create unverified and must never write `is_verified` from the request body.

// ---- Mock the molecule data layer the handlers touch ----------------------
const create = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'sitter-1' } }))
const updateById = vi.fn(async (..._a: unknown[]) => ({ data: { id: 'sitter-1' } }))
const deleteById = vi.fn(async (..._a: unknown[]) => ({ data: { ok: true } }))
// findMany: onboarding existence check (POST) returns [] → no prior sitter row.
const findMany = vi.fn(async (..._a: unknown[]) => [] as unknown[])
// findById: PUT/DELETE ownership check → row owned by the calling user.
const findById = vi.fn(async (_table: string, id: string) => ({
  id,
  user_id: 'owner-1',
  is_verified: false,
}))

vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  updateById: (...a: unknown[]) => updateById(...a),
  deleteById: (...a: unknown[]) => deleteById(...a),
  findMany: (...a: unknown[]) => findMany(...a),
  findById: (...a: unknown[]) => findById(a[0] as string, a[1] as string),
}))

// getUserId reads res.locals.session?.userId; getParamId reads req.params.id.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

// Validation is orthogonal to the fix — pass bodies through untouched so the
// malicious `is_verified` payload actually reaches the handler. This proves the
// handler itself strips it (defense in depth), not just the zod schema.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const sitters = (await import('../handlers/sitters.js')).default

  const app = express()
  app.use(express.json())
  // Test auth shim: map an X-Test-User header onto res.locals.session, exactly
  // as the real JWT auth middleware would populate it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/sitters', sitters)

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
})

beforeEach(() => {
  vi.clearAllMocks()
})

const sitterId = '00000000-0000-0000-0000-000000000001'

describe('[TPL-1] sitters cannot self-assign is_verified (mass-assignment)', () => {
  it('POST /sitters forces is_verified=false even when the body sends true', async () => {
    const res = await fetch(`${baseUrl}/sitters`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({
        display_name: 'Hacker McSitter',
        services: ['walking'],
        is_verified: true, // malicious — must be ignored
      }),
    })
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, written] = create.mock.calls[0] as [string, Record<string, unknown>]
    expect(written.is_verified).toBe(false)
    expect(written.user_id).toBe('owner-1') // identity from session, not body
  })

  it('PUT /sitters/:id never writes is_verified from the body', async () => {
    const res = await fetch(`${baseUrl}/sitters/${sitterId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({
        display_name: 'Updated Name',
        is_verified: true, // malicious — must be ignored
      }),
    })
    expect(res.status).toBe(200)
    expect(updateById).toHaveBeenCalledTimes(1)
    const [, , patch] = updateById.mock.calls[0] as [string, string, Record<string, unknown>]
    expect(patch).not.toHaveProperty('is_verified')
    // Legitimate edit still applied.
    expect(patch.display_name).toBe('Updated Name')
  })

  it('PUT /sitters/:id still persists legitimate editable fields', async () => {
    const res = await fetch(`${baseUrl}/sitters/${sitterId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({
        bio: 'Loves dogs',
        hourly_rate_cents: 2500,
        services: ['walking', 'boarding'],
        is_active: false,
      }),
    })
    expect(res.status).toBe(200)
    const [, , patch] = updateById.mock.calls[0] as [string, string, Record<string, unknown>]
    expect(patch.bio).toBe('Loves dogs')
    expect(patch.hourly_rate_cents).toBe(2500)
    expect(patch.is_active).toBe(false)
    // services is JSON.stringified for jsonb storage.
    expect(patch.services).toBe(JSON.stringify(['walking', 'boarding']))
    expect(patch).not.toHaveProperty('is_verified')
  })

  it('PUT /sitters/:id on a sitter owned by someone else returns 404 (no cross-owner write)', async () => {
    findById.mockResolvedValueOnce({ id: sitterId, user_id: 'someone-else', is_verified: false })
    const res = await fetch(`${baseUrl}/sitters/${sitterId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-user': 'owner-1' },
      body: JSON.stringify({ display_name: 'x' }),
    })
    expect(res.status).toBe(404)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('POST /sitters with no session is rejected 401 (identity never from body)', async () => {
    const res = await fetch(`${baseUrl}/sitters`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'x', is_verified: true }),
    })
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })
})
