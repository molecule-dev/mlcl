import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { ForjaTopBar } from '../components/ForjaTopBar.js'

interface RoutineRow {
  id: string
  name: string
  description?: string | null
  estimated_duration_minutes?: number | null
  target_muscle_groups?: string[] | string | null
  is_template?: boolean
  exerciseCount?: number
  exerciseNames?: string[]
}

interface ExerciseRow {
  id: string
  name: string
}

interface RoutineExerciseRow {
  id: string
  routine_id: string
  exercise_id: string
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch (_error) {
      // JSON parse failed — value is a plain string, not an array
      return []
    }
  }
  return []
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDuration, setCreateDuration] = useState('')
  const [createError, setCreateError] = useState('')
  const [startError, setStartError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const list = (await http.get<RoutineRow[]>('/routines')).data ?? []
      const exList = (await http.get<ExerciseRow[]>('/exercises')).data ?? []
      const exMap = new Map<string, string>(exList.map((e) => [e.id, e.name]))
      const enriched: RoutineRow[] = []
      for (const r of list) {
        try {
          const detail = (
            await http.get<RoutineRow & { exercises?: RoutineExerciseRow[] }>(`/routines/${r.id}`)
          ).data
          const exercises = detail?.exercises ?? []
          enriched.push({
            ...r,
            exerciseCount: exercises.length,
            exerciseNames: exercises
              .map((e) => exMap.get(e.exercise_id))
              .filter((n): n is string => Boolean(n)),
          })
        } catch (_error) {
          // Routine detail fetch failed — fall back to empty exercise list
          enriched.push({ ...r, exerciseCount: 0, exerciseNames: [] })
        }
      }
      setRoutines(enriched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!createName.trim()) {
      setCreateError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setCreating(true)
    try {
      const minutes = Number(createDuration)
      const body: Record<string, unknown> = {
        name: createName.trim(),
        is_template: true,
      }
      if (Number.isFinite(minutes) && minutes > 0) {
        body.estimated_duration_minutes = Math.round(minutes)
      }
      const created = (await http.post<RoutineRow>('/routines', body)).data
      setShowCreate(false)
      setCreateName('')
      setCreateDuration('')
      await load()
      if (created?.id) {
        navigate(`/templates/${created.id}/edit`)
      }
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t(
              'forja.templates.create.error.generic',
              {},
              { defaultValue: 'Could not create template.' },
            ),
      )
    } finally {
      setCreating(false)
    }
  }

  async function handleStart(routine: RoutineRow) {
    setStartError('')
    try {
      const created = (await http.post<{ id?: string }>(`/routines/${routine.id}/start`, {})).data
      if (created?.id) {
        navigate('/workout/active')
      } else {
        setStartError(
          t('forja.templates.start.error', {}, { defaultValue: 'Could not start workout.' }),
        )
      }
    } catch (err) {
      setStartError(
        err instanceof Error
          ? err.message
          : t('forja.templates.start.error', {}, { defaultValue: 'Could not start workout.' }),
      )
    }
  }

  async function handleDelete(routine: RoutineRow) {
    try {
      await http.delete(`/routines/${routine.id}`)
      await load()
    } catch (_error) {
      // Delete failed — list stays unchanged, user can retry
    }
  }

  return (
    <>
      <ForjaTopBar
        title={t('forja.templates.title', {}, { defaultValue: 'Workout templates' })}
        eyebrow={
          <span>
            {t(
              'forja.templates.eyebrow',
              { count: routines.length },
              { defaultValue: '{{count}} templates · pinned at top' },
            )}
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
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
            {t('forja.templates.new', {}, { defaultValue: 'New template' })}
          </button>
        }
      />

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          aria-label={t('forja.templates.new', {}, { defaultValue: 'New template' })}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline/60 shadow-sm',
          )}
        >
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
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t(
                  'forja.templates.create.namePlaceholder',
                  {},
                  { defaultValue: 'Push Day A' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                )}
                required
              />
            </label>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface',
                )}
              >
                {t('forja.templates.create.duration', {}, { defaultValue: 'Estimated min' })}
              </span>
              <input
                value={createDuration}
                onChange={(e) => setCreateDuration(e.target.value)}
                placeholder={t(
                  'forja.templates.create.durationPlaceholder',
                  {},
                  { defaultValue: '60' },
                )}
                type="number"
                inputMode="numeric"
                min={0}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                )}
              />
            </label>
          </div>
          {createError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {createError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={creating}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('forja.templates.create.submit', {}, { defaultValue: 'Create template' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setCreateError('')
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors uppercase tracking-wide',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      {startError ? (
        <p
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 4),
            'text-error bg-error-container/30 rounded-xl border border-error/30',
          )}
        >
          {startError}
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
          {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
        </p>
      ) : routines.length === 0 ? (
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
            {t('forja.templates.empty.title', {}, { defaultValue: 'No templates yet' })}
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'forja.templates.empty.body',
              {},
              {
                defaultValue:
                  'Build your first template — Push/Pull/Legs, Upper/Lower, or any custom split.',
              },
            )}
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
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
            {t('forja.templates.empty.cta', {}, { defaultValue: 'New template' })}
          </button>
        </div>
      ) : (
        <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4 list-none')}>
          {routines.map((tpl) => {
            const tags = parseTags(tpl.target_muscle_groups)
            const split = tags.length
              ? tags[0]
              : t('forja.templates.split.custom', {}, { defaultValue: 'Custom' })
            return (
              <li key={tpl.id}>
                <article
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface border border-outline/40 hover:border-primary/40 transition-colors shadow-sm h-full',
                  )}
                >
                  <header
                    className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}
                  >
                    <div>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-black uppercase tracking-[0.22em] text-on-surface-variant',
                        )}
                      >
                        {String(split).toUpperCase()}
                      </span>
                      <h3
                        className={cm.cn(
                          'text-xl font-extrabold tracking-tight text-on-surface mt-1',
                        )}
                      >
                        {tpl.name}
                      </h3>
                      <div
                        className={cm.cn(
                          cm.flex({ gap: 'sm' }),
                          cm.textSize('xs'),
                          'text-on-surface-variant uppercase tracking-widest font-bold mt-2',
                        )}
                      >
                        <span>{tpl.exerciseCount ?? 0} ex.</span>
                        {tpl.estimated_duration_minutes ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{tpl.estimated_duration_minutes} min</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      to={`/templates/${tpl.id}/edit`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-9 h-9 rounded-full bg-surface-variant text-on-surface-variant hover:bg-primary-container/40 hover:text-primary transition-colors',
                      )}
                      aria-label={t('forja.templates.edit', {}, { defaultValue: 'Edit template' })}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-lg')}
                      >
                        edit
                      </span>
                    </Link>
                  </header>
                  <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
                    {(tpl.exerciseNames ?? []).slice(0, 4).map((ex, i) => (
                      <li
                        key={`${tpl.id}-${i}`}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn(
                            'material-symbols-outlined text-on-surface-variant text-base',
                          )}
                        >
                          radio_button_unchecked
                        </span>
                        <span>{ex}</span>
                      </li>
                    ))}
                    {(tpl.exerciseNames?.length ?? 0) > 4 ? (
                      <li
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant pl-6 font-bold uppercase tracking-widest',
                        )}
                      >
                        +{(tpl.exerciseNames?.length ?? 0) - 4} more
                      </li>
                    ) : null}
                    {(tpl.exerciseNames?.length ?? 0) === 0 ? (
                      <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
                        {t(
                          'forja.templates.noExercises',
                          {},
                          { defaultValue: 'No exercises yet — open editor to add.' },
                        )}
                      </li>
                    ) : null}
                  </ul>
                  <div className={cm.cn(cm.flex({ gap: 'sm' }), 'mt-auto')}>
                    <button
                      type="button"
                      onClick={() => handleStart(tpl)}
                      disabled={(tpl.exerciseCount ?? 0) === 0}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                        cm.sp('py', 3),
                        cm.fontWeight('bold'),
                        'flex-1 bg-primary text-on-primary rounded-lg hover:bg-primary-light transition-colors uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                        play_arrow
                      </span>
                      {t('forja.templates.start', {}, { defaultValue: 'Start workout' })}
                    </button>
                    <ConfirmButton
                      label={t('forja.templates.delete', {}, { defaultValue: 'Delete template' })}
                      confirmLabel={t(
                        'forja.templates.delete.confirm',
                        { name: tpl.name },
                        { defaultValue: `Delete "${tpl.name}"?` },
                      )}
                      onConfirm={() => handleDelete(tpl)}
                      disarmSeconds={5}
                      aria-label={t(
                        'forja.templates.delete',
                        {},
                        { defaultValue: 'Delete template' },
                      )}
                    />
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
