import type { AddressInfo } from 'node:net'

import express, { type Express } from 'express'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// --- Mocks ---------------------------------------------------------------

// getUserId reads the session off res.locals (set by a test middleware below),
// mirroring the real bond which derives identity from the verified session —
// never from the request body.
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals: { userId?: string } }) => res.locals.userId,
  getParamId: (req: { params: Record<string, string> }) => req.params.id,
}))

// validateBody runs the REAL zod schema the handler passes in, so the test
// exercises the actual schema (e.g. status excluded from updateTutorSchema,
// booking_id OPTIONAL in createReviewSchema), not a pass-through stub.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody:
    (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }) =>
    (req: { body: unknown }, res: ExpressRes, next: () => void) => {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: 'validation' })
        return
      }
      req.body = parsed.data
      next()
    },
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async () => ({ data: { id: 'new-id' } })),
  findById: vi.fn(async () => null),
  findOne: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(async () => ({ data: { id: 'updated-id' } })),
  deleteById: vi.fn(async () => undefined),
  count: vi.fn(async () => 0),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-search', () => ({
  index: vi.fn(async () => undefined),
  search: vi.fn(async () => []),
}))

type ExpressRes = { status: (n: number) => ExpressRes; json: (b: unknown) => void }

import * as db from '@molecule/api-database'

const findById = db.findById as unknown as Mock
const findOne = db.findOne as unknown as Mock
const create = db.create as unknown as Mock
const updateById = db.updateById as unknown as Mock

// --- Test server harness -------------------------------------------------

async function withServer(
  router: express.Router,
  userId: string | undefined,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const app: Express = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    if (userId) res.locals.userId = userId
    next()
  })
  app.use(router)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const { port } = server.address() as AddressInfo
  try {
    await fn(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  create.mockResolvedValue({ data: { id: 'new-id' } })
  updateById.mockResolvedValue({ data: { id: 'updated-id' } })
  findOne.mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- TPL-001: tutor cannot self-approve via mass-assignable status -------

describe('TPL-001 tutors: status is not self-assignable', () => {
  const tutorUserId = 'tutor-user-1'
  const tutorProfileId = 'tutor-profile-1'

  it('PUT /:id does NOT persist a client-supplied status (mass-assignment closed)', async () => {
    findById.mockImplementation(async (table: string) =>
      table === 'tutor_profiles'
        ? { id: tutorProfileId, user_id: tutorUserId, status: 'pending' }
        : null,
    )
    const { default: tutorsRouter } = await import('../handlers/tutors.js')
    await withServer(tutorsRouter, tutorUserId, async (base) => {
      const res = await fetch(`${base}/${tutorProfileId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name', status: 'active' }),
      })
      expect(res.status).toBe(200)
      expect(updateById).toHaveBeenCalledTimes(1)
      const updates = updateById.mock.calls[0][2] as Record<string, unknown>
      expect(updates).toHaveProperty('display_name', 'New Name')
      // The privileged column must never reach the write.
      expect(updates).not.toHaveProperty('status')
    })
  })

  it('PATCH /:id/status is forbidden (403) for a non-admin', async () => {
    findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'users') return { id, role: 'user' }
      if (table === 'tutor_profiles') return { id, user_id: tutorUserId, status: 'pending' }
      return null
    })
    const { default: tutorsRouter } = await import('../handlers/tutors.js')
    await withServer(tutorsRouter, tutorUserId, async (base) => {
      const res = await fetch(`${base}/${tutorProfileId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      expect(res.status).toBe(403)
      expect(updateById).not.toHaveBeenCalled()
    })
  })

  it('PATCH /:id/status succeeds (200) for an admin and writes the status', async () => {
    findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'users') return { id, role: 'admin' }
      if (table === 'tutor_profiles') return { id, user_id: tutorUserId, status: 'pending' }
      return null
    })
    const { default: tutorsRouter } = await import('../handlers/tutors.js')
    await withServer(tutorsRouter, 'admin-user', async (base) => {
      const res = await fetch(`${base}/${tutorProfileId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      expect(res.status).toBe(200)
      expect(updateById).toHaveBeenCalledTimes(1)
      const [table, , updates] = updateById.mock.calls[0]
      expect(table).toBe('tutor_profiles')
      expect(updates).toHaveProperty('status', 'active')
    })
  })
})

// --- TPL-002: reviews require a completed, owned booking -----------------

describe('TPL-002 reviews: tied to a completed owned booking', () => {
  const studentId = 'student-1'
  const realTutorId = 'tutor-real'
  const bookingId = 'booking-1'

  it('accepts a standalone review with no booking_id when the tutor exists (201, NULL booking_id)', async () => {
    // booking_id is optional: a standalone review (e.g. from the public tutor
    // profile) is attributed to the client-supplied tutor_id once the tutor is
    // confirmed to exist, and is stored with a NULL booking_id.
    findById.mockImplementation(async (table: string) =>
      table === 'tutor_profiles'
        ? { id: realTutorId, rating_average: 4.5, rating_count: 10 }
        : null,
    )
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: realTutorId, rating: 5 }),
      })
      expect(res.status).toBe(201)
      expect(create).toHaveBeenCalledTimes(1)
      const [table, row] = create.mock.calls[0]
      expect(table).toBe('reviews')
      expect((row as Record<string, unknown>).tutor_id).toBe(realTutorId)
      expect((row as Record<string, unknown>).reviewer_id).toBe(studentId)
      expect((row as Record<string, unknown>).booking_id).toBeNull()
    })
  })

  it('rejects a standalone review for a tutor that does not exist (404, no row created)', async () => {
    // No booking to derive the tutor from, so the client tutor_id is validated
    // against tutor_profiles before the review (or its aggregate) is touched.
    findById.mockResolvedValue(null)
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: 'tutor-ghost', rating: 5 }),
      })
      expect(res.status).toBe(404)
      expect(create).not.toHaveBeenCalled()
    })
  })

  it('rejects a review attributed to a tutor not on the booking (400, no row created)', async () => {
    findById.mockImplementation(async (table: string) =>
      table === 'bookings'
        ? { id: bookingId, student_id: studentId, tutor_id: realTutorId, status: 'completed' }
        : null,
    )
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: 'tutor-victim', booking_id: bookingId, rating: 1 }),
      })
      expect(res.status).toBe(400)
      expect(create).not.toHaveBeenCalled()
    })
  })

  it('rejects a review on a booking the caller does not own (403)', async () => {
    findById.mockImplementation(async (table: string) =>
      table === 'bookings'
        ? { id: bookingId, student_id: 'other-student', tutor_id: realTutorId, status: 'completed' }
        : null,
    )
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: realTutorId, booking_id: bookingId, rating: 5 }),
      })
      expect(res.status).toBe(403)
      expect(create).not.toHaveBeenCalled()
    })
  })

  it('rejects a second review for the same booking (409)', async () => {
    findById.mockImplementation(async (table: string) =>
      table === 'bookings'
        ? { id: bookingId, student_id: studentId, tutor_id: realTutorId, status: 'completed' }
        : null,
    )
    findOne.mockResolvedValue({ id: 'existing-review' })
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: realTutorId, booking_id: bookingId, rating: 4 }),
      })
      expect(res.status).toBe(409)
      expect(create).not.toHaveBeenCalled()
    })
  })

  it('creates the review with the tutor derived from the booking', async () => {
    findById.mockImplementation(async (table: string) => {
      if (table === 'bookings')
        return { id: bookingId, student_id: studentId, tutor_id: realTutorId, status: 'completed' }
      if (table === 'tutor_profiles') return { id: realTutorId, rating_average: 0, rating_count: 0 }
      return null
    })
    const { default: reviewsRouter } = await import('../handlers/reviews.js')
    await withServer(reviewsRouter, studentId, async (base) => {
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tutor_id: realTutorId, booking_id: bookingId, rating: 5 }),
      })
      expect(res.status).toBe(201)
      expect(create).toHaveBeenCalledTimes(1)
      const [table, row] = create.mock.calls[0]
      expect(table).toBe('reviews')
      expect((row as Record<string, unknown>).tutor_id).toBe(realTutorId)
      expect((row as Record<string, unknown>).reviewer_id).toBe(studentId)
      expect((row as Record<string, unknown>).booking_id).toBe(bookingId)
    })
  })
})
