import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express, { type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression tests for [M-5]: the self-service two-factor route must run the
// REAL TOTP lifecycle — a live token verified against a pending (enable) or
// active (disable) secret — never a bare `twoFactorEnabled` flag write. The
// TOTP bond is mocked exactly the way @molecule/api-resource-user's own
// handler tests mock it: `verify` resolves a TwoFactorVerifyResult.

const mockGenerateSecret = vi.fn(() => 'JBSWY3DPEHPK3PXP')
type VerifyResult = { valid: boolean; timeStep?: number; reason?: string }

const mockGetUrls = vi.fn(async (..._a: unknown[]) => ({
  keyUrl: 'otpauth://totp/App:u1?secret=JBSWY3DPEHPK3PXP&issuer=App',
  QRImageUrl: 'data:image/png;base64,QR',
}))
const mockVerify = vi.fn(async (..._a: unknown[]) => ({ valid: false }) as VerifyResult)

vi.mock('@molecule/api-two-factor', () => ({
  generateSecret: () => mockGenerateSecret(),
  getUrls: (...a: unknown[]) => mockGetUrls(...(a as [never])),
  verify: (...a: unknown[]) => mockVerify(...(a as [never])),
}))

// usersSecrets row + users row, keyed by the table the handler reads.
interface SecretsRow {
  id: string
  twoFactorSecret: string | null
  pendingTwoFactorSecret: string | null
  lastTwoFactorTimeStep: number | null
}
const secrets: Record<string, SecretsRow> = {
  'user-1': {
    id: 'user-1',
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    lastTwoFactorTimeStep: null,
  },
}
const users: Record<string, { id: string; username: string; twoFactorEnabled: boolean }> = {
  'user-1': { id: 'user-1', username: 'u1', twoFactorEnabled: false },
}

const findById = vi.fn(async (table: string, id: string) => {
  if (table === 'usersSecrets') return secrets[id as keyof typeof secrets] ?? null
  return users[id as keyof typeof users] ?? null
})
const updateById = vi.fn(async (table: string, id: string, writes: Record<string, unknown>) => {
  const store = table === 'usersSecrets' ? secrets : users
  const row = store[id as keyof typeof store] as Record<string, unknown> | undefined
  if (row) Object.assign(row, writes)
  return { data: row }
})

vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => findById(...(a as [string, string])),
  updateById: (...a: unknown[]) => updateById(...(a as [string, string, Record<string, unknown>])),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: Response) =>
    (res.locals.session as { userId?: string } | undefined)?.userId ?? null,
  getParamId: (req: Request) => String(req.params.id),
}))

vi.mock('@molecule/api-config', () => ({
  get: (_key: string, fallback?: string) => fallback ?? 'App',
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const twoFactor = (await import('../handlers/users-2fa.js')).default

  const app = express()
  app.use(express.json())
  app.use((req: Request, res: Response, next: (err?: unknown) => void) => {
    const userId = req.header('x-test-user')
    if (userId) res.locals.session = { userId }
    next()
  })
  app.use('/users', twoFactor)

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
  mockVerify.mockResolvedValue({ valid: false })
  Object.assign(secrets['user-1'], {
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    lastTwoFactorTimeStep: null,
  })
  Object.assign(users['user-1'], { twoFactorEnabled: false })
})

const authed = { 'x-test-user': 'user-1' }
const jsonHeaders = { 'content-type': 'application/json', ...authed }

describe('[M-5] two-factor setup stores a pending secret and returns provisioning data', () => {
  it('POST /users/me/two-factor/setup → keyUrl + QR + secret, pending persisted', async () => {
    const res = await fetch(`${baseUrl}/users/me/two-factor/setup`, {
      method: 'POST',
      headers: authed,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { secret?: string; keyUrl?: string; QRImageUrl?: string }
    expect(body.secret).toBe('JBSWY3DPEHPK3PXP')
    expect(body.keyUrl).toContain('otpauth://')
    expect(body.QRImageUrl).toContain('data:image/')
    expect(secrets['user-1'].pendingTwoFactorSecret).toBe('JBSWY3DPEHPK3PXP')
    // Setup alone must NOT enable 2FA.
    expect(users['user-1'].twoFactorEnabled).toBe(false)
  })

  it('401 without a session', async () => {
    const res = await fetch(`${baseUrl}/users/me/two-factor/setup`, { method: 'POST' })
    expect(res.status).toBe(401)
  })
})

describe('[M-5] enabling requires a live token against the pending secret', () => {
  it('enable without a token → 400', async () => {
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(400)
    expect(users['user-1'].twoFactorEnabled).toBe(false)
  })

  it('enable with no pending setup → 400', async () => {
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: true, token: '123456' }),
    })
    expect(res.status).toBe(400)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('enable with a wrong token → 400, flag untouched', async () => {
    secrets['user-1'].pendingTwoFactorSecret = 'PENDINGSECRET'
    mockVerify.mockResolvedValueOnce({ valid: false, reason: 'format' })
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: true, token: '000000' }),
    })
    expect(res.status).toBe(400)
    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({ secret: 'PENDINGSECRET', token: '000000' }),
    )
    expect(users['user-1'].twoFactorEnabled).toBe(false)
    expect(secrets['user-1'].twoFactorSecret).toBeNull()
  })

  it('enable with a valid token → flag set + pending promoted to the stored secret', async () => {
    secrets['user-1'].pendingTwoFactorSecret = 'PENDINGSECRET'
    mockVerify.mockResolvedValueOnce({ valid: true, timeStep: 98765 })
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: true, token: '654321' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { twoFactorEnabled?: boolean }
    expect(body.twoFactorEnabled).toBe(true)
    expect(users['user-1'].twoFactorEnabled).toBe(true)
    expect(secrets['user-1'].twoFactorSecret).toBe('PENDINGSECRET')
    expect(secrets['user-1'].pendingTwoFactorSecret).toBeNull()
    expect(secrets['user-1'].lastTwoFactorTimeStep).toBe(98765)
  })
})

describe('[M-5] disabling requires a live token against the active secret', () => {
  beforeEach(() => {
    // A user with 2FA already enabled.
    Object.assign(secrets['user-1'], {
      twoFactorSecret: 'ACTIVESECRET',
      lastTwoFactorTimeStep: 111,
    })
    users['user-1'].twoFactorEnabled = true
  })

  it('disable without a token → 400', async () => {
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: false }),
    })
    expect(res.status).toBe(400)
    expect(users['user-1'].twoFactorEnabled).toBe(true)
  })

  it('disable with a wrong token → 400, nothing cleared', async () => {
    mockVerify.mockResolvedValueOnce({ valid: false, reason: 'replay' })
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: false, token: '999999' }),
    })
    expect(res.status).toBe(400)
    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'ACTIVESECRET',
        token: '999999',
        afterTimeStep: 111,
      }),
    )
    expect(users['user-1'].twoFactorEnabled).toBe(true)
    expect(secrets['user-1'].twoFactorSecret).toBe('ACTIVESECRET')
  })

  it('disable with a valid token → secret + flag cleared together', async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, timeStep: 222 })
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: false, token: '111111' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { twoFactorEnabled?: boolean }
    expect(body.twoFactorEnabled).toBe(false)
    expect(users['user-1'].twoFactorEnabled).toBe(false)
    expect(secrets['user-1'].twoFactorSecret).toBeNull()
    expect(secrets['user-1'].pendingTwoFactorSecret).toBeNull()
    expect(secrets['user-1'].lastTwoFactorTimeStep).toBe(222)
  })

  it('disable when 2FA is not enabled → 400', async () => {
    Object.assign(secrets['user-1'], {
      twoFactorSecret: null,
      pendingTwoFactorSecret: null,
      lastTwoFactorTimeStep: null,
    })
    users['user-1'].twoFactorEnabled = false
    const res = await fetch(`${baseUrl}/users/me/two-factor`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ enabled: false, token: '123456' }),
    })
    expect(res.status).toBe(400)
    expect(mockVerify).not.toHaveBeenCalled()
  })
})
