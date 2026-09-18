import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ForjaTopBar } from '../components/ForjaTopBar.js'
import { type MuscleGroup, MuscleGroupBadge } from '../components/MuscleGroupBadge.js'

const MUSCLE_GROUPS: ReadonlyArray<MuscleGroup> = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
]

interface ApiExercise {
  id: string
  name: string
  muscle_group?: string | null
  muscle_groups?: string[] | string | null
  equipment?: string | null
  category?: string | null
  difficulty?: string | null
  is_custom?: boolean
}

const FILTERS: { key: MuscleGroup | 'all'; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'chest', defaultLabel: 'Chest' },
  { key: 'back', defaultLabel: 'Back' },
  { key: 'legs', defaultLabel: 'Legs' },
  { key: 'shoulders', defaultLabel: 'Shoulders' },
  { key: 'arms', defaultLabel: 'Arms' },
  { key: 'core', defaultLabel: 'Core' },
  { key: 'cardio', defaultLabel: 'Cardio' },
]

function normalizeMuscleGroup(value: unknown): MuscleGroup {
  if (typeof value !== 'string') return 'core'
  const lower = value.toLowerCase()
  for (const g of MUSCLE_GROUPS) if (lower === g) return g
  if (/(quad|ham|glute|calf|leg)/.test(lower)) return 'legs'
  if (/(chest|pec)/.test(lower)) return 'chest'
  if (/(back|lat|trap|rhom)/.test(lower)) return 'back'
  if (/(shoulder|delt)/.test(lower)) return 'shoulders'
  if (/(bicep|tricep|arm|forearm)/.test(lower)) return 'arms'
  if (/(core|abs|abdom|oblique)/.test(lower)) return 'core'
  if (/(cardio|conditioning|run|row|bike|jump)/.test(lower)) return 'cardio'
  return 'core'
}

export function Exercises() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [exercises, setExercises] = useState<ApiExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup>('chest')
  const [newEquipment, setNewEquipment] = useState('Barbell')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = (await http.get<ApiExercise[]>('/exercises')).data ?? []
      setExercises(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const group = normalizeMuscleGroup(ex.muscle_group)
      if (filter !== 'all' && group !== filter) return false
      if (query && !(ex.name ?? '').toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [exercises, filter, query])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!newName.trim()) {
      setCreateError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name: newName.trim(),
        muscle_group: newGroup,
        muscle_groups: [newGroup],
      }
      if (newEquipment.trim()) body.equipment = newEquipment.trim()
      await http.post('/exercises', body)
      setShowCreate(false)
      setNewName('')
      setNewGroup('chest')
      setNewEquipment('Barbell')
      await load()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t(
              'forja.exercises.create.error.generic',
              {},
              { defaultValue: 'Could not create exercise.' },
            ),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <ForjaTopBar
        title={t('forja.exercises.title', {}, { defaultValue: 'Exercise library' })}
        eyebrow={
          <span>
            {t(
              'forja.exercises.eyebrow',
              { count: exercises.length },
              { defaultValue: '{{count}} exercises tracked' },
            )}
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
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
            {t('forja.exercises.add', {}, { defaultValue: 'New exercise' })}
          </button>
        }
      />

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          aria-label={t('forja.exercises.add', {}, { defaultValue: 'New exercise' })}
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-2xl bg-surface border border-outline/60 shadow-sm',
          )}
        >
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3')}>
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t(
                  'forja.exercises.create.namePlaceholder',
                  {},
                  { defaultValue: 'Bulgarian Split Squat' },
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
                {t('forja.exercises.create.muscle', {}, { defaultValue: 'Muscle group' })}
              </span>
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
                className={cm.cn(
                  cm.sp('px', 4),
                  'h-12 rounded-lg border border-outline bg-surface text-on-surface',
                )}
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-surface',
                )}
              >
                {t('forja.exercises.create.equipment', {}, { defaultValue: 'Equipment' })}
              </span>
              <input
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                placeholder={t(
                  'forja.exercises.create.equipmentPlaceholder',
                  {},
                  { defaultValue: 'Barbell' },
                )}
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
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors uppercase tracking-wide disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('forja.exercises.create.submit', {}, { defaultValue: 'Save exercise' })}
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

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          'h-12 rounded-full bg-surface border border-outline shadow-sm',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-on-surface-variant')}
        >
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder={t(
            'forja.exercises.search',
            {},
            { defaultValue: 'Search by name or muscle group…' },
          )}
          className={cm.cn(
            'flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant outline-none',
          )}
        />
      </div>

      <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-on-surface border border-outline hover:bg-surface-variant',
            )}
          >
            {t(`forja.exercises.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
          </button>
        ))}
      </div>

      {loading ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 5),
            'rounded-xl bg-surface border border-outline/40 text-on-surface-variant',
          )}
        >
          {t('forja.exercises.loading', {}, { defaultValue: 'Loading exercises…' })}
        </p>
      ) : (
        <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3 list-none')}>
          {filtered.map((ex) => {
            const group = normalizeMuscleGroup(ex.muscle_group)
            return (
              <li key={ex.id}>
                <Link
                  to={`/exercises/${ex.id}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 5),
                    'rounded-xl bg-surface border border-outline/40 hover:border-primary/40 hover:bg-surface-variant/30 transition-colors group block',
                  )}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}
                  >
                    <h3
                      className={cm.cn(
                        'text-lg font-bold text-on-surface group-hover:text-primary tracking-tight transition-colors',
                      )}
                    >
                      {ex.name}
                    </h3>
                    <MuscleGroupBadge group={group} compact />
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-widest font-bold',
                    )}
                  >
                    <span>
                      {ex.equipment ??
                        t(
                          'forja.exercises.unknownEquipment',
                          {},
                          { defaultValue: 'Equipment N/A' },
                        )}
                    </span>
                    {ex.category ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{ex.category}</span>
                      </>
                    ) : null}
                    {ex.is_custom ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{t('forja.exercises.custom', {}, { defaultValue: 'Custom' })}</span>
                      </>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
          {!loading && filtered.length === 0 ? (
            <li
              className={cm.cn(
                cm.sp('p', 5),
                cm.textSize('sm'),
                'col-span-full rounded-xl border border-dashed border-outline text-on-surface-variant text-center',
              )}
            >
              {t('forja.exercises.empty', {}, { defaultValue: 'No exercises match your filter.' })}
            </li>
          ) : null}
        </ul>
      )}
    </>
  )
}
