/**
 * Development user seeding.
 *
 * Creates a deterministic test account (email `g37@flagship.test`,
 * password `TestPass!1`) on dev startup so that automated behavioral
 * verifiers (G37 page-interaction probe) can authenticate without
 * relying on per-run signups. Skipped automatically in production —
 * this is a development convenience only.
 *
 * Idempotent: if the user already exists the function is a no-op.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { create, findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { hash } from '@molecule/api-password'

const TEST_EMAIL = 'g37@flagship.test'
const TEST_PASSWORD = 'TestPass!1'

/**
 * Seed a deterministic dev user if one does not already exist. No-op in
 * production. Failures are logged but never throw — seed problems must
 * not block the dev server from starting.
 */
export async function seedDevUser(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return
  try {
    const existing = await findMany<{ id: string; email: string }>('users', {
      where: [{ field: 'email', operator: '=', value: TEST_EMAIL }],
      limit: 1,
    })
    if (existing.length > 0) return
    const passwordHash = await hash(TEST_PASSWORD)
    const id = randomUUID()
    await create('users', {
      id,
      email: TEST_EMAIL,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await create('usersSecrets', {
      id,
      passwordHash,
    })
    logger.info(`Seeded dev test user ${TEST_EMAIL}.`)
  } catch (err) {
    logger.warn?.(`Skipped dev test user seed: ${(err as Error).message}`)
  }
}
