/**
 * Regression test for TPL-004 (privileged-column mass-assignment).
 *
 * An instructor must not be able to self-promote their own course to
 * `featured` by sending `featured: true` in a PATCH/PUT body. The handlers
 * build the DB update via `{ ...body, updated_at }`, so the protection lives
 * in `updateCourseSchema`: `featured` is omitted, and the real validation
 * middleware (`validateBody`) strips unknown keys via `schema.parse()` before
 * the body ever reaches the spread.
 *
 * This test mounts the real catalog router with the real validation
 * middleware and asserts the patch handed to the data store contains no
 * `featured` key, while a legitimate owner-editable field (title) still flows
 * through. It fails if `featured` is re-added to the update schema.
 */
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const OWNER_ID = 'owner-1'

// Capture what the handler tries to persist.
const updateByIdMock = vi.fn(
  async (_table: string, id: string, patch: Record<string, unknown>) => ({
    data: { id, ...patch },
  }),
)
const findByIdMock = vi.fn(async (_table: string, id: string) => ({
  id,
  instructor_id: OWNER_ID,
  user_id: OWNER_ID,
  title: 'Original',
  status: 'draft',
  featured: false,
  published_at: null,
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => OWNER_ID,
  uuidParamSchema: z.object({ id: z.string() }),
}))

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: (...args: [string, string]) => findByIdMock(...args),
  findMany: vi.fn(async () => []),
  updateById: (...args: [string, string, Record<string, unknown>]) => updateByIdMock(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-search', () => ({
  hasProvider: () => false,
  search: vi.fn(),
}))

vi.mock('../handlers/_decorate.js', () => ({
  decorateCourse: async (course: unknown) => course,
  decorateCourses: async (courses: unknown) => courses,
}))

async function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const { default: catalogRouter } = await import('../handlers/catalog.js')
  const app = express()
  app.use(express.json())
  app.use('/catalog', catalogRouter)
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((res) => server.close(() => res())),
      })
    })
  })
}

describe('catalog update — privileged column mass-assignment (TPL-004)', () => {
  let server: { url: string; close: () => Promise<void> }

  beforeEach(async () => {
    updateByIdMock.mockClear()
    findByIdMock.mockClear()
    server = await startServer()
  })

  afterEach(async () => {
    await server.close()
  })

  for (const method of ['PATCH', 'PUT'] as const) {
    it(`${method} /:id strips client-supplied featured but keeps legit fields`, async () => {
      const res = await fetch(`${server.url}/catalog/11111111-1111-1111-1111-111111111111`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated title', featured: true }),
      })

      expect(res.status).toBe(200)
      expect(updateByIdMock).toHaveBeenCalledTimes(1)
      const patch = updateByIdMock.mock.calls[0][2]
      // The unauthorized escalation must be dropped...
      expect(patch).not.toHaveProperty('featured')
      // ...while the legitimate owner edit still goes through.
      expect(patch.title).toBe('Updated title')
    })
  }
})
