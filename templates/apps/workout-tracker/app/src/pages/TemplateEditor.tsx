import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type MuscleGroup, MuscleGroupBadge } from '../components/MuscleGroupBadge.js'

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  primary_muscle_group?: string | null
}

interface ApiRoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  sort_order?: number | null
  order_index?: number | null
  target_sets?: number | null
  target_reps?: number | null
  target_rest_seconds?: number | null
  sets?: number | null
  reps?: number | null
  rest_seconds?: number | null
}

interface ApiRoutine {
  id: string
  name: string
  description?: string | null
  estimated_duration_minutes?: number | null
  exercises?: ApiRoutineExercise[]
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

export function TemplateEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [routine, setRoutine] = useState<ApiRoutine | null>(null)
  const [exercises, setExercises] = useState<ApiExercise[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [pendingExerciseId, setPendingExerciseId] = useState('')
  const [pendingSets, setPendingSets] = useState('3')
  const [pendingReps, setPendingReps] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [rRes, exRes] = await Promise.all([
        http.get<ApiRoutine>(`/routines/${id}`),
        http.get<ApiExercise[]>('/exercises'),
      ])
      const r = rRes.data ?? null
      setRoutine(r)
      setName(r?.name ?? '')
      setDescription(r?.description ?? '')
      setDuration(r?.estimated_duration_minutes ? String(r.estimated_duration_minutes) : '')
      const exList = exRes.data ?? []
      setExercises(exList)
      if (!pendingExerciseId && exList[0]) setPendingExerciseId(exList[0].id)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.templateEditor.error.load', {}, { defaultValue: 'Could not load template.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!routine) return
    setError('')
    setSaving(true)
    try {
      const dur = duration === '' ? null : Number(duration)
      await http.patch(`/routines/${routine.id}`, {
        name: name.trim() || routine.name,
        description: description || null,
        estimated_duration_minutes: dur,
      })
      // Domain event: a template definition was saved.
      void track({ name: 'routine.saved', properties: { routineId: routine.id } })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.templateEditor.error.save', {}, { defaultValue: 'Could not save template.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault()
    if (!routine) return
    if (!pendingExerciseId) {
      setError(
        t('forja.templateEditor.error.exercise', {}, { defaultValue: 'Pick an exercise first.' }),
      )
      return
    }
    setError('')
    setAdding(true)
    try {
      const sets = Math.max(1, Math.min(20, Number(pendingSets) || 3))
      const reps = Math.max(1, Math.min(99, Number(pendingReps) || 10))
      await http.post(`/routines/${routine.id}/exercises`, {
        exercise_id: pendingExerciseId,
        target_sets: sets,
        target_reps: reps,
        sets,
        reps,
      })
      // Domain event: the routine builder gained a planned exercise.
      void track({
        name: 'routine.exercise_added',
        properties: { routineId: routine.id, exerciseId: pendingExerciseId, sets, reps },
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.templateEditor.error.add', {}, { defaultValue: 'Could not add exercise.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveExercise(rowId: string) {
    if (!routine) return
    setError('')
    try {
      await http.delete(`/routines/${routine.id}/exercises/${rowId}`)
      void track({
        name: 'routine.exercise_removed',
        properties: { routineId: routine.id, rowId },
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'forja.templateEditor.error.remove',
              {},
              { defaultValue: 'Could not remove exercise.' },
            ),
      )
    }
  }

  async function handleStart() {
    if (!routine) return
    setError('')
    try {
      await http.post(`/routines/${routine.id}/start`)
      // Domain event: a workout started FROM a template (builder funnel end).
      void track({
        name: 'workout.started',
        properties: { routineId: routine.id },
      })
      navigate('/workout/active')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forja.templateEditor.error.start', {}, { defaultValue: 'Could not start workout.' }),
      )
    }
  }

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const routineExercises = useMemo(() => {
    const list = routine?.exercises ?? []
    return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [routine])

  return (
    <>
      <ForjaTopBar
        title={
          routine?.name
            ? t(
                'forja.templateEditor.editing',
                { name: routine.name },
                { defaultValue: 'Editing · {{name}}' },
              )
            : t('forja.templateEditor.title', {}, { defaultValue: 'Template editor' })
        }
        eyebrow={
          <>
            <Link to="/templates" className={cm.cn('hover:text-primary transition-colors')}>
              ← {t('nav.templates', {}, { defaultValue: 'Templates' })}
            </Link>
            {routine ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {t(
                    'forja.templateEditor.summary',
                    { count: routineExercises.length },
                    { defaultValue: '{{count}} exercises' },
                  )}
                </span>
              </>
            ) : null}
          </>
        }
        actions={
          <div className={cm.flex({ gap: 'sm' })}>
            <button
              type="button"
              onClick={handleStart}
              disabled={!routine || routineExercises.length === 0}
              data-testid="start-from-template"
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
                play_arrow
              </span>
              {t('forja.templateEditor.start', {}, { defaultValue: 'Start workout' })}
            </button>
          </div>
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
          {t('forja.templateEditor.loading', {}, { defaultValue: 'Loading template…' })}
        </p>
      ) : !routine ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 5),
            'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
          )}
        >
          {t('forja.templateEditor.notFound', {}, { defaultValue: 'Template not found.' })}
        </p>
      ) : (
        <>
          <form
            onSubmit={handleSave}
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
                {t('forja.templateEditor.metaEyebrow', {}, { defaultValue: 'Template settings' })}
              </span>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface mt-1')}>
                {t('forja.templateEditor.metaTitle', {}, { defaultValue: 'Identity · Notes' })}
              </h2>
            </header>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <input
                  data-testid="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {t(
                    'forja.templateEditor.field.duration',
                    {},
                    { defaultValue: 'Estimated duration (min)' },
                  )}
                </span>
                <input
                  data-testid="template-duration"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                  )}
                />
              </label>
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'md:col-span-2')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface',
                  )}
                >
                  {t('form.notes', {}, { defaultValue: 'Notes' })}
                </span>
                <textarea
                  data-testid="template-notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'min-h-[80px] rounded-lg border border-outline bg-surface text-on-surface',
                  )}
                />
              </label>
            </div>
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <button
                type="submit"
                disabled={saving}
                data-testid="save-template"
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
                  save
                </span>
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </form>

          <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                {t('forja.templateEditor.exercises.title', {}, { defaultValue: 'Exercise order' })}
              </h2>
            </div>
            <form
              onSubmit={handleAddExercise}
              className={cm.cn(
                cm.flex({ gap: 'sm' }),
                cm.sp('p', 4),
                'flex-wrap rounded-xl bg-surface border border-outline/40',
              )}
            >
              <select
                data-testid="add-exercise-select"
                value={pendingExerciseId}
                onChange={(e) => setPendingExerciseId(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface flex-1 min-w-[160px]',
                )}
              >
                <option value="">
                  {t(
                    'forja.templateEditor.pickExercise',
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
              <input
                data-testid="add-exercise-sets"
                type="number"
                min="1"
                max="20"
                value={pendingSets}
                onChange={(e) => setPendingSets(e.target.value)}
                aria-label={t('forja.templateEditor.sets', {}, { defaultValue: 'Sets' })}
                placeholder={t('forja.templateEditor.sets', {}, { defaultValue: 'Sets' })}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface w-24',
                )}
              />
              <input
                data-testid="add-exercise-reps"
                type="number"
                min="1"
                max="99"
                value={pendingReps}
                onChange={(e) => setPendingReps(e.target.value)}
                aria-label={t('forja.templateEditor.reps', {}, { defaultValue: 'Reps' })}
                placeholder={t('forja.templateEditor.reps', {}, { defaultValue: 'Reps' })}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface w-24',
                )}
              />
              <button
                type="submit"
                disabled={adding}
                data-testid="add-exercise"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors uppercase tracking-wide disabled:opacity-50',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                  add
                </span>
                {t('forja.templateEditor.addExercise', {}, { defaultValue: 'Add exercise' })}
              </button>
            </form>
            {routineExercises.length === 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('p', 5),
                  'rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
                )}
              >
                {t(
                  'forja.templateEditor.empty',
                  {},
                  { defaultValue: 'No exercises in this template yet — add one above.' },
                )}
              </p>
            ) : (
              <ol
                className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}
                data-testid="exercise-list"
              >
                {routineExercises.map((row, i) => {
                  const ex = exMap.get(row.exercise_id)
                  return (
                    <li key={row.id}>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('p', 4),
                          'rounded-xl bg-surface border border-outline/40 hover:border-primary/40 transition-colors',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'w-6 text-center font-black uppercase tracking-widest text-on-surface-variant tabular-nums',
                          )}
                        >
                          {i + 1}
                        </span>
                        <div
                          className={cm.cn(
                            cm.flex({ direction: 'col', gap: 'xs' }),
                            'flex-1 min-w-0',
                          )}
                        >
                          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                            <h3 className={cm.cn('font-bold text-on-surface truncate')}>
                              {ex?.name ??
                                t('forja.templateEditor.unknown', {}, { defaultValue: 'Exercise' })}
                            </h3>
                            <MuscleGroupBadge
                              group={asMuscleGroup(
                                ex?.primary_muscle_group ?? ex?.muscle_group ?? null,
                              )}
                              compact
                            />
                          </div>
                          <div
                            className={cm.cn(
                              cm.flex({ gap: 'sm' }),
                              cm.textSize('xs'),
                              'text-on-surface-variant uppercase tracking-widest font-bold',
                            )}
                          >
                            <span>
                              {row.target_sets ?? row.sets ?? 0} sets ×{' '}
                              {row.target_reps ?? row.reps ?? 0} reps
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={t('common.remove', {}, { defaultValue: 'Remove' })}
                          data-testid="remove-exercise"
                          onClick={() => handleRemoveExercise(row.id)}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-9 h-9 rounded-full text-on-surface-variant hover:bg-error-container/40 hover:text-error transition-colors',
                          )}
                        >
                          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </>
  )
}
