import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the discussions broken-access-control fix
 * (RVALL-1 — residual of the pass-9 lms sweep):
 *
 * The global verifyMiddleware only POPULATES the session (it never 401s), so
 * handlers must self-guard. discussions.ts was left ungated while the sweep
 * fixed grades/enrollments. After the fix:
 *
 * - Content reads (GET /, GET /:id, GET /:id/replies, GET /course/:courseId)
 *   require a session and course membership (enrolled student/TA or staff);
 *   anonymous callers get 401 (or an empty forum list on GET /).
 * - POST / and POST /:id/replies require an active enrollment in the thread's
 *   course — an unenrolled user is 403'd and nothing is created.
 * - Enrolled students and course staff keep working.
 */

// --- mutable test state the hoisted mocks read from ---
let currentUserId: string | null = 'student-1'
// courseId -> instructor_id
const courses = new Map<string, { id: string; instructor_id: string }>()
// course ids the current user has an active enrollment in (drives assertEnrolled
// + the enrolledCourseIds list scope)
let enrolledCourseIds: string[] = []
// course ids the current user holds an active TA enrollment for (drives the
// role=ta branch of isCourseStaff + staffCourseIds)
let taCourseIds: string[] = []
const discussionRows = new Map<string, { id: string; course_id: string }>()
const createCalls: Array<{ table: string; data: Record<string, unknown> }> = []
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
    if (table === 'discussions') return discussionRows.get(id) ?? null
    return null
  },
  findOne: async (_table: string, where: Array<{ field: string; value: unknown }>) => {
    const courseId = where.find((c) => c.field === 'course_id')?.value as string | undefined
    const role = where.find((c) => c.field === 'role')?.value
    if (role === 'ta') {
      // isCourseStaff's TA check
      if (courseId && taCourseIds.includes(courseId)) return { id: 'ta-x', course_id: courseId }
      return null
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
      // staffCourseIds owned-courses path uses instructor_id; the
      // enrolledCourseIds path filters by student_id + status=active.
      return enrolledCourseIds.map((cid) => ({ course_id: cid }))
    }
    if (table === 'discussions') return [{ id: 'd1', course_id: 'course-1' }]
    if (table === 'discussion_replies') return [{ id: 'r1' }]
    return []
  },
  create: async (table: string, data: Record<string, unknown>) => {
    createCalls.push({ table, data })
    return { data: { id: 'new-id', ...data } }
  },
  updateById: async (_table: string, id: string, data: Record<string, unknown>) => ({
    data: { id, ...data },
  }),
  deleteById: async (_table: string, id: string) => ({ data: { id } }),
}))

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
  const { default: discussionsRouter } = await import('../handlers/discussions.js')
  const app = express()
  app.use(express.json())
  app.use('/discussions', discussionsRouter)
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
  discussionRows.clear()
  enrolledCourseIds = []
  taCourseIds = []
  createCalls.length = 0
  findManyCalls.length = 0
  // course-1 owned by instructor-9; current user is NOT staff by default.
  courses.set('course-1', { id: 'course-1', instructor_id: 'instructor-9' })
  // a thread in course-1
  discussionRows.set('d1', { id: 'd1', course_id: 'course-1' })
})

const get = (path: string) => fetch(`${baseUrl}${path}`)
const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('GET /discussions (forum list) authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/discussions')
    expect(res.status).toBe(401)
  })

  it('returns an empty list for a member of no courses (never the global table)', async () => {
    const res = await get('/discussions')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    // never queried the discussions table unscoped
    expect(findManyCalls.some((c) => c.table === 'discussions')).toBe(false)
  })

  it('scopes the list to the enrolled + staffed course ids', async () => {
    enrolledCourseIds = ['course-1']
    const res = await get('/discussions')
    expect(res.status).toBe(200)
    const listCall = findManyCalls.find((c) => c.table === 'discussions')
    const scope = listCall?.where.find((w) => w.field === 'course_id')
    expect(scope?.operator).toBe('in')
    expect(scope?.value).toEqual(['course-1'])
  })

  it('?course_id outside the accessible set yields an empty list', async () => {
    enrolledCourseIds = ['course-1']
    const res = await get('/discussions?course_id=course-other')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe('GET /discussions/:id read authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await get('/discussions/d1')
    expect(res.status).toBe(401)
  })

  it('403s a signed-in but non-member caller', async () => {
    const res = await get('/discussions/d1')
    expect(res.status).toBe(403)
  })

  it('404s when the thread does not exist', async () => {
    enrolledCourseIds = ['course-1']
    const res = await get('/discussions/missing')
    expect(res.status).toBe(404)
  })

  it('allows an enrolled student', async () => {
    enrolledCourseIds = ['course-1']
    const res = await get('/discussions/d1')
    expect(res.status).toBe(200)
  })

  it('allows the course instructor (staff, not enrolled)', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/discussions/d1')
    expect(res.status).toBe(200)
  })
})

describe('GET /discussions/:id/replies read authorization', () => {
  it('403s a non-member caller', async () => {
    const res = await get('/discussions/d1/replies')
    expect(res.status).toBe(403)
  })

  it('allows an enrolled student', async () => {
    enrolledCourseIds = ['course-1']
    const res = await get('/discussions/d1/replies')
    expect(res.status).toBe(200)
  })
})

describe('GET /discussions/course/:courseId read authorization', () => {
  it('403s a non-member caller', async () => {
    const res = await get('/discussions/course/course-1')
    expect(res.status).toBe(403)
  })

  it('allows the course instructor', async () => {
    currentUserId = 'instructor-9'
    const res = await get('/discussions/course/course-1')
    expect(res.status).toBe(200)
  })
})

describe('POST /discussions create authorization', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await post('/discussions', {
      course_id: 'course-1',
      title: 'Hi',
      content: 'Body',
    })
    expect(res.status).toBe(401)
    expect(createCalls).toHaveLength(0)
  })

  it('403s an unenrolled user (cross-course write blocked, nothing created)', async () => {
    const res = await post('/discussions', {
      course_id: 'course-1',
      title: 'Hi',
      content: 'Body',
    })
    expect(res.status).toBe(403)
    expect(createCalls).toHaveLength(0)
  })

  it('allows an enrolled student and stamps the author from the session', async () => {
    enrolledCourseIds = ['course-1']
    const res = await post('/discussions', {
      course_id: 'course-1',
      title: 'Hi',
      content: 'Body',
      author_id: 'forged-other-user',
    })
    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0].data.author_id).toBe('student-1')
  })
})

describe('POST /discussions/:id/replies create authorization', () => {
  it('404s when the thread does not exist', async () => {
    enrolledCourseIds = ['course-1']
    const res = await post('/discussions/missing/replies', { content: 'Hello' })
    expect(res.status).toBe(404)
    expect(createCalls).toHaveLength(0)
  })

  it('403s an unenrolled user (nothing created)', async () => {
    const res = await post('/discussions/d1/replies', { content: 'Hello' })
    expect(res.status).toBe(403)
    expect(createCalls).toHaveLength(0)
  })

  it('allows an enrolled student', async () => {
    enrolledCourseIds = ['course-1']
    const res = await post('/discussions/d1/replies', { content: 'Hello' })
    expect(res.status).toBe(201)
    expect(createCalls).toHaveLength(1)
    expect(createCalls[0].data.author_id).toBe('student-1')
  })
})
