/**
 * Weight-unit preference (Settings → Preferences → Weight unit), stored on the
 * profile at `oauthData.preferences.weightUnit` ('kg' | 'lbs').
 *
 * Set weights are stored canonically in **kilograms** (ActiveWorkout writes
 * `weight_kg` + `weight_unit: 'kg'`); this module converts them to the chosen
 * display unit. Previously every weight display hardcoded `kg`, so choosing lbs
 * had no effect.
 *
 * The chosen unit is cached at module scope so the many stateless weight
 * renderers can read it synchronously via `getWeightUnit()` / `toDisplayWeight()`;
 * a single `useWeightPreference()` hook mounted in the authenticated app shell
 * fetches it once and re-renders the tree when it resolves. Converters are pure.
 */
import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient } from '@molecule/app-react'

export type WeightUnit = 'kg' | 'lbs'

const DEFAULT_UNIT: WeightUnit = 'kg'
const KG_TO_LBS = 2.2046226218

let cachedUnit: WeightUnit = DEFAULT_UNIT

/** Coerce an arbitrary stored value to a known weight unit (defaults to kg). */
export function normalizeWeightUnit(unit: string | null | undefined): WeightUnit {
  return unit === 'lbs' ? 'lbs' : 'kg'
}

/** The user's display weight unit (defaults to kg until preferences load). */
export function getWeightUnit(): WeightUnit {
  return cachedUnit
}

/** Seed the cached unit — e.g. on Settings load/save, or from the shell hook. */
export function primeWeightUnit(unit: string | null | undefined): void {
  cachedUnit = normalizeWeightUnit(unit)
}

/** Convert a canonical-kg value to the given unit, rounded to one decimal (pure). */
export function convertWeight(kg: number, unit: WeightUnit): number {
  const value = unit === 'lbs' ? kg * KG_TO_LBS : kg
  return Math.round(value * 10) / 10
}

/** Convert a canonical-kg value to the user's chosen unit (reads the cache). */
export function toDisplayWeight(kg: number): number {
  return convertWeight(kg, cachedUnit)
}

/**
 * Convert a value the user TYPED in their chosen unit back to canonical kg for
 * storage (the inverse of toDisplayWeight). A lbs entry is divided by the factor;
 * a kg entry is returned unchanged.
 */
export function toStorageKg(value: number, unit: WeightUnit = cachedUnit): number {
  const kg = unit === 'lbs' ? value / KG_TO_LBS : value
  return Math.round(kg * 100) / 100
}

interface UserPrefsResponse {
  preferences?: { weightUnit?: string }
}

/**
 * Fetch the signed-in user's weight-unit preference once and keep the module
 * cache fresh. Mount this in the authenticated app shell so every weight
 * renderer picks up the chosen unit and re-renders when it loads. Reads the
 * server-side GET /api/settings channel — the platform user resource never
 * returns `oauthData` on reads, so the preference cannot ride /users/:id.
 * A failed load keeps the default and must never break rendering.
 */
export function useWeightPreference(): WeightUnit {
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [unit, setUnit] = useState<WeightUnit>(cachedUnit)
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    http
      .get<UserPrefsResponse>('/settings')
      .then((res) => {
        if (cancelled) return
        const next = normalizeWeightUnit(res.data?.preferences?.weightUnit)
        cachedUnit = next
        setUnit(next)
      })
      .catch(() => {
        // keep the default; a failed profile load must not break rendering
      })
    return () => {
      cancelled = true
    }
  }, [http, userId])
  return unit
}
