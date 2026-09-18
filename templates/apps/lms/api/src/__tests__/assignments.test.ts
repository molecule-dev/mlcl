import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the assignment content broken-access-control fix
 * (L2-1 — enrollment/paywall bypass):
 *
 * The global verifyMiddleware only POPULATES the session (it never 401s), so
 * the assignment-read handlers must self-guard with course membership
 * (enrolled student/TA or staff) — exactly as discussions.ts does. Before the
 * fix GET /, GET /course/:courseId and GET /:id returned the full assignment
 * rows (instructions, due dates, point values) to ANY caller (even anonymous).
 *
 * After the fix:
 * - GET /, GET /course/:courseId, GET /:id require a session (401 anon) and
 *   course membership (403 non-member).
 * - GET / scopes the listing to the caller's enrolled + staffed courses.
 * - Enrolled students and course staff (instructors) keep working.
 */

let currentUserId: string | null = 'student-1'
// courseId -> instructor_id
const courses = new Map<string, { id: string; instructor_id: string }>()
let enrolledIds: string[] = []
let taCourseIds: string[] = []
// assignmentId -> course_id
const assignments = new Map<string, { id: string; course_id: string }>()
const findManyCalls: Array<{ table: string; where: Array<Record<string, unknown>> }> = []

vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: { status: (n: number) => { json: (b: unknown) => void } }) => {
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' })
      return null
    }
    return currentUserId
  },
}))

vi.mock('@molecule/api-database', () => ({
  findById: async (table: string, id: string) => {
    if (table === 'courses') return courses.get(id) ?? null
    if (table === 'assignments') return assignments.get(id) ?? null
    return null
  },
  findOne: async (_table: string, where: Array<{ field: string; value: unknown }>) => {
    const courseId = where.find((c) => c.field === 'course_id')?.value as string | undefined
    const role = where.find((c) => c.field === 'role')?.value
    if (role === 'ta') {
      if (courseId && taCourseIds.includes(courseId)) return { id: 'ta-x', course_id: courseId }
      return null
    }
    if (courseId && enrolledIds.includes(courseId)) return { id: 'enr-x', course_id: courseId }
    return null
  },
  findMany: async (table: string, opts?: { where?: Array<Record<string, unknown>> }) => {
    const where = opts?.where ?? []
    findManyCalls.push({ table, where })
    if (table === 'courses') {
      const instr = where.find((c) => c.field === 'instructor_id')?.value
      return [...courses.values()].filter((c) => c.instructor_id === instr)
    }
    if (table === 'enrollments') {
      const role = where.find((c) => c.field === 'role')?.value
      if (role === 'ta') return taCourseIds.map((cid) => ({ course_id: cid }))
      return enrolledIds.map((cid) => ({ course_id: cid }))
    }
    if (table === 'assignments') {
      const inFilter = where.find((c) => c.field === 'course_id' && c.operator === 'in')?.value as
        string[] | undefined
      const eqFilter = where.find((c) => c.field === 'course_id' && c.operator === '=')?.value as
        string | undefined
      let rows = [...assignments.values()]
      if (inFilter) rows = rows.filter((a) => inFilter.includes(a.course_id))
      if (eqFilter) rows = rows.filter((a) => a.course_id === eqFilter)
      return rows
    }
    return []
  },
  create: async () => ({ data: {} }),
  updateById: async (_table: string, id: string, data: Record<string, unknown>) => ({
    data: { id, ...data },
  }),
  deleteById: async () => ({ data: {} }),
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
  const { default: assignmentsRouter } = await import('../handlers/assignments.js')
  const app = express()
  app.use(express.json())
  app.use('/assignments', assignmentsRouter)
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
  currentUserId = 'student-1'
  courses.clear()
  assignments.clear()
  enrolledIds = []
  taCourseIds = []
  findManyCalls.length = 0
  courses.set('course-1', { id: 'course-1', instructor_id: 'instructor-9' })
  assignments.set('a1', { id: 'a1', course_id: 'course-1' })
})

const get = (path: string) => fetch(`${baseUrl}${path}`)

describe('GET /assignments (list) authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/assignments')
    expect(res.status).toBe(401)
  })

  it('returns an empty list for a member of no courses (never the global table)', async () => {
    const res = await get('/assignments')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    expect(findManyCalls.some((c) => c.table === 'assignments')).toBe(false)
  })

  it('scopes the list to the enrolled + staffed course ids', async () => {
    enrolledIds = ['course-1']
    const res = await get('/assignments')
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find((c) => c.table === 'assignments')
    const scope = listCall?.where.find((w) => w.field === 'course_id')
    expect(scope?.operator).toBe('in')
    expect(scope?.value).toEqual(['course-1'])
  })

  it('?course_id outside the accessible set yields an empty list', async () => {
    enrolledIds = ['course-1']
    const res = await get('/assignments?course_id=course-other')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe('GET /assignments/course/:courseId read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/assignments/course/course-1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller', async () => {
    const res = await get('/assignments/course/course-1')
    expect(res.status).toBe(403)
  })

  it('allows an enrolled student', async () => {
    enrolledIds = ['course-1']
    const res = await get('/assignments/course/course-1')
    expect(res.status).toBe(200)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/assignments/course/course-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /assignments/:id read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/assignments/a1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller (instructions withheld)', async () => {
    const res = await get('/assignments/a1')
    expect(res.status).toBe(403)
  })

  it('404s when the assignment does not exist', async () => {
    enrolledIds = ['course-1']
    const res = await get('/assignments/missing')
    expect(res.status).toBe(404)
  })

  it('allows an enrolled student', async () => {
    enrolledIds = ['course-1']
    const res = await get('/assignments/a1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('a1')
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/assignments/a1')
    expect(res.status).toBe(200)
  })
})
