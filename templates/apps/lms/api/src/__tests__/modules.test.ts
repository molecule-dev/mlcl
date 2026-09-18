import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the module-items reorder IDOR fix (RVALL):
 *
 * PUT /modules/:moduleId/reorder authorizes only the PATH module's course
 * (assertCourseStaff), then renumbers the client-supplied item_ids. Before
 * the fix it called updateById on every id blindly, so a staff member of one
 * module/course could renumber another module's items by passing their ids.
 *
 * The fix fetches the module's OWN items first and ignores any id that does
 * not belong to this module. Legitimate reordering of the module's own items
 * keeps working; foreign ids are silently skipped.
 */

let currentUserId: string | null = 'instructor-9'
// courseId -> instructor_id
const courses = new Map<string, { id: string; instructor_id: string }>([
  ['course-1', { id: 'course-1', instructor_id: 'instructor-9' }],
])
// moduleId -> course_id
const modules = new Map<string, { id: string; course_id: string }>([
  ['module-1', { id: 'module-1', course_id: 'course-1' }],
])
// module_items keyed by module_id
const moduleItems: Record<string, Array<{ id: string }>> = {
  'module-1': [{ id: 'item-1' }, { id: 'item-2' }, { id: 'item-3' }],
  'module-2': [{ id: 'foreign-1' }],
}
const updateCalls: Array<{ table: string; id: string; data: Record<string, unknown> }> = []

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
    return null
  },
  findOne: async () => null, // no TA enrollment
  findMany: async (table: string, opts: { where?: Array<Record<string, unknown>> }) => {
    const where = opts?.where ?? []
    if (table === 'module_items') {
      const moduleId = where.find((c) => c.field === 'module_id')?.value as string | undefined
      return moduleId ? (moduleItems[moduleId] ?? []) : []
    }
    return []
  },
  create: async () => ({ data: {} }),
  updateById: async (table: string, id: string, data: Record<string, unknown>) => {
    updateCalls.push({ table, id, data })
    return { data: { id, ...data } }
  },
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
  currentUserId = 'instructor-9'
  updateCalls.length = 0
})

const reorder = (moduleId: string, item_ids: string[]) =>
  fetch(`${baseUrl}/modules/${moduleId}/reorder`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ item_ids }),
  })

describe('PUT /modules/:moduleId/reorder IDOR binding', () => {
  it('401s for anonymous callers', async () => {
    currentUserId = null
    const res = await reorder('module-1', ['item-2', 'item-1'])
    expect(res.status).toBe(401)
    expect(updateCalls.length).toBe(0)
  })

  it('403s for a non-staff caller', async () => {
    currentUserId = 'random-user'
    const res = await reorder('module-1', ['item-2', 'item-1'])
    expect(res.status).toBe(403)
    expect(updateCalls.length).toBe(0)
  })

  it("reorders the module's own items for course staff", async () => {
    const res = await reorder('module-1', ['item-2', 'item-1', 'item-3'])
    expect(res.status).toBe(200)
    expect(updateCalls).toEqual([
      { table: 'module_items', id: 'item-2', data: { position: 0 } },
      { table: 'module_items', id: 'item-1', data: { position: 1 } },
      { table: 'module_items', id: 'item-3', data: { position: 2 } },
    ])
  })

  it('ignores foreign item ids belonging to another module', async () => {
    const res = await reorder('module-1', ['foreign-1', 'item-1'])
    expect(res.status).toBe(200)
    // foreign-1 (belongs to module-2) must NOT be touched; item-1 is reordered.
    expect(updateCalls.find((c) => c.id === 'foreign-1')).toBeUndefined()
    expect(updateCalls).toEqual([{ table: 'module_items', id: 'item-1', data: { position: 1 } }])
  })
})
