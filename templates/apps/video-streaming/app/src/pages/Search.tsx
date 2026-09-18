import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type Channel, ChannelStripCard } from '../components/ChannelStripCard.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList } from '../lib/unwrap.js'

function mapVideoRow(r: Record<string, unknown>): VideoCardData {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    channel_id: String(r.channel_id ?? ''),
    channel_name: String(r.channel_name ?? ''),
    duration_seconds:
      typeof r.duration_seconds === 'number'
        ? r.duration_seconds
        : typeof r.duration_sec === 'number'
          ? r.duration_sec
          : 0,
    view_count: typeof r.view_count === 'number' ? r.view_count : 0,
    published_at: String(r.published_at ?? r.created_at ?? new Date().toISOString()),
    cover_index: typeof r.cover_index === 'number' ? r.cover_index : 0,
    live: !!r.live,
    thumbnail_url: (r.thumbnail_url as string | null | undefined) ?? null,
  }
}

function mapChannelRow(r: Record<string, unknown>): Channel {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    handle: String(r.handle ?? ''),
    subscriber_count: typeof r.subscriber_count === 'number' ? r.subscriber_count : 0,
    video_count: typeof r.video_count === 'number' ? r.video_count : 0,
    avatar_index: typeof r.avatar_index === 'number' ? r.avatar_index : 0,
    subscribed: !!r.subscribed,
    description: String(r.bio ?? r.description ?? ''),
  }
}

const SAMPLE_VIDEOS: VideoCardData[] = [
  {
    id: 'sv-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
  },
  {
    id: 'sv-2',
    title: 'I built a 1M-viewer channel from a closet',
    channel_id: 'c-2',
    channel_name: 'Lina Reyes',
    duration_seconds: 924,
    view_count: 312_000,
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    cover_index: 1,
  },
  {
    id: 'sv-3',
    title: 'Live: building a synth in 60 minutes',
    channel_id: 'c-5',
    channel_name: 'Resonant Labs',
    duration_seconds: 3_600,
    view_count: 12_400,
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    cover_index: 4,
    live: true,
  },
  {
    id: 'sv-4',
    title: 'Every camera lens explained in 8 minutes',
    channel_id: 'c-6',
    channel_name: 'Aperture Daily',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 5,
  },
]

const SAMPLE_CHANNELS: Channel[] = [
  {
    id: 'c-1',
    name: 'Northern Field Studio',
    handle: 'northernfield',
    subscriber_count: 482_000,
    video_count: 124,
    avatar_index: 0,
    subscribed: true,
    description: 'Quiet documentary work from a small Brooklyn studio.',
  },
  {
    id: 'c-2',
    name: 'Lina Reyes',
    handle: 'linareyes',
    subscriber_count: 1_200_000,
    video_count: 318,
    avatar_index: 1,
    subscribed: false,
    description: 'Solo creator behind one of YouTube\u2019s coziest bedroom-studio channels.',
  },
]

const FILTERS = ['all', 'videos', 'channels', 'live'] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  videos: 'Videos',
  channels: 'Channels',
  live: 'Live',
}

const RECENT = [
  'photography',
  'analogue film',
  'live coding',
  'home studio',
  'baking sourdough',
] as const

export function Search() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [videos, setVideos] = useState<VideoCardData[]>(SAMPLE_VIDEOS)
  const [channels, setChannels] = useState<Channel[]>(SAMPLE_CHANNELS)

  // Initial fetch — populate Videos/Channels for the empty-query view from
  // the same API the watch-page uses.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/videos?limit=24').catch(() => null),
      http.get('/api/channels').catch(() => null),
    ]).then(([v, c]) => {
      if (cancelled) return
      if (v) {
        const apiV = unwrapList<Record<string, unknown>>(v).map(mapVideoRow)
        if (apiV.length > 0) setVideos(apiV)
      }
      if (c) {
        const apiC = unwrapList<Record<string, unknown>>(c).map(mapChannelRow)
        if (apiC.length > 0) setChannels(apiC)
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  // Server-side search — debounced; falls back to client-side filtering
  // if the call fails. Uses the dedicated /api/videos/search?q= endpoint
  // which has an ILIKE fallback when the search bond isn't reachable.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q) return
    debounceRef.current = setTimeout(() => {
      http
        .get(`/api/videos/search?q=${encodeURIComponent(q)}&limit=24`)
        .then((res) => {
          // When the search bond serves the query, /api/videos/search returns
          // the normalized @molecule/api-search SearchResult
          // ({ hits: [{ id, document }], … }) — unwrapList() on that shape
          // silently yields [] and server results were dropped. Map hits back
          // to video rows; the ILIKE fallback path still returns a plain list.
          const body = (res as { data?: unknown })?.data ?? res
          const hits = (body as { hits?: Array<{ id: string; document: Record<string, unknown> }> })
            ?.hits
          const rows = hits
            ? hits.map((hit) => ({ id: hit.id, ...hit.document }))
            : unwrapList<Record<string, unknown>>(res)
          const list = rows.map(mapVideoRow)
          if (list.length > 0) setVideos(list)
        })
        .catch(() => {
          /* keep prior list */
        })
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [http, query])

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter(
      (v) => v.title.toLowerCase().includes(q) || v.channel_name.toLowerCase().includes(q),
    )
  }, [videos, query])

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return channels
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q),
    )
  }, [channels, query])

  const showVideos = filter === 'all' || filter === 'videos' || filter === 'live'
  const showChannels = filter === 'all' || filter === 'channels'
  const liveVideos = filteredVideos.filter((v) => v.live)
  const visibleVideos = filter === 'live' ? liveVideos : filteredVideos

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header className={cm.cn('space-y-3')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('search.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} search' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('search.heading', {}, { defaultValue: 'Find the video you\u2019re after' })}
        </h1>
        <div className={cm.cn('relative max-w-2xl')}>
          <span
            className={cm.cn(
              'absolute inset-y-0 left-4 flex items-center text-on-surface-variant material-symbols-outlined',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'search.placeholder',
              { appName: APP_NAME },
              { defaultValue: 'Search videos, channels, or topics' },
            )}
            className={cm.cn(
              'w-full pl-12 pr-4 h-12 text-base bg-surface-container-lowest border border-outline-variant rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            )}
          />
        </div>

        <nav
          aria-label={t('search.filterLabel', {}, { defaultValue: 'Filter results' })}
          className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
        >
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cm.cn(
                  'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
                )}
                aria-pressed={active}
              >
                {t(`search.filter.${f}`, {}, { defaultValue: FILTER_LABEL[f] })}
              </button>
            )
          })}
        </nav>
      </header>

      {!query.trim() && (
        <section className={cm.cn('space-y-3')}>
          <h2
            className={cm.cn(
              'text-sm font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('search.recentHeading', {}, { defaultValue: 'Recent searches' })}
          </h2>
          <div className={cm.flex({ gap: 'xs', wrap: 'wrap' })}>
            {RECENT.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setQuery(r)}
                className={cm.cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[14px] text-on-surface-variant')}
                  aria-hidden="true"
                >
                  history
                </span>
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {showChannels && filteredChannels.length > 0 && (
        <section className={cm.cn('space-y-3')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t(
              'search.channelsHeading',
              { count: filteredChannels.length },
              { defaultValue: 'Channels ({{count}})' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-2')}>
            {filteredChannels.map((c) => (
              <ChannelStripCard key={c.id} channel={c} />
            ))}
          </div>
        </section>
      )}

      {showVideos && (
        <section className={cm.cn('space-y-3')}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {filter === 'live'
              ? t(
                  'search.liveHeading',
                  { count: visibleVideos.length },
                  { defaultValue: 'Live now ({{count}})' },
                )
              : t(
                  'search.videosHeading',
                  { count: visibleVideos.length },
                  { defaultValue: 'Videos ({{count}})' },
                )}
          </h2>
          <VideoGrid
            videos={visibleVideos}
            emptyMessage={t(
              'search.empty',
              {},
              { defaultValue: 'No matches yet — try a broader query.' },
            )}
          />
        </section>
      )}
    </div>
  )
}
