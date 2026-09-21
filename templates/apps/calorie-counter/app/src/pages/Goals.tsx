import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface MacroGoal {
  key: 'protein' | 'carbs' | 'fat' | 'fiber'
  label: string
  defaultGrams: number
  tone: string
}

const MACROS: MacroGoal[] = [
  { key: 'protein', label: 'Protein', defaultGrams: 120, tone: 'border-l-protein bg-protein/5' },
  { key: 'carbs', label: 'Carbs', defaultGrams: 240, tone: 'border-l-carbs bg-carbs/5' },
  { key: 'fat', label: 'Fat', defaultGrams: 70, tone: 'border-l-fat bg-fat/5' },
  { key: 'fiber', label: 'Fiber', defaultGrams: 35, tone: 'border-l-fiber bg-fiber/5' },
]

interface GoalResponse {
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
  fiber?: number | string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

export function Goals() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [calories, setCalories] = useState(2000)
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active'>(
    'moderate',
  )
  const [grams, setGrams] = useState<Record<MacroGoal['key'], number>>(() => ({
    protein: 120,
    carbs: 240,
    fat: 70,
    fiber: 35,
  }))
  const [editing, setEditing] = useState<MacroGoal['key'] | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<GoalResponse>('/api/goals')
      .then((r) => {
        if (cancelled || !r.data) return
        const g = r.data as GoalResponse
        setCalories(Math.round(num(g.calories)) || 2000)
        setGrams({
          protein: Math.round(num(g.protein)) || 120,
          carbs: Math.round(num(g.carbs)) || 240,
          fat: Math.round(num(g.fat)) || 70,
          fiber: Math.round(num(g.fiber ?? 35)) || 35,
        })
      })
      .catch(() => {
        // Defaults already set
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const persistGoal = async (next: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
  }) => {
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      await http.post('/api/goals', {
        calories: next.calories ?? calories,
        protein: next.protein ?? grams.protein,
        carbs: next.carbs ?? grams.carbs,
        fat: next.fat ?? grams.fat,
        fiber: next.fiber ?? grams.fiber,
      })
      track({
        name: 'calorie.goal_updated',
        properties: {
          calories: next.calories ?? calories,
          protein: next.protein ?? grams.protein,
          carbs: next.carbs ?? grams.carbs,
          fat: next.fat ?? grams.fat,
        },
      })
      setInfo(t('nosh.goals.saved', {}, { defaultValue: 'Goals saved.' }))
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.goals.saveError', {}, { defaultValue: 'Could not save goals.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCalorieCommit = () => {
    persistGoal({ calories })
  }

  const handleActivity = async (level: typeof activity) => {
    // Re-scale the user's CURRENT calorie target (never a hardcoded base, or a
    // custom target would be clobbered) relative to the previous activity
    // level, so switching levels is stable and switching back restores.
    const multipliers: Record<typeof activity, number> = {
      sedentary: 0.9,
      light: 0.95,
      moderate: 1,
      active: 1.1,
    }
    const targetCalories = Math.min(
      3500,
      Math.max(1200, Math.round((calories / multipliers[activity]) * multipliers[level])),
    )
    setActivity(level)
    setCalories(targetCalories)
    setInfo(
      t(`nosh.goals.activity.set.${level}`, {}, { defaultValue: `Activity set to ${level}.` }),
    )
    await persistGoal({ calories: targetCalories })
  }

  const startEdit = (key: MacroGoal['key']) => {
    setEditing(key)
    setEditValue(String(grams[key]))
    setInfo(t(`nosh.goals.macros.editing.${key}`, {}, { defaultValue: `Editing ${key} target.` }))
  }

  const commitEdit = async () => {
    if (editing == null) return
    const parsed = Number.parseInt(editValue, 10)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setEditing(null)
      return
    }
    const nextGrams = { ...grams, [editing]: parsed }
    setGrams(nextGrams)
    const macroKey = editing
    setEditing(null)
    await persistGoal({ [macroKey]: parsed })
  }

  const cancelEdit = () => setEditing(null)

  const stepCalories = useMemo(() => Math.max(50, Math.round(calories * 0.025)), [calories])

  return (
    <>
      <NoshTopBar
        title={t('nosh.goals.heading', {}, { defaultValue: 'Your goals' })}
        eyebrow={t('nosh.goals.eyebrow', {}, { defaultValue: 'Personalized · Updated weekly' })}
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success-container text-on-success-container',
          )}
          role="status"
        >
          {info}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'bg-gradient-to-br from-primary-container to-surface rounded-2xl border border-primary/20 shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nosh.goals.calorie.label', {}, { defaultValue: 'Daily calorie target' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mt', 2))}>
          <span className={cm.cn('text-6xl font-extrabold text-on-surface tabular-nums')}>
            {calories.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('nosh.goals.kcal', {}, { defaultValue: 'kcal' })}
          </span>
        </div>
        <input
          type="range"
          min={1200}
          max={3500}
          step={50}
          value={calories}
          onChange={(e) => setCalories(Number(e.target.value))}
          onMouseUp={handleCalorieCommit}
          onTouchEnd={handleCalorieCommit}
          className={cm.cn('w-full mt-6 accent-primary')}
          aria-label={t('nosh.goals.calorie.label', {}, { defaultValue: 'Daily calorie target' })}
        />
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          <span>1,200</span>
          <span>3,500</span>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 4))}>
          <button
            type="button"
            onClick={() => {
              const next = Math.max(1200, calories - stepCalories)
              setCalories(next)
              persistGoal({ calories: next })
            }}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-surface text-on-surface border border-outline hover:bg-surface-variant transition-colors disabled:opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-base align-middle')}
            >
              remove
            </span>
            <span className={cm.cn('ml-1')}>
              {t('nosh.goals.lower', {}, { defaultValue: 'Lower' })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(3500, calories + stepCalories)
              setCalories(next)
              persistGoal({ calories: next })
            }}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors disabled:opacity-50',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-base align-middle')}
            >
              add
            </span>
            <span className={cm.cn('ml-1')}>
              {t('nosh.goals.raise', {}, { defaultValue: 'Raise' })}
            </span>
          </button>
        </div>
      </section>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('nosh.goals.activity.title', {}, { defaultValue: 'Activity level' })}
        </h3>
        <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-3')}>
          {(['sedentary', 'light', 'moderate', 'active'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleActivity(level)}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl border-2 transition-colors',
                activity === level
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline bg-surface text-on-surface hover:border-primary/50',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-2xl')}>
                {level === 'sedentary'
                  ? 'chair'
                  : level === 'light'
                    ? 'directions_walk'
                    : level === 'moderate'
                      ? 'directions_run'
                      : 'fitness_center'}
              </span>
              {t(
                `nosh.goals.activity.${level}`,
                {},
                { defaultValue: level[0].toUpperCase() + level.slice(1) },
              )}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4), 'text-on-surface')}>
          {t('nosh.goals.macros.title', {}, { defaultValue: 'Macronutrient targets' })}
        </h3>
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          {MACROS.map((m) => {
            const isEditing = editing === m.key
            return (
              <div
                key={m.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'center', justify: 'between' }),
                  'bg-surface rounded-2xl shadow-sm border-l-4',
                  m.tone,
                )}
              >
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(`nosh.goals.macros.${m.key}`, {}, { defaultValue: m.label })}
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className={cm.cn(
                        'text-3xl font-extrabold text-on-surface tabular-nums mt-1 bg-transparent border-b-2 border-primary outline-none w-32',
                      )}
                    />
                  ) : (
                    <p
                      className={cm.cn('text-3xl font-extrabold text-on-surface tabular-nums mt-1')}
                    >
                      {grams[m.key]}
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant ml-1',
                        )}
                      >
                        g
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => (isEditing ? commitEdit() : startEdit(m.key))}
                  aria-label={t(
                    'nosh.goals.macros.edit',
                    { name: m.label },
                    { defaultValue: 'Edit {{name}}' },
                  )}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-full bg-surface-variant text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-colors',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    {isEditing ? 'check' : 'tune'}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
