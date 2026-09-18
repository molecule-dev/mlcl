import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the module/lesson content broken-access-control fix
 * (L2-1 — enrollment/paywall bypass):
 *
 * The global verifyMiddleware only POPULATES the session (it never 401s), so
 * the content-read handlers must self-guard with course membership (enrolled
 * student/TA or staff) — exactly as discussions.ts does. Before the fix the
 * module/lesson read endpoints returned course content to ANY caller (even
 * anonymous), bypassing the enrollment gate the template is built around.
 *
 * After the fix:
 * - GET /, GET /course/:courseId, GET /:id, GET /items/:itemId, GET /:id/items
 *   require a session (401 anon) and course membership (403 non-member).
 * - GET / scopes the listing to the caller's enrolled + staffed courses.
 * - Enrolled students and course staff (instructors) keep working.
 */

let currentUserId: string | null = 'student-1'
// courseId -> instructor_id
const courses = new Map<string, { id: string; instructor_id: string; name?: string }>()
// course ids the current user has an active enrollment in (drives assertEnrolled
// + the enrolledCourseIds list scope)
let enrolledIds: string[] = []
// course ids the current user holds an active TA enrollment for (drives the
// role=ta branch of isCourseStaff + staffCourseIds)
let taCourseIds: string[] = []
// moduleId -> course_id
const modules = new Map<string, { id: string; course_id: string; position?: number }>()
// itemId -> module_id
const items = new Map<string, { id: string; module_id: string; position?: number }>()
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
    if (table === 'course_modules') return modules.get(id) ?? null
    if (table === 'module_items') return items.get(id) ?? null
    return null
  },
  findOne: async (_table: string, where: Array<{ field: string; value: unknown }>) => {
    const courseId = where.find((c) => c.field === 'course_id')?.value as string | undefined
    const role = where.find((c) => c.field === 'role')?.value
    if (role === 'ta') {
      if (courseId && taCourseIds.includes(courseId)) return { id: 'ta-x', course_id: courseId }
      return null
    }
    // assertEnrolled: active enrollment (no role filter)
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
    if (table === 'course_modules') {
      const inFilter = where.find((c) => c.field === 'course_id' && c.operator === 'in')?.value as
        string[] | undefined
      const eqFilter = where.find((c) => c.field === 'course_id' && c.operator === '=')?.value as
        string | undefined
      let rows = [...modules.values()]
      if (inFilter) rows = rows.filter((m) => inFilter.includes(m.course_id))
      if (eqFilter) rows = rows.filter((m) => m.course_id === eqFilter)
      return rows
    }
    if (table === 'module_items') {
      const inFilter = where.find((c) => c.field === 'module_id' && c.operator === 'in')?.value as
        string[] | undefined
      const eqFilter = where.find((c) => c.field === 'module_id' && c.operator === '=')?.value as
        string | undefined
      let rows = [...items.values()]
      if (inFilter) rows = rows.filter((it) => inFilter.includes(it.module_id))
      if (eqFilter) rows = rows.filter((it) => it.module_id === eqFilter)
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
  const { default: modulesRouter } = await import('../handlers/modules.js')
  const app = express()
  app.use(express.json())
  app.use('/modules', modulesRouter)
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
  modules.clear()
  items.clear()
  enrolledIds = []
  taCourseIds = []
  findManyCalls.length = 0
  // course-1 owned by instructor-9; current user is NOT staff/enrolled by default.
  courses.set('course-1', { id: 'course-1', instructor_id: 'instructor-9', name: 'Course One' })
  modules.set('module-1', { id: 'module-1', course_id: 'course-1', position: 0 })
  items.set('item-1', { id: 'item-1', module_id: 'module-1', position: 0 })
})

const get = (path: string) => fetch(`${baseUrl}${path}`)

describe('GET /modules (list) authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/modules')
    expect(res.status).toBe(401)
  })

  it('returns an empty list for a member of no courses (never the global table)', async () => {
    const res = await get('/modules')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    // never queried course_modules unscoped
    expect(findManyCalls.some((c) => c.table === 'course_modules')).toBe(false)
  })

  it('scopes the list to the enrolled + staffed course ids', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules')
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find((c) => c.table === 'course_modules')
    const scope = listCall?.where.find((w) => w.field === 'course_id')
    expect(scope?.operator).toBe('in')
    expect(scope?.value).toEqual(['course-1'])
  })
})

describe('GET /modules/course/:courseId read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/modules/course/course-1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller', async () => {
    const res = await get('/modules/course/course-1')
    expect(res.status).toBe(403)
  })

  it('allows an enrolled student', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/course/course-1')
    expect(res.status).toBe(200)
  })

  it('allows the course instructor (staff, not enrolled)', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/modules/course/course-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /modules/items/:itemId read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/modules/items/item-1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller (lesson content withheld)', async () => {
    const res = await get('/modules/items/item-1')
    expect(res.status).toBe(403)
  })

  it('404s when the item does not exist', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/items/missing')
    expect(res.status).toBe(404)
  })

  it('allows an enrolled student and returns lesson content', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/items/item-1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe('item-1')
    expect(body.course_id).toBe('course-1')
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/modules/items/item-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /modules/:id read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/modules/module-1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller', async () => {
    const res = await get('/modules/module-1')
    expect(res.status).toBe(403)
  })

  it('404s when the module does not exist', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/missing')
    expect(res.status).toBe(404)
  })

  it('allows an enrolled student', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/module-1')
    expect(res.status).toBe(200)
  })
})

describe('GET /modules/:id/items read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/modules/module-1/items')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller', async () => {
    const res = await get('/modules/module-1/items')
    expect(res.status).toBe(403)
  })

  it('allows an enrolled student', async () => {
    enrolledIds = ['course-1']
    const res = await get('/modules/module-1/items')
    expect(res.status).toBe(200)
  })
})
