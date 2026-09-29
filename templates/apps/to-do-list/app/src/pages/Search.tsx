import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { TaskList } from '../components/TaskList.js'
import {
  type Label,
  listLabels,
  listTasks,
  searchTasks,
  type Task,
  toggleTaskCompleted,
} from '../lib/api.js'

/** Result-age window applied client-side on the task's created_at stamp. */
const PERIODS = [
  { key: 'all', label: 'All time', ms: null },
  { key: '30d', label: 'Last 30 days', ms: 30 * 86_400_000 },
  { key: '6m', label: 'Last 6 months', ms: 182 * 86_400_000 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [labels, setLabels] = useState<Label[]>([])
  const [results, setResults] = useState<Task[]>([])
  const [query, setQuery] = useState('')
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listLabels(http)
      .then((items) => {
        if (!cancelled) setLabels(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('search.loadError', {}, { defaultValue: 'Failed to load search index.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Debounced server-side search; refire when label filter changes too.
  const trimmedQuery = query.trim()
  const hasQuery = trimmedQuery.length > 0
  const hasFilter = hasQuery || activeLabelId !== null

  useEffect(() => {
    if (!hasFilter) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = window.setTimeout(async () => {
      try {
        let items: Task[]
        if (hasQuery && activeLabelId !== null) {
          // Server doesn't combine search+label_id; fetch the smaller
          // label-scoped set and substring-filter client-side.
          const labeled = await listTasks(http, { label_id: activeLabelId })
          const needle = trimmedQuery.toLowerCase()
          items = labeled.filter((task) => task.title.toLowerCase().includes(needle))
        } else if (hasQuery) {
          items = await searchTasks(http, trimmedQuery)
        } else if (activeLabelId !== null) {
          items = await listTasks(http, { label_id: activeLabelId })
        } else {
          items = []
        }
        if (!cancelled) setResults(items)
      } catch (_error) {
        // search failure is shown as empty results; no error banner needed
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [http, trimmedQuery, hasQuery, activeLabelId, hasFilter])

  const onToggle = async (id: string) => {
    const updated = await toggleTaskCompleted(http, id).catch(() => null)
    if (!updated) return
    setResults((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const labelLookup = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const activeLabelName = activeLabelId ? labelLookup.get(activeLabelId)?.name : null

  const activePeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[0]
  const visible = useMemo(() => {
    if (activePeriod.ms === null) return results
    const cutoff = Date.now() - activePeriod.ms
    return results.filter((r) => new Date(r.created_at).getTime() >= cutoff)
  }, [results, activePeriod])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('search.eyebrow', {}, { defaultValue: 'Find anything' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'search.subheading',
            {},
            { defaultValue: 'Search across your tasks by title or filter by label.' },
          )}
        </p>
      </header>

      <form
        onSubmit={(e) => e.preventDefault()}
        className={cm.cn(
          cm.flex({ gap: 'sm', align: 'center' }),
          'rounded-full bg-surface-container-low border border-outline-variant/40 px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-primary text-base')}
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder', {}, { defaultValue: 'Search tasks…' })}
          aria-label={t('search.inputLabel', {}, { defaultValue: 'Search tasks' })}
          data-mol-id="search-input"
          className={cm.cn('flex-1 bg-transparent border-0 outline-none text-sm')}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('search.clear', {}, { defaultValue: 'Clear search' })}
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant hover:text-on-surface')}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              close
            </span>
          </button>
        ) : (
          <span
            className={cm.cn(
              'px-2 py-0.5 text-[10px] text-on-surface-variant border border-outline-variant rounded font-mono',
            )}
          >
            ⌘K
          </span>
        )}
      </form>

      {labels.length > 0 ? (
        <div className={cm.flex({ gap: 'sm', wrap: 'wrap', align: 'center' })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('search.filterLabels', {}, { defaultValue: 'Filter by label' })}
          </span>
          <button
            type="button"
            onClick={() => setActiveLabelId(null)}
            data-mol-id="search-label-all"
            className={cm.cn(
              cm.sp('px', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'py-0.5',
              activeLabelId === null
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
            )}
          >
            {t('status.all', {}, { defaultValue: 'All' })}
          </button>
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => setActiveLabelId(label.id)}
              data-mol-id={`search-label-${label.id}`}
              className={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'py-0.5 font-mono',
                activeLabelId === label.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
              )}
            >
              @{label.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.loading', {}, { defaultValue: 'Indexing…' })}
        </p>
      ) : !hasFilter ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.maxW('lg'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-primary-container/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-primary')}
              aria-hidden="true"
            >
              manage_search
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('search.idleHeading', {}, { defaultValue: 'Start typing' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'search.idle',
              {},
              { defaultValue: 'Type to search across your tasks, or pick a label above.' },
            )}
          </p>
        </div>
      ) : searching ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
        </p>
      ) : results.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.maxW('lg'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.sp('mb', 4),
              'h-16 w-16 mx-auto bg-surface-container-high',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-3xl text-on-surface-variant')}
              aria-hidden="true"
            >
              search_off
            </span>
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
            {t('search.noResultsHeading', {}, { defaultValue: 'No matches' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'search.noResults',
              { query: trimmedQuery || (activeLabelName ?? '') },
              {
                defaultValue:
                  'Nothing matches "{{query}}". Try a different word or clear the filter.',
              },
            )}
          </p>
        </div>
      ) : (
        <section className={cm.cn('space-y-3')}>
          <div
            className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'tracking-wide',
                'text-on-surface-variant',
              )}
            >
              {period === 'all'
                ? t(
                    'search.summary',
                    { count: visible.length, query: trimmedQuery || (activeLabelName ?? '') },
                    { defaultValue: 'Showing {{count}} results for "{{query}}"' },
                  )
                : t(
                    'search.summaryPeriod',
                    {
                      count: visible.length,
                      query: trimmedQuery || (activeLabelName ?? ''),
                      period: t(
                        `search.period.${period}`,
                        {},
                        { defaultValue: activePeriod.label },
                      ),
                    },
                    {
                      defaultValue: 'Showing {{count}} results for "{{query}}" in last {{period}}',
                    },
                  )}
            </h2>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
              )}
            >
              {t(
                'search.resultCount',
                { count: visible.length },
                { defaultValue: '{{count}} found' },
              )}
            </span>
          </div>

          <div className={cm.flex({ gap: 'xs', wrap: 'wrap', align: 'center' })}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                data-mol-id={`search-period-${p.key}`}
                aria-pressed={period === p.key}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'transition-colors',
                  period === p.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
                )}
              >
                {t(`search.period.${p.key}`, {}, { defaultValue: p.label })}
              </button>
            ))}
          </div>

          {visible.length === 0 && results.length > 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'search.periodEmpty',
                {},
                { defaultValue: 'No matches in this period — widen the window above.' },
              )}
            </p>
          ) : null}

          <TaskList tasks={visible} showProject onToggle={onToggle} />
        </section>
      )}
    </div>
  )
}
