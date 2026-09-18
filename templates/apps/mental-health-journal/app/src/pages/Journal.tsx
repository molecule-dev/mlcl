import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { JournalEntryCard } from '../components/JournalEntryCard.js'
import type { MoodLevel } from '../components/MoodHeroCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface JournalEntry {
  id: string
  date: string
  title: string
  preview: string
  mood: MoodLevel
  tags: string[]
  word_count: number
}

const FILTERS: { key: 'all' | MoodLevel; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'radiant', defaultLabel: 'Radiant' },
  { key: 'good', defaultLabel: 'Good' },
  { key: 'neutral', defaultLabel: 'Neutral' },
  { key: 'low', defaultLabel: 'Low' },
  { key: 'struggling', defaultLabel: 'Struggling' },
]

function groupByMonth(entries: JournalEntry[]): { label: string; items: JournalEntry[] }[] {
  const groups = new Map<string, JournalEntry[]>()
  for (const entry of entries) {
    const date = new Date(entry.date)
    const key = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(entry)
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

export function Journal() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filter, setFilter] = useState<'all' | MoodLevel>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const dateFilter = searchParams.get('date')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/journal/entries')
      .then((res) => {
        if (cancelled) return
        setEntries(unwrapList<JournalEntry>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('journal.loadError', {}, { defaultValue: 'Failed to load entries.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    let result = entries
    if (dateFilter) {
      result = result.filter((e) => e.date.slice(0, 10) === dateFilter)
    }
    if (filter !== 'all') result = result.filter((e) => e.mood === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q) ||
          e.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    return result
  }, [entries, filter, search, dateFilter])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('journal.eyebrow', {}, { defaultValue: 'Your reflections' })}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}
          >
            {t('journal.heading', {}, { defaultValue: 'Journal' })}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'journal.subheading',
              { count: entries.length },
              { defaultValue: '{{count}} entries — every one worth keeping.' },
            )}
          </p>
        </div>
        <Link
          to="/journal/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full text-white shadow-md hover:shadow-lg transition-shadow',
          )}
          style={{
            background:
              'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>edit</span>
          {t('journal.newEntry', {}, { defaultValue: 'New entry' })}
        </Link>
      </header>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
        )}
      >
        <div className="relative">
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'journal.searchPlaceholder',
              {},
              { defaultValue: 'Search a feeling, a name, a moment…' },
            )}
            className={cm.cn(
              cm.sp('py', 3),
              'w-full pl-12 pr-4 text-base font-medium text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
            )}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'rounded-full text-[11px] uppercase tracking-widest transition-all',
                filter === f.key
                  ? 'text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              style={
                filter === f.key
                  ? {
                      background:
                        'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                    }
                  : undefined
              }
            >
              {t(`journal.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('journal.loading', {}, { defaultValue: 'Loading entries…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('p', 16),
            cm.textCenter,
            'text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-5xl" aria-hidden="true">
            menu_book
          </span>
          <p className={cm.cn(cm.sp('mt', 4), cm.fontWeight('semibold'))}>
            {t(
              'journal.empty',
              {},
              {
                defaultValue: 'No reflections match — try a different filter or write a new entry.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-8')}>
          {grouped.map((g) => (
            <section key={g.label} className={cm.cn('space-y-3')}>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  cm.sp('px', 1),
                )}
              >
                {g.label}
              </h3>
              <ul className={cm.cn('space-y-3')}>
                {g.items.map((e) => (
                  <li key={e.id}>
                    <JournalEntryCard
                      id={e.id}
                      date={e.date}
                      title={e.title}
                      preview={e.preview}
                      mood={e.mood}
                      tags={e.tags}
                      wordCount={e.word_count}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
