import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type Channel, ChannelStripCard } from '../components/ChannelStripCard.js'
import { FeaturedHeroCard, type FeaturedVideo } from '../components/FeaturedHeroCard.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList } from '../lib/unwrap.js'

interface HomeVideo extends VideoCardData {
  description?: string
  category?: string
  watch_progress_seconds?: number
}

const SAMPLE_VIDEOS: HomeVideo[] = [
  {
    id: 'v-1',
    title: 'How a film label fell in love with reels again',
    description:
      'A short documentary on how a 60-year-old indie label is rebuilding its archive — frame-by-frame, in 4K, with the original directors of photography.',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
    watch_progress_seconds: 700,
    category: 'documentary',
  },
  {
    id: 'v-2',
    title: 'I built a 1M-viewer channel from a closet',
    channel_id: 'c-2',
    channel_name: 'Lina Reyes',
    duration_seconds: 924,
    view_count: 312_000,
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    cover_index: 1,
    category: 'creators',
  },
  {
    id: 'v-3',
    title: 'Late-night ambient cooking — chickpea three ways',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 2_640,
    view_count: 198_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
    category: 'cooking',
  },
  {
    id: 'v-4',
    title: 'The last analogue cinema in Lisbon',
    channel_id: 'c-4',
    channel_name: 'Cosmo Reels',
    duration_seconds: 1_812,
    view_count: 87_400,
    published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    cover_index: 3,
    category: 'documentary',
  },
  {
    id: 'v-5',
    title: 'Live: building a synth in 60 minutes',
    channel_id: 'c-5',
    channel_name: 'Resonant Labs',
    duration_seconds: 3_600,
    view_count: 12_400,
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    cover_index: 4,
    live: true,
    category: 'tech',
  },
  {
    id: 'v-6',
    title: 'Every camera lens explained in 8 minutes',
    channel_id: 'c-6',
    channel_name: 'Aperture Daily',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 5,
    category: 'photography',
  },
  {
    id: 'v-7',
    title: 'Why this 90s sitcom theme still slaps',
    channel_id: 'c-7',
    channel_name: 'Off-Tempo',
    duration_seconds: 740,
    view_count: 248_000,
    published_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    cover_index: 6,
    category: 'culture',
  },
  {
    id: 'v-8',
    title: 'I gave up coffee for a week — here\u2019s what happened',
    channel_id: 'c-8',
    channel_name: 'Petra Vlogs',
    duration_seconds: 1_140,
    view_count: 86_500,
    published_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    cover_index: 0,
    category: 'lifestyle',
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
    description: 'Quiet documentary work from a small Brooklyn studio.',
    subscribed: true,
    has_new: true,
  },
  {
    id: 'c-2',
    name: 'Lina Reyes',
    handle: 'linareyes',
    subscriber_count: 1_200_000,
    video_count: 318,
    avatar_index: 1,
    description: 'Solo creator behind one of YouTube\u2019s coziest bedroom-studio channels.',
    subscribed: true,
  },
  {
    id: 'c-5',
    name: 'Resonant Labs',
    handle: 'resonantlabs',
    subscriber_count: 86_400,
    video_count: 47,
    avatar_index: 2,
    description: 'Hardware tinkering, modular synths, and the occasional 8-bit chiptune.',
    subscribed: false,
  },
  {
    id: 'c-6',
    name: 'Aperture Daily',
    handle: 'aperture',
    subscriber_count: 2_300_000,
    video_count: 612,
    avatar_index: 3,
    description: 'Photography crash courses, gear reviews, and one-take field tutorials.',
    subscribed: true,
  },
]

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [videos, setVideos] = useState<HomeVideo[]>(SAMPLE_VIDEOS)
  const [channels, setChannels] = useState<Channel[]>(SAMPLE_CHANNELS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/api/videos'), http.get('/api/channels')])
      .then(([v, c]) => {
        if (cancelled) return
        const apiVideos = unwrapList<HomeVideo>(v)
        const apiChannels = unwrapList<Channel>(c)
        if (apiVideos.length > 0) setVideos(apiVideos)
        if (apiChannels.length > 0) setChannels(apiChannels)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'home.loadError',
              {},
              { defaultValue: 'Showing sample videos — couldn\u2019t reach the server.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const heroVideo = useMemo<FeaturedVideo | null>(() => {
    const resuming = videos.find((v) => v.watch_progress_seconds && v.watch_progress_seconds > 0)
    const pick = resuming ?? videos[0]
    if (!pick) return null
    return {
      id: pick.id,
      title: pick.title,
      description: pick.description,
      channel_id: pick.channel_id,
      channel_name: pick.channel_name,
      duration_seconds: pick.duration_seconds,
      view_count: pick.view_count,
      cover_index: pick.cover_index,
      thumbnail_url: pick.thumbnail_url,
      live: pick.live,
      watch_progress_seconds: pick.watch_progress_seconds,
    }
  }, [videos])

  const liveVideos = videos.filter((v) => v.live)
  const recentVideos = useMemo(
    () =>
      [...videos].sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      ),
    [videos],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-12')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('home.eyebrow', { appName: APP_NAME }, { defaultValue: 'Today on {{appName}}' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'home.subheading',
            {},
            {
              defaultValue:
                'New uploads from your subscriptions, fresh trends, and a few suggestions hand-picked for tonight.',
            },
          )}
        </p>
      </header>

      <FeaturedHeroCard
        video={heroVideo}
        eyebrow={
          heroVideo?.watch_progress_seconds
            ? t('home.heroEyebrowResume', {}, { defaultValue: 'Continue watching' })
            : t('home.heroEyebrowFeatured', {}, { defaultValue: 'Featured today' })
        }
      />

      {liveVideos.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
              {t('home.liveHeading', {}, { defaultValue: 'Live right now' })}
            </h2>
            <p className={cm.cn('text-xs text-on-surface-variant font-medium')}>
              {t('home.liveSub', {}, { defaultValue: 'Streaming this minute' })}
            </p>
          </div>
          <VideoGrid
            videos={liveVideos}
            highlightFirstEyebrow={t('home.liveBadge', {}, { defaultValue: 'On now' })}
          />
        </section>
      )}

      <section className={cm.cn('space-y-4')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('home.recentHeading', {}, { defaultValue: 'New from your subscriptions' })}
          </h2>
        </div>
        <VideoGrid videos={recentVideos} limit={8} />
      </section>

      {channels.length > 0 && (
        <section className={cm.cn('space-y-4')}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
              {t('home.channelsHeading', {}, { defaultValue: 'Channels you follow' })}
            </h2>
            <Link
              to="/subscriptions"
              className={cm.cn('text-sm font-bold text-primary hover:underline')}
            >
              {t('home.channelsSeeAll', {}, { defaultValue: 'See all →' })}
            </Link>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 lg:grid-cols-2')}>
            {channels.slice(0, 4).map((c) => (
              <ChannelStripCard key={c.id} channel={c} />
            ))}
          </div>
        </section>
      )}

      {error && !loading && (
        <p className={cm.cn(cm.textCenter, 'text-xs text-on-surface-variant pt-4')}>{error}</p>
      )}
    </div>
  )
}
