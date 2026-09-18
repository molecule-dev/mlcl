import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type MuscleGroup, MuscleGroupBadge } from '../components/MuscleGroupBadge.js'
import { type StatItem, StatsTriad } from '../components/StatsTriad.js'
import { getWeightUnit, toDisplayWeight } from '../lib/weight.js'

interface ApiSet {
  id: string
  exercise_id: string
  set_number?: number | null
  set_index?: number | null
  weight: number | string
  weight_kg?: number | string | null
  reps: number
}

interface ApiWorkout {
  id: string
  name?: string | null
  status: string
  started_at: string
  completed_at?: string | null
  duration_seconds?: number | string | null
  total_volume?: number | string | null
  total_volume_kg?: number | string | null
  sets?: ApiSet[]
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

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function WorkoutDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [workout, setWorkout] = useState<ApiWorkout | null>(null)
  const [exercises, setExercises] = useState<ApiExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [repeating, setRepeating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        const [wRes, exRes] = await Promise.all([
          http.get<ApiWorkout>(`/workouts/${id}`),
          http.get<ApiExercise[]>('/exercises'),
        ])
        if (cancelled) return
        setWorkout(wRes.data ?? null)
        setExercises(exRes.data ?? [])
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : t(
                  'forja.workoutDetail.error.load',
                  {},
                  { defaultValue: 'Could not load workout.' },
                ),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const breakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        exId: string
        name: string
        muscle: MuscleGroup
        topWeight: number
        topReps: number
        volume: number
      }
    >()
    for (const s of workout?.sets ?? []) {
      const ex = exMap.get(s.exercise_id)
      const cur = map.get(s.exercise_id) ?? {
        exId: s.exercise_id,
        name: ex?.name ?? 'Exercise',
        muscle: asMuscleGroup(ex?.primary_muscle_group ?? ex?.muscle_group ?? null),
        topWeight: 0,
        topReps: 0,
        volume: 0,
      }
      const w = num(s.weight_kg ?? s.weight)
      const r = num(s.reps)
      cur.volume += w * r
      if (w > cur.topWeight || (w === cur.topWeight && r > cur.topReps)) {
        cur.topWeight = w
        cur.topReps = r
      }
      map.set(s.exercise_id, cur)
    }
    return Array.from(map.values())
  }, [workout, exMap])

  const totalVolume = Math.round(
    toDisplayWeight(num(workout?.total_volume_kg ?? workout?.total_volume)),
  )
  const durationMin = Math.max(0, Math.round(num(workout?.duration_seconds) / 60))
  const totalSets = workout?.sets?.length ?? 0
  const avgPerSet = totalSets > 0 ? Math.round(num(workout?.duration_seconds) / totalSets) : 0
  const avgPerSetLabel = `${Math.floor(avgPerSet / 60)}:${(avgPerSet % 60).toString().padStart(2, '0')}`

  const stats: StatItem[] = [
    {
      key: 'volume',
      icon: 'fitness_center',
      tone: 'volume-up',
      label: t('forja.workoutDetail.totalVolume', {}, { defaultValue: 'Total volume' }),
      value: `${totalVolume.toLocaleString()} ${getWeightUnit()}`,
      caption: t(
        'forja.workoutDetail.workingSets',
        { count: totalSets },
        { defaultValue: '{{count}} working sets' },
      ),
    },
    {
      key: 'duration',
      icon: 'schedule',
      tone: 'rest-timer',
      label: t('form.duration', {}, { defaultValue: 'Duration' }),
      value: `${durationMin} min`,
      caption: t(
        'forja.workoutDetail.avgPerSet',
        { time: avgPerSetLabel },
        { defaultValue: 'avg {{time}} / set' },
      ),
    },
    {
      key: 'exercises',
      icon: 'list',
      tone: 'primary',
      label: t('forja.workoutDetail.exercises', {}, { defaultValue: 'Exercises' }),
      value: String(breakdown.length),
      caption: t(
        'forja.workoutDetail.exercisesCaption',
        {},
        { defaultValue: 'distinct lifts trained' },
      ),
    },
  ]

  async function handleRepeat() {
    if (!workout) return
    setError('')
    setRepeating(true)
    try {
      const created = (
        await http.post<ApiWorkout>('/workouts', {
          name: workout.name ?? undefined,
        })
      ).data
      if (created?.id) {
        navigate('/workout/active')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forja.workoutDetail.error.repeat',
              {},
              { defaultValue: 'Could not start a new workout.' },
            ),
      )
    } finally {
      setRepeating(false)
    }
  }

  return (
    <>
      <ForjaTopBar
        title={workout?.name ?? t('forja.workoutDetail.title', {}, { defaultValue: 'Workout' })}
        eyebrow={
          <>
            <Link to="/history" className={cm.cn('hover:text-primary transition-colors')}>
              ← {t('nav.history', {}, { defaultValue: 'History' })}
            </Link>
            {workout ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{fmtDateTime(workout.started_at)}</span>
              </>
            ) : null}
          </>
        }
        actions={
          <button
            type="button"
            onClick={handleRepeat}
            disabled={!workout || repeating}
            data-testid="repeat-workout"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-50',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              content_copy
            </span>
            {repeating
              ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
              : t('forja.workoutDetail.copy', {}, { defaultValue: 'Repeat workout' })}
          </button>
        }
      />

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          {error}
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
          {t('forja.workoutDetail.loading', {}, { defaultValue: 'Loading workout…' })}
        </p>
      ) : !workout ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 5),
            'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
          )}
        >
          {t('forja.workoutDetail.notFound', {}, { defaultValue: 'Workout not found.' })}
        </p>
      ) : (
        <>
          <StatsTriad items={stats} />
          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('forja.workoutDetail.exercises.title', {}, { defaultValue: 'Exercise breakdown' })}
            </h2>
            {breakdown.length === 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('p', 5),
                  'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
                )}
              >
                {t(
                  'forja.workoutDetail.noSets',
                  {},
                  { defaultValue: 'No sets logged for this workout.' },
                )}
              </p>
            ) : (
              <div
                className={cm.cn('overflow-hidden rounded-xl bg-surface border border-outline/40')}
              >
                <table className={cm.cn('w-full text-sm')} data-testid="exercise-breakdown">
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
                    </tr>
                  </thead>
                  <tbody className={cm.cn('divide-y divide-outline/40')}>
                    {breakdown.map((row) => (
                      <tr
                        key={row.exId}
                        className={cm.cn('hover:bg-surface-variant/40 transition-colors')}
                      >
                        <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
                          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                            <Link
                              to={`/exercises/${row.exId}`}
                              className={cm.cn(
                                'font-bold text-on-surface hover:text-primary transition-colors',
                              )}
                            >
                              {row.name}
                            </Link>
                            <MuscleGroupBadge group={row.muscle} compact />
                          </div>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'forja.workoutDetail.note',
                {
                  id: id ?? '',
                  sets: totalSets,
                  volume: totalVolume.toLocaleString(),
                  unit: getWeightUnit(),
                },
                {
                  defaultValue:
                    'Workout {{id}} · {{sets}} sets · {{volume}} {{unit}} total volume.',
                },
              )}
            </p>
          </section>
        </>
      )}
    </>
  )
}
