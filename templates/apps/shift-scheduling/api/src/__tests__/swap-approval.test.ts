import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Router-level tests of the two server-enforced workflows:
//  1. no-double-booking on shift create (409 + no write), and
//  2. swap/drop/claim approval moving the assignment atomically
//     (or refusing with 409 when the receiving staff member conflicts).
// The database bond is mocked with a small in-memory dispatch so the real
// Express handlers run end-to-end.

// Untyped vi.fn()s: the dispatching implementations below take typed
// (table, opts) params, which a pre-typed (...args: unknown[]) mock would
// reject as contravariant.
const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: vi.fn(async () => 0),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
  uuidParamSchema: { safeParse: (v: unknown) => ({ success: true, data: v }) },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({ ensureSeeded: vi.fn(async () => undefined) }))

const SHIFTS = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    user_id: 'u1',
    staff_id: '11111111-1111-4111-8111-111111111111',
    role: 'Barista',
    starts_at: '2026-10-05T14:00:00.000Z',
    ends_at: '2026-10-05T22:00:00.000Z',
    published: true,
    notes: null,
    assigned_via: 'assigned',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000003',
    user_id: 'u1',
    staff_id: null,
    role: 'Barista',
    starts_at: '2026-10-06T14:00:00.000Z',
    ends_at: '2026-10-06T22:00:00.000Z',
    published: true,
    notes: null,
    assigned_via: 'assigned',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
]

const STAFF = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: 'u1',
    first_name: 'Dana',
    last_name: 'Whitfield',
    email: 'dana@shiftly.example',
    phone: null,
    role: 'Shift Lead',
    max_weekly_hours: 40,
    status: 'active',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    user_id: 'u1',
    first_name: 'Priya',
    last_name: 'Raman',
    email: 'priya@shiftly.example',
    phone: null,
    role: 'Barista',
    max_weekly_hours: 30,
    status: 'active',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
]

// staff-2 already holds an overlapping shift on Tuesday evening.
const STAFF2_SHIFT = {
  id: 'aaaaaaaa-0000-4000-8000-000000000002',
  user_id: 'u1',
  staff_id: '22222222-2222-4222-8222-222222222222',
  role: 'Barista',
  starts_at: '2026-10-06T18:00:00.000Z',
  ends_at: '2026-10-06T23:00:00.000Z',
  published: true,
  notes: null,
  assigned_via: 'assigned',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}

function dispatchDb(): void {
  db.findMany.mockImplementation(
    async (table: string, opts?: { where?: Array<{ field: string; value: unknown }> }) => {
      const rows = table === 'shifts' ? [...SHIFTS, STAFF2_SHIFT] : table === 'staff' ? STAFF : []
      const where = opts?.where ?? []
      const staffFilter = where.find((w) => w.field === 'staff_id')
      if (staffFilter) {
        return rows.filter(
          (r) =>
            String((r as { staff_id?: string | null }).staff_id ?? '') ===
            String(staffFilter.value),
        )
      }
      return rows
    },
  )
  db.findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'shifts') return [...SHIFTS, STAFF2_SHIFT].find((s) => s.id === id) ?? null
    return null
  })
  db.create.mockImplementation(async (_table: string, data: unknown) => ({ data }))
  // updateById returns a full-row-shaped `{ data }` so the decorate fns
  // (which read created_at etc. off the returned row) see valid dates.
  db.updateById.mockImplementation(async (_table: string, _id: string, data: unknown) => ({
    data: {
      created_at: '2026-09-20T00:00:00.000Z',
      updated_at: '2026-09-20T00:00:00.000Z',
      ...(data as Record<string, unknown>),
    },
  }))
}

interface Captured {
  status: number
  body: unknown
}

function drive(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  body: unknown,
): Promise<Captured> {
  const captured: Captured = { status: 0, body: null }
  const res = {
    status(code: number) {
      captured.status = code
      return this
    },
    json(payload: unknown) {
      captured.body = payload
      // Express implies 200 when a handler responds without status().
      if (captured.status === 0) captured.status = 200
      return this
    },
    end() {
      return this
    },
    locals: {},
  } as unknown as Response
  const req = {
    method,
    url,
    headers: {},
    body,
    query: {},
    params: {},
    get: () => undefined,
  } as unknown as Request
  return new Promise((resolve, reject) => {
    router(req, res, (err?: unknown) => (err ? reject(err) : resolve(captured)))
    // Handlers are async — resolve on the first json()/end() via microtask poll.
    const poll = (): void => {
      if (captured.status !== 0 || captured.body !== null) resolve(captured)
      else setTimeout(poll, 5)
    }
    setTimeout(poll, 5)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  dispatchDb()
})

describe('shift create conflict enforcement', () => {
  it('409s and does NOT write when the staff member overlaps an existing shift', async () => {
    const shifts = (await import('../handlers/shifts.js')).default
    const out = await drive(shifts, 'POST', '/', {
      staff_id: '11111111-1111-4111-8111-111111111111',
      role: 'Barista',
      date: '2026-10-05',
      start_time: '16:00',
      end_time: '20:00',
    })
    expect(out.status).toBe(409)
    expect((out.body as { code?: string }).code).toBe('shift_conflict')
    expect(db.create).not.toHaveBeenCalled()
  })

  it('201s a non-overlapping shift for the same staff member', async () => {
    const shifts = (await import('../handlers/shifts.js')).default
    const out = await drive(shifts, 'POST', '/', {
      staff_id: '11111111-1111-4111-8111-111111111111',
      role: 'Barista',
      date: '2026-10-07',
      start_time: '14:00',
      end_time: '22:00',
    })
    expect(out.status).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })

  it('201s an OPEN shift regardless of staffing (no assignee to conflict)', async () => {
    const shifts = (await import('../handlers/shifts.js')).default
    const out = await drive(shifts, 'POST', '/', {
      staff_id: null,
      role: 'Cook',
      date: '2026-10-05',
      start_time: '14:00',
      end_time: '22:00',
    })
    expect(out.status).toBe(201)
  })
})

describe('swap approval moves the assignment atomically', () => {
  async function driveSwap(
    status: 'approved' | 'denied',
    kind: 'swap' | 'drop',
    target: string | null,
    fromShift = 'aaaaaaaa-0000-4000-8000-000000000001',
  ): Promise<Captured> {
    db.findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'shifts') return [...SHIFTS, STAFF2_SHIFT].find((s) => s.id === id) ?? null
      if (table === 'swap_requests')
        return {
          id: 'bbbbbbbb-0000-4000-8000-000000000001',
          user_id: 'u1',
          kind,
          from_shift: fromShift,
          requester_staff_id:
            fromShift === 'aaaaaaaa-0000-4000-8000-000000000002'
              ? '22222222-2222-4222-8222-222222222222'
              : '11111111-1111-4111-8111-111111111111',
          target_staff_id: target,
          status: 'pending',
          note: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2026-09-20T00:00:00.000Z',
          updated_at: '2026-09-20T00:00:00.000Z',
        }
      return null
    })
    const swaps = (await import('../handlers/swap-requests.js')).default
    return drive(swaps, 'PATCH', '/bbbbbbbb-0000-4000-8000-000000000001', { status })
  }

  it('approving a swap assigns the shift to the target (assigned_via swap)', async () => {
    const out = await driveSwap('approved', 'swap', '22222222-2222-4222-8222-222222222222')
    expect(out.status).toBe(200)
    const shiftUpdate = db.updateById.mock.calls.find(
      (c) => c[0] === 'shifts' && c[1] === 'aaaaaaaa-0000-4000-8000-000000000001',
    )
    expect(shiftUpdate?.[2]).toMatchObject({
      staff_id: '22222222-2222-4222-8222-222222222222',
      assigned_via: 'swap',
    })
    const swapUpdate = db.updateById.mock.calls.find(
      (c) => c[0] === 'swap_requests' && c[1] === 'bbbbbbbb-0000-4000-8000-000000000001',
    )
    expect(swapUpdate?.[2]).toMatchObject({ status: 'approved', reviewed_by: 'u1' })
  })

  it('409s (and stays pending) when the target has an overlapping shift', async () => {
    // Swapping shift-2 (Tue 18:00–23:00, staff-2's own) to staff-1 fails:
    // staff-1 already holds shift-1 (Mon 14:00–22:00)… no overlap there, so
    // the fixture uses the claims-style overlap via staff-2's other window —
    // instead swap shift-1 (Mon 14–22) to staff-2 while staff-2 holds a
    // Monday-evening overlap, simulated by treating STAFF2_SHIFT as Monday.
    db.findMany.mockImplementation(
      async (table: string, opts?: { where?: Array<{ field: string; value: unknown }> }) => {
        const rows =
          table === 'shifts'
            ? [
                ...SHIFTS,
                {
                  ...STAFF2_SHIFT,
                  starts_at: '2026-10-05T18:00:00.000Z',
                  ends_at: '2026-10-05T23:00:00.000Z',
                },
              ]
            : table === 'staff'
              ? STAFF
              : []
        const where = opts?.where ?? []
        const staffFilter = where.find((w) => w.field === 'staff_id')
        if (staffFilter) {
          return rows.filter(
            (r) =>
              String((r as { staff_id?: string | null }).staff_id ?? '') ===
              String(staffFilter.value),
          )
        }
        return rows
      },
    )
    const out = await driveSwap(
      'approved',
      'swap',
      '22222222-2222-4222-8222-222222222222',
      'aaaaaaaa-0000-4000-8000-000000000001',
    )
    expect(out.status).toBe(409)
    expect((out.body as { code?: string }).code).toBe('shift_conflict')
    expect(db.updateById.mock.calls.find((c) => c[0] === 'shifts')).toBeUndefined()
    expect(db.updateById.mock.calls.find((c) => c[0] === 'swap_requests')).toBeUndefined()
  })

  it('approving a drop reopens the shift (staff_id null)', async () => {
    const out = await driveSwap('approved', 'drop', null)
    expect(out.status).toBe(200)
    const shiftUpdate = db.updateById.mock.calls.find(
      (c) => c[0] === 'shifts' && c[1] === 'aaaaaaaa-0000-4000-8000-000000000001',
    )
    expect(shiftUpdate?.[2]).toMatchObject({ staff_id: null })
  })

  it('denying leaves the shift untouched', async () => {
    const out = await driveSwap('denied', 'swap', '22222222-2222-4222-8222-222222222222')
    expect(out.status).toBe(200)
    expect(db.updateById.mock.calls.find((c) => c[0] === 'shifts')).toBeUndefined()
  })
})

describe('claim approval', () => {
  it('assigns the open shift to the claimant and denies sibling claims', async () => {
    db.findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'shifts') return SHIFTS.find((s) => s.id === id) ?? null
      if (table === 'claims')
        return {
          id: 'cccccccc-0000-4000-8000-000000000001',
          user_id: 'u1',
          shift_id: 'aaaaaaaa-0000-4000-8000-000000000003',
          staff_id: '22222222-2222-4222-8222-222222222222',
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2026-09-20T00:00:00.000Z',
          updated_at: '2026-09-20T00:00:00.000Z',
        }
      return null
    })
    db.findMany.mockImplementation(async (table: string): Promise<unknown[]> => {
      if (table === 'claims')
        return [
          {
            id: 'cccccccc-0000-4000-8000-000000000001',
            user_id: 'u1',
            shift_id: 'aaaaaaaa-0000-4000-8000-000000000003',
            staff_id: '22222222-2222-4222-8222-222222222222',
            status: 'pending',
          },
          {
            id: 'cccccccc-0000-4000-8000-000000000002',
            user_id: 'u1',
            shift_id: 'aaaaaaaa-0000-4000-8000-000000000003',
            staff_id: '11111111-1111-4111-8111-111111111111',
            status: 'pending',
          },
        ]
      if (table === 'shifts') return SHIFTS
      if (table === 'staff') return STAFF
      return []
    })
    const claims = (await import('../handlers/claims.js')).default
    const out = await drive(claims, 'PATCH', '/cccccccc-0000-4000-8000-000000000001', {
      status: 'approved',
    })
    expect(out.status).toBe(200)
    const shiftUpdate = db.updateById.mock.calls.find(
      (c) => c[0] === 'shifts' && c[1] === 'aaaaaaaa-0000-4000-8000-000000000003',
    )
    expect(shiftUpdate?.[2]).toMatchObject({
      staff_id: '22222222-2222-4222-8222-222222222222',
      assigned_via: 'claim',
    })
    const siblingDenied = db.updateById.mock.calls.find(
      (c) => c[0] === 'claims' && c[1] === 'cccccccc-0000-4000-8000-000000000002',
    )
    expect(siblingDenied?.[2]).toMatchObject({ status: 'denied' })
  })

  it('409s when the claimant now has an overlapping shift', async () => {
    // shift-open is Tue 14:00–22:00; STAFF2_SHIFT is Tue 18:00–23:00 — overlap.
    db.findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'shifts') return [...SHIFTS, STAFF2_SHIFT].find((s) => s.id === id) ?? null
      if (table === 'claims')
        return {
          id: 'cccccccc-0000-4000-8000-000000000001',
          user_id: 'u1',
          shift_id: 'aaaaaaaa-0000-4000-8000-000000000003',
          staff_id: '22222222-2222-4222-8222-222222222222',
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2026-09-20T00:00:00.000Z',
          updated_at: '2026-09-20T00:00:00.000Z',
        }
      return null
    })
    const claims = (await import('../handlers/claims.js')).default
    const out = await drive(claims, 'PATCH', '/claim-1', { status: 'approved' })
    expect(out.status).toBe(409)
    expect((out.body as { code?: string }).code).toBe('shift_conflict')
    expect(db.updateById.mock.calls.find((c) => c[0] === 'shifts')).toBeUndefined()
  })
})
