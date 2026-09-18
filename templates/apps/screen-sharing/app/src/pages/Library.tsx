import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LibraryStatsHero } from '../components/LibraryStatsHero.js'
import type { RecordingCardData } from '../components/RecordingCard.js'
import { RecordingCard } from '../components/RecordingCard.js'

interface RecordingRow {
  id: string
  title: string
  thumbnail_url?: string | null
  duration_ms?: number | null
  view_count?: number | null
  visibility?: 'private' | 'workspace' | 'public' | 'password'
  status?: string | null
  author_name?: string | null
  created_at?: string | null
  poster_emoji?: string | null
}

const FILTERS: { id: 'all' | 'mine' | 'workspace' | 'public'; label: string }[] = [
  { id: 'all', label: 'All recordings' },
  { id: 'mine', label: 'Private only' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'public', label: 'Public' },
]

function unwrapList(payload: unknown): RecordingRow[] {
  if (Array.isArray(payload)) return payload as RecordingRow[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as RecordingRow[]
  }
  return []
}

function toCardVisibility(v?: string | null): 'public' | 'team' | 'private' {
  if (v === 'public') return 'public'
  if (v === 'workspace') return 'team'
  return 'private'
}

function toCardStatus(s?: string | null): 'ready' | 'processing' | 'live' {
  if (s === 'processing') return 'processing'
  if (s === 'live') return 'live'
  return 'ready'
}

function rowToCard(r: RecordingRow): RecordingCardData {
  return {
    id: r.id,
    title: r.title || 'Untitled recording',
    thumbnail_url: r.thumbnail_url ?? null,
    duration_seconds: Math.round((r.duration_ms ?? 0) / 1000),
    view_count: r.view_count ?? 0,
    visibility: toCardVisibility(r.visibility),
    status: toCardStatus(r.status),
    author_name: r.author_name ?? undefined,
    created_at: r.created_at ?? undefined,
    posterEmoji: r.poster_emoji ?? '🎬',
  }
}

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [recordings, setRecordings] = useState<RecordingRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'workspace' | 'public'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/recordings')
      .then((res) => {
        if (cancelled) return
        setRecordings(unwrapList(res?.data))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('library.error.load', {}, { defaultValue: 'Failed to load recordings.' }))
        setRecordings([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const cards = useMemo(() => recordings.map(rowToCard), [recordings])

  const filtered = useMemo(() => {
    return cards.filter((rec) => {
      if (filter === 'mine' && rec.visibility !== 'private') return false
      if (filter === 'workspace' && rec.visibility !== 'team') return false
      if (filter === 'public' && rec.visibility !== 'public') return false
      if (!search.trim()) return true
      return rec.title.toLowerCase().includes(search.toLowerCase())
    })
  }, [cards, filter, search])

  const totalViews = useMemo(() => cards.reduce((sum, r) => sum + (r.view_count ?? 0), 0), [cards])

  return (
    <div data-mol-id="library-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <LibraryStatsHero
        totalRecordings={cards.length}
        totalViews={totalViews}
        averageWatchPercent={0}
        trend7d={[0, 0, 0, 0, 0, 0, 0]}
        weeklyChangePercent={0}
      />

      <section
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              data-mol-id={`library-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-full transition-colors',
                filter === f.id
                  ? 'text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/20'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {t(`library.filter.${f.id}`, {}, { defaultValue: f.label })}
            </button>
          ))}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-full border border-outline-variant bg-surface-container-lowest min-w-[280px]',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-on-surface-variant')}>search</span>
          <input
            type="search"
            data-mol-id="library-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('library.search.aria', {}, { defaultValue: 'Search recordings' })}
            placeholder={t('library.searchPlaceholder', {}, { defaultValue: 'Search recordings…' })}
            className={cm.cn(
              cm.flex1,
              cm.textSize('sm'),
              'bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
          />
          <Link
            to="/record"
            data-mol-id="library-new-recording"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] hover:opacity-90',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>add</span>
            {t('status.new', {}, { defaultValue: 'New' })}
          </Link>
        </div>
      </section>

      {error ? (
        <div
          data-mol-id="library-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'rounded-2xl border border-error/30 bg-error/5 text-error',
          )}
        >
          {error}
        </div>
      ) : loading ? (
        <div
          data-mol-id="library-loading"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={cm.cn('h-64 rounded-2xl bg-surface-container-lowest animate-pulse')}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="library-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            cm.stack(3),
            'rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
          >
            videocam_off
          </span>
          <h3 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {cards.length === 0
              ? t('library.empty.title', {}, { defaultValue: 'No recordings yet' })
              : t(
                  'library.empty.filtered',
                  {},
                  { defaultValue: 'No recordings match this filter' },
                )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-sm mx-auto')}>
            {t(
              'library.empty.body',
              {},
              {
                defaultValue:
                  'Capture your first walkthrough — your team will love that there is no calendar invite.',
              },
            )}
          </p>
          <Link
            to="/record"
            data-mol-id="library-empty-cta"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'inline-block mx-auto rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
            )}
          >
            {t('library.empty.cta', {}, { defaultValue: 'Record your first clip' })}
          </Link>
        </div>
      ) : (
        <div
          data-mol-id="library-grid"
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}
        >
          {filtered.map((rec) => (
            <RecordingCard key={rec.id} recording={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
