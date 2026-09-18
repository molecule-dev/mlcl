import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the enrollment authorization fix (V1-b / P3F-1):
 *
 * - POST may not be used by a student to self-promote to a staff role, nor to
 *   enroll another user, unless the caller is course staff.
 * - PUT /:id strips `role` for a student editing their own enrollment (no
 *   self-promotion) and requires staff to edit someone else's.
 * - DELETE /:id is scoped to self-unenrollment OR course staff (no IDOR).
 */

// --- mutable test state the hoisted mocks read from ---
let currentUserId: string | null = 'student-1'
const courses = new Map<string, Record<string, unknown>>()
const enrollments = new Map<string, Record<string, unknown>>()
let taEnrollment: Record<string, unknown> | null = null
// Course ids the current user has an active enrollment in (drives assertEnrolled).
let enrolledCourseIds: string[] = []
// Course ids the current user holds an active TA enrollment for (drives the
// role=ta branch of isCourseStaff + staffCourseIds).
let taCourseIds: string[] = []
const createCalls: Array<{ table: string; data: Record<string, unknown> }> = []
const updateCalls: Array<{ table: string; id: string; data: Record<string, unknown> }> = []
const deleteCalls: Array<{ table: string; id: string }> = []
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
    if (table === 'enrollments') return enrollments.get(id) ?? null
    return null
  },
  findOne: async (_table: string, where: Array<{ field: string; value: unknown }>) => {
    const role = where.find((c) => c.field === 'role')?.value
    const courseId = where.find((c) => c.field === 'course_id')?.value as string | undefined
    if (role === 'ta') {
      if (courseId && taCourseIds.includes(courseId)) return { id: 'ta-x', course_id: courseId }
      return taEnrollment
    }
    // assertEnrolled: active enrollment (no role filter)
    if (courseId && enrolledCourseIds.includes(courseId))
      return { id: 'enr-x', course_id: courseId }
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
      // GET list endpoints: return a sentinel row so callers can assert length.
      return [{ id: 'row-1' }]
    }
    return []
  },
  create: async (table: string, data: Record<string, unknown>) => {
    createCalls.push({ table, data })
    return { data: { id: 'new-id', ...data } }
  },
  updateById: async (table: string, id: string, data: Record<string, unknown>) => {
    updateCalls.push({ table, id, data })
    const merged = { id, ...(enrollments.get(id) ?? {}), ...data }
    return { data: merged }
  },
  deleteById: async (table: string, id: string) => {
    deleteCalls.push({ table, id })
    return { data: { id } }
  },
}))

vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => ({ messageId: 'x' })) }))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  // pass-through: the auth fix is independent of body validation
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

let baseUrl = ''
let server: Server

beforeAll(async () => {
  const { default: enrollmentsRouter } = await import('../handlers/enrollments.js')
  const app = express()
  app.use(express.json())
  app.use('/enrollments', enrollmentsRouter)
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
  enrollments.clear()
  taEnrollment = null
  enrolledCourseIds = []
  taCourseIds = []
  createCalls.length = 0
  updateCalls.length = 0
  deleteCalls.length = 0
  findManyCalls.length = 0
  // A course owned by someone else; current user is NOT staff.
  courses.set('course-1', { id: 'course-1', instructor_id: 'instructor-9', name: 'Algebra' })
})

const post = (body: unknown) =>
  fetch(`${baseUrl}/enrollments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /enrollments authorization', () => {
  it('blocks a student self-promoting to ta (forces 403)', async () => {
    const res = await post({
      course_id: 'course-1',
      student_email: 'student1@example.com',
      role: 'ta',
    })
    expect(res.status).toBe(403)
    expect(createCalls).toHaveLength(0)
  })

  it('forces a plain student self-enrollment when no privilege is requested', async () => {
    const res = await post({ course_id: 'course-1', student_email: 'student1@example.com' })
    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0].data.role).toBe('student')
    expect(createCalls[0].data.student_id).toBe('student-1')
  })

  it('blocks enrolling another student_id without course staff (403)', async () => {
    const res = await post({
      course_id: 'course-1',
      student_id: 'someone-else',
      student_email: 'student1@example.com',
    })
    expect(res.status).toBe(403)
    expect(createCalls).toHaveLength(0)
  })

  it('allows course staff (instructor) to enroll another user as ta', async () => {
    currentUserId = 'instructor-9'
    const res = await post({
      course_id: 'course-1',
      student_id: 'helper-2',
      student_email: 'helper@example.com',
      role: 'ta',
    })
    expect(res.status).toBe(201)
    expect(createCalls[0].data.role).toBe('ta')
    expect(createCalls[0].data.student_id).toBe('helper-2')
  })
})

describe('POST /enrollments idempotency (no duplicate enrollment)', () => {
  it('re-enrolling returns the existing enrollment (200) without creating a duplicate', async () => {
    // findOne mock returns an existing enrollment when the course is in enrolledCourseIds.
    enrolledCourseIds = ['course-1']
    const res = await post({ course_id: 'course-1', student_email: 'student1@example.com' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { alreadyEnrolled?: boolean }
    expect(body.alreadyEnrolled).toBe(true)
    // The duplicate insert (and its welcome email) must be skipped.
    expect(createCalls).toHaveLength(0)
  })

  it('still creates when the caller is not yet enrolled', async () => {
    enrolledCourseIds = [] // not enrolled
    const res = await post({ course_id: 'course-1', student_email: 'student1@example.com' })
    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
  })
})

describe('PUT /enrollments/:id authorization', () => {
  it('404s when the enrollment does not exist', async () => {
    const res = await fetch(`${baseUrl}/enrollments/missing`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    })
    expect(res.status).toBe(404)
  })

  it('lets a student change own status but strips role (no self-promotion)', async () => {
    enrollments.set('enr-1', {
      id: 'enr-1',
      course_id: 'course-1',
      student_id: 'student-1',
      role: 'student',
      status: 'active',
    })
    const res = await fetch(`${baseUrl}/enrollments/enr-1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'inactive', role: 'ta' }),
    })
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].data.role).toBeUndefined()
    expect(updateCalls[0].data.status).toBe('inactive')
  })

  it('403s when a non-staff edits another user enrollment', async () => {
    enrollments.set('enr-2', {
      id: 'enr-2',
      course_id: 'course-1',
      student_id: 'other-student',
      role: 'student',
      status: 'active',
    })
    const res = await fetch(`${baseUrl}/enrollments/enr-2`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'ta' }),
    })
    expect(res.status).toBe(403)
    expect(updateCalls).toHaveLength(0)
  })
})

describe('DELETE /enrollments/:id authorization', () => {
  it('403s on cross-course enrollment delete by a non-owner non-staff (IDOR)', async () => {
    enrollments.set('enr-3', {
      id: 'enr-3',
      course_id: 'course-1',
      student_id: 'other-student',
      role: 'student',
      status: 'active',
    })
    const res = await fetch(`${baseUrl}/enrollments/enr-3`, { method: 'DELETE' })
    expect(res.status).toBe(403)
    expect(deleteCalls).toHaveLength(0)
  })

  it('allows self-unenrollment', async () => {
    enrollments.set('enr-4', {
      id: 'enr-4',
      course_id: 'course-1',
      student_id: 'student-1',
      role: 'student',
      status: 'active',
    })
    const res = await fetch(`${baseUrl}/enrollments/enr-4`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(deleteCalls).toHaveLength(1)
  })

  it('allows course staff to remove another user enrollment', async () => {
    currentUserId = 'instructor-9'
    enrollments.set('enr-5', {
      id: 'enr-5',
      course_id: 'course-1',
      student_id: 'other-student',
      role: 'student',
      status: 'active',
    })
    const res = await fetch(`${baseUrl}/enrollments/enr-5`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(deleteCalls).toHaveLength(1)
  })
})

describe('GET /enrollments authorization (TPL-003)', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await fetch(`${baseUrl}/enrollments`)
    expect(res.status).toBe(401)
  })

  it('scopes the no-filter list to the caller (never the global table)', async () => {
    const res = await fetch(`${baseUrl}/enrollments`)
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find(
      (c) => c.table === 'enrollments' && !c.where.some((w) => w.field === 'role'),
    )
    expect(listCall?.where.some((w) => w.field === 'student_id' && w.value === 'student-1')).toBe(
      true,
    )
  })

  it('?course_id roster: 403s a non-enrolled non-staff caller', async () => {
    const res = await fetch(`${baseUrl}/enrollments?course_id=course-1`)
    expect(res.status).toBe(403)
  })

  it('?course_id roster: allows an enrolled student', async () => {
    enrolledCourseIds = ['course-1']
    const res = await fetch(`${baseUrl}/enrollments?course_id=course-1`)
    expect(res.status).toBe(200)
  })

  it('?course_id roster: allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await fetch(`${baseUrl}/enrollments?course_id=course-1`)
    expect(res.status).toBe(200)
  })

  it('?student_id=me resolves to the caller', async () => {
    const res = await fetch(`${baseUrl}/enrollments?student_id=me`)
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find(
      (c) => c.table === 'enrollments' && !c.where.some((w) => w.field === 'role'),
    )
    expect(listCall?.where.some((w) => w.field === 'student_id' && w.value === 'student-1')).toBe(
      true,
    )
  })

  it('?student_id=other 403s a caller who staffs nothing', async () => {
    const res = await fetch(`${baseUrl}/enrollments?student_id=other-student`)
    expect(res.status).toBe(403)
  })

  it('?student_id=other scopes a staff caller to their courses', async () => {
    currentUserId = 'instructor-9' // instructs course-1
    const res = await fetch(`${baseUrl}/enrollments?student_id=other-student`)
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find(
      (c) => c.table === 'enrollments' && !c.where.some((w) => w.field === 'role'),
    )
    const scope = listCall?.where.find((w) => w.field === 'course_id')
    expect(scope?.operator).toBe('in')
    expect(scope?.value).toEqual(['course-1'])
  })
})

describe('GET /enrollments/course/:courseId authorization (TPL-003)', () => {
  it('403s a non-staff caller', async () => {
    const res = await fetch(`${baseUrl}/enrollments/course/course-1`)
    expect(res.status).toBe(403)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await fetch(`${baseUrl}/enrollments/course/course-1`)
    expect(res.status).toBe(200)
  })
})

describe('GET /enrollments/student/:studentId authorization (TPL-003)', () => {
  it('allows self', async () => {
    const res = await fetch(`${baseUrl}/enrollments/student/student-1`)
    expect(res.status).toBe(200)
  })

  it('403s a non-self caller who staffs nothing', async () => {
    const res = await fetch(`${baseUrl}/enrollments/student/other-student`)
    expect(res.status).toBe(403)
  })

  it('scopes a non-self staff caller to their courses', async () => {
    currentUserId = 'instructor-9'
    const res = await fetch(`${baseUrl}/enrollments/student/other-student`)
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find(
      (c) => c.table === 'enrollments' && !c.where.some((w) => w.field === 'role'),
    )
    const scope = listCall?.where.find((w) => w.field === 'course_id')
    expect(scope?.operator).toBe('in')
    expect(scope?.value).toEqual(['course-1'])
  })
})
