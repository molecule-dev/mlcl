import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface SearchResult {
  meeting_id: string
  meeting_title: string
  recorded_at: string
  speaker: string
  ts: string
  text: string
}

const FILTERS = ['all', 'last7d', 'last30d', 'mentions'] as const
type FilterKey = (typeof FILTERS)[number]

const FILTER_DEFAULT_LABEL: Record<FilterKey, string> = {
  all: 'All time',
  last7d: 'Last 7 days',
  last30d: 'Last 30 days',
  mentions: 'Mentions me',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function highlight(text: string, query: string): { parts: { text: string; match: boolean }[] } {
  if (!query.trim()) return { parts: [{ text, match: false }] }
  const q = query.trim()
  const lower = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let idx = 0
  while (idx < text.length) {
    const next = lower.indexOf(lowerQ, idx)
    if (next === -1) {
      parts.push({ text: text.slice(idx), match: false })
      break
    }
    if (next > idx) parts.push({ text: text.slice(idx, next), match: false })
    parts.push({ text: text.slice(next, next + q.length), match: true })
    idx = next + q.length
  }
  return { parts }
}

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const url = `/api/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`
    http
      .get(url)
      .then((res) => {
        if (!cancelled) setResults(unwrapList<SearchResult>(res))
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, query, filter])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    return results.filter(
      (r) =>
        r.text.toLowerCase().includes(query.toLowerCase().trim()) ||
        r.speaker.toLowerCase().includes(query.toLowerCase().trim()) ||
        r.meeting_title.toLowerCase().includes(query.toLowerCase().trim()),
    )
  }, [results, query])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </h1>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-3')}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'search.placeholder',
            {},
            { defaultValue: 'Search transcripts, speakers, decisions…' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('base'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
        <div className={cm.flex({ gap: 'sm' })}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                filter === f
                  ? cm.cn('bg-primary text-on-primary')
                  : cm.cn(
                      'bg-surface-container',
                      'text-on-surface-variant',
                      'hover:bg-surface-container-high',
                    ),
              )}
            >
              {t(`search.filter.${f}`, {}, { defaultValue: FILTER_DEFAULT_LABEL[f] })}
            </button>
          ))}
        </div>
      </div>

      {!query.trim() ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.empty', {}, { defaultValue: 'Type to search transcripts.' })}
        </p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('search.noResults', { q: query }, { defaultValue: 'No results for “{{q}}”.' })}
        </p>
      ) : (
        <ul className={'space-y-3'}>
          {filtered.map((r, i) => {
            const { parts } = highlight(r.text, query)
            return (
              <li
                key={`${r.meeting_id}-${i}`}
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}
              >
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span>
                    <Link
                      to={`/meetings/${r.meeting_id}`}
                      className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                    >
                      {r.meeting_title}
                    </Link>{' '}
                    · {r.speaker} · {r.ts}
                  </span>
                  <span>{fmtDate(r.recorded_at)}</span>
                </header>
                <p
                  className={cm.cn(cm.textSize('sm'))}
                  style={{ fontFamily: 'var(--mol-font-serif)' }}
                >
                  {parts.map((p, j) =>
                    p.match ? (
                      <mark
                        key={j}
                        className={cm.cn(
                          'bg-primary-container',
                          cm.textPrimary,
                          cm.fontWeight('semibold'),
                          'rounded px-1',
                        )}
                      >
                        {p.text}
                      </mark>
                    ) : (
                      <span key={j}>{p.text}</span>
                    ),
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
