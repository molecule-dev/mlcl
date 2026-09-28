import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

// Re-export under a local name so the closure inside useEffect can call it
// without unused-import lint warnings when the project ships with strict
// rules.
const unwrapSingleLocal = unwrapSingle

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  video_count: number
  visibility: 'public' | 'private' | 'unlisted'
  updated_at: string
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%)',
]

const SAMPLE_HISTORY: VideoCardData[] = [
  {
    id: 'h-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
    watch_progress_seconds: 700,
  },
  {
    id: 'h-2',
    title: 'Inside an indie 4K transfer studio',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 740,
    view_count: 180_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
    watch_progress_seconds: 720,
  },
  {
    id: 'h-3',
    title: 'Every camera lens explained in 8 minutes',
    channel_id: 'c-6',
    channel_name: 'Aperture Daily',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 5,
  },
  {
    id: 'h-4',
    title: 'I built a 1M-viewer channel from a closet',
    channel_id: 'c-2',
    channel_name: 'Lina Reyes',
    duration_seconds: 924,
    view_count: 312_000,
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    cover_index: 1,
    watch_progress_seconds: 924,
  },
]

const SAMPLE_LIKED: VideoCardData[] = [
  {
    id: 'l-1',
    title: 'A walking tour of our Brooklyn studio',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    cover_index: 5,
  },
  {
    id: 'l-2',
    title: 'Late-night ambient cooking — chickpea three ways',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 2_640,
    view_count: 198_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
  },
]

const SAMPLE_PLAYLISTS: Playlist[] = [
  {
    id: 'p-1',
    title: 'Watch later',
    description: 'My queue of long-form documentaries.',
    cover_index: 0,
    video_count: 18,
    visibility: 'private',
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'p-2',
    title: 'Slow Sundays',
    description: 'Calm cooking, gentle interviews, ambient field recordings.',
    cover_index: 2,
    video_count: 7,
    visibility: 'public',
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'p-3',
    title: 'Studio inspirations',
    description: 'Indie creators with bedroom-studio energy.',
    cover_index: 1,
    video_count: 23,
    visibility: 'unlisted',
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'p-4',
    title: '90s sitcom essays',
    description: 'Why so many of these themes still slap.',
    cover_index: 5,
    video_count: 12,
    visibility: 'public',
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
]

const TABS = ['history', 'watchLater', 'liked', 'playlists'] as const
type Tab = (typeof TABS)[number]

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [history, setHistory] = useState<VideoCardData[]>(SAMPLE_HISTORY)
  const [liked] = useState<VideoCardData[]>(SAMPLE_LIKED)
  const [playlists, setPlaylists] = useState<Playlist[]>(SAMPLE_PLAYLISTS)
  const [tab, setTab] = useState<Tab>('history')

  const [watchLater, setWatchLater] = useState<VideoCardData[]>([])

  useEffect(() => {
    let cancelled = false
    // Map a video row → VideoCardData. Used for both /api/videos lookups
    // (when we already have the row) and the in-flight join below where we
    // attach `watch_progress_seconds` from /api/library/history.
    const mapRow = (r: Record<string, unknown>, progress?: number): VideoCardData => ({
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
      watch_progress_seconds: progress,
    })

    const loadList = async (libUrl: string, videoIdField: 'video_id'): Promise<VideoCardData[]> => {
      const res = await http.get(libUrl).catch(() => null)
      if (!res) return []
      const rows = unwrapList<Record<string, unknown>>(res.data)
      if (rows.length === 0) return []
      const ids = Array.from(new Set(rows.map((r) => String(r[videoIdField])).filter(Boolean)))
      const videoRows = await Promise.all(
        ids.map((id) => http.get(`/api/videos/${id}`).catch(() => null)),
      )
      const idToVideo = new Map<string, Record<string, unknown>>()
      for (let i = 0; i < ids.length; i++) {
        const v = videoRows[i]
        if (!v) continue
        const single = unwrapSingleLocal<Record<string, unknown>>(v.data)
        if (single) idToVideo.set(ids[i], single)
      }
      return rows
        .map((r) => {
          const id = String(r[videoIdField])
          const v = idToVideo.get(id)
          if (!v) return null
          const progress = typeof r.position_sec === 'number' ? r.position_sec : undefined
          return mapRow(v, progress)
        })
        .filter((x): x is VideoCardData => x !== null)
    }

    Promise.all([
      loadList('/api/library/history', 'video_id'),
      loadList('/api/library/later', 'video_id'),
      http.get('/api/playlists').catch(() => null),
    ]).then(([h, l, p]) => {
      if (cancelled) return
      if (h.length > 0) setHistory(h)
      if (l.length > 0) setWatchLater(l)
      if (p) {
        const apiP = unwrapList<Playlist>(p)
        if (apiP.length > 0) setPlaylists(apiP)
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const summary = useMemo(
    () => [
      {
        key: 'history',
        label: t('library.summary.history', {}, { defaultValue: 'Watched' }),
        value: history.length,
      },
      {
        key: 'watchLater',
        label: t('library.summary.watchLater', {}, { defaultValue: 'Watch later' }),
        value: watchLater.length,
      },
      {
        key: 'liked',
        label: t('library.summary.liked', {}, { defaultValue: 'Liked' }),
        value: liked.length,
      },
      {
        key: 'playlists',
        label: t('library.summary.playlists', {}, { defaultValue: 'Playlists' }),
        value: playlists.length,
      },
    ],
    [history.length, watchLater.length, liked.length, playlists.length, t],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('library.eyebrow', {}, { defaultValue: 'Watched · saved · liked' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'library.subheading',
            {},
            {
              defaultValue:
                'Pick up where you left off, revisit your likes, or curate playlists for later.',
            },
          )}
        </p>
      </header>

      <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        {summary.map((s) => (
          <li
            key={s.key}
            className={cm.cn(
              cm.accentCard({ tone: 'custom' }),
              'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            )}
            style={{ ['--mol-accent' as string]: BRAND_COLOR }}
          >
            <p className={cm.accentCardLabel({ tone: 'custom' })}>{s.label}</p>
            <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
              {s.value}
            </p>
          </li>
        ))}
      </ul>

      <Link
        to="/library?filter=liked"
        onClick={(e) => {
          e.preventDefault()
          setTab('liked')
        }}
        className={cm.cn(
          'relative block overflow-hidden rounded-[2rem] text-white p-7 shadow-md hover:shadow-2xl hover:shadow-rose-500/20 transition-all hover:-translate-y-0.5',
        )}
        style={{ background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${ACCENT_COLOR} 100%)` }}
      >
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 flex items-center gap-5')}>
          <div
            className={cm.cn('w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg')}
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined text-[36px] text-white')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              thumb_up
            </span>
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {t('library.likedEyebrow', {}, { defaultValue: 'Auto-curated playlist' })}
            </p>
            <h2
              className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight leading-tight')}
            >
              {t('library.likedTitle', {}, { defaultValue: 'Liked videos' })}
            </h2>
            <p className={cm.cn('text-sm text-white/80 mt-1')}>
              {t(
                'library.likedSubtitle',
                { count: liked.length },
                { defaultValue: '{{count}} liked videos · grows as you tap the thumb' },
              )}
            </p>
          </div>
          <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
            arrow_forward
          </span>
        </div>
      </Link>

      <nav
        aria-label={t('library.tabsLabel', {}, { defaultValue: 'Library tabs' })}
        className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
      >
        {TABS.map((s) => {
          const active = tab === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cm.cn(
                'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
              )}
              aria-pressed={active}
            >
              {t(`library.tab.${s}`, {}, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) })}
            </button>
          )
        })}
      </nav>

      {tab === 'history' && (
        <VideoGrid
          videos={history}
          emptyMessage={t('library.emptyHistory', {}, { defaultValue: 'No watch history yet.' })}
        />
      )}
      {tab === 'watchLater' && (
        <VideoGrid
          videos={watchLater}
          emptyMessage={t(
            'library.emptyWatchLater',
            {},
            { defaultValue: 'Nothing saved for later yet.' },
          )}
        />
      )}
      {tab === 'liked' && (
        <VideoGrid
          videos={liked}
          emptyMessage={t('library.emptyLiked', {}, { defaultValue: 'No liked videos yet.' })}
        />
      )}
      {tab === 'playlists' && (
        <ul
          className={cm.cn(
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {playlists.map((p) => {
            const grad = COVER_GRADIENTS[p.cover_index % COVER_GRADIENTS.length]
            return (
              <li key={p.id}>
                <Link to={`/playlist/${p.id}`} className={cm.cn('group block')}>
                  <div
                    className={cm.cn(
                      'aspect-video rounded-2xl shadow-md group-hover:shadow-2xl group-hover:shadow-on-surface/15 transition-all overflow-hidden flex items-center justify-center relative',
                    )}
                    style={{ background: grad }}
                    aria-hidden="true"
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[64px] text-white/35 group-hover:scale-110 transition-transform',
                      )}
                    >
                      playlist_play
                    </span>
                    <span
                      className={cm.cn(
                        'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-foreground/60 backdrop-blur-md text-white',
                      )}
                    >
                      {t(
                        'library.playlistVideoCount',
                        { count: p.video_count },
                        { defaultValue: '{{count}} videos' },
                      )}
                    </span>
                  </div>
                  <div className={cm.cn('mt-3')}>
                    <p
                      className={cm.cn(
                        'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {p.visibility === 'private'
                        ? t('library.playlistPrivate', {}, { defaultValue: 'Private' })
                        : p.visibility === 'unlisted'
                          ? t('library.playlistUnlisted', {}, { defaultValue: 'Unlisted' })
                          : t('library.playlistPublic', {}, { defaultValue: 'Public' })}
                    </p>
                    <h3
                      className={cm.cn(
                        'text-base font-extrabold tracking-tight line-clamp-1 mt-0.5 group-hover:text-primary transition-colors',
                      )}
                    >
                      {p.title}
                    </h3>
                    <p
                      className={cm.cn(
                        'text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed',
                      )}
                    >
                      {p.description}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
