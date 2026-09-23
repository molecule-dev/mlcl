import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import type { MuscleGroup } from '../components/MuscleGroupBadge.js'
import { type WorkoutHistoryEntry, WorkoutHistoryRow } from '../components/WorkoutHistoryRow.js'
import { getWeightUnit, toDisplayWeight } from '../lib/weight.js'

interface ApiWorkout {
  id: string
  name?: string | null
  status: string
  started_at: string
  completed_at?: string | null
  duration_seconds?: number | string | null
  total_volume?: number | string | null
  total_volume_kg?: number | string | null
  sets?: ApiWorkoutSet[]
}

interface ApiWorkoutSet {
  id: string
  exercise_id: string
}

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  primary_muscle_group?: string | null
}

const KNOWN_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'glutes',
  'calves',
] as const

function asMuscleGroup(s: string | null | undefined): MuscleGroup | null {
  if (!s) return null
  const lower = s.toLowerCase()
  for (const g of KNOWN_GROUPS) {
    if (lower.includes(g)) return g as MuscleGroup
  }
  return null
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type TranslateFn = ReturnType<typeof useTranslation>['t']

function relativeDate(iso: string, t: TranslateFn): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diff <= 0) return t('forja.common.today', {}, { defaultValue: 'Today' })
  if (diff === 1) return t('forja.common.yesterday', {}, { defaultValue: 'Yesterday' })
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function exportCsv(rows: WorkoutHistoryEntry[]) {
  const header = ['Date', 'Workout', 'Volume', 'Unit', 'Duration (min)', 'Sets']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [r.date, JSON.stringify(r.name), r.totalVolume, r.unit ?? 'kg', r.durationMin, r.sets].join(
        ',',
      ),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workout-history-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function History() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<WorkoutHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadError(false)
      try {
        const [workoutsRes, exercisesRes] = await Promise.all([
          http.get<ApiWorkout[]>('/workouts?status=completed&limit=200'),
          http.get<ApiExercise[]>('/exercises'),
        ])
        if (cancelled) return
        const exMap = new Map((exercisesRes.data ?? []).map((e) => [e.id, e]))
        const workouts = workoutsRes.data ?? []
        const detailed = await Promise.all(
          workouts.map(async (w) => {
            try {
              const detail = (await http.get<ApiWorkout>(`/workouts/${w.id}`)).data
              return detail ?? w
            } catch (_error) {
              // Detail fetch failed — fall back to list-level workout object
              return w
            }
          }),
        )
        if (cancelled) return
        setEntries(
          detailed.map<WorkoutHistoryEntry>((w) => {
            const sets = w.sets ?? []
            const groups = new Set<MuscleGroup>()
            for (const s of sets) {
              const exForSet = exMap.get(s.exercise_id)
              const g = asMuscleGroup(
                exForSet?.primary_muscle_group ?? exForSet?.muscle_group ?? null,
              )
              if (g) groups.add(g)
            }
            return {
              id: w.id,
              name: w.name || t('forja.active.defaultName', {}, { defaultValue: 'Workout' }),
              date: relativeDate(w.started_at, t),
              totalVolume: Math.round(toDisplayWeight(num(w.total_volume_kg ?? w.total_volume))),
              unit: getWeightUnit(),
              durationMin: Math.max(0, Math.round(num(w.duration_seconds) / 60)),
              sets: sets.length,
              newPRs: 0,
              muscleGroups: Array.from(groups),
            }
          }),
        )
      } catch (_error) {
        // Fetch failed — surface an inline error instead of a silent blank.
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, reloadKey])

  const monthVolume = useMemo(() => entries.reduce((sum, r) => sum + r.totalVolume, 0), [entries])

  return (
    <>
      <ForjaTopBar
        title={t('forja.history.title', {}, { defaultValue: 'Workout history' })}
        eyebrow={
          <>
            <span>
              {t(
                'forja.history.eyebrow',
                { count: entries.length },
                { defaultValue: '{{count}} workouts logged' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 0),
                'rounded-full bg-pr-light text-pr-text text-[10px] font-black uppercase tracking-widest',
              )}
            >
              {monthVolume.toLocaleString()} {getWeightUnit()}
            </span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => exportCsv(entries)}
            disabled={entries.length === 0}
            data-testid="export-csv"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide disabled:opacity-50',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              download
            </span>
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        }
      />

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
          {t('forja.history.list.title', {}, { defaultValue: 'All workouts' })}
        </h2>
        {loadError ? (
          <div
            role="alert"
            data-mol-id="load-error"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('p', 4),
              cm.textSize('sm'),
              'flex-wrap rounded-xl bg-error-container text-on-error-container',
            )}
          >
            <span>
              {t(
                'common.loadFailed',
                {},
                {
                  defaultValue: 'Could not load your data — check your connection and try again.',
                },
              )}
            </span>
            <button
              type="button"
              data-mol-id="retry-load"
              onClick={() => setReloadKey((k) => k + 1)}
              className={cm.cn(cm.fontWeight('bold'), 'underline underline-offset-2')}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : null}

        {loading ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 5),
              'rounded-xl bg-surface border border-outline/40 text-on-surface-variant',
            )}
          >
            {t('forja.history.loading', {}, { defaultValue: 'Loading workouts…' })}
          </p>
        ) : entries.length === 0 ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 5),
              'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
            )}
            data-testid="history-empty"
          >
            {t(
              'forja.history.empty',
              {},
              { defaultValue: 'No completed workouts yet — finish a session to see it here.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <WorkoutHistoryRow entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
