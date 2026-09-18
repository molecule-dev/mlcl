import { createHash } from 'node:crypto'

import { findMany } from '@molecule/api-database'

type Flag = {
  name: string
  enabled: boolean
  rollout_percentage: number // 0..100
  updated_at: string
}

const CACHE_TTL_MS = 60_000
let cache: { loadedAt: number; flags: Map<string, Flag> } | null = null

async function loadFlags(): Promise<Map<string, Flag>> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.flags
  }
  const rows = (await findMany('feature_flags', { limit: 500 })) as Flag[]
  const flags = new Map(rows.map((r) => [r.name, r]))
  cache = { loadedAt: Date.now(), flags }
  return flags
}

function bucket(userId: string, name: string): number {
  // Hash (user_id + flag_name) → 0..99. Stable per user per flag, so
  // a user either sees the feature or doesn't — no flicker.
  const h = createHash('sha256').update(`${userId}:${name}`).digest()
  return h.readUInt32BE(0) % 100
}

export async function isEnabled(name: string, user?: { id: string }): Promise<boolean> {
  const flags = await loadFlags()
  const flag = flags.get(name)
  if (!flag || !flag.enabled) return false
  if (flag.rollout_percentage >= 100) return true
  if (!user) return false
  return bucket(user.id, name) < flag.rollout_percentage
}

/**
 * Evaluate EVERY known flag for a user → `{ [name]: boolean }`. Backs the
 * `GET /api/flags` endpoint the client's `useFlag()` hook fetches once on mount.
 * Reuses the same 60s cache as `isEnabled`, so this is one DB read per minute
 * regardless of how many flags or callers exist.
 */
export async function evaluateAll(user?: { id: string }): Promise<Record<string, boolean>> {
  const flags = await loadFlags()
  const result: Record<string, boolean> = {}
  for (const name of flags.keys()) {
    result[name] = await isEnabled(name, user)
  }
  return result
}
