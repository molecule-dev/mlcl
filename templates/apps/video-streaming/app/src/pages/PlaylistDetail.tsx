import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Playlist {
  id: string
  title: string
  description: string
  cover_index: number
  curator_name: string
  curator_handle: string
  visibility: 'public' | 'private' | 'unlisted'
  video_count: number
  total_duration_seconds: number
  updated_at: string
}

const SAMPLE_PLAYLIST: Playlist = {
  id: 'sample',
  title: 'Slow Sundays',
  description:
    'A growing playlist of long-form, calmly-paced videos — documentaries, ambient cooking, walking tours, and quiet creator vlogs. Refreshed once a week, on Sunday mornings.',
  cover_index: 0,
  curator_name: 'You',
  curator_handle: 'me',
  visibility: 'public',
  video_count: 7,
  total_duration_seconds: 18_240,
  updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
}

const SAMPLE_VIDEOS: VideoCardData[] = [
  {
    id: 'pv-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
  },
  {
    id: 'pv-2',
    title: 'Late-night ambient cooking — chickpea three ways',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 2_640,
    view_count: 198_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
  },
  {
    id: 'pv-3',
    title: 'A walking tour of our Brooklyn studio',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    cover_index: 5,
  },
  {
    id: 'pv-4',
    title: 'Why analogue colours look the way they do',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1_140,
    view_count: 86_500,
    published_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    cover_index: 4,
  },
  {
    id: 'pv-5',
    title: 'The last analogue cinema in Lisbon',
    channel_id: 'c-4',
    channel_name: 'Cosmo Reels',
    duration_seconds: 1_812,
    view_count: 87_400,
    published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    cover_index: 3,
  },
  {
    id: 'pv-6',
    title: 'Why this 90s sitcom theme still slaps',
    channel_id: 'c-7',
    channel_name: 'Off-Tempo',
    duration_seconds: 740,
    view_count: 248_000,
    published_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    cover_index: 6,
  },
]

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #c026d3 100%)',
]

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

function fmtVideoDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function PlaylistDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [playlist, setPlaylist] = useState<Playlist>(SAMPLE_PLAYLIST)
  const [videos, setVideos] = useState<VideoCardData[]>(SAMPLE_VIDEOS)
  const [shareCopied, setShareCopied] = useState(false)
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const [pickerOptions, setPickerOptions] = useState<VideoCardData[]>([])
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/playlists/${id}`)
      .then((p) => {
        if (cancelled || !p) return
        const apiP = unwrapSingle<Partial<Playlist> & { videos?: VideoCardData[]; name?: string }>(
          p,
        )
        if (!apiP) return
        // Merge with sample defaults so missing fields (curator_name,
        // visibility, total_duration_seconds, updated_at) don't render
        // as `undefined` / Invalid Date. Map the database `name` column
        // onto the page's `title` field so user-created playlists show
        // their real title (the seed sample uses `title` already).
        const mapped: Partial<Playlist> = { ...apiP }
        if (apiP.name && !apiP.title) {
          mapped.title = apiP.name
        }
        setPlaylist({ ...SAMPLE_PLAYLIST, ...mapped } as Playlist)
        // The handler embeds videos in the playlist response — use them.
        if (Array.isArray(apiP.videos) && apiP.videos.length > 0) {
          setVideos(apiP.videos)
        } else if (Array.isArray(apiP.videos)) {
          // Empty array: user-created playlist with no items yet.
          setVideos([])
        }
      })
      .catch(() => {
        // network error — keep sample fallback
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const heroGradient = COVER_GRADIENTS[playlist.cover_index % COVER_GRADIENTS.length]

  const handleShuffle = () => {
    if (videos.length === 0) return
    const pick = videos[Math.floor(Math.random() * videos.length)]
    if (pick) navigate(`/watch/${pick.id}`)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
    } catch (_error) {
      // Clipboard access is optional; browser may block it — leave UI as-is.
    }
  }

  const openAddPicker = async () => {
    setAddError(null)
    setAddPickerOpen(true)
    if (pickerOptions.length === 0) {
      const res = await http.get('/api/videos').catch(() => null)
      if (res) {
        const list = unwrapList<VideoCardData>(res)
        const inPlaylist = new Set(videos.map((v) => String(v.id)))
        setPickerOptions(list.filter((v) => !inPlaylist.has(String(v.id))).slice(0, 8))
      }
    }
  }

  const handleAddVideo = async (videoId: string) => {
    if (!id || adding) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await http.post(`/api/playlists/${id}/videos`, { video_id: videoId })
      // Optimistic refresh: refetch the playlist so the new row appears.
      const p = await http.get(`/api/playlists/${id}`).catch(() => null)
      if (p) {
        const apiP = unwrapSingle<Partial<Playlist> & { videos?: VideoCardData[] }>(p)
        if (apiP && Array.isArray(apiP.videos)) {
          setVideos(apiP.videos)
        }
      }
      // Drop the picked option so user can add another.
      setPickerOptions((prev) => prev.filter((o) => String(o.id) !== videoId))
      // Acknowledge by closing the picker if list now empty.
      if (pickerOptions.length <= 1) setAddPickerOpen(false)
      void res
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t(
              'playlistDetail.addError',
              {},
              { defaultValue: 'Could not add video — please try again.' },
            ),
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.maxW('7xl'), cm.mxAuto, 'space-y-8')}>
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white shadow-2xl')}
        style={{ background: heroGradient, minHeight: '320px' }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/15 blur-2xl',
          )}
          aria-hidden="true"
        />

        <div
          className={cm.cn(
            'relative z-10 p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center',
          )}
        >
          <div className={cm.cn('lg:col-span-4 flex justify-center lg:justify-start')}>
            <div
              className={cm.cn(
                'w-44 h-44 lg:w-56 lg:h-56 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
              )}
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[120px] text-white/85')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                playlist_play
              </span>
            </div>
          </div>
          <div className={cm.cn('lg:col-span-8')}>
            <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
              <span
                className={cm.cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                {playlist.visibility === 'private'
                  ? t('playlistDetail.privateBadge', {}, { defaultValue: 'Private playlist' })
                  : playlist.visibility === 'unlisted'
                    ? t('playlistDetail.unlistedBadge', {}, { defaultValue: 'Unlisted playlist' })
                    : t('playlistDetail.publicBadge', {}, { defaultValue: 'Public playlist' })}
              </span>
              <span
                className={cm.cn('text-[11px] font-bold uppercase tracking-widest text-white/80')}
              >
                {t(
                  'playlistDetail.curatedBy',
                  { name: playlist.curator_name },
                  { defaultValue: 'Curated by {{name}}' },
                )}
              </span>
            </div>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mt-3',
              )}
            >
              {playlist.title}
            </h1>
            <p
              className={cm.cn(
                'text-sm md:text-base text-white/85 leading-relaxed mt-3 max-w-2xl line-clamp-3',
              )}
            >
              {playlist.description}
            </p>
            <p className={cm.cn('text-[11px] text-white/70 font-medium mt-4 tabular-nums')}>
              {t(
                'playlistDetail.meta',
                {
                  count: playlist.video_count,
                  duration: fmtDuration(playlist.total_duration_seconds),
                },
                { defaultValue: '{{count}} videos · {{duration}} total' },
              )}
            </p>

            <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
              <Link
                to={`/watch/${videos[0]?.id ?? 'sample'}`}
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3.5 mt-5 font-semibold text-[15px] bg-surface text-on-surface rounded-full hover:bg-surface/90 transition-colors shadow-lg shadow-black/10',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
                {t('playlistDetail.playAllCta', {}, { defaultValue: 'Play all' })}
              </Link>
              <button
                type="button"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3.5 mt-5 font-semibold text-[15px] rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
                )}
                onClick={handleShuffle}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  shuffle
                </span>
                {t('playlistDetail.shuffleCta', {}, { defaultValue: 'Shuffle' })}
              </button>
              <button
                type="button"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-3 mt-5 rounded-full border border-surface/30 hover:bg-surface/10 transition-colors',
                )}
                aria-label={t('playlistDetail.shareCta', {}, { defaultValue: 'Share playlist' })}
                onClick={handleShare}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  share
                </span>
                {shareCopied && (
                  <span className={cm.cn('text-xs font-bold')}>
                    {t('common.copiedBang', {}, { defaultValue: 'Copied!' })}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={cm.cn('space-y-3')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t(
              'playlistDetail.videosHeading',
              { count: videos.length },
              { defaultValue: '{{count}} videos' },
            )}
          </h2>
          <span className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'playlistDetail.updatedAt',
              { date: new Date(playlist.updated_at).toLocaleDateString() },
              { defaultValue: 'Updated {{date}}' },
            )}
          </span>
        </div>
        <ul
          className={cm.cn(
            'rounded-2xl bg-surface-container-lowest divide-y divide-outline-variant/40 overflow-hidden',
          )}
        >
          {videos.map((v, i) => {
            const grad = COVER_GRADIENTS[v.cover_index % COVER_GRADIENTS.length]
            return (
              <li key={v.id}>
                <Link
                  to={`/watch/${v.id}`}
                  className={cm.cn(
                    'group flex items-center gap-4 px-4 py-3 hover:bg-surface-container transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      'w-10 text-right shrink-0 font-mono tabular-nums text-xs text-on-surface-variant',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('group-hover:hidden')}>{i + 1}</span>
                    <span
                      className={cm.cn(
                        'hidden group-hover:inline material-symbols-outlined text-base text-on-surface',
                      )}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </span>
                  <div
                    className={cm.cn(
                      'relative w-32 aspect-video rounded-xl shrink-0 flex items-center justify-center overflow-hidden',
                    )}
                    style={{ background: grad }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[28px] text-white/40')}>
                      play_circle
                    </span>
                    <span
                      className={cm.cn(
                        'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-foreground/75 text-white',
                      )}
                    >
                      {fmtVideoDuration(v.duration_seconds)}
                    </span>
                  </div>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p
                      className={cm.cn(
                        'text-sm font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors',
                      )}
                    >
                      {v.title}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant mt-0.5 truncate')}>
                      {v.channel_name}
                    </p>
                    <p className={cm.cn('text-[11px] text-on-surface-variant tabular-nums mt-0.5')}>
                      {t(
                        'common.countViews',
                        { count: fmtViews(v.view_count) },
                        { defaultValue: '{{count}} views' },
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className={cm.cn('space-y-3 pt-2')}>
          <button
            type="button"
            className={cm.cn(
              'inline-flex items-center gap-2 px-6 h-11 rounded-full text-sm font-bold uppercase tracking-widest text-white shadow hover:opacity-90 transition-opacity',
            )}
            style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
            onClick={() => (addPickerOpen ? setAddPickerOpen(false) : void openAddPicker())}
            aria-expanded={addPickerOpen}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              add
            </span>
            {t('playlistDetail.addVideoCta', {}, { defaultValue: 'Add to playlist' })}
          </button>
          {addPickerOpen && (
            <div
              className={cm.cn(
                'rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2 max-w-2xl',
              )}
            >
              <p
                className={cm.cn(
                  'text-xs font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('playlistDetail.pickerHeading', {}, { defaultValue: 'Pick a video to add' })}
              </p>
              {pickerOptions.length === 0 ? (
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'playlistDetail.pickerEmpty',
                    {},
                    {
                      defaultValue:
                        'No more videos available — every published video is already in this playlist.',
                    },
                  )}
                </p>
              ) : (
                <ul className={cm.cn('divide-y divide-outline-variant/40')}>
                  {pickerOptions.map((opt) => (
                    <li key={opt.id} className={cm.cn('flex items-center gap-3 py-2')}>
                      <div className={cm.cn('flex-1 min-w-0')}>
                        <p className={cm.cn('text-sm font-bold tracking-tight line-clamp-1')}>
                          {opt.title}
                        </p>
                        <p className={cm.cn('text-xs text-on-surface-variant truncate')}>
                          {opt.channel_name}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() => void handleAddVideo(String(opt.id))}
                        className={cm.cn(
                          'px-3 h-9 rounded-full text-xs font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50',
                        )}
                      >
                        {adding
                          ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                          : t('common.add', {}, { defaultValue: 'Add' })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {addError && (
                <p className={cm.cn('text-xs text-error')} role="alert">
                  {addError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
