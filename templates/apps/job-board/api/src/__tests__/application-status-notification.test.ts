import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// When an employer moves an application's status, the applicant must get an in-app
// notification (the notifications table/list/UI exist but nothing ever created a row —
// the bell was always empty). The applicant's own `withdrawn` action must NOT notify.

let currentUserId = 'owner-1'
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? 'app1',
}))

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: 'm1' })))
vi.mock('@molecule/api-emails', () => ({ sendMail }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import router from '../handlers/applications.js'

function statusHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/status' && l.route.methods.put)
  if (!layer?.route) throw new Error('PUT /:id/status not found')
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

beforeEach(() => {
  vi.clearAllMocks()
  currentUserId = 'owner-1'
  db.count.mockResolvedValue(0)
  db.findMany.mockResolvedValue([])
  db.updateById.mockResolvedValue({ data: { id: 'app1', status: 'reviewed' } })
  db.create.mockResolvedValue({ data: {} })
  db.findById.mockImplementation((table: string) => {
    if (table === 'applications')
      return Promise.resolve({
        id: 'app1',
        applicant_id: 'applicant-1',
        job_id: 'job-1',
        status: 'submitted',
      })
    if (table === 'jobs')
      return Promise.resolve({ id: 'job-1', company_id: 'co-1', title: 'Engineer' })
    if (table === 'companies') return Promise.resolve({ id: 'co-1', owner_id: 'owner-1' })
    if (table === 'users') return Promise.resolve({ id: 'applicant-1', email: 'a@example.com' })
    return Promise.resolve(null)
  })
})

describe('job-board application status → in-app notification', () => {
  it('notifies the applicant when the employer moves the status', async () => {
    const res = makeRes()
    await statusHandler()(
      { params: { id: 'app1' }, body: { status: 'reviewed' } } as unknown as Request,
      res as unknown as Response,
    )
    const notif = (db.create.mock.calls as unknown[][]).find((c) => c[0] === 'notifications')
    expect(notif).toBeDefined()
    expect(notif?.[1]).toMatchObject({
      user_id: 'applicant-1',
      kind: 'application_status',
      read: false,
    })
  })

  it('does NOT notify on the applicant’s own withdrawal', async () => {
    currentUserId = 'applicant-1' // the applicant, not the company owner
    const res = makeRes()
    await statusHandler()(
      { params: { id: 'app1' }, body: { status: 'withdrawn' } } as unknown as Request,
      res as unknown as Response,
    )
    expect((db.create.mock.calls as unknown[][]).some((c) => c[0] === 'notifications')).toBe(false)
  })
})

describe('job-board status email honors the applicant’s applicationUpdates toggle', () => {
  const moveStatus = async () => {
    const res = makeRes()
    await statusHandler()(
      { params: { id: 'app1' }, body: { status: 'reviewed' } } as unknown as Request,
      res as unknown as Response,
    )
  }

  it('sends the status email by default (preference unset)', async () => {
    await moveStatus()
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('suppresses the email when applicationUpdates=false, but still rings the in-app bell', async () => {
    db.findById.mockImplementation((table: string) => {
      if (table === 'applications')
        return Promise.resolve({
          id: 'app1',
          applicant_id: 'applicant-1',
          job_id: 'job-1',
          status: 'submitted',
        })
      if (table === 'jobs')
        return Promise.resolve({ id: 'job-1', company_id: 'co-1', title: 'Engineer' })
      if (table === 'companies') return Promise.resolve({ id: 'co-1', owner_id: 'owner-1' })
      if (table === 'users')
        return Promise.resolve({
          id: 'applicant-1',
          email: 'a@example.com',
          oauthData: { settings: { applicationUpdates: false } },
        })
      return Promise.resolve(null)
    })
    await moveStatus()
    expect(sendMail).not.toHaveBeenCalled()
    // The email toggle does not govern the in-app notification channel.
    expect((db.create.mock.calls as unknown[][]).some((c) => c[0] === 'notifications')).toBe(true)
  })
})
