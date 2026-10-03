import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerTopBar } from '../components/SimmerTopBar.js'
import {
  formatQuantityWithUnit,
  GROCERY_CATEGORY_LABELS,
  num,
  PANTRY_SHELF_LABELS,
} from '../lib/plan.js'

interface PantryRow {
  id: string
  name: string
  quantity: number | string
  unit: string
}

/** localStorage key shared with Settings' "Smart Pantry & Grocery Automation". */
const RESTOCK_THRESHOLD_KEY = 'simmer.settings.restockThreshold'

function readRestockThreshold(): number {
  try {
    const raw = window.localStorage.getItem(RESTOCK_THRESHOLD_KEY)
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 10) : 1
  } catch (_error) {
    // Private mode / storage unavailable: the threshold starts at its default.
    return 1
  }
}

export function Pantry() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<PantryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [adding, setAdding] = useState(false)
  const [restockThreshold, setRestockThreshold] = useState<number>(() => readRestockThreshold())

  const loadPantry = useCallback(() => {
    let cancelled = false
    setError(null)
    http
      .get<PantryRow[]>('/api/pantry?limit=500')
      .then((res) => {
        if (cancelled) return
        setItems(Array.isArray(res.data) ? (res.data as PantryRow[]) : [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('simmer.pantry.fetchError', {}, { defaultValue: 'Could not load the pantry.' }),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  useEffect(() => loadPantry(), [loadPantry])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = (items ?? []).filter((i) => !q || i.name.toLowerCase().includes(q))
    const map = new Map<string, PantryRow[]>()
    for (const item of filtered) {
      const category = guessCategory(item.name)
      const list = map.get(category) ?? []
      list.push(item)
      map.set(category, list)
    }
    // Pantry shelves first (the design's staple taxonomy), then any
    // grocery-aisle groups the leftover items fall into.
    const shelves = [...PANTRY_SHELF_LABELS, ...GROCERY_CATEGORY_LABELS]
    const seen = new Set<string>()
    return shelves
      .filter((c) => {
        if (!map.has(c.id) || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      .map((c) => ({ ...c, items: map.get(c.id) ?? [] }))
  }, [items, query])

  const restockQueue = useMemo(() => {
    const q = Number.isFinite(restockThreshold) ? restockThreshold : 1
    return (items ?? []).filter((i) => num(i.quantity) <= q)
  }, [items, restockThreshold])

  // Re-read the threshold when the tab regains focus — Settings may have
  // changed it in another view of the same app.
  useEffect(() => {
    const sync = (): void => setRestockThreshold(readRestockThreshold())
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [])

  const addItem = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || adding) return
    setAdding(true)
    try {
      await http.post('/api/pantry', {
        name: trimmed,
        quantity: Number.parseFloat(quantity) || 1,
        unit: unit.trim(),
      })
      setName('')
      setQuantity('1')
      setUnit('')
      void track({ name: 'pantry.item-added', properties: { name: trimmed } })
      loadPantry()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('simmer.pantry.addError', {}, { defaultValue: 'Could not add the item.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  const adjust = async (item: PantryRow, delta: number): Promise<void> => {
    const next = Math.max(0, Number(item.quantity ?? 0) + delta)
    setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)) ?? prev)
    try {
      await http.put(`/api/pantry/${item.id}`, { quantity: next })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.pantry.updateError', {}, { defaultValue: 'Could not update the item.' }),
      )
      loadPantry()
    }
  }

  const removeItem = async (item: PantryRow): Promise<void> => {
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? prev)
    try {
      await http.delete(`/api/pantry/${item.id}`)
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('simmer.pantry.removeError', {}, { defaultValue: 'Could not remove the item.' }),
      )
      loadPantry()
    }
  }

  return (
    <>
      <SimmerTopBar
        title={t('simmer.pantry.heading', {}, { defaultValue: 'Pantry' })}
        eyebrow={t(
          'simmer.pantry.eyebrow',
          { count: items?.length ?? 0 },
          { defaultValue: '{{count}} items on hand — the grocery list flags these' },
        )}
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

      {/* Add form */}
      <form
        onSubmit={addItem}
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap sm:flex-nowrap')}
      >
        <input
          type="text"
          data-mol-id="pantry-add-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t(
            'simmer.pantry.addPlaceholder',
            {},
            { defaultValue: 'What do you have? (e.g. olive oil)' },
          )}
          className={cm.cn(
            'flex-1 min-w-[10rem] h-12 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none',
          )}
        />
        <input
          type="number"
          step="0.25"
          min="0"
          data-mol-id="pantry-add-quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label={t('simmer.pantry.quantityLabel', {}, { defaultValue: 'Quantity' })}
          className={cm.cn(
            'w-24 h-12 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none',
          )}
        />
        <input
          type="text"
          data-mol-id="pantry-add-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label={t('simmer.pantry.unitLabel', {}, { defaultValue: 'Unit' })}
          placeholder="ml"
          className={cm.cn(
            'w-24 h-12 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none',
          )}
        />
        <button
          type="submit"
          data-mol-id="pantry-add-submit"
          disabled={adding || name.trim().length === 0}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            'h-12 rounded-xl bg-accent text-on-accent hover:bg-accent/90 transition-colors font-semibold disabled:opacity-50',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            add
          </span>
          {t('simmer.pantry.addCta', {}, { defaultValue: 'Stock it' })}
        </button>
      </form>

      {/* Search */}
      <div className={cm.cn('relative')}>
        <span
          aria-hidden="true"
          className={cm.cn(
            'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
          )}
        >
          search
        </span>
        <input
          type="search"
          data-mol-id="pantry-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'simmer.pantry.searchPlaceholder',
            {},
            { defaultValue: 'Search the pantry…' },
          )}
          className={cm.cn(
            'w-full h-11 pl-12 pr-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none',
          )}
        />
      </div>

      {items === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('simmer.pantry.loading', {}, { defaultValue: 'Loading the pantry…' })}
        </p>
      ) : items.length === 0 ? (
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
            kitchen
          </span>
          <h2 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('simmer.pantry.empty.title', {}, { defaultValue: 'Your pantry is empty' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'simmer.pantry.empty.body',
              {},
              { defaultValue: 'Track what you already have and the grocery list will badge it.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4 items-start')}>
          {grouped.map((group) => (
            <section
              key={group.id}
              data-mol-id={`pantry-group-${group.id}`}
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
                {t(`simmer.categories.${group.id}`, {}, { defaultValue: group.label })}
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
                    )}
                  >
                    <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'text-on-surface',
                        )}
                      >
                        {item.name}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {formatQuantityWithUnit(item.quantity, item.unit)}
                      </span>
                    </span>
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <button
                        type="button"
                        data-mol-id={`pantry-decrease-${item.id}`}
                        aria-label={t(
                          'simmer.pantry.useSome',
                          { name: item.name },
                          { defaultValue: 'Use one {{name}}' },
                        )}
                        onClick={() => void adjust(item, -1)}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-8 h-8 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn('material-symbols-outlined text-base')}
                        >
                          remove
                        </span>
                      </button>
                      <button
                        type="button"
                        data-mol-id={`pantry-increase-${item.id}`}
                        aria-label={t(
                          'simmer.pantry.addSome',
                          { name: item.name },
                          { defaultValue: 'Add one {{name}}' },
                        )}
                        onClick={() => void adjust(item, 1)}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-8 h-8 rounded-full text-on-surface-variant hover:bg-primary-container/50 hover:text-primary transition-colors',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn('material-symbols-outlined text-base')}
                        >
                          add
                        </span>
                      </button>
                      <button
                        type="button"
                        data-mol-id={`pantry-remove-${item.id}`}
                        aria-label={t(
                          'simmer.pantry.removeItem',
                          {},
                          { defaultValue: 'Remove item' },
                        )}
                        onClick={() => void removeItem(item)}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'w-8 h-8 rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn('material-symbols-outlined text-base')}
                        >
                          delete
                        </span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Pantry Restock Queue — staples at or below the restock threshold */}
      <section
        data-mol-id="pantry-restock-queue"
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'bg-surface rounded-2xl shadow-sm border border-outline/30',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
          <h2
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'text-on-surface',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-primary')}>
              restock
            </span>
            {t('simmer.pantry.restock.title', {}, { defaultValue: 'Pantry Restock Queue' })}
          </h2>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full bg-surface-variant text-on-surface-variant tabular-nums',
            )}
          >
            {t(
              'simmer.pantry.restock.threshold',
              { count: restockThreshold },
              { defaultValue: 'At or below {{count}}' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'simmer.pantry.restock.body',
            { count: restockThreshold },
            {
              defaultValue:
                'Staples sitting at or below {{count}} units land here — restock them before the next plan rebuilds the list. Adjust the threshold in Settings.',
            },
          )}
        </p>
        {items === null ? null : restockQueue.length === 0 ? (
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-have-it',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              check_circle
            </span>
            {t(
              'simmer.pantry.restock.stocked',
              {},
              { defaultValue: 'Everything is stocked above the restock line.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), 'list-none')}>
            {restockQueue.map((item) => (
              <li
                key={item.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-full bg-accent-container text-on-accent-container',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {item.name}
                  <span className={cm.cn(cm.textSize('xs'), 'ml-1 tabular-nums')}>
                    {formatQuantityWithUnit(item.quantity, item.unit)}
                  </span>
                </span>
                <button
                  type="button"
                  data-mol-id={`pantry-restock-${item.id}`}
                  aria-label={t(
                    'simmer.pantry.restock.addOne',
                    { name: item.name },
                    { defaultValue: 'Restock {{name}}' },
                  )}
                  onClick={() => void adjust(item, 1)}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-6 h-6 rounded-full bg-on-accent-container/10 hover:bg-on-accent-container/20 transition-colors',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                    add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/**
 * Light client-side grouping for display; the authoritative classifier is
 * the server's (api/src/lib/grocery.ts). This mirror adds the design's
 * pantry-SHELF taxonomy (oils / spices / grains / root-cellar aromatics) on
 * top of the grocery aisles and defaults unknowns to "other".
 */
function guessCategory(name: string): string {
  const n = name.toLowerCase()
  const has = (...keywords: string[]): boolean =>
    keywords.some((k) => n === k || n.includes(`${k} `) || n.endsWith(` ${k}`))
  if (has('chicken', 'beef', 'pork', 'bacon', 'sausage', 'turkey', 'lamb', 'steak', 'ham'))
    return 'meat'
  if (has('salmon', 'fish', 'shrimp', 'tuna', 'cod', 'crab')) return 'seafood'
  if (
    has(
      'milk',
      'butter',
      'cheese',
      'egg',
      'yogurt',
      'cream',
      'parmesan',
      'feta',
      'cheddar',
      'mozzarella',
      'ricotta',
    )
  )
    return 'dairy'
  if (has('bread', 'baguette', 'tortilla', 'bun', 'roll', 'pita')) return 'bakery'
  // Pantry shelves (design taxonomy) — checked before the wider aisles.
  if (has('oil', 'vinegar', 'sesame', 'syrup', 'mirin', 'cooking wine')) return 'oils'
  if (
    has(
      'salt',
      'pepper',
      'peppercorn',
      'peppercorns',
      'paprika',
      'cumin',
      'oregano',
      'cinnamon',
      'turmeric',
      'seasoning',
      'spice',
      'chili flakes',
    )
  )
    return 'spices'
  if (
    has(
      'flour',
      'rice',
      'pasta',
      'noodle',
      'spaghetti',
      'macaroni',
      'bean',
      'beans',
      'lentil',
      'lentils',
      'oat',
      'oats',
      'quinoa',
      'couscous',
      'polenta',
      'grain',
      'grains',
      'sugar',
      'cereal',
      'chickpea',
      'chickpeas',
    )
  )
    return 'grains'
  if (has('garlic', 'onion', 'shallot', 'ginger', 'scallion', 'leek', 'potato')) return 'aromatics'
  if (has('coffee', 'tea', 'juice', 'wine')) return 'drinks'
  if (
    has(
      'apple',
      'tomato',
      'carrot',
      'lemon',
      'lime',
      'lettuce',
      'spinach',
      'kale',
      'basil',
      'parsley',
      'cilantro',
      'cucumber',
      'avocado',
      'zucchini',
      'broccoli',
      'mushroom',
      'banana',
      'berry',
    )
  )
    return 'produce'
  return 'other'
}
