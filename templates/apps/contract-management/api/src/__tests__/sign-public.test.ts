import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The PUBLIC token-redeem signing endpoint. The token is the bearer credential for an
// external signer with no account: verify it exists + isn't expired, sign THAT signer's
// row once (single-use), and activate the contract only once every party has signed.

const db = { findMany: vi.fn(), findById: vi.fn(), updateById: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import router from '../handlers/sign-public.js'

function handler(method: 'get' | 'post'): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:token' && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method} /:token not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res
}
const future = new Date(Date.now() + 86_400_000).toISOString()
const past = new Date(Date.now() - 86_400_000).toISOString()

function mockSignatures(tokenRows: unknown[], contractRows: unknown[]) {
  db.findMany.mockImplementation((_table: string, opts: { where?: Array<{ field: string }> }) => {
    const field = opts?.where?.[0]?.field
    if (field === 'token') return Promise.resolve(tokenRows)
    if (field === 'contract_id') return Promise.resolve(contractRows)
    return Promise.resolve([])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
  db.create.mockResolvedValue({ data: {} })
  db.findById.mockResolvedValue({
    id: 'c1',
    user_id: 'owner-1',
    title: 'MSA',
    body_html: '',
    body_md: '',
  })
})

describe('contract-management public signing', () => {
  it('signs this signer (single-use) but does NOT activate while another party is pending', async () => {
    const sig = {
      id: 's1',
      contract_id: 'c1',
      user_id: 'owner-1',
      signer_name: 'Ann',
      status: 'pending',
      token: 'tok',
      token_expires_at: future,
    }
    mockSignatures([sig], [sig, { id: 's2', status: 'pending' }])
    const res = makeRes()
    await handler('post')(
      { params: { token: 'tok' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(200)
    const sigUpdate = db.updateById.mock.calls.find((c) => c[0] === 'signatures')
    expect(sigUpdate?.[2]).toMatchObject({ status: 'signed' })
    expect(db.updateById.mock.calls.some((c) => c[0] === 'contracts')).toBe(false)
  })

  it('activates the contract + notifies the owner once the LAST party signs', async () => {
    const sig = {
      id: 's1',
      contract_id: 'c1',
      user_id: 'owner-1',
      signer_name: 'Ann',
      status: 'pending',
      token: 'tok',
      token_expires_at: future,
    }
    mockSignatures([sig], [sig])
    const res = makeRes()
    await handler('post')(
      { params: { token: 'tok' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    const contractUpdate = db.updateById.mock.calls.find((c) => c[0] === 'contracts')
    expect(contractUpdate?.[2]).toMatchObject({ status: 'active' })
    expect(db.create.mock.calls.some((c) => c[0] === 'notifications')).toBe(true)
  })

  it('suppresses the owner notification when the owner disabled contractSigned (still activates)', async () => {
    const sig = {
      id: 's1',
      contract_id: 'c1',
      user_id: 'owner-1',
      signer_name: 'Ann',
      status: 'pending',
      token: 'tok',
      token_expires_at: future,
    }
    mockSignatures([sig], [sig])
    // Table-aware findById: the owner opted out of "Signed or declined".
    db.findById.mockImplementation((table: string) =>
      table === 'users'
        ? Promise.resolve({
            id: 'owner-1',
            oauthData: { notificationPreferences: { contractSigned: false } },
          })
        : Promise.resolve({ id: 'c1', user_id: 'owner-1', title: 'MSA' }),
    )
    const res = makeRes()
    await handler('post')(
      { params: { token: 'tok' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    // The contract still activates — only the notification is gated.
    expect(db.updateById.mock.calls.some((c) => c[0] === 'contracts')).toBe(true)
    expect(db.create.mock.calls.some((c) => c[0] === 'notifications')).toBe(false)
  })

  it('rejects an expired token with 410 and does not sign', async () => {
    mockSignatures(
      [{ id: 's1', contract_id: 'c1', status: 'pending', token: 'tok', token_expires_at: past }],
      [],
    )
    const res = makeRes()
    await handler('post')(
      { params: { token: 'tok' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(410)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('is idempotent for an already-signed token (no double-sign)', async () => {
    mockSignatures(
      [{ id: 's1', contract_id: 'c1', status: 'signed', token: 'tok', token_expires_at: future }],
      [],
    )
    const res = makeRes()
    await handler('post')(
      { params: { token: 'tok' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(200)
    expect((res.body as { alreadySigned?: boolean }).alreadySigned).toBe(true)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('404s an unknown token', async () => {
    mockSignatures([], [])
    const res = makeRes()
    await handler('post')(
      { params: { token: 'nope' }, ip: '1.2.3.4' } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(404)
    expect(db.updateById).not.toHaveBeenCalled()
  })
})
