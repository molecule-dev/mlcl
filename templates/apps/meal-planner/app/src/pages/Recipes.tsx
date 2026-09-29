import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerTopBar } from '../components/SimmerTopBar.js'
import { num } from '../lib/plan.js'

interface RecipeCardRow {
  id: string
  title: string
  description: string
  servings: number | string
  prep_minutes: number | string
  cook_minutes: number | string
  tags: string[]
  image_emoji: string
}

const TIME_FILTERS = [
  { key: 'all', maxTotal: undefined, label: 'Any time' },
  { key: 'quick', maxTotal: 20, label: '≤ 20 min' },
  { key: 'weeknight', maxTotal: 45, label: '≤ 45 min' },
] as const

export function Recipes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<RecipeCardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<(typeof TIME_FILTERS)[number]['key']>('all')

  useEffect(() => {
    let cancelled = false
    setError(null)
    http
      .get<RecipeCardRow[]>('/api/recipes?limit=200')
      .then((res) => {
        if (cancelled) return
        setRecipes(Array.isArray(res.data) ? (res.data as RecipeCardRow[]) : [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('simmer.recipes.fetchError', {}, { defaultValue: 'Could not load recipes.' }),
        )
        setRecipes([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const tags = useMemo(() => {
    const seen = new Set<string>()
    for (const r of recipes ?? []) for (const tag of r.tags ?? []) seen.add(tag)
    return [...seen].sort()
  }, [recipes])

  const filtered = useMemo(() => {
    const list = recipes ?? []
    const q = query.trim().toLowerCase()
    const maxTotal = TIME_FILTERS.find((f) => f.key === timeFilter)?.maxTotal
    return list.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q)) return false
      if (activeTag && !(r.tags ?? []).includes(activeTag)) return false
      if (maxTotal !== undefined && num(r.prep_minutes) + num(r.cook_minutes) > maxTotal) {
        return false
      }
      return true
    })
  }, [recipes, query, activeTag, timeFilter])

  return (
    <>
      <SimmerTopBar
        title={t('simmer.recipes.heading', {}, { defaultValue: 'Recipe vault & library' })}
        eyebrow={t(
          'simmer.recipes.eyebrow',
          { count: recipes?.length ?? 0 },
          { defaultValue: '{{count}} recipes, yours and the starter catalog' },
        )}
        actions={
          <button
            type="button"
            data-mol-id="recipes-new"
            onClick={() => navigate('/recipes/new')}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors shadow-sm',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-lg')}>
              add
            </span>
            {t('simmer.recipes.create', {}, { defaultValue: 'New recipe' })}
          </button>
        }
      />

      {/* Search + filters */}
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
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
            data-mol-id="recipes-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'simmer.recipes.searchPlaceholder',
              {},
              { defaultValue: 'Search by title or tag…' },
            )}
            className={cm.cn(
              'w-full h-12 pl-12 pr-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant outline-none',
            )}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'xs' }))}>
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              data-mol-id={`recipes-time-${f.key}`}
              aria-pressed={timeFilter === f.key}
              onClick={() => setTimeFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full border transition-colors',
                timeFilter === f.key
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline/50 text-on-surface-variant hover:border-primary/50',
              )}
            >
              {t(`simmer.recipes.time.${f.key}`, {}, { defaultValue: f.label })}
            </button>
          ))}
          <span aria-hidden="true" className={cm.cn('text-on-surface-variant mx-1')}>
            ·
          </span>
          {activeTag ? (
            <button
              type="button"
              data-mol-id={`recipes-tag-${activeTag}`}
              aria-pressed
              onClick={() => setActiveTag(null)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full border border-primary bg-primary-container text-on-primary-container',
              )}
            >
              #{activeTag}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                close
              </span>
            </button>
          ) : (
            tags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                data-mol-id={`recipes-tag-${tag}`}
                onClick={() => setActiveTag(tag)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-full border border-outline/50 text-on-surface-variant hover:border-primary/50 transition-colors',
                )}
              >
                #{tag}
              </button>
            ))
          )}
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

      {recipes === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('simmer.recipes.loading', {}, { defaultValue: 'Loading recipes…' })}
        </p>
      ) : filtered.length === 0 ? (
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
            menu_book
          </span>
          <h2 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('simmer.recipes.empty.title', {}, { defaultValue: 'No recipes match' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
            {t(
              'simmer.recipes.empty.body',
              {},
              { defaultValue: 'Clear the filters, or add a recipe of your own.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
          {filtered.map((r) => {
            const total = num(r.prep_minutes) + num(r.cook_minutes)
            return (
              <button
                key={r.id}
                type="button"
                data-mol-id={`recipe-card-${r.id}`}
                onClick={() => navigate(`/recipes/${r.id}`)}
                className={cm.cn(
                  cm.sp('p', 5),
                  'text-left bg-surface rounded-2xl shadow-sm border border-outline/20 hover:shadow-md hover:-translate-y-0.5 transition-all group',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.cn('text-4xl')} aria-hidden="true">
                    {r.image_emoji}
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-widest bg-primary-container text-on-primary-container',
                    )}
                  >
                    {t(
                      'simmer.recipes.totalTime',
                      { count: total },
                      { defaultValue: '{{count}} min' },
                    )}
                  </span>
                </div>
                <h2
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 4),
                    'text-on-surface group-hover:text-primary transition-colors',
                  )}
                >
                  {r.title}
                </h2>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant line-clamp-2',
                  )}
                >
                  {r.description}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('mt', 3),
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'simmer.recipes.serves',
                      { count: num(r.servings) },
                      { defaultValue: 'Serves {{count}}' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'flex-wrap justify-end min-w-0',
                    )}
                  >
                    {(r.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          'rounded-full bg-surface-variant text-on-surface-variant',
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                </div>
              </button>
            )
          })}
          <button
            type="button"
            data-mol-id="recipes-add-tile"
            onClick={() => navigate('/recipes/new')}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
              'bg-surface rounded-2xl shadow-sm border-2 border-dashed border-outline/40 hover:border-primary/60 hover:bg-primary-container/30 transition-colors min-h-[160px] text-on-surface-variant hover:text-primary',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-3xl')}>
              add
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('simmer.recipes.addCard', {}, { defaultValue: 'Add a recipe' })}
            </span>
          </button>
        </div>
      )}
    </>
  )
}
