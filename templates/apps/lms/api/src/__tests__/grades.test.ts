import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the grades broken-access-control fix
 * (TPL-001 / TPL-002):
 *
 * - GET /course/:courseId and /course/:courseId/report are course-staff only
 *   (401 anon, 403 non-staff).
 * - GET /student/:studentId is self-scoped: self sees all courses, a non-self
 *   caller only sees grades for the courses they staff (403 if they staff none).
 * - GET /student/:studentId/course/:courseId allows self or staff-of-that-course.
 * - GET /student/:studentId/transcript is self-only.
 */

let currentUserId: string | null = 'student-1'
// courseId -> instructor_id
const courses = new Map<string, { id: string; instructor_id: string }>()
// active TA enrollments for the current user: list of course ids
let taCourseIds: string[] = []
const gradeRows = [
  { id: 'g1', student_id: 'student-1', course_id: 'course-1', score: 90, max_score: 100 },
]
// assignmentId -> assignment row (drives the max_score-defaults-from-points test)
const assignments = new Map<string, { id: string; points: number }>()
let lastCreatedGrade: Record<string, unknown> | null = null
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
  findById: async (table: string, id: string) =>
    table === 'courses'
      ? (courses.get(id) ?? null)
      : table === 'assignments'
        ? (assignments.get(id) ?? null)
        : null,
  findOne: async (_table: string, where: Array<{ field: string; value: unknown }>) => {
    // isCourseStaff's TA check: course_id + student_id + role=ta + status=active
    const courseId = where.find((c) => c.field === 'course_id')?.value as string | undefined
    const role = where.find((c) => c.field === 'role')?.value
    if (role === 'ta' && courseId && taCourseIds.includes(courseId)) {
      return { id: 'ta-x', course_id: courseId }
    }
    return null
  },
  findMany: async (table: string, opts: { where?: Array<Record<string, unknown>> }) => {
    const where = opts.where ?? []
    findManyCalls.push({ table, where })
    if (table === 'courses') {
      const instr = where.find((c) => c.field === 'instructor_id')?.value
      return [...courses.values()].filter((c) => c.instructor_id === instr)
    }
    if (table === 'enrollments') {
      const role = where.find((c) => c.field === 'role')?.value
      if (role === 'ta') return taCourseIds.map((cid) => ({ course_id: cid }))
      return []
    }
    if (table === 'grades') return gradeRows
    return []
  },
  create: async (_table: string, data: Record<string, unknown>) => {
    lastCreatedGrade = data
    return { data: { id: 'new-grade', ...data } }
  },
  updateById: async () => ({ data: {} }),
}))

vi.mock('@molecule/api-reporting', () => ({
  aggregate: async () => ({ rows: [{ avgScore: '90', totalGrades: '1' }] }),
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
  const { default: gradesRouter } = await import('../handlers/grades.js')
  const app = express()
  app.use(express.json())
  app.use('/grades', gradesRouter)
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
  taCourseIds = []
  findManyCalls.length = 0
  assignments.clear()
  lastCreatedGrade = null
  // course-1 owned by instructor-9; current user is NOT staff.
  courses.set('course-1', { id: 'course-1', instructor_id: 'instructor-9' })
})

const get = (path: string) => fetch(`${baseUrl}${path}`)
const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('GET /grades/course/:courseId authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/grades/course/course-1')
    expect(res.status).toBe(401)
  })

  it('403s for a non-staff caller', async () => {
    const res = await get('/grades/course/course-1')
    expect(res.status).toBe(403)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/grades/course/course-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /grades/student/:studentId authorization', () => {
  it('allows self to read all their grades (no course scoping)', async () => {
    const res = await get('/grades/student/student-1')
    expect(res.status).toBe(200)
    const gradesCall = findManyCalls.find((c) => c.table === 'grades')
    expect(gradesCall?.where.some((w) => w.field === 'course_id')).toBe(false)
  })

  it('403s for a non-self caller who staffs nothing', async () => {
    currentUserId = 'random-user'
    const res = await get('/grades/student/student-1')
    expect(res.status).toBe(403)
  })

  it('scopes a non-self staff caller to the courses they staff', async () => {
    currentUserId = 'instructor-9' // instructs course-1
    const res = await get('/grades/student/student-1')
    expect(res.status).toBe(200)
    const gradesCall = findManyCalls.find((c) => c.table === 'grades')
    const courseScope = gradesCall?.where.find((w) => w.field === 'course_id')
    expect(courseScope?.operator).toBe('in')
    expect(courseScope?.value).toEqual(['course-1'])
  })
})

describe('GET /grades/student/:studentId/course/:courseId authorization', () => {
  it('allows self', async () => {
    const res = await get('/grades/student/student-1/course/course-1')
    expect(res.status).toBe(200)
  })

  it('403s for a non-self caller who is not staff of that course', async () => {
    currentUserId = 'random-user'
    const res = await get('/grades/student/student-1/course/course-1')
    expect(res.status).toBe(403)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/grades/student/student-1/course/course-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /grades/student/:studentId/transcript authorization', () => {
  it('allows self', async () => {
    const res = await get('/grades/student/student-1/transcript')
    expect(res.status).toBe(200)
  })

  it('403s for any non-self caller (even an instructor)', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/grades/student/student-1/transcript')
    expect(res.status).toBe(403)
  })
})

describe('GET /grades/course/:courseId/report authorization', () => {
  it('403s for a non-staff caller', async () => {
    const res = await get('/grades/course/course-1/report')
    expect(res.status).toBe(403)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/grades/course/course-1/report')
    expect(res.status).toBe(200)
  })
})

describe('POST /grades defaults max_score from the assignment points', () => {
  it("defaults max_score to the assignment's points when the body omits it", async () => {
    currentUserId = 'instructor-9'
    assignments.set('a1', { id: 'a1', points: 50 })
    const res = await post('/grades', {
      assignment_id: 'a1',
      student_id: 'student-1',
      course_id: 'course-1',
      score: 45,
    })
    expect(res.status).toBe(201)
    expect(lastCreatedGrade?.max_score).toBe(50)
  })

  it('honors an explicit max_score (override wins over the assignment points)', async () => {
    currentUserId = 'instructor-9'
    assignments.set('a1', { id: 'a1', points: 50 })
    const res = await post('/grades', {
      assignment_id: 'a1',
      student_id: 'student-1',
      course_id: 'course-1',
      score: 72,
      max_score: 80,
    })
    expect(res.status).toBe(201)
    expect(lastCreatedGrade?.max_score).toBe(80)
  })
})
