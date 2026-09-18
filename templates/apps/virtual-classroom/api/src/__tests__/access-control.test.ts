/**
 * Broken-access-control regression tests (TPL-2).
 *
 * Two privilege-escalation paths, both rooted in trusting a client-supplied
 * `role`, are exercised here:
 *
 *   1. POST /rooms/:id/join — a student must NOT be able to self-assign
 *      `instructor`/`ta` (which grants whiteboard write/clear). The role is
 *      derived server-side from room ownership / course enrollment.
 *   2. POST /courses/:id/enroll — a student must NOT be able to self-assign an
 *      elevated `ta` enrollment role. Only the course instructor may grant it.
 *
 * Each test asserts the persisted role, not the request body — the body role is
 * deliberately malicious.
 */

import type { Request, Response, Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as db from '@molecule/api-database'

let currentUserId = 'user-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: vi.fn(() => currentUserId),
  getUserId: vi.fn(() => currentUserId),
  validationError: vi.fn((res: Response, _issues: unknown) => {
    res.status(400).json({ error: 'validation' })
  }),
}))

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(() => []),
  updateById: vi.fn(async (_t: string, _id: string, data: unknown) => ({ data })),
  deleteById: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: vi.fn(async () => undefined),
}))

const mockedDb = vi.mocked(db)

/** Pull a single route handler off an express Router by method + path. */
function getHandler(
  router: Router,
  method: string,
  path: string,
): (req: Request, res: Response) => unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = (router as any).stack.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  )
  if (!layer) throw new Error(`route not found: ${method} ${path}`)
  return layer.route.stack[layer.route.stack.length - 1].handle
}

/** Minimal Express-like response capturing status + json/end. */
function makeRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 200,
    _json: undefined as unknown,
    status(code: number) {
      this._status = code
      return this
    },
    json(payload: unknown) {
      this._json = payload
      return this
    },
    end() {
      return this
    },
  }
  return res as unknown as Response & { _status: number; _json: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUserId = 'user-1'
  mockedDb.updateById.mockImplementation(async (_t, _id, data) => ({ data }) as never)
  mockedDb.create.mockImplementation(async (_t, data) => ({ data }) as never)
})

describe('POST /rooms/:id/join — server-side role derivation', () => {
  it('ignores a client-supplied instructor role and persists student for a non-host', async () => {
    const router = (await import('../handlers/rooms.js')).default
    const join = getHandler(router, 'post', '/:id/join')

    currentUserId = 'student-1'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'rooms') {
        return {
          id: '11111111-1111-4111-8111-111111111111',
          host_id: 'host-9',
          course_id: null,
          status: 'waiting',
          participant_count: 0,
        } as never
      }
      // no existing participant
      return null as never
    })

    const req = {
      params: { id: '11111111-1111-4111-8111-111111111111' },
      // malicious: try to self-assign instructor
      body: { role: 'instructor' },
    } as unknown as Request
    const res = makeRes()

    await join(req, res)

    expect(mockedDb.create).toHaveBeenCalledTimes(1)
    const [table, payload] = mockedDb.create.mock.calls[0]
    expect(table).toBe('room_participants')
    expect((payload as { role: string }).role).toBe('student')
    expect((payload as { role: string }).role).not.toBe('instructor')
  })

  it('grants instructor to the room host regardless of body', async () => {
    const router = (await import('../handlers/rooms.js')).default
    const join = getHandler(router, 'post', '/:id/join')

    currentUserId = 'host-9'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'rooms') {
        return {
          id: '11111111-1111-4111-8111-111111111111',
          host_id: 'host-9',
          course_id: null,
          status: 'waiting',
          participant_count: 0,
        } as never
      }
      return null as never
    })

    const req = {
      params: { id: '11111111-1111-4111-8111-111111111111' },
      body: { role: 'student' },
    } as unknown as Request
    const res = makeRes()

    await join(req, res)

    const [, payload] = mockedDb.create.mock.calls[0]
    expect((payload as { role: string }).role).toBe('instructor')
  })

  it('honors an authoritative ta course-enrollment when joining a course room', async () => {
    const router = (await import('../handlers/rooms.js')).default
    const join = getHandler(router, 'post', '/:id/join')

    currentUserId = 'ta-1'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'rooms') {
        return {
          id: '11111111-1111-4111-8111-111111111111',
          host_id: 'host-9',
          course_id: 'course-1',
          status: 'waiting',
          participant_count: 0,
        } as never
      }
      if (table === 'room_participants') return null as never
      if (table === 'courses') return { id: 'course-1', instructor_id: 'host-9' } as never
      if (table === 'course_enrollments') {
        return { id: 'e1', course_id: 'course-1', student_id: 'ta-1', role: 'ta' } as never
      }
      return null as never
    })

    const req = {
      params: { id: '11111111-1111-4111-8111-111111111111' },
      body: {},
    } as unknown as Request
    const res = makeRes()

    await join(req, res)

    const [, payload] = mockedDb.create.mock.calls[0]
    expect((payload as { role: string }).role).toBe('ta')
  })
})

describe('POST /courses/:id/enroll — elevated role gate', () => {
  it('forces self-enrolling student to student even when body asks for ta', async () => {
    const router = (await import('../handlers/courses.js')).default
    const enroll = getHandler(router, 'post', '/:id/enroll')

    currentUserId = 'student-1'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'courses') {
        return { id: 'course-1', instructor_id: 'instr-9' } as never
      }
      // no existing enrollment
      return null as never
    })

    const req = {
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: { role: 'ta' },
    } as unknown as Request
    const res = makeRes()

    await enroll(req, res)

    // The privileged path is rejected; no elevated enrollment is created.
    expect(res._status).toBe(403)
    expect(mockedDb.create).not.toHaveBeenCalled()
  })

  it('lets a plain student self-enroll as student', async () => {
    const router = (await import('../handlers/courses.js')).default
    const enroll = getHandler(router, 'post', '/:id/enroll')

    currentUserId = 'student-1'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'courses') return { id: 'course-1', instructor_id: 'instr-9' } as never
      return null as never
    })

    const req = {
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: {},
    } as unknown as Request
    const res = makeRes()

    await enroll(req, res)

    expect(mockedDb.create).toHaveBeenCalledTimes(1)
    const [, payload] = mockedDb.create.mock.calls[0]
    expect((payload as { role: string }).role).toBe('student')
  })

  it('lets the course instructor grant a ta enrollment role', async () => {
    const router = (await import('../handlers/courses.js')).default
    const enroll = getHandler(router, 'post', '/:id/enroll')

    currentUserId = 'instr-9'
    mockedDb.findOne.mockImplementation(async (table: string) => {
      if (table === 'courses') return { id: 'course-1', instructor_id: 'instr-9' } as never
      return null as never
    })

    const req = {
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: { role: 'ta' },
    } as unknown as Request
    const res = makeRes()

    await enroll(req, res)

    expect(mockedDb.create).toHaveBeenCalledTimes(1)
    const [, payload] = mockedDb.create.mock.calls[0]
    expect((payload as { role: string }).role).toBe('ta')
  })
})
