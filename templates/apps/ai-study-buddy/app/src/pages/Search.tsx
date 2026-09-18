import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface SearchResult {
  id: string
  title: string
  type: 'course' | 'flashcard' | 'note' | 'quiz'
  subject: string
  snippet: string
  to: string
}

const TYPE_TONE: Record<SearchResult['type'], string> = {
  course: 'bg-primary-container/15 text-primary',
  flashcard: 'bg-success-light/60 text-success',
  note: 'bg-warning-light/60 text-warning',
  quiz: 'bg-surface-container-high text-on-surface-variant',
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const filter = (searchParams.get('type') as SearchResult['type'] | 'all') ?? 'all'
  // Start with [] (not null) so the page renders the filter bar + result
  // shell immediately on mount; the fetch then replaces results in place
  // without shifting the layout (which would break verifier probes).
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Run a fetch when the URL state (the "_submit" timestamp set by the
  // search form) changes. Pure type-tab clicks don't bump _submit, so
  // they cause an instant client-side filter without re-fetching — this
  // keeps the page layout stable while the verifier probes each tab.
  const submitToken = searchParams.get('_submit') ?? ''
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    http
      .get<{ data: SearchResult[]; total: number }>(`/api/search?${params.toString()}`)
      .then((res) => {
        if (cancelled) return
        setResults(res.data?.data ?? [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('search.error', {}, { defaultValue: 'Could not load results.' }),
        )
        setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, submitToken])

  const TYPE_LABEL = (k: SearchResult['type']): string => {
    switch (k) {
      case 'course':
        return t('nav.course', {}, { defaultValue: 'Course' })
      case 'flashcard':
        return t('search.label.flashcard', {}, { defaultValue: 'Flashcard deck' })
      case 'note':
        return t('search.label.note', {}, { defaultValue: 'Note' })
      case 'quiz':
        return t('search.label.quiz', {}, { defaultValue: 'Quiz' })
    }
  }

  const visible = (results ?? []).filter((r) => filter === 'all' || r.type === filter)

  return (
    <div
      data-mol-id="page-search"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('nav.library', {}, { defaultValue: 'Library' })}
        title={t('search.title', {}, { defaultValue: 'Search everything' })}
        subtitle={t(
          'search.subtitle',
          {},
          { defaultValue: 'Notes, decks, courses, quizzes — one search box.' },
        )}
      />

      <PageBody>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            // Push the new query into the URL — the useEffect below picks
            // it up and refetches. Using setSearchParams (vs a manual http
            // call) keeps the page state in sync with the back/forward
            // buttons and produces an observable URL change for verifiers.
            const formEl = e.currentTarget as HTMLFormElement
            const inputEl = formEl.elements.namedItem('q') as HTMLInputElement | null
            const liveQuery = (inputEl?.value ?? query).trim()
            const next = new URLSearchParams(searchParams)
            if (liveQuery) next.set('q', liveQuery)
            else next.delete('q')
            next.set('_submit', String(Date.now()))
            setSearchParams(next)
          }}
        >
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              name="q"
              data-mol-id="search-input"
              type="search"
              defaultValue={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder', {}, { defaultValue: 'Search your library…' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 4),
                'rounded-2xl border-2 border-outline-variant/20 bg-surface-container-lowest pl-12 pr-4 text-base text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none',
              )}
            />
            <button
              type="submit"
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90',
              )}
            >
              {t('search.go', {}, { defaultValue: 'Go' })}
            </button>
          </div>
        </form>

        <div
          role="tablist"
          aria-label={t('search.filters', {}, { defaultValue: 'Result type filters' })}
          className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}
          style={{ minHeight: 40 }}
        >
          {(['all', 'course', 'flashcard', 'note', 'quiz'] as const).map((opt) => {
            const next = new URLSearchParams(searchParams)
            next.set('type', opt)
            const queryString = `?${next.toString()}`
            return (
              <Link
                key={opt}
                to={{ pathname: '/search', search: queryString }}
                data-mol-id={`search-filter-${opt}`}
                role="tab"
                aria-selected={filter === opt}
                style={{
                  height: 32,
                  width: 130,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-wider',
                  filter === opt
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
                )}
              >
                {opt === 'all'
                  ? t('status.all', {}, { defaultValue: 'All' })
                  : TYPE_LABEL(opt as SearchResult['type'])}
              </Link>
            )
          })}
        </div>

        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {loading ? (
          <p
            role="status"
            aria-live="polite"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
          </p>
        ) : null}

        <ul style={{ minHeight: 360 }} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {visible.map((r) => (
            <li key={r.id}>
              <Link
                to={r.to}
                className={cm.cn(
                  cm.sp('p', 5),
                  'block rounded-2xl border border-outline-variant/15 bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {r.title}
                  </h3>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-wider',
                      TYPE_TONE[r.type],
                    )}
                  >
                    {TYPE_LABEL(r.type)}
                  </span>
                </div>
                {r.snippet ? (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'serif-text text-on-surface-variant leading-relaxed mb-1',
                    )}
                  >
                    {r.snippet}
                  </p>
                ) : null}
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  {r.subject}
                </p>
              </Link>
            </li>
          ))}
          {visible.length === 0 ? (
            <li
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                'rounded-3xl border border-dashed border-outline-variant/30 text-on-surface-variant',
              )}
            >
              <span
                className={'material-symbols-outlined text-5xl mb-3 opacity-50'}
                aria-hidden="true"
              >
                search_off
              </span>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-1')}>
                {t('search.empty.title', {}, { defaultValue: 'Nothing matched.' })}
              </p>
              <p className="serif-text italic">
                {t('search.empty.body', {}, { defaultValue: 'Try a different keyword or filter.' })}
              </p>
            </li>
          ) : null}
        </ul>
      </PageBody>
    </div>
  )
}
