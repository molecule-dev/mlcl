import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type MuscleGroup, MuscleGroupBadge } from '../components/MuscleGroupBadge.js'
import { type StatItem, StatsTriad } from '../components/StatsTriad.js'
import { getWeightUnit, toDisplayWeight } from '../lib/weight.js'

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  primary_muscle_group?: string | null
  category?: string | null
  equipment?: string | null
}

interface ApiSet {
  id: string
  workout_id: string
  exercise_id: string
  weight: number | string
  weight_kg?: number | string | null
  reps: number
}

interface ApiWorkout {
  id: string
  name?: string | null
  status: string
  started_at: string
  sets?: ApiSet[]
}

interface ApiPersonalRecord {
  id: string
  exercise_id: string
  kind: string
  value: number | string
  achieved_at: string
}

interface ApiVolumePoint {
  date: string
  volume: number
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

function asMuscleGroup(s: string | null | undefined): MuscleGroup {
  if (!s) return 'core'
  const lower = s.toLowerCase()
  for (const g of KNOWN_GROUPS) {
    if (lower.includes(g)) return g as MuscleGroup
  }
  return 'core'
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ExerciseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams()
  const http = useHttpClient()

  const [exercise, setExercise] = useState<ApiExercise | null>(null)
  const [pr, setPR] = useState<ApiPersonalRecord | null>(null)
  const [volume, setVolume] = useState<ApiVolumePoint[]>([])
  const [sessions, setSessions] = useState<
    Array<{
      workout_id: string
      date: string
      startedAtMs: number
      topWeight: number
      topReps: number
      volume: number
      est1RM: number
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        const [exRes, prsRes, volRes, workoutsRes] = await Promise.all([
          http.get<ApiExercise>(`/exercises/${id}`),
          http.get<ApiPersonalRecord[]>(`/progress/personal-records?exercise_id=${id}&limit=10`),
          http.get<ApiVolumePoint[]>(`/progress/volume-over-time?exercise_id=${id}&period=180`),
          http.get<ApiWorkout[]>(`/workouts?status=completed&limit=20`),
        ])
        if (cancelled) return
        setExercise(exRes.data ?? null)
        const sortedPRs = [...(prsRes.data ?? [])].sort((a, b) => num(b.value) - num(a.value))
        setPR(sortedPRs[0] ?? null)
        setVolume(volRes.data ?? [])

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
        const rows = detailed
          .map((w) => {
            const sets = (w.sets ?? []).filter((s) => s.exercise_id === id)
            if (sets.length === 0) return null
            let topW = 0
            let topR = 0
            let vol = 0
            for (const s of sets) {
              const w0 = num(s.weight_kg ?? s.weight)
              const r0 = num(s.reps)
              vol += w0 * r0
              if (w0 > topW || (w0 === topW && r0 > topR)) {
                topW = w0
                topR = r0
              }
            }
            const est = topW * (1 + topR / 30)
            const startedAtMs = new Date(w.started_at).getTime()
            return {
              workout_id: w.id,
              date: fmtDate(w.started_at),
              startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : 0,
              topWeight: topW,
              topReps: topR,
              volume: Math.round(vol),
              est1RM: Math.round(est),
            }
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
        setSessions(rows.slice(0, 10))
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
  }, [http, id])

  const points = useMemo(() => {
    return volume.map((v) => v.volume)
  }, [volume])

  const totalVolume30 = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000
    return Math.round(
      volume.filter((v) => new Date(v.date).getTime() >= since).reduce((s, v) => s + v.volume, 0),
    )
  }, [volume])

  const stats: StatItem[] = [
    {
      key: 'pr',
      icon: 'emoji_events',
      tone: 'pr',
      label: t('forja.exerciseDetail.bestEst', {}, { defaultValue: 'Best est. 1RM' }),
      value: pr ? `${Math.round(toDisplayWeight(num(pr.value)))} ${getWeightUnit()}` : '—',
      caption: pr
        ? t(
            'forja.exerciseDetail.bestCaption',
            { date: fmtDate(pr.achieved_at) },
            { defaultValue: 'set on {{date}}' },
          )
        : t('forja.exerciseDetail.noPR', {}, { defaultValue: 'No PR recorded yet' }),
    },
    {
      key: 'volume',
      icon: 'fitness_center',
      tone: 'volume-up',
      label: t('forja.exerciseDetail.volume30d', {}, { defaultValue: 'Volume (30d)' }),
      value: `${Math.round(toDisplayWeight(totalVolume30)).toLocaleString()} ${getWeightUnit()}`,
      caption: t(
        'forja.exerciseDetail.volumeCaption',
        {
          count: sessions.filter(
            (s) => s.startedAtMs > 0 && Date.now() - s.startedAtMs <= 30 * 86_400_000,
          ).length,
        },
        { defaultValue: 'across {{count}} sessions' },
      ),
    },
    {
      key: 'frequency',
      icon: 'replay',
      tone: 'rest-timer',
      label: t('forja.exerciseDetail.sessions', {}, { defaultValue: 'Sessions' }),
      value: String(sessions.length),
      caption: t('forja.exerciseDetail.sessionsCaption', {}, { defaultValue: 'Total tracked' }),
    },
  ]

  return (
    <>
      <ForjaTopBar
        title={exercise?.name ?? t('forja.exerciseDetail.title', {}, { defaultValue: 'Exercise' })}
        eyebrow={
          <>
            <Link to="/exercises" className={cm.cn('hover:text-primary transition-colors')}>
              ← {t('forja.exerciseDetail.back', {}, { defaultValue: 'Exercises' })}
            </Link>
            <MuscleGroupBadge
              group={asMuscleGroup(
                exercise?.primary_muscle_group ?? exercise?.muscle_group ?? null,
              )}
              compact
            />
            {exercise?.equipment ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{exercise.equipment}</span>
              </>
            ) : null}
          </>
        }
        actions={
          <Link
            to="/workout/active"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              add
            </span>
            {t('forja.exerciseDetail.logSet', {}, { defaultValue: 'Log set' })}
          </Link>
        }
      />

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
          {t('forja.exerciseDetail.loading', {}, { defaultValue: 'Loading exercise…' })}
        </p>
      ) : !exercise ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 5),
            'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
          )}
        >
          {t('forja.exerciseDetail.notFound', {}, { defaultValue: 'Exercise not found.' })}
        </p>
      ) : (
        <>
          <StatsTriad items={stats} />

          {points.length >= 2 ? (
            <section
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 6),
                'rounded-2xl bg-surface border border-outline/40 shadow-sm',
              )}
            >
              <header>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-[0.22em] text-on-surface-variant',
                  )}
                >
                  {t(
                    'forja.exerciseDetail.chart.eyebrow',
                    {},
                    { defaultValue: 'Volume over time' },
                  )}
                </span>
                <h2
                  className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface mt-1')}
                >
                  {t(
                    'forja.exerciseDetail.chart.title',
                    {},
                    { defaultValue: 'Volume per session (last 6 mo)' },
                  )}
                </h2>
              </header>
              <ProgressionChart points={points} />
            </section>
          ) : null}

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
              {t('forja.exerciseDetail.recent.title', {}, { defaultValue: 'Recent sessions' })}
            </h2>
            {sessions.length === 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('p', 5),
                  'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
                )}
              >
                {t(
                  'forja.exerciseDetail.empty',
                  {},
                  { defaultValue: 'No sessions recorded for this exercise yet.' },
                )}
              </p>
            ) : (
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
                        Date
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'text-[10px] font-black uppercase tracking-widest',
                        )}
                      >
                        Top set
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'text-[10px] font-black uppercase tracking-widest text-right',
                        )}
                      >
                        Volume
                      </th>
                      <th
                        className={cm.cn(
                          cm.sp('px', 5),
                          cm.sp('py', 3),
                          'text-[10px] font-black uppercase tracking-widest text-right',
                        )}
                      >
                        Est. 1RM
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cm.cn('divide-y divide-outline/40')}>
                    {sessions.map((row) => (
                      <tr
                        key={row.workout_id}
                        className={cm.cn('hover:bg-surface-variant/40 transition-colors')}
                      >
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'font-bold text-on-surface',
                          )}
                        >
                          {row.date}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-on-surface tabular-nums',
                          )}
                        >
                          {row.topWeight} × {row.topReps}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-right text-on-surface font-extrabold tabular-nums',
                          )}
                        >
                          {Math.round(toDisplayWeight(row.volume)).toLocaleString()}{' '}
                          {getWeightUnit()}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 5),
                            cm.sp('py', 3),
                            'text-right text-pr-text font-extrabold tabular-nums',
                          )}
                        >
                          {Math.round(toDisplayWeight(Number(row.est1RM)))} {getWeightUnit()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

function ProgressionChart({ points }: { points: number[] }) {
  const cm = getClassMap()
  if (points.length === 0) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = 100 / Math.max(points.length - 1, 1)
  const path = points
    .map((v, i) => {
      const x = i * step
      const y = 100 - ((v - min) / range) * 80 - 10
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  const fill = `${path} L 100 100 L 0 100 Z`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cm.cn('w-full h-48')}>
      <path d={fill} fill="rgb(224 80 48 / 0.18)" />
      <path
        d={path}
        fill="none"
        stroke="rgb(224 80 48)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((v, i) => {
        const x = i * step
        const y = 100 - ((v - min) / range) * 80 - 10
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.5"
            fill="white"
            stroke="rgb(224 80 48)"
            strokeWidth="0.8"
          />
        )
      })}
    </svg>
  )
}
