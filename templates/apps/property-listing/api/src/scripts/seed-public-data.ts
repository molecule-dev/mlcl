/**
 * property-listing — global public seed.
 *
 * On API boot, idempotently seeds:
 *   - 5 agent profiles (public catalog)
 *   - 10 active properties owned by a synthetic 'system' user, each linked
 *     to one of the seeded agents
 *
 * The properties are intentionally NOT user-scoped: this is a Zillow-like
 * marketplace where the public browses a shared listing pool. The fresh
 * authenticated user can still create/edit their own listings (those will
 * appear alongside the seed).
 *
 * Re-running is safe: a count() guard skips the work once the seed is in
 * place.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const SYSTEM_USER_ID = '00000000-0000-4000-8000-000000000001'
const SYSTEM_USER_EMAIL = 'system@property-listing.local'

interface AgentFixture {
  id: string
  name: string
  email: string
  phone: string
  bio: string
  city: string
  specialty: string
  rating: number
  active: boolean
}

interface PropertyFixture {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet: number
  lot_size?: number
  year_built?: number
  property_type: string
  photos: string[]
  features: string[]
  status: string
  latitude: number
  longitude: number
  agent_id: string
}

function loadJson<T>(name: string): T[] {
  const here = fileURLToPath(new URL('.', import.meta.url))
  const file = join(here, '../../fixtures', name)
  return JSON.parse(readFileSync(file, 'utf-8')) as T[]
}

let didSeed = false

export async function seedPublicData(): Promise<void> {
  if (didSeed) return
  try {
    const propCount = await count('properties', [])
    const agentCount = await count('agents', [])
    if (propCount > 0 || agentCount > 0) {
      didSeed = true
      return
    }

    // Synthetic system user that owns all seeded properties. Bypass auth
    // entirely; this user has no password and is not addressable from the
    // login form.
    try {
      await create('users', {
        id: SYSTEM_USER_ID,
        email: SYSTEM_USER_EMAIL,
        name: 'PropertyHub Demo',
      })
    } catch (_error) {
      // Already exists or creation rejected — the row may already be present from a prior partial seed
    }

    const agentFixtures = loadJson<AgentFixture>('agents.json')
    const propertyFixtures = loadJson<PropertyFixture>('properties.json')

    const fixtureToDbAgent = new Map<string, string>()

    for (const a of agentFixtures) {
      const r = await create('agents', {
        name: a.name,
        email: a.email,
        phone: a.phone,
        bio: a.bio,
        city: a.city,
        specialty: a.specialty,
        rating: a.rating,
        active: a.active,
      })
      const dbId = (r.data as { id?: string } | null)?.id
      if (dbId) fixtureToDbAgent.set(a.id, dbId)
    }

    let seededProperties = 0
    for (const p of propertyFixtures) {
      const dbAgentId = fixtureToDbAgent.get(p.agent_id)
      try {
        await create('properties', {
          owner_id: SYSTEM_USER_ID,
          agent_id: dbAgentId ?? null,
          title: p.title,
          description: p.description,
          address: p.address,
          city: p.city,
          state: p.state,
          zip_code: p.zip_code,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.square_feet,
          lot_size: p.lot_size ?? null,
          year_built: p.year_built ?? null,
          property_type: p.property_type,
          // JSONB columns: pre-stringify. The pg driver treats raw JS
          // arrays as Postgres ARRAY parameters (`{...}`), which the
          // JSONB parser then either rejects (non-empty) or coerces
          // into an empty object (empty array → `{}`).
          photos: JSON.stringify(p.photos ?? []),
          features: JSON.stringify(p.features ?? []),
          latitude: p.latitude,
          longitude: p.longitude,
          status: p.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        seededProperties++
      } catch (err) {
        logger.error('[property-listing/seed] property insert failed:', err)
      }
    }

    logger.info(
      `[property-listing/seed] seeded ${agentFixtures.length} agents and ${seededProperties} properties`,
    )
    didSeed = true
  } catch (err) {
    logger.error('[property-listing/seed] failed:', err)
  }
}
