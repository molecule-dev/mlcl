/**
 * Objective progress rollup, shared by the check-in and key-result handlers.
 *
 * @module
 */

import { findMany, updateById } from '@molecule/api-database'

/**
 * Recompute an objective's stored `progress` as the equal-weighted average of its key
 * results' progress, and persist it. The UI renders `objectives.progress` directly (the
 * progress ring, the dashboard "overall progress" average), but nothing ever rolled it up
 * from the key results — so it stayed frozen at its creation value while the individual KR
 * rings moved. Mirrors the read-only average already used in teams.ts. Call after any key
 * result create / update / delete or check-in that changes a KR's progress. An objective
 * with no key results rolls up to 0.
 */
export async function recomputeObjectiveProgress(objectiveId: string): Promise<void> {
  const krs = await findMany<{ progress: number | string | null }>('key_results', {
    where: [{ field: 'objective_id', operator: '=', value: objectiveId }],
  })
  const progress =
    krs.length === 0
      ? 0
      : Math.round(krs.reduce((sum, k) => sum + (Number(k.progress) || 0), 0) / krs.length)
  await updateById('objectives', objectiveId, { progress, updated_at: new Date() })
}
