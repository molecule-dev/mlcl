import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { getWeightUnit, toDisplayWeight, toStorageKg } from '../lib/weight.js'

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  primary_muscle_group?: string | null
  category?: string | null
}

interface ApiSet {
  id: string
  exercise_id: string
  set_index?: number | null
  set_number?: number | null
  weight: number | string
  weight_kg?: number | string | null
  weight_unit?: string | null
  reps: number
  rpe?: number | null
  is_completed?: boolean
  is_warmup?: boolean
}

interface ApiWorkout {
  id: string
  user_id: string
  name?: string | null
  notes?: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  duration_seconds?: number | null
  total_volume?: number | string | null
  total_volume_kg?: number | string | null
  routine_id?: string | null
  sets?: ApiSet[]
}

interface ApiRoutineExercise {
  id: string
  exercise_id: string
  target_sets?: number | null
  target_reps?: number | null
  sets?: number | null
  reps?: number | null
  sort_order?: number | null
  order_index?: number | null
}

interface ApiRoutine {
  id: string
  name?: string | null
  exercises?: ApiRoutineExercise[]
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function elapsedString(startedAt: string, nowMs: number): string {
  const start = new Date(startedAt).getTime()
  if (!Number.isFinite(start)) return '0:00'
  const sec = Math.max(0, Math.floor((nowMs - start) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ActiveWorkout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [workout, setWorkout] = useState<ApiWorkout | null>(null)
  const [exercises, setExercises] = useState<ApiExercise[]>([])
  const [routine, setRoutine] = useState<ApiRoutine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const [pendingExerciseId, setPendingExerciseId] = useState('')
  const [pendingWeight, setPendingWeight] = useState('')
  const [pendingReps, setPendingReps] = useState('')
  const [adding, setAdding] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const exList = (await http.get<ApiExercise[]>('/exercises')).data ?? []
      setExercises(exList)
      const active = (await http.get<ApiWorkout | null>('/workouts/active')).data ?? null
      if (active && active.id) {
        const detail = (await http.get<ApiWorkout>(`/workouts/${active.id}`)).data ?? null
        setWorkout(detail)
        // If the active workout was started from a routine/template, load its
        // planned exercises so the user can see what's queued and the form
        // pre-selects the next planned lift instead of an empty dropdown.
        const routineId = detail?.routine_id ?? active.routine_id ?? null
        if (routineId) {
          try {
            const routineDetail =
              (await http.get<ApiRoutine>(`/routines/${routineId}`)).data ?? null
            setRoutine(routineDetail)
            // Pre-select the first planned exercise that doesn't yet have
            // any logged sets; fall back to the first planned exercise.
            const plan = (routineDetail?.exercises ?? [])
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            const loggedExerciseIds = new Set((detail?.sets ?? []).map((s) => s.exercise_id))
            const next = plan.find((p) => !loggedExerciseIds.has(p.exercise_id)) ?? plan[0]
            if (next) {
              setPendingExerciseId(next.exercise_id)
            } else if (!pendingExerciseId && exList[0]) {
              setPendingExerciseId(exList[0].id)
            }
          } catch (_error) {
            // Routine detail fetch failed — fall back to no routine plan
            setRoutine(null)
            if (!pendingExerciseId && exList[0]) setPendingExerciseId(exList[0].id)
          }
        } else {
          setRoutine(null)
          if (!pendingExerciseId && exList[0]) setPendingExerciseId(exList[0].id)
        }
      } else {
        setWorkout(null)
        setRoutine(null)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.active.error.load', {}, { defaultValue: 'Could not load workout.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleStart() {
    setError('')
    try {
      const created = (
        await http.post<ApiWorkout>('/workouts', {
          name: t('forja.active.defaultName', {}, { defaultValue: 'Workout' }),
        })
      ).data
      if (created?.id) {
        const detail = (await http.get<ApiWorkout>(`/workouts/${created.id}`)).data ?? created
        setWorkout(detail)
        if (!pendingExerciseId && exercises[0]) setPendingExerciseId(exercises[0].id)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.active.error.start', {}, { defaultValue: 'Could not start workout.' }),
      )
    }
  }

  async function handleAddSet(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!workout) return
    if (!pendingExerciseId) {
      setError(t('forja.active.error.exercise', {}, { defaultValue: 'Pick an exercise first.' }))
      return
    }
    const w = Number(pendingWeight)
    const r = Number(pendingReps)
    if (!Number.isFinite(w) || w < 0) {
      setError(t('forja.active.error.weight', {}, { defaultValue: 'Enter a valid weight.' }))
      return
    }
    if (!Number.isInteger(r) || r <= 0) {
      setError(t('forja.active.error.reps', {}, { defaultValue: 'Enter at least 1 rep.' }))
      return
    }
    setAdding(true)
    try {
      const existingForExercise = (workout.sets ?? []).filter(
        (s) => s.exercise_id === pendingExerciseId,
      )
      const setIndex = existingForExercise.length
      await http.post(`/workouts/${workout.id}/sets`, {
        exercise_id: pendingExerciseId,
        set_index: setIndex,
        set_number: setIndex + 1,
        // The user types in their chosen unit; store canonical kg so every
        // display (which converts kg → the chosen unit) round-trips correctly.
        weight: toStorageKg(w),
        weight_kg: toStorageKg(w),
        weight_unit: 'kg',
        reps: r,
        is_completed: true,
      })
      setPendingWeight('')
      setPendingReps('')
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.active.error.addSet', {}, { defaultValue: 'Could not add set.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteSet(setId: string) {
    if (!workout) return
    setError('')
    try {
      await http.delete(`/workouts/${workout.id}/sets/${setId}`)
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.active.error.deleteSet', {}, { defaultValue: 'Could not delete set.' }),
      )
    }
  }

  async function handleFinish() {
    if (!workout) return
    setError('')
    setFinishing(true)
    try {
      await http.post(`/workouts/${workout.id}/complete`)
      navigate(`/history/${workout.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.active.error.finish', {}, { defaultValue: 'Could not finish workout.' }),
      )
      setFinishing(false)
    }
  }

  const exerciseById = useMemo(() => {
    const m = new Map<string, ApiExercise>()
    for (const e of exercises) m.set(e.id, e)
    return m
  }, [exercises])

  const setsByExercise = useMemo(() => {
    const m = new Map<string, ApiSet[]>()
    for (const s of workout?.sets ?? []) {
      const arr = m.get(s.exercise_id) ?? []
      arr.push(s)
      m.set(s.exercise_id, arr)
    }
    return m
  }, [workout])

  const totalVolume = useMemo(() => {
    let v = 0
    for (const s of workout?.sets ?? []) {
      if (s.is_warmup) continue // warmup sets don't count toward working volume
      v += num(s.weight_kg ?? s.weight) * num(s.reps)
    }
    return v
  }, [workout])

  return (
    <>
      <ForjaTopBar
        title={
          workout
            ? (workout.name ?? t('forja.active.title', {}, { defaultValue: 'Active workout' }))
            : t('forja.active.title', {}, { defaultValue: 'Active workout' })
        }
        eyebrow={
          workout ? (
            <>
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-base text-primary-dark')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
              <span data-testid="workout-elapsed">
                {t(
                  'forja.active.eyebrow',
                  { time: elapsedString(workout.started_at, now) },
                  { defaultValue: 'Live · {{time}} elapsed' },
                )}
              </span>
            </>
          ) : (
            <span>{t('forja.active.idleEyebrow', {}, { defaultValue: 'No active workout' })}</span>
          )
        }
        actions={
          workout ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={finishing}
              data-testid="finish-workout"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-volume-up text-on-surface hover:bg-volume-up/90 transition-colors uppercase tracking-wide disabled:opacity-50',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                flag
              </span>
              {finishing
                ? t('forja.active.finishing', {}, { defaultValue: 'Finishing…' })
                : t('forja.active.finish', {}, { defaultValue: 'Finish workout' })}
            </button>
          ) : null
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
          {t('forja.active.loading', {}, { defaultValue: 'Loading workout…' })}
        </p>
      ) : !workout ? (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline/40 shadow-sm text-center',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forja.active.idle',
              {},
              {
                defaultValue:
                  'No workout in progress. Start a fresh session to begin logging sets.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'center' }))}>
            <button
              type="button"
              onClick={handleStart}
              data-testid="start-workout"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary-light transition-colors uppercase tracking-wide text-sm',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                play_arrow
              </span>
              {t('forja.active.start', {}, { defaultValue: 'Start workout' })}
            </button>
          </div>
        </section>
      ) : (
        <>
          {routine && (routine.exercises ?? []).length > 0 ? (
            <section
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface border border-outline/40 shadow-sm',
              )}
              data-testid="planned-exercises"
            >
              <h2 className={cm.cn('text-xl font-bold text-on-surface tracking-tight')}>
                {t('forja.active.plan.title', {}, { defaultValue: 'Planned exercises' })}
              </h2>
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
                {(routine.exercises ?? [])
                  .slice()
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((p) => {
                    const ex = exerciseById.get(p.exercise_id)
                    const targetSets = p.target_sets ?? p.sets ?? 0
                    const targetReps = p.target_reps ?? p.reps ?? 0
                    const loggedSets = (workout.sets ?? []).filter(
                      (s) => s.exercise_id === p.exercise_id,
                    ).length
                    const done = targetSets > 0 && loggedSets >= targetSets
                    return (
                      <li
                        key={p.id}
                        data-testid="planned-row"
                        data-exercise-id={p.exercise_id}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          'rounded-lg border border-outline/30 bg-surface',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn(
                            'material-symbols-outlined text-base shrink-0',
                            done ? 'text-volume-up' : 'text-on-surface-variant',
                          )}
                        >
                          {done ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span className={cm.cn('flex-1 font-bold text-on-surface')}>
                          {ex?.name ??
                            t('forja.active.unknownExercise', {}, { defaultValue: 'Exercise' })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-black uppercase tracking-widest text-on-surface-variant tabular-nums',
                          )}
                        >
                          {t(
                            'forja.active.plan.progress',
                            {
                              done: loggedSets,
                              target: targetSets,
                              reps: targetReps,
                            },
                            { defaultValue: '{{done}}/{{target}} sets × {{reps}} reps' },
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingExerciseId(p.exercise_id)}
                          data-testid="planned-select"
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'rounded-full bg-surface-variant text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors uppercase tracking-wide',
                          )}
                        >
                          {t('forja.active.plan.select', {}, { defaultValue: 'Select' })}
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </section>
          ) : null}

          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-2xl bg-surface border border-outline/40 shadow-sm',
            )}
            data-testid="set-composer"
          >
            <h2 className={cm.cn('text-xl font-bold text-on-surface tracking-tight')}>
              {t('forja.active.addSet.title', {}, { defaultValue: 'Log a set' })}
            </h2>
            <form
              onSubmit={handleAddSet}
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
            >
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {t('forja.active.exercise', {}, { defaultValue: 'Exercise' })}
                </span>
                <select
                  data-testid="exercise-select"
                  value={pendingExerciseId}
                  onChange={(e) => setPendingExerciseId(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                  )}
                >
                  <option value="">
                    {t(
                      'forja.active.exercise.placeholder',
                      {},
                      { defaultValue: 'Pick an exercise…' },
                    )}
                  </option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    'flex-1 min-w-[120px]',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-widest text-on-surface',
                    )}
                  >
                    {t(
                      'forja.active.weight',
                      { unit: getWeightUnit() },
                      { defaultValue: 'Weight ({{unit}})' },
                    )}
                  </span>
                  <input
                    data-testid="set-weight"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={pendingWeight}
                    onChange={(e) => setPendingWeight(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                    )}
                  />
                </label>
                <label
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    'flex-1 min-w-[100px]',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-widest text-on-surface',
                    )}
                  >
                    {t('forja.active.reps', {}, { defaultValue: 'Reps' })}
                  </span>
                  <input
                    data-testid="set-reps"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={pendingReps}
                    onChange={(e) => setPendingReps(e.target.value)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                    )}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={adding}
                data-testid="add-set"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-50',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  add
                </span>{' '}
                {adding
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('forja.active.addSet', {}, { defaultValue: 'Add set' })}
              </button>
            </form>
          </section>

          <section
            className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
            data-testid="logged-sets"
          >
            <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                {t('forja.active.sets.title', {}, { defaultValue: 'Logged sets' })}
              </h2>
              <span
                data-testid="total-volume"
                className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface tabular-nums')}
              >
                {t(
                  'forja.active.totalVolume',
                  {
                    volume: Math.round(toDisplayWeight(totalVolume)).toLocaleString(),
                    unit: getWeightUnit(),
                  },
                  { defaultValue: '{{volume}} {{unit}} total' },
                )}
              </span>
            </div>
            {(workout.sets?.length ?? 0) === 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('p', 5),
                  'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
                )}
              >
                {t(
                  'forja.active.sets.empty',
                  {},
                  { defaultValue: 'No sets logged yet — log your first above.' },
                )}
              </p>
            ) : (
              Array.from(setsByExercise.entries()).map(([exId, sets]) => {
                const ex = exerciseById.get(exId)
                return (
                  <article
                    key={exId}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 5),
                      'rounded-xl bg-surface shadow-sm border border-outline/40',
                    )}
                    data-testid="exercise-block"
                    data-exercise-id={exId}
                  >
                    <h3 className={cm.cn('text-xl font-bold text-on-surface tracking-tight')}>
                      {ex?.name ??
                        t('forja.active.unknownExercise', {}, { defaultValue: 'Exercise' })}
                    </h3>
                    <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
                      {sets.map((s, idx) => (
                        <li
                          key={s.id}
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'sm' }),
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'h-12 rounded-lg border border-outline/30 bg-surface tabular-nums',
                          )}
                          data-testid="logged-set"
                        >
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.fontWeight('bold'),
                              'w-8 h-8 rounded-full text-on-surface-variant bg-surface-variant text-sm shrink-0',
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'w-24 h-10 rounded-md border border-outline/60 bg-input-background text-on-surface font-semibold',
                            )}
                          >
                            {toDisplayWeight(num(s.weight_kg ?? s.weight))} {getWeightUnit()}
                          </span>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'w-20 h-10 rounded-md border border-outline/60 bg-input-background text-on-surface font-semibold',
                            )}
                          >
                            {s.reps} reps
                          </span>
                          <span className={cm.cn('flex-1')} />
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(s.id)}
                            aria-label={t(
                              'forja.active.deleteSet',
                              {},
                              { defaultValue: 'Delete set' },
                            )}
                            data-testid="delete-set"
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors shrink-0',
                            )}
                          >
                            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                              delete
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })
            )}
          </section>
        </>
      )}
    </>
  )
}
