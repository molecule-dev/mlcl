import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ChannelData {
  id: string
  name: string
  handle: string
  subscriber_count: number
  video_count: number
  total_views: number
  description: string
  joined_at: string
  banner_index: number
  avatar_index: number
  subscribed: boolean
}

const SAMPLE_CHANNEL: ChannelData = {
  id: 'sample',
  name: 'Northern Field Studio',
  handle: 'northernfield',
  subscriber_count: 482_000,
  video_count: 124,
  total_views: 38_400_000,
  description:
    'Quiet documentary work from a small Brooklyn studio. We restore archival material, shoot field recordings, and occasionally release a feature.',
  joined_at: '2019-03-12',
  banner_index: 0,
  avatar_index: 0,
  subscribed: true,
}

const SAMPLE_VIDEOS: VideoCardData[] = [
  {
    id: 'cv-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
  },
  {
    id: 'cv-2',
    title: 'Inside an indie 4K transfer studio',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 740,
    view_count: 180_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 2,
  },
  {
    id: 'cv-3',
    title: 'Finding lost reels in a basement archive',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 924,
    view_count: 312_000,
    published_at: new Date(Date.now() - 24 * 86400000).toISOString(),
    cover_index: 1,
  },
  {
    id: 'cv-4',
    title: 'Restoring a 16mm print frame by frame',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 2_640,
    view_count: 198_000,
    published_at: new Date(Date.now() - 48 * 86400000).toISOString(),
    cover_index: 3,
  },
  {
    id: 'cv-5',
    title: 'Why analogue colours look the way they do',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1_140,
    view_count: 86_500,
    published_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    cover_index: 4,
  },
  {
    id: 'cv-6',
    title: 'A walking tour of our Brooklyn studio',
    channel_id: 'sample',
    channel_name: 'Northern Field Studio',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    cover_index: 5,
  },
]

const TABS = ['videos', 'shorts', 'playlists', 'live', 'about'] as const
type Tab = (typeof TABS)[number]

const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #4c1d95 40%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 50%, #1e1b4b 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 50%, #064e3b 100%)',
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
]

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function Channel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [channel, setChannel] = useState<ChannelData>(SAMPLE_CHANNEL)
  const [videos, setVideos] = useState<VideoCardData[]>(SAMPLE_VIDEOS)
  const [tab, setTab] = useState<Tab>('videos')
  const [subscribed, setSubscribed] = useState(false)
  const [followId, setFollowId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get(`/api/channels/${id}`).catch(() => null),
      http.get(`/api/videos?channel_id=${id}`).catch(() => null),
      http.get('/api/follows').catch(() => null),
    ]).then(([c, v, follows]) => {
      if (cancelled) return
      const apiChannel = c ? unwrapSingle<Record<string, unknown>>(c) : null
      if (apiChannel) {
        const channelName = String(apiChannel.name ?? SAMPLE_CHANNEL.name)
        // Map snake_case columns into the camelCase the page reads.
        // The DB returns `bio` for description and `created_at` for the
        // join date — without this projection the about-tab renders
        // blank fields and the joined-year shows "1970".
        setChannel({
          id: String(apiChannel.id ?? id),
          name: channelName,
          handle: String(apiChannel.handle ?? ''),
          subscriber_count:
            typeof apiChannel.subscriber_count === 'number' ? apiChannel.subscriber_count : 0,
          video_count: Array.isArray(apiChannel.videos) ? apiChannel.videos.length : 0,
          total_views: typeof apiChannel.total_views === 'number' ? apiChannel.total_views : 0,
          description: String(apiChannel.bio ?? apiChannel.description ?? ''),
          joined_at: String(
            apiChannel.created_at ?? apiChannel.createdAt ?? new Date().toISOString(),
          ),
          banner_index: 0,
          avatar_index: 0,
          subscribed: false,
        })
      }
      if (v) {
        const list = unwrapList<Record<string, unknown>>(v)
        if (list.length > 0) {
          const channelName = apiChannel ? String(apiChannel.name ?? '') : ''
          setVideos(
            list.map((r) => ({
              id: String(r.id),
              title: String(r.title ?? ''),
              channel_id: String(r.channel_id ?? ''),
              channel_name: String(r.channel_name ?? channelName ?? ''),
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
            })),
          )
        }
      }
      if (follows) {
        const followRows = unwrapList<Record<string, unknown>>(follows)
        const f = followRows.find((r) => String(r.channel_id ?? r.targetId) === id)
        if (f) {
          setSubscribed(true)
          setFollowId(String(f.id ?? ''))
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const handleSubscribe = async () => {
    if (!id) return
    if (subscribed && followId) {
      try {
        await http.delete(`/api/follows/${followId}`)
        track({ name: 'channel.unsubscribed', properties: { channelId: id } })
        setSubscribed(false)
        setFollowId(null)
        setChannel((prev) => ({
          ...prev,
          subscriber_count: Math.max(0, prev.subscriber_count - 1),
        }))
      } catch (_error) {
        // Unsubscribe is best-effort; UI already reflects optimistic state — leave as-is.
      }
      return
    }
    try {
      const res = await http.post('/api/follows', { channel_id: id })
      const row = unwrapSingle<Record<string, unknown>>(res) ?? {}
      track({ name: 'channel.subscribed', properties: { channelId: id } })
      setSubscribed(true)
      setFollowId(String(row.id ?? ''))
      setChannel((prev) => ({ ...prev, subscriber_count: prev.subscriber_count + 1 }))
    } catch (_error) {
      // Subscribe is best-effort; leave UI as-is on failure.
    }
  }

  const bannerGradient = BANNER_GRADIENTS[channel.banner_index % BANNER_GRADIENTS.length]
  const avatarGradient = AVATAR_GRADIENTS[channel.avatar_index % AVATAR_GRADIENTS.length]

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 6), 'space-y-6')}>
      <div
        className={cm.cn('relative h-44 md:h-56 rounded-2xl overflow-hidden shadow-md')}
        style={{ background: bannerGradient }}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn('absolute right-12 top-12 w-20 h-20 rounded-full bg-black/15 blur-2xl')}
        />
      </div>

      {/* Stack under `sm` so the fixed-width Subscribe button never crushes
          the channel name into one or two characters on a 390px phone. */}
      <div className={cm.cn('flex flex-col items-start gap-4 -mt-6 px-4 sm:flex-row sm:items-end')}>
        <div
          className={cm.cn(
            'w-28 h-28 md:w-32 md:h-32 rounded-full shrink-0 flex items-center justify-center shadow-2xl border-4 border-background',
          )}
          style={{ background: avatarGradient }}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined text-[64px] text-white/85')}>
            person
          </span>
        </div>
        <div className={cm.cn('flex-1 min-w-0 sm:pb-2 w-full')}>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight truncate')}>
            {channel.name}
          </h1>
          <div
            className={cm.cn(
              'flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-sm text-on-surface-variant',
            )}
          >
            <span>@{channel.handle}</span>
            <span aria-hidden="true">·</span>
            <span className={cm.cn('tabular-nums')}>
              {t(
                'channel.subscribersCount',
                { count: fmtCount(channel.subscriber_count) },
                { defaultValue: '{{count}} subscribers' },
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span className={cm.cn('tabular-nums')}>
              {t(
                'channel.videosCount',
                { count: channel.video_count },
                { defaultValue: '{{count}} videos' },
              )}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubscribe}
          className={cm.cn(
            'px-6 h-11 rounded-full text-sm font-bold uppercase tracking-widest shadow transition-colors shrink-0',
            subscribed
              ? 'bg-surface-container-low text-on-surface border border-outline-variant hover:bg-surface-container'
              : 'text-white hover:opacity-90',
          )}
          style={
            !subscribed
              ? { background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }
              : undefined
          }
          aria-pressed={subscribed}
        >
          {subscribed
            ? t('channel.subscribed', {}, { defaultValue: 'Subscribed' })
            : t('channel.subscribe', {}, { defaultValue: 'Subscribe' })}
        </button>
      </div>

      <nav
        aria-label={t('channel.tabsLabel', {}, { defaultValue: 'Channel tabs' })}
        className={cm.cn('border-b border-outline-variant/60 px-4')}
      >
        {/* Tabs scroll horizontally on phones instead of clipping the last ones. */}
        <ul className={cm.cn(cm.flex({ gap: 'lg' }), 'overflow-x-auto')}>
          {TABS.map((s) => {
            const active = tab === s
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setTab(s)}
                  className={cm.cn(
                    'px-1 py-3 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2',
                    active
                      ? 'text-on-surface border-primary'
                      : 'text-on-surface-variant border-transparent hover:text-on-surface',
                  )}
                  aria-current={active}
                >
                  {t(
                    `channel.tab.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {tab === 'videos' && (
        <VideoGrid
          videos={videos}
          emptyMessage={t('channel.emptyVideos', {}, { defaultValue: 'No videos yet.' })}
        />
      )}
      {tab === 'shorts' && (
        <VideoGrid
          videos={videos.slice(0, 4).map((v) => ({ ...v, duration_seconds: 60 }))}
          emptyMessage={t('channel.emptyShorts', {}, { defaultValue: 'No shorts yet.' })}
        />
      )}
      {tab === 'playlists' && (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
          {t('channel.playlistsPlaceholder', {}, { defaultValue: 'Playlists coming soon.' })}
        </p>
      )}
      {tab === 'live' && (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
          {t('channel.livePlaceholder', {}, { defaultValue: 'No upcoming streams scheduled.' })}
        </p>
      )}
      {tab === 'about' && (
        <div className={cm.cn('rounded-2xl bg-surface-container-lowest p-6 space-y-4 max-w-3xl')}>
          <p className={cm.cn('text-base leading-relaxed text-on-surface')}>
            {channel.description}
          </p>
          <dl className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm')}>
            <div className={cm.cn('border-l-4 border-primary pl-3')}>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
              </dt>
              <dd className={cm.cn('text-2xl font-extrabold tabular-nums')}>
                {fmtCount(channel.subscriber_count)}
              </dd>
            </div>
            <div className={cm.cn('border-l-4 border-primary pl-3')}>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('channel.aboutTotalViews', {}, { defaultValue: 'Total views' })}
              </dt>
              <dd className={cm.cn('text-2xl font-extrabold tabular-nums')}>
                {fmtCount(channel.total_views)}
              </dd>
            </div>
            <div className={cm.cn('border-l-4 border-primary pl-3')}>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('channel.aboutJoined', {}, { defaultValue: 'Joined' })}
              </dt>
              <dd className={cm.cn('text-2xl font-extrabold')}>
                {new Date(channel.joined_at).getFullYear()}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
