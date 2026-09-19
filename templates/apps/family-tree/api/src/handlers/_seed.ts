/**
 * family-tree — per-user demo seeding.
 *
 * On the first authenticated request from a user (signup or login) this
 * module checks whether the user has any people yet. If not, it seeds the
 * demo family from api/fixtures/{people,relationships}.json — four
 * generations connected by parent and partner edges. Fixture rows reference
 * each other by stable `key`; the seed maps keys to freshly created uuids.
 *
 * The seed is gated on count(people). Once a user has people, subsequent
 * calls are a no-op. Concurrent calls are guarded with an in-memory
 * `seedingInFlight` map to avoid double-seeding when a fresh signup hits
 * multiple endpoints simultaneously.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

interface FixturePerson {
  key: string
  first_name: string
  last_name?: string | null
  maiden_name?: string | null
  gender?: string | null
  birth_date?: string | null
  birth_place?: string | null
  death_date?: string | null
  death_place?: string | null
  notes?: string | null
}

interface FixtureRelationship {
  from_key: string
  to_key: string
  kind: 'parent' | 'partner'
}

async function loadFixtures(): Promise<{
  people: FixturePerson[]
  relationships: FixtureRelationship[]
}> {
  const peopleUrl = new URL('../../fixtures/people.json', import.meta.url)
  const relUrl = new URL('../../fixtures/relationships.json', import.meta.url)
  const [people, relationships] = await Promise.all([
    readFile(peopleUrl, 'utf8'),
    readFile(relUrl, 'utf8'),
  ])
  return { people: JSON.parse(people), relationships: JSON.parse(relationships) }
}

/**
 * Seed the demo family for a single user, idempotently. Returns immediately
 * if the user is already seeded.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return

  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('people', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const { people: fixturePeople, relationships: fixtureRels } = await loadFixtures()
    const keyToId = new Map<string, string>()

    for (const p of fixturePeople) {
      const result = await create('people', {
        user_id: userId,
        first_name: p.first_name,
        last_name: p.last_name ?? null,
        maiden_name: p.maiden_name ?? null,
        gender: p.gender ?? null,
        birth_date: p.birth_date ?? null,
        birth_place: p.birth_place ?? null,
        death_date: p.death_date ?? null,
        death_place: p.death_place ?? null,
        notes: p.notes ?? null,
        photo_url: null,
        created_at: new Date(),
      })
      const created = (result as { data?: { id?: string } }).data ?? result
      const newId = (created as { id?: string })?.id
      if (newId) keyToId.set(p.key, newId)
    }

    for (const rel of fixtureRels) {
      const fromId = keyToId.get(rel.from_key)
      const toId = keyToId.get(rel.to_key)
      if (!fromId || !toId) continue
      await create('relationships', {
        user_id: userId,
        from_person: fromId,
        to_person: toId,
        kind: rel.kind,
        created_at: new Date(),
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[family-tree/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
