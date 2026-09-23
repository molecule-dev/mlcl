import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type MuscleGroup, MuscleGroupBadge } from '../components/MuscleGroupBadge.js'
import { getWeightUnit, toDisplayWeight } from '../lib/weight.js'

interface ApiPersonalRecord {
  id: string
  exercise_id: string
  workout_id?: string | null
  kind: '1rm_estimated' | '1rm' | '3rm' | '5rm' | 'max_volume' | 'max_reps'
  value: number | string
  achieved_at: string
}

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
}

const MUSCLE_GROUPS: ReadonlyArray<MuscleGroup> = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
]

const KIND_FILTERS: Array<{ key: '' | ApiPersonalRecord['kind']; label: string }> = [
  { key: '', label: 'All' },
  { key: '1rm_estimated', label: 'Est. 1RM' },
  { key: '1rm', label: '1RM' },
  { key: '3rm', label: '3RM' },
  { key: '5rm', label: '5RM' },
  { key: 'max_volume', label: 'Max volume' },
  { key: 'max_reps', label: 'Max reps' },
]

function normalizeMuscleGroup(value: unknown): MuscleGroup {
  if (typeof value !== 'string') return 'core'
  const lower = value.toLowerCase()
  for (const g of MUSCLE_GROUPS) if (lower === g) return g
  if (/(quad|ham|glute|calf|leg)/.test(lower)) return 'legs'
  if (/(chest|pec)/.test(lower)) return 'chest'
  if (/(back|lat|trap)/.test(lower)) return 'back'
  if (/(shoulder|delt)/.test(lower)) return 'shoulders'
  if (/(bicep|tricep|arm|forearm)/.test(lower)) return 'arms'
  if (/(core|abs|abdom)/.test(lower)) return 'core'
  if (/(cardio|conditioning|run|row|bike)/.test(lower)) return 'cardio'
  return 'core'
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PersonalRecords() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [records, setRecords] = useState<ApiPersonalRecord[]>([])
  const [exercises, setExercises] = useState<Map<string, ApiExercise>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [kind, setKind] = useState<'' | ApiPersonalRecord['kind']>('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const list = (await http.get<ApiPersonalRecord[]>('/records')).data ?? []
        const exList = (await http.get<ApiExercise[]>('/exercises')).data ?? []
        if (cancelled) return
        setRecords(list)
        setExercises(new Map(exList.map((e) => [e.id, e])))
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
  }, [http])

  const filtered = useMemo(() => {
    return records.filter((r) => (kind ? r.kind === kind : true))
  }, [records, kind])

  const top = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 3)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [filtered],
  )

  return (
    <>
      <ForjaTopBar
        title={t('forja.records.title', {}, { defaultValue: 'Personal records' })}
        eyebrow={
          <>
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-base text-pr')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span>
              {t(
                'forja.records.eyebrow',
                { count: filtered.length },
                { defaultValue: '{{count}} all-time PRs across every tracked lift' },
              )}
            </span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-pressed={filterOpen}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              filter_list
            </span>
            {t('forja.records.filter', {}, { defaultValue: 'Filter' })}
          </button>
        }
      />

      {filterOpen ? (
        <div
          aria-label={t('forja.records.filterLabel', {}, { defaultValue: 'PR filter' })}
          className={cm.cn(
            cm.flex({ gap: 'xs' }),
            cm.sp('p', 4),
            'rounded-xl bg-surface border border-outline/40 flex-wrap',
          )}
        >
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => setKind(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest transition-colors',
                kind === f.key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface text-on-surface border border-outline hover:bg-surface-variant',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {loadError ? (
        <p
          role="alert"
          data-mol-id="load-error"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          {t(
            'common.loadFailed',
            {},
            {
              defaultValue: 'Could not load your data — check your connection and try again.',
            },
          )}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 5),
            'rounded-xl bg-surface border border-outline/40 text-on-surface-variant',
          )}
        >
          {t('forja.records.loading', {}, { defaultValue: 'Loading personal records…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 8),
            'rounded-2xl border border-dashed border-outline text-center',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant uppercase tracking-widest font-bold',
            )}
          >
            {t('forja.records.empty.title', {}, { defaultValue: 'No PRs yet' })}
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forja.records.empty.body',
              {},
              {
                defaultValue:
                  'Complete a workout — your best estimated 1RM per exercise is recorded here automatically.',
              },
            )}
          </p>
        </div>
      ) : (
        <>
          <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-4')}>
            {top.map((pr) => {
              const ex = exercises.get(pr.exercise_id)
              return (
                <article
                  key={pr.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 6),
                    'rounded-2xl text-white shadow-lg relative overflow-hidden',
                  )}
                  style={{
                    background:
                      pr.rank === 1
                        ? 'linear-gradient(135deg, #92600a 0%, #78350f 100%)'
                        : pr.rank === 2
                          ? 'linear-gradient(135deg, var(--color-streak-inactive) 0%, var(--mol-color-text-secondary) 100%)'
                          : 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
                  }}
                >
                  <div
                    className={cm.cn(
                      'absolute -right-12 -top-12 w-40 h-40 rounded-full bg-surface/15 blur-2xl pointer-events-none',
                    )}
                  />
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-[0.32em] text-white/80',
                    )}
                  >
                    #{pr.rank} · {pr.kind.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={cm.cn('text-2xl font-bold leading-tight tracking-tight')}>
                    {ex?.name ??
                      t('forja.records.unknownExercise', {}, { defaultValue: 'Unknown exercise' })}
                  </span>
                  <span className={cm.cn('text-5xl font-extrabold tabular-nums leading-none mt-2')}>
                    {toDisplayWeight(Number(pr.value))}{' '}
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        'text-white/80 font-semibold uppercase tracking-widest',
                      )}
                    >
                      {getWeightUnit()}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-white/80 uppercase tracking-widest font-bold',
                    )}
                  >
                    {fmtDate(pr.achieved_at)}
                  </span>
                </article>
              )
            })}
          </section>

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('forja.records.list.title', {}, { defaultValue: 'All-time leaderboard' })}
            </h2>
            <div
              className={cm.cn('overflow-hidden rounded-xl bg-surface border border-outline/40')}
            >
              <table className={cm.cn('w-full text-sm')}>
                <thead>
                  <tr className={cm.cn('text-on-surface-variant text-left')}>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest',
                      )}
                    >
                      Exercise
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest',
                      )}
                    >
                      Kind
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest',
                      )}
                    >
                      Date
                    </th>
                    <th
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'text-[10px] font-black uppercase tracking-widest text-right',
                      )}
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className={cm.cn('divide-y divide-outline/40')}>
                  {filtered.map((row) => {
                    const ex = exercises.get(row.exercise_id)
                    return (
                      <tr
                        key={row.id}
                        className={cm.cn('hover:bg-surface-variant/40 transition-colors')}
                      >
                        <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
                          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                            <span className={cm.cn('font-bold text-on-surface')}>
                              {ex?.name ?? '—'}
                            </span>
                            {ex?.muscle_group ? (
                              <MuscleGroupBadge
                                group={normalizeMuscleGroup(ex.muscle_group)}
                                compact
                              />
                            ) : null}
                          </div>
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-on-surface uppercase font-bold tracking-widest text-xs',
                          )}
                        >
                          {row.kind.replace('_', ' ')}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-on-surface-variant tabular-nums',
                          )}
                        >
                          {fmtDate(row.achieved_at)}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-right text-pr-text font-extrabold tabular-nums',
                          )}
                        >
                          {toDisplayWeight(Number(row.value))} {getWeightUnit()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
