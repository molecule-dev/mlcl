import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RecipePicker } from '../components/RecipePicker.js'
import { SimmerTopBar } from '../components/SimmerTopBar.js'
import { WeekNavigator } from '../components/WeekNavigator.js'
import {
  dateOfDay,
  DAY_LABELS,
  DAY_SHORT_LABELS,
  formatDayLabel,
  MEAL_SLOTS,
  type MealSlot,
  num,
  SLOT_META,
  weekStartOf,
} from '../lib/plan.js'

interface PlanEntry {
  id: string
  week_start: string
  day: number
  meal_slot: string
  recipe_id: string
  servings: number | string
  recipe: {
    id: string
    title: string
    servings: number | string
    prep_minutes: number | string
    cook_minutes: number | string
    image_emoji: string
  } | null
}

export function MealPlan() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState<string>(() => weekStartOf())
  const [entries, setEntries] = useState<PlanEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ day: number; mealSlot: MealSlot } | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const loadWeek = useCallback(
    (week: string) => {
      let cancelled = false
      setError(null)
      http
        .get<PlanEntry[]>(`/api/meal-plan?week_start=${week}`)
        .then((res) => {
          if (cancelled) return
          setEntries(Array.isArray(res.data) ? (res.data as PlanEntry[]) : [])
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setError(
            e instanceof Error
              ? e.message
              : t('simmer.plan.fetchError', {}, { defaultValue: 'Could not load the plan.' }),
          )
          setEntries([])
        })
      return () => {
        cancelled = true
      }
    },
    [http, t],
  )

  useEffect(() => loadWeek(weekStart), [loadWeek, weekStart])

  const byCell = useMemo(() => {
    const map = new Map<string, PlanEntry[]>()
    for (const entry of entries ?? []) {
      const key = `${entry.day}|${entry.meal_slot}`
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
    }
    return map
  }, [entries])

  const plannedCount = (entries ?? []).length

  const removeEntry = async (entryId: string): Promise<void> => {
    // Optimistic removal; a failure reloads the week from the server.
    setEntries((prev) => prev?.filter((e) => e.id !== entryId) ?? prev)
    try {
      await http.delete(`/api/meal-plan/${entryId}`)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              'simmer.plan.removeError',
              {},
              { defaultValue: 'Could not remove the planned meal.' },
            ),
      )
      loadWeek(weekStart)
    }
  }

  const regenerateGroceryList = async (): Promise<void> => {
    setRegenerating(true)
    setError(null)
    try {
      await http.post('/api/grocery-list/regenerate', { week_start: weekStart })
      navigate(`/groceries?week=${weekStart}`)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              'simmer.plan.regenerateError',
              {},
              { defaultValue: 'Could not regenerate the grocery list.' },
            ),
      )
    } finally {
      setRegenerating(false)
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <>
      <SimmerTopBar
        title={t('simmer.plan.heading', {}, { defaultValue: 'This week' })}
        eyebrow={t(
          'simmer.plan.eyebrow',
          { count: plannedCount },
          { defaultValue: '{{count}} meals planned' },
        )}
      />

      <WeekNavigator weekStart={weekStart} onChange={setWeekStart}>
        <button
          type="button"
          data-mol-id="plan-regenerate-list"
          disabled={regenerating || plannedCount === 0}
          onClick={() => void regenerateGroceryList()}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-light transition-colors disabled:opacity-50',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
            shopping_cart
          </span>
          {regenerating
            ? t('simmer.plan.regenerating', {}, { defaultValue: 'Building list…' })
            : t('simmer.plan.regenerate', {}, { defaultValue: 'Grocery list' })}
        </button>
      </WeekNavigator>

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

      {entries === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('simmer.plan.loading', {}, { defaultValue: 'Loading the week…' })}
        </p>
      ) : (
        <div className={cm.cn('overflow-x-auto pb-2')}>
          <div className={cm.cn('grid grid-cols-7 min-w-[56rem] gap-2')}>
            {/* Day header row */}
            {DAY_SHORT_LABELS.map((label, i) => {
              const isToday = dateOfDay(weekStart, i) === todayIso
              return (
                <div
                  key={label}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center' }),
                    cm.sp('py', 2),
                    'rounded-lg',
                    isToday
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-wide',
                    )}
                  >
                    {t(`simmer.plan.days.${i}`, {}, { defaultValue: label })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'))}>
                    {formatDayLabel(weekStart, i).slice(-2)}
                  </span>
                </div>
              )
            })}

            {/* One row per meal slot */}
            {MEAL_SLOTS.map((slot) => (
              <div key={slot} className={cm.cn('contents')}>
                {DAY_SHORT_LABELS.map((_, day) => {
                  const cellEntries = byCell.get(`${day}|${slot}`) ?? []
                  return (
                    <div
                      key={`${slot}-${day}`}
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 'xs' }),
                        cm.sp('p', 2),
                        'rounded-xl bg-surface border border-outline/20 min-h-[7.5rem]',
                      )}
                    >
                      {cellEntries.length === 0 ? (
                        <button
                          type="button"
                          data-mol-id={`cell-add-${slot}-${day}`}
                          aria-label={t(
                            'simmer.plan.addCell',
                            {
                              slot: t(
                                `simmer.slots.${slot}`,
                                {},
                                { defaultValue: SLOT_META[slot].defaultLabel },
                              ),
                              day: t(
                                `simmer.plan.days.${day}`,
                                {},
                                { defaultValue: DAY_LABELS[day] },
                              ),
                            },
                            { defaultValue: 'Add a recipe to {{slot}} on {{day}}' },
                          )}
                          onClick={() => setPicker({ day, mealSlot: slot })}
                          className={cm.cn(
                            cm.flex({
                              direction: 'col',
                              align: 'center',
                              justify: 'center',
                              gap: 'xs',
                            }),
                            'w-full flex-1 rounded-lg border border-dashed border-outline/40 text-on-surface-variant/60 hover:border-primary/60 hover:text-primary transition-colors min-h-[6rem]',
                          )}
                        >
                          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                            {SLOT_META[slot].icon}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cm.cn('material-symbols-outlined text-base')}
                          >
                            add
                          </span>
                        </button>
                      ) : (
                        cellEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={cm.cn(
                              cm.flex({ direction: 'col', gap: 'xs' }),
                              cm.sp('p', 2),
                              'rounded-lg bg-surface-variant/70 group relative',
                            )}
                          >
                            <button
                              type="button"
                              data-mol-id={`entry-open-${entry.id}`}
                              onClick={() =>
                                entry.recipe && navigate(`/recipes/${entry.recipe.id}`)
                              }
                              className={cm.cn(
                                cm.flex({ direction: 'col', gap: 'xs' }),
                                'text-left',
                              )}
                            >
                              <span className={cm.cn('text-2xl')} aria-hidden="true">
                                {entry.recipe?.image_emoji ?? '🍽️'}
                              </span>
                              <span
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  cm.fontWeight('semibold'),
                                  'text-on-surface line-clamp-3',
                                )}
                              >
                                {entry.recipe?.title ??
                                  t(
                                    'simmer.plan.unavailable',
                                    {},
                                    { defaultValue: 'Recipe unavailable' },
                                  )}
                              </span>
                              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                                {t(
                                  'simmer.plan.serves',
                                  { count: num(entry.servings) },
                                  { defaultValue: 'serves {{count}}' },
                                )}
                              </span>
                            </button>
                            <button
                              type="button"
                              data-mol-id={`entry-remove-${entry.id}`}
                              aria-label={t(
                                'simmer.plan.removeEntry',
                                {},
                                { defaultValue: 'Remove from plan' },
                              )}
                              onClick={() => void removeEntry(entry.id)}
                              className={cm.cn(
                                cm.flex({ align: 'center', justify: 'center' }),
                                'absolute top-1 right-1 w-6 h-6 rounded-full bg-surface/80 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-error focus:opacity-100 transition-opacity',
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cm.cn('material-symbols-outlined text-sm')}
                              >
                                close
                              </span>
                            </button>
                          </div>
                        ))
                      )}
                      {cellEntries.length > 0 ? (
                        <button
                          type="button"
                          data-mol-id={`cell-add-more-${slot}-${day}`}
                          aria-label={t(
                            'simmer.plan.addMore',
                            {
                              slot: t(
                                `simmer.slots.${slot}`,
                                {},
                                { defaultValue: SLOT_META[slot].defaultLabel },
                              ),
                            },
                            { defaultValue: 'Add another recipe to {{slot}}' },
                          )}
                          onClick={() => setPicker({ day, mealSlot: slot })}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'w-full h-6 rounded-md border border-dashed border-outline/30 text-on-surface-variant/50 hover:border-primary/50 hover:text-primary transition-colors',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cm.cn('material-symbols-outlined text-sm')}
                          >
                            add
                          </span>
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile-friendly slot legend */}
      <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }))}>
        {MEAL_SLOTS.map((slot) => (
          <span
            key={slot}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              {SLOT_META[slot].icon}
            </span>
            {t(`simmer.slots.${slot}`, {}, { defaultValue: SLOT_META[slot].defaultLabel })}
          </span>
        ))}
      </div>

      <RecipePicker
        open={picker !== null}
        weekStart={weekStart}
        day={picker?.day ?? 0}
        mealSlot={picker?.mealSlot ?? 'dinner'}
        onClose={() => setPicker(null)}
        onAssigned={() => loadWeek(weekStart)}
      />
    </>
  )
}
