import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Coverage for the minimal-public-profile endpoint (GET /users/:id):
 *
 * Readable by any authenticated caller for any id. It returns the minimal
 * public profile — `id`, `name`, `email` — used by the "Taught by …"
 * instructor/author UI (and contact-the-instructor affordances), and must
 * NEVER leak the sensitive fields the full self record carries
 * (`oauthData`, `planKey`, `planExpiresAt`, `planAutoRenews`, password hash).
 * The full self record is reached only via the self-scoped GET /me.
 */

let currentUserId: string | null = 'me-1'
const users = new Map<string, Record<string, unknown>>()

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
}))

vi.mock('@molecule/api-database', () => ({
  findById: async (_table: string, id: string) => users.get(id) ?? null,
  updateById: async () => ({ data: {} }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

let baseUrl = ''
let server: Server

beforeAll(async () => {
  const { default: usersRouter } = await import('../handlers/users.js')
  const app = express()
  app.use(express.json())
  app.use('/', usersRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
  currentUserId = 'me-1'
  users.clear()
  users.set('instructor-9', {
    id: 'instructor-9',
    name: 'Dr. Park',
    email: 'park@example.com',
    oauthData: { sub: 'secret', preferences: { theme: 'dark' } },
    planKey: 'pro',
    planExpiresAt: '2099-01-01T00:00:00.000Z',
    planAutoRenews: true,
  })
})

describe('GET /users/:id minimal public profile', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await fetch(`${baseUrl}/users/instructor-9`)
    expect(res.status).toBe(401)
  })

  it('returns the minimal public profile (id, name, email) for another user', async () => {
    const res = await fetch(`${baseUrl}/users/instructor-9`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('instructor-9')
    expect(body.name).toBe('Dr. Park')
    expect(body.email).toBe('park@example.com')
  })

  it('NEVER leaks sensitive fields (oauthData, plan*) of another user', async () => {
    const res = await fetch(`${baseUrl}/users/instructor-9`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).not.toHaveProperty('oauthData')
    expect(body).not.toHaveProperty('planKey')
    expect(body).not.toHaveProperty('planExpiresAt')
    expect(body).not.toHaveProperty('planAutoRenews')
  })
})
