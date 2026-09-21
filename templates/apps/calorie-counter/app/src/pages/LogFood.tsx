import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NoshTopBar } from '../components/NoshTopBar.js'

interface FoodRow {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
}

interface DiaryApiEntry {
  id: string
  meal_type: string
  food_name: string
  calories: number | string
}

interface DiaryDayResponse {
  entries: DiaryApiEntry[]
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'verified', label: 'Verified' },
  { key: 'mine', label: 'My foods' },
] as const

const MEAL_TABS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
] as const

const QUICK_ADDS = [
  { key: 'water', icon: 'water_drop', tone: 'text-info', defaultLabel: 'Water', calories: 0 },
  { key: 'coffee', icon: 'local_cafe', tone: 'text-warning', defaultLabel: 'Coffee', calories: 5 },
  {
    key: 'tea',
    icon: 'emoji_food_beverage',
    tone: 'text-success',
    defaultLabel: 'Tea',
    calories: 2,
  },
  { key: 'snack', icon: 'cookie', tone: 'text-snacks', defaultLabel: 'Snack', calories: 100 },
] as const

const ICON_MAP: Record<string, { icon: string; tone: string }> = {
  default: { icon: 'restaurant', tone: 'bg-primary-container text-primary' },
  fruit: { icon: 'nutrition', tone: 'bg-warning-container text-warning' },
  vegetable: { icon: 'eco', tone: 'bg-success-container text-success' },
  meal: { icon: 'lunch_dining', tone: 'bg-accent-container text-accent' },
  beverage: { icon: 'local_cafe', tone: 'bg-info-container text-info' },
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

const todayDate = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const apiMealType = (
  m: (typeof MEAL_TABS)[number]['key'],
): 'breakfast' | 'lunch' | 'dinner' | 'snack' =>
  (m === 'snacks' ? 'snack' : m) as 'breakfast' | 'lunch' | 'dinner' | 'snack'

const WATER_LABEL = 'Water'

const isMealKey = (v: string | null): v is (typeof MEAL_TABS)[number]['key'] =>
  MEAL_TABS.some((m) => m.key === v)

export function LogFood() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('all')
  // Pre-select the meal tab from ?meal= (Today's per-meal "Add" buttons
  // navigate here with it); default to lunch otherwise.
  const [meal, setMeal] = useState<(typeof MEAL_TABS)[number]['key']>(() => {
    const requested = searchParams.get('meal')
    return isMealKey(requested) ? requested : 'lunch'
  })
  const [query, setQuery] = useState('')
  const [foods, setFoods] = useState<FoodRow[] | null>(null)
  const [recent, setRecent] = useState<DiaryApiEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const date = useMemo(() => todayDate(), [])

  useEffect(() => {
    let cancelled = false
    setError(null)
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    params.set('limit', '12')
    if (activeTab === 'verified') params.set('is_verified', 'true')
    else if (activeTab === 'mine') params.set('is_verified', 'false')
    const handle = setTimeout(() => {
      http
        .get<FoodRow[]>(`/api/foods?${params.toString()}`)
        .then((r) => {
          if (cancelled) return
          setFoods(Array.isArray(r.data) ? (r.data as FoodRow[]) : [])
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setError(
            e instanceof Error
              ? e.message
              : t('nosh.log.searchError', {}, { defaultValue: 'Could not search foods.' }),
          )
          setFoods([])
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [http, t, query, activeTab, refreshKey])

  useEffect(() => {
    let cancelled = false
    http
      .get<DiaryDayResponse>(`/api/diary?date=${date}`)
      .then((r) => {
        if (cancelled) return
        const entries = (r.data as DiaryDayResponse | null)?.entries ?? []
        setRecent(entries.slice(0, 5))
      })
      .catch(() => {
        if (cancelled) return
        setRecent([])
      })
    return () => {
      cancelled = true
    }
  }, [http, date])

  const handleAddFood = async (f: FoodRow) => {
    setError(null)
    setInfo(null)
    try {
      await http.post('/api/diary', {
        date,
        meal_type: apiMealType(meal),
        food_id: f.id,
        food_name: f.name,
        servings: 1,
        serving_unit: 'serving',
        calories: num(f.calories),
        protein: num(f.protein),
        carbs: num(f.carbs),
        fat: num(f.fat),
      })
      track({
        name: 'food.logged',
        properties: {
          food_id: f.id,
          food_name: f.name,
          meal_type: apiMealType(meal),
          calories: num(f.calories),
        },
      })
      const mealLabel = t(
        `nosh.log.meal.${meal}`,
        {},
        { defaultValue: MEAL_TABS.find((m) => m.key === meal)?.label ?? meal },
      )
      setInfo(
        t(
          'nosh.log.added',
          { name: f.name, meal: mealLabel },
          { defaultValue: 'Added {{name}} to {{meal}}' },
        ),
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.log.addError', {}, { defaultValue: 'Could not add food.' }),
      )
    }
  }

  const handleQuickAdd = async (q: (typeof QUICK_ADDS)[number]) => {
    setError(null)
    try {
      await http.post('/api/diary/quick-add', {
        date,
        meal_type: apiMealType(meal),
        calories: q.calories,
        protein: 0,
        carbs: 0,
        fat: 0,
        // Named so entries read naturally in the diary — and so water logged
        // here counts toward Today's water tracker (it matches on food_name).
        food_name: q.key === 'water' ? WATER_LABEL : q.defaultLabel,
      })
      track({ name: 'food.quick_added', properties: { item: q.key, calories: q.calories } })
      setInfo(
        t(
          'nosh.log.quickAdded',
          { name: t(`nosh.log.quick.${q.key}`, {}, { defaultValue: q.defaultLabel }) },
          { defaultValue: 'Logged {{name}}' },
        ),
      )
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('nosh.log.quickAddError', {}, { defaultValue: 'Could not log item.' }),
      )
    }
  }

  return (
    <>
      <NoshTopBar
        title={t('nosh.log.heading', {}, { defaultValue: 'Log Food' })}
        actions={
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'rounded-full bg-surface-variant gap-1',
            )}
          >
            {MEAL_TABS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMeal(m.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  'rounded-full transition-colors',
                  meal === m.key
                    ? 'bg-surface text-accent font-semibold shadow-sm'
                    : 'text-on-surface-variant font-medium hover:text-on-surface',
                )}
              >
                {t(`nosh.log.meal.${m.key}`, {}, { defaultValue: m.label })}
              </button>
            ))}
          </div>
        }
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

      <div className={cm.cn('relative w-full')}>
        <span
          aria-hidden="true"
          className={cm.cn(
            'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant',
          )}
        >
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'nosh.log.searchPlaceholder',
            {},
            { defaultValue: 'Search foods, meals, or scan a barcode' },
          )}
          className={cm.cn(
            'w-full h-12 pl-12 pr-12 rounded-xl bg-surface border border-primary-container focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none shadow-sm',
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('nosh.log.clearSearch', {}, { defaultValue: 'Clear search' })}
            className={cm.cn(
              'absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
              close
            </span>
          </button>
        ) : null}
      </div>

      <div className={cm.cn(cm.flex({ gap: 'lg' }), 'border-b border-primary-container')}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              setRefreshKey((n) => n + 1)
            }}
            className={cm.cn(
              cm.sp('pb', 3),
              cm.textSize('sm'),
              'border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface font-medium',
            )}
          >
            {t(`nosh.log.tab.${tab.key}`, {}, { defaultValue: tab.label })}
          </button>
        ))}
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'lg:flex-row')}>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'w-full lg:w-2/3')}>
          {foods === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nosh.log.loading', {}, { defaultValue: 'Loading foods…' })}
            </p>
          ) : foods.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface rounded-2xl text-center text-on-surface-variant',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'))}>
                {query
                  ? t(
                      'nosh.log.noResults',
                      { q: query },
                      { defaultValue: 'No foods matched "{{q}}".' },
                    )
                  : t('nosh.log.empty', {}, { defaultValue: 'Type to search the food database.' })}
              </p>
            </div>
          ) : (
            foods.map((f) => {
              const cat = (f.category ?? '').toLowerCase()
              const iconInfo = ICON_MAP[cat] ?? ICON_MAP.default
              const calories = Math.round(num(f.calories))
              return (
                <article
                  key={f.id}
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.sp('p', 4),
                    'bg-surface rounded-xl shadow-sm hover:shadow-md transition-shadow border border-outline/30 group',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      `w-12 h-12 rounded-xl mr-4 flex-shrink-0 ${iconInfo.tone}`,
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                      {iconInfo.icon}
                    </span>
                  </div>
                  <Link to={`/food/${f.id}`} className={cm.cn('flex-1 min-w-0')}>
                    <h3
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        'text-on-surface truncate group-hover:text-primary transition-colors',
                      )}
                    >
                      {f.name}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate')}>
                      {f.brand ??
                        f.category ??
                        t('nosh.log.standardServing', {}, { defaultValue: 'Standard serving' })}
                    </p>
                  </Link>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
                    <div className={cm.cn('text-right')}>
                      <div
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('lg'),
                          'text-on-surface tabular-nums',
                        )}
                      >
                        {calories}{' '}
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            'text-on-surface-variant uppercase',
                          )}
                        >
                          {t('nosh.log.kcal', {}, { defaultValue: 'kcal' })}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ gap: 'sm' }),
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'tabular-nums mt-0.5',
                        )}
                      >
                        <span className={cm.cn('text-protein')}>
                          {Math.round(num(f.protein))}g P
                        </span>
                        <span className={cm.cn('text-carbs')}>{Math.round(num(f.carbs))}g C</span>
                        <span className={cm.cn('text-fat')}>{Math.round(num(f.fat))}g F</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFood(f)}
                      aria-label={t(
                        'nosh.log.add',
                        { name: f.name },
                        { defaultValue: 'Add {{name}}' },
                      )}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-9 h-9 rounded-full bg-accent-container text-accent hover:bg-accent hover:text-on-accent transition-colors group-hover:scale-105',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-base')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        add
                      </span>
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>

        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'w-full lg:w-1/3')}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface rounded-2xl shadow-sm border border-primary-container/50',
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-primary')}>
                bolt
              </span>
              {t('nosh.log.quickAdd', {}, { defaultValue: 'Quick Add' })}
            </h3>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              {QUICK_ADDS.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => handleQuickAdd(q)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'bg-surface-variant hover:bg-primary-container border border-outline/30 hover:border-primary/30 rounded-full text-on-surface transition-colors',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-base ${q.tone}`}
                  >
                    {q.icon}
                  </span>
                  {t(`nosh.log.quick.${q.key}`, {}, { defaultValue: q.defaultLabel })}
                </button>
              ))}
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface rounded-2xl shadow-sm border border-primary-container/50',
            )}
          >
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-accent')}>
                history
              </span>
              {t('nosh.log.recentTitle', {}, { defaultValue: 'Recent today' })}
            </h3>
            {recent === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('nosh.log.recentLoading', {}, { defaultValue: 'Loading recent…' })}
              </p>
            ) : recent.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('nosh.log.recentEmpty', {}, { defaultValue: 'Nothing logged yet today.' })}
              </p>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}>
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-surface truncate',
                      )}
                    >
                      {p.food_name}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'text-on-surface-variant bg-surface-variant rounded-md tabular-nums',
                      )}
                    >
                      {Math.round(num(p.calories))}{' '}
                      {t('nosh.log.kcal', {}, { defaultValue: 'kcal' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
