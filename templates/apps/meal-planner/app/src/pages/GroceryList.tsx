import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerTopBar } from '../components/SimmerTopBar.js'
import { WeekNavigator } from '../components/WeekNavigator.js'
import { formatQuantityWithUnit, GROCERY_CATEGORY_LABELS, weekStartOf } from '../lib/plan.js'

interface GroceryRow {
  id: string
  name: string
  quantity: number | string
  unit: string
  category: string
  source: string
  checked: boolean
  in_pantry: boolean
  pantry_quantity: number | null
  pantry_unit: string | null
}

/** localStorage key shared with Settings' "Smart Pantry & Grocery Automation". */
const PANTRY_BADGES_KEY = 'simmer.settings.pantryBadges'

function pantryBadgesEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(PANTRY_BADGES_KEY)
    return raw === null ? true : raw === 'on'
  } catch (_error) {
    // Private mode / storage unavailable: badges default to on.
    return true
  }
}

export function GroceryList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState<string>(
    () => searchParams.get('week') ?? weekStartOf(),
  )
  const [items, setItems] = useState<GroceryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualName, setManualName] = useState('')
  const [adding, setAdding] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  // Settings → Smart Pantry & Grocery Automation: when off, the "you already
  // have this" badges stay hidden (the server still merges the quantities).
  const [showPantryBadges, setShowPantryBadges] = useState<boolean>(() => pantryBadgesEnabled())

  // Re-read the setting when the tab regains focus — Settings may have
  // flipped it in another view of the same app.
  useEffect(() => {
    const sync = (): void => setShowPantryBadges(pantryBadgesEnabled())
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  const loadList = useCallback(
    (week: string) => {
      let cancelled = false
      setError(null)
      http
        .get<GroceryRow[]>(`/api/grocery-list?week_start=${week}`)
        .then((res) => {
          if (cancelled) return
          setItems(Array.isArray(res.data) ? (res.data as GroceryRow[]) : [])
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setError(
            e instanceof Error
              ? e.message
              : t('simmer.groceries.fetchError', {}, { defaultValue: 'Could not load the list.' }),
          )
          setItems([])
        })
      return () => {
        cancelled = true
      }
    },
    [http, t],
  )

  useEffect(() => loadList(weekStart), [loadList, weekStart])

  const grouped = useMemo(() => {
    const map = new Map<string, GroceryRow[]>()
    for (const item of items ?? []) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    // Known aisles in canonical order, then unknown categories by name.
    const orderedKeys = [
      ...GROCERY_CATEGORY_LABELS.filter((c) => map.has(c.id)).map((c) => c.id),
      ...[...map.keys()].filter((k) => !GROCERY_CATEGORY_LABELS.some((c) => c.id === k)).sort(),
    ]
    return orderedKeys.map((key) => ({
      key,
      label: GROCERY_CATEGORY_LABELS.find((c) => c.id === key)?.label ?? key,
      icon: GROCERY_CATEGORY_LABELS.find((c) => c.id === key)?.icon ?? 'shopping_basket',
      items: map.get(key) ?? [],
    }))
  }, [items])

  const checkedCount = (items ?? []).filter((i) => i.checked).length
  const totalCount = (items ?? []).length

  const toggleItem = async (item: GroceryRow): Promise<void> => {
    setItems(
      (prev) => prev?.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)) ?? prev,
    )
    try {
      await http.put(`/api/grocery-list/${item.id}`, { checked: !item.checked })
      void track({
        name: 'grocery-list.item-checked',
        properties: { item_id: item.id, checked: !item.checked, week_start: weekStart },
      })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.groceries.toggleError', {}, { defaultValue: 'Could not update the item.' }),
      )
      loadList(weekStart)
    }
  }

  const removeItem = async (item: GroceryRow): Promise<void> => {
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? prev)
    try {
      await http.delete(`/api/grocery-list/${item.id}`)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.groceries.removeError', {}, { defaultValue: 'Could not remove the item.' }),
      )
      loadList(weekStart)
    }
  }

  const addManual = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = manualName.trim()
    if (!name || adding) return
    setAdding(true)
    try {
      await http.post('/api/grocery-list', {
        week_start: weekStart,
        name,
        quantity: 1,
        unit: '',
        category: 'other',
      })
      setManualName('')
      void track({ name: 'grocery-list.item-added', properties: { name, week_start: weekStart } })
      loadList(weekStart)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('simmer.groceries.addError', {}, { defaultValue: 'Could not add the item.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  const regenerate = async (): Promise<void> => {
    setRegenerating(true)
    setError(null)
    try {
      await http.post('/api/grocery-list/regenerate', { week_start: weekStart })
      void track({
        name: 'grocery-list.generated',
        properties: { week_start: weekStart, source: 'groceries' },
      })
      loadList(weekStart)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              'simmer.groceries.regenerateError',
              {},
              { defaultValue: 'Could not regenerate the list.' },
            ),
      )
    } finally {
      setRegenerating(false)
    }
  }

  const clearChecked = async (): Promise<void> => {
    setItems((prev) => prev?.filter((i) => !i.checked) ?? prev)
    try {
      await http.delete('/api/grocery-list/checked')
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(
              'simmer.groceries.clearError',
              {},
              { defaultValue: 'Could not clear checked items.' },
            ),
      )
      loadList(weekStart)
    }
  }

  const changeWeek = (week: string): void => {
    setWeekStart(week)
    setSearchParams(week === weekStartOf() ? {} : { week }, { replace: true })
  }

  return (
    <>
      <SimmerTopBar
        title={t('simmer.groceries.heading', {}, { defaultValue: 'Grocery list' })}
        eyebrow={t(
          'simmer.groceries.eyebrow',
          { checked: checkedCount, total: totalCount },
          { defaultValue: '{{checked}} of {{total}} items bagged' },
        )}
      />

      <WeekNavigator weekStart={weekStart} onChange={changeWeek}>
        <button
          type="button"
          data-mol-id="groceries-regenerate"
          disabled={regenerating}
          onClick={() => void regenerate()}
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
            refresh
          </span>
          {regenerating
            ? t('simmer.groceries.regenerating', {}, { defaultValue: 'Rebuilding…' })
            : t('simmer.groceries.regenerate', {}, { defaultValue: 'Rebuild from plan' })}
        </button>
        {checkedCount > 0 ? (
          <button
            type="button"
            data-mol-id="groceries-clear-checked"
            onClick={() => void clearChecked()}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline text-on-surface-variant hover:border-error hover:text-error transition-colors',
            )}
          >
            {t('simmer.groceries.clearChecked', {}, { defaultValue: 'Clear checked' })}
          </button>
        ) : null}
      </WeekNavigator>

      {/* Progress bar */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', gap: 'xs' }),
          'bg-surface rounded-2xl shadow-sm border border-outline/20',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('simmer.groceries.progress', {}, { defaultValue: 'Shopping progress' })}
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
            {checkedCount} / {totalCount}
          </span>
        </div>
        <div className={cm.cn('h-2 rounded-full bg-surface-variant overflow-hidden')}>
          <div
            className={cm.cn('h-full rounded-full bg-primary transition-all')}
            style={{ width: totalCount === 0 ? '0%' : `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

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

      {/* Manual add */}
      <form onSubmit={addManual} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <input
          type="text"
          data-mol-id="groceries-add-name"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder={t(
            'simmer.groceries.addPlaceholder',
            {},
            { defaultValue: 'Add something else… (e.g. dish soap)' },
          )}
          className={cm.cn(
            'flex-1 h-12 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none',
          )}
        />
        <button
          type="submit"
          data-mol-id="groceries-add-submit"
          disabled={adding || manualName.trim().length === 0}
          aria-label={t('simmer.groceries.addCta', {}, { defaultValue: 'Add item' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-12 h-12 flex-none rounded-xl bg-accent text-on-accent hover:bg-accent/90 transition-colors disabled:opacity-50',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            add
          </span>
        </button>
      </form>

      {items === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('simmer.groceries.loading', {}, { defaultValue: 'Loading the list…' })}
        </p>
      ) : totalCount === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            'bg-surface rounded-2xl shadow-sm text-center',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-5xl text-primary')}
          >
            shopping_cart
          </span>
          <h2 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('simmer.groceries.empty.title', {}, { defaultValue: 'Nothing to shop for yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'simmer.groceries.empty.body',
              {},
              { defaultValue: 'Plan a few meals for this week, then rebuild the list.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4 items-start')}>
          {grouped.map((group) => (
            <section
              key={group.key}
              data-mol-id={`grocery-group-${group.key}`}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ direction: 'col', gap: 'xs' }),
                'bg-surface rounded-2xl shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wide text-on-surface-variant',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  {group.icon}
                </span>
                {t(`simmer.categories.${group.key}`, {}, { defaultValue: group.label })}
                <span className={cm.cn('ml-auto', 'text-on-surface-variant/70')}>
                  {group.items.length}
                </span>
              </h2>
              <ul
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'list-none divide-y divide-outline/20',
                )}
              >
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.sp('py', 2),
                      'group',
                    )}
                  >
                    <label
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'cursor-pointer min-w-0',
                      )}
                    >
                      <input
                        type="checkbox"
                        data-mol-id={`grocery-check-${item.id}`}
                        checked={item.checked}
                        onChange={() => void toggleItem(item)}
                        className={cm.cn(
                          'w-5 h-5 rounded-sm border-outline text-primary focus:ring-primary/30',
                        )}
                      />
                      <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            item.checked
                              ? 'line-through text-on-surface-variant'
                              : 'text-on-surface',
                          )}
                        >
                          {item.name}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums',
                          )}
                        >
                          {formatQuantityWithUnit(item.quantity, item.unit)}
                          {item.source === 'manual' ? ' · ' : ''}
                          {item.source === 'manual'
                            ? t('simmer.groceries.manualTag', {}, { defaultValue: 'added by you' })
                            : ''}
                        </span>
                        {showPantryBadges && item.in_pantry ? (
                          <span
                            className={cm.cn(
                              cm.sp('mt', 1),
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'w-fit rounded-full bg-have-it-light text-have-it',
                            )}
                          >
                            {t(
                              'simmer.groceries.inPantry',
                              {},
                              { defaultValue: 'You already have this' },
                            )}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <button
                      type="button"
                      data-mol-id={`grocery-remove-${item.id}`}
                      aria-label={t(
                        'simmer.groceries.removeItem',
                        {},
                        { defaultValue: 'Remove item' },
                      )}
                      onClick={() => void removeItem(item)}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-8 h-8 flex-none rounded-full text-on-surface-variant opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-error focus:opacity-100 transition-opacity',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-base')}
                      >
                        close
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
