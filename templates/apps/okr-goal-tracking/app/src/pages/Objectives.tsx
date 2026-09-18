import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ObjectiveCard, type ObjectiveCardData } from '../components/ObjectiveCard.js'
import type { RingStatus } from '../components/ProgressRing.js'
import { type KeyResultRow, type ObjectiveRow, uiStatus } from '../lib/api.js'

type FilterKey = 'all' | RingStatus

const FILTERS: Array<{ key: FilterKey; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'on-track', defaultLabel: 'On track' },
  { key: 'at-risk', defaultLabel: 'At risk' },
  { key: 'behind', defaultLabel: 'Behind' },
  { key: 'completed', defaultLabel: 'Completed' },
]

export function Objectives() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([])
  const [krs, setKrs] = useState<KeyResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)

  // Keep the local filter box in sync with ?q= (set by the topbar search).
  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    let aborted = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ObjectiveRow[]>('/api/objectives'),
      http.get<KeyResultRow[]>('/api/key-results'),
    ])
      .then(([objsRes, allKrsRes]) => {
        if (aborted) return
        setObjectives(objsRes.data ?? [])
        setKrs(allKrsRes.data ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load objectives')
        setLoading(false)
      })
    return () => {
      aborted = true
    }
  }, [http])

  const ownerLabel = useMemo(
    () =>
      (user?.name ?? user?.email ?? '').split('@')[0] ||
      t('common.you', {}, { defaultValue: 'You' }),
    [t, user?.email, user?.name],
  )

  const cards: Array<ObjectiveCardData & { searchText: string }> = useMemo(() => {
    const krByObj = new Map<string, KeyResultRow[]>()
    for (const kr of krs) {
      const list = krByObj.get(kr.objective_id) ?? []
      list.push(kr)
      krByObj.set(kr.objective_id, list)
    }
    return objectives.map((o) => {
      const list = krByObj.get(o.id) ?? []
      const completed = list.filter((k) => k.status === 'completed').length
      return {
        id: o.id,
        title: o.title,
        description: o.description ?? undefined,
        ownerName: ownerLabel,
        period: t('objectives.periodCurrent', {}, { defaultValue: 'Current' }),
        progress: o.progress,
        status: uiStatus(o.status),
        keyResultCount: list.length,
        keyResultsCompleted: completed,
        searchText: [o.title, o.description ?? '', ...list.map((k) => k.title)]
          .join(' ')
          .toLowerCase(),
      }
    })
  }, [krs, objectives, ownerLabel, t])

  const filtered = cards.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false
    if (query && !o.searchText.includes(query.toLowerCase())) return false
    return true
  })

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'end', gap: 'md' }))}>
        <div className={cm.cn(cm.stack(2))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
            )}
          >
            {t('objectives.eyebrow', {}, { defaultValue: 'Company plan' })}
          </span>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-heading-ink)' }}
          >
            {t('objectives.heading', {}, { defaultValue: 'All objectives' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'objectives.subheading',
              { count: objectives.length },
              {
                defaultValue:
                  'Tracking {{count}} objectives. Filter by status to find what needs attention.',
              },
            )}
          </p>
        </div>
        <Link
          to="/objectives/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t('objectives.new', {}, { defaultValue: 'New objective' })}
        </Link>
      </header>

      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center', gap: 'md' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 flex-wrap',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-colors',
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
                style={active ? { backgroundColor: 'var(--color-nav-bg)' } : undefined}
              >
                {t(
                  `objectives.filter.${f.key}` as 'objectives.filter.all',
                  {},
                  { defaultValue: f.defaultLabel },
                )}
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center' }), 'relative max-w-xs flex-1 min-w-[200px]')}
        >
          <span
            aria-hidden
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'objectives.searchPlaceholder',
              {},
              { defaultValue: 'Filter by title…' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'pl-9 pr-4 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-indigo-500/30 outline-none',
            )}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-light border border-red-200 text-error text-sm',
          )}
        >
          {error}
        </div>
      )}

      <section className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
        {loading ? (
          <p
            data-testid="objectives-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant col-span-2')}
          >
            {t('objectives.loading', {}, { defaultValue: 'Loading objectives…' })}
          </p>
        ) : filtered.length === 0 ? (
          <div
            data-testid="objectives-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.stack(2),
              cm.textCenter,
              'col-span-2 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-[40px] text-on-surface-variant/60 mx-auto"
              aria-hidden
            >
              {objectives.length === 0 ? 'flag' : 'search_off'}
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
              {objectives.length === 0
                ? t('objectives.emptyTitle', {}, { defaultValue: 'No objectives yet' })
                : t(
                    'objectives.emptyFilteredTitle',
                    {},
                    { defaultValue: 'No objectives match those filters yet.' },
                  )}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {objectives.length === 0
                ? t(
                    'objectives.emptyBody',
                    {},
                    {
                      defaultValue: 'Draft your first objective to start tracking weekly progress.',
                    },
                  )
                : t(
                    'objectives.emptyFilteredBody',
                    {},
                    { defaultValue: 'Try clearing the filter or starting a new objective.' },
                  )}
            </p>
            {objectives.length === 0 && (
              <div>
                <Link
                  to="/objectives/new"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 inline-flex',
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  {t('objectives.new', {}, { defaultValue: 'New objective' })}
                </Link>
              </div>
            )}
          </div>
        ) : (
          filtered.map((obj) => (
            <ObjectiveCard key={obj.id} objective={obj} href={`/objectives/${obj.id}`} />
          ))
        )}
      </section>
    </div>
  )
}

export default Objectives
