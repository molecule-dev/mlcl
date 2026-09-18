/**
 * Regression test for L1-1 (hardcoded-credential instructor backdoor).
 *
 * The global catalog seed creates a demo instructor `users` row so the
 * catalog/instructor pages render. It must NOT also create a
 * `usersSecrets` row, because that row carried a hashed copy of a static
 * password committed to the public template source — a known-credential
 * privileged login present in every deployment.
 *
 * The shared login handler (`@molecule/api-resource-user`) authenticates
 * via `compare(body.password, secrets.passwordHash)` and returns 403 at
 * its `!secrets` check when no `usersSecrets` row exists. So with the
 * secrets row gone, the seeded account is unauthenticatable while the
 * instructor still exists for page rendering.
 *
 * This test mounts the real seed against a mocked data store and asserts:
 *   - the instructor `users` row IS created (pages still render), and
 *   - NO `usersSecrets` row is ever created (no loginable account), and
 *   - the legitimate catalog (courses/lessons) still seeds.
 *
 * It fails if a `usersSecrets`/`passwordHash` create is reintroduced.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface CreateCall {
  table: string
  values: Record<string, unknown>
}

const createCalls: CreateCall[] = []

const createMock = vi.fn(async (table: string, values: Record<string, unknown>) => {
  createCalls.push({ table, values })
  // Courses need an id echoed back so the seed can attach lessons/reviews.
  return { data: { id: `${table}-${createCalls.length}` } }
})

vi.mock('@molecule/api-database', () => ({
  // No published course yet, and no existing instructor → full cold seed.
  count: vi.fn(async () => 0),
  findOne: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  create: (...args: [string, Record<string, unknown>]) => createMock(...args),
}))

describe('global catalog seed — demo instructor is not loginable (L1-1)', () => {
  beforeEach(() => {
    createCalls.length = 0
    createMock.mockClear()
  })

  it('creates the instructor users row but never a usersSecrets/password row', async () => {
    const { seedGlobalCatalogIfEmpty } = await import('../handlers/_seed.js')
    const result = await seedGlobalCatalogIfEmpty()

    // Legitimate behavior preserved: the instructor exists (pages render)...
    const userCreates = createCalls.filter((c) => c.table === 'users')
    expect(userCreates).toHaveLength(1)
    expect(userCreates[0].values.email).toBe('demo-instructor@example.com')
    expect(userCreates[0].values.is_instructor).toBe(true)
    expect(result.instructorCreated).toBe(true)

    // ...and the catalog still seeds.
    expect(result.coursesCreated).toBeGreaterThan(0)
    expect(result.lessonsCreated).toBeGreaterThan(0)

    // The exploit is closed: no secrets row → no password hash → not loginable.
    const secretCreates = createCalls.filter((c) => c.table === 'usersSecrets')
    expect(secretCreates).toHaveLength(0)
    // Defense in depth: no create call anywhere carries a passwordHash.
    for (const call of createCalls) {
      expect(call.values).not.toHaveProperty('passwordHash')
    }
  })
})
