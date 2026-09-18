import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Channel, ChannelStripCard } from '../components/ChannelStripCard.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList } from '../lib/unwrap.js'

const SAMPLE_VIDEOS: VideoCardData[] = [
  {
    id: 's-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 482_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
  },
  {
    id: 's-2',
    title: 'I built a 1M-viewer channel from a closet',
    channel_id: 'c-2',
    channel_name: 'Lina Reyes',
    duration_seconds: 924,
    view_count: 312_000,
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    cover_index: 1,
  },
  {
    id: 's-3',
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
    id: 's-4',
    title: 'Every camera lens explained in 8 minutes',
    channel_id: 'c-6',
    channel_name: 'Aperture Daily',
    duration_seconds: 482,
    view_count: 1_200_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 5,
  },
  {
    id: 's-5',
    title: 'Late-night ambient cooking — chickpea three ways',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 2_640,
    view_count: 198_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
  },
  {
    id: 's-6',
    title: 'Why this 90s sitcom theme still slaps',
    channel_id: 'c-7',
    channel_name: 'Off-Tempo',
    duration_seconds: 740,
    view_count: 248_000,
    published_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    cover_index: 6,
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
    has_new: true,
    unread_count: 3,
    description: 'Quiet documentary work from a small Brooklyn studio.',
  },
  {
    id: 'c-2',
    name: 'Lina Reyes',
    handle: 'linareyes',
    subscriber_count: 1_200_000,
    video_count: 318,
    avatar_index: 1,
    subscribed: true,
    has_new: true,
    unread_count: 1,
    description: 'Solo creator behind one of YouTube\u2019s coziest bedroom-studio channels.',
  },
  {
    id: 'c-3',
    name: 'Slow Spoon',
    handle: 'slowspoon',
    subscriber_count: 240_000,
    video_count: 92,
    avatar_index: 2,
    subscribed: true,
    description: 'Late-night ambient cooking, vegan-leaning recipes.',
  },
  {
    id: 'c-4',
    name: 'Cosmo Reels',
    handle: 'cosmoreels',
    subscriber_count: 87_400,
    video_count: 56,
    avatar_index: 3,
    subscribed: true,
    description: 'Travel documentaries from the rare corners of the world.',
  },
  {
    id: 'c-5',
    name: 'Resonant Labs',
    handle: 'resonantlabs',
    subscriber_count: 86_400,
    video_count: 47,
    avatar_index: 4,
    subscribed: true,
    has_new: true,
    unread_count: 2,
    description: 'Hardware tinkering, modular synths, and the occasional 8-bit chiptune.',
  },
  {
    id: 'c-6',
    name: 'Aperture Daily',
    handle: 'aperture',
    subscriber_count: 2_300_000,
    video_count: 612,
    avatar_index: 0,
    subscribed: true,
    description: 'Photography crash courses, gear reviews, and one-take field tutorials.',
  },
]

export function Subscriptions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [videos, setVideos] = useState<VideoCardData[]>(SAMPLE_VIDEOS)
  const [channels, setChannels] = useState<Channel[]>(SAMPLE_CHANNELS)

  useEffect(() => {
    let cancelled = false
    // Resolve subscribed channels from /api/follows (each row's channel_id),
    // then fetch each channel + their videos. /api/channels is the full list
    // — we filter client-side rather than adding a non-standard query param.
    http
      .get('/api/follows')
      .then(async (followsRes) => {
        if (cancelled) return
        const follows = unwrapList<Record<string, unknown>>(followsRes)
        const subscribedIds = new Set(
          follows.map((f) => String(f.channel_id ?? f.targetId)).filter(Boolean),
        )
        const allChannels = await http.get('/api/channels').catch(() => null)
        if (cancelled) return
        const channelRows = allChannels ? unwrapList<Record<string, unknown>>(allChannels) : []
        const subscribedChannels = channelRows.filter((c) => subscribedIds.has(String(c.id)))
        const mapped: Channel[] = subscribedChannels.map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ''),
          handle: String(c.handle ?? ''),
          subscriber_count: typeof c.subscriber_count === 'number' ? c.subscriber_count : 0,
          video_count: 0,
          avatar_index: 0,
          subscribed: true,
          description: String(c.bio ?? ''),
        }))
        if (mapped.length > 0) setChannels(mapped)
        // Fetch videos for each subscribed channel and merge.
        if (subscribedIds.size > 0) {
          const videoBatches = await Promise.all(
            Array.from(subscribedIds).map((channelId) =>
              http.get(`/api/videos?channel_id=${channelId}&limit=6`).catch(() => null),
            ),
          )
          if (cancelled) return
          const merged: VideoCardData[] = []
          for (const batch of videoBatches) {
            if (!batch) continue
            for (const r of unwrapList<Record<string, unknown>>(batch)) {
              merged.push({
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
              })
            }
          }
          merged.sort(
            (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
          )
          if (merged.length > 0) setVideos(merged)
        }
      })
      .catch(() => {
        /* sample data fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const totalUnread = channels.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('subscriptions.eyebrow', {}, { defaultValue: 'Followed channels' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('subscriptions.heading', {}, { defaultValue: 'Subscriptions' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'subscriptions.subheading',
            { count: totalUnread },
            { defaultValue: '{{count}} new uploads from channels you follow.' },
          )}
        </p>
      </header>

      <section className={cm.cn('space-y-4')}>
        <h2
          className={cm.cn('text-sm font-black uppercase tracking-widest text-on-surface-variant')}
        >
          {t('subscriptions.channelsHeading', {}, { defaultValue: 'Your channels' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6')}>
          {channels.map((c) => (
            <ChannelStripCard key={c.id} channel={c} layout="vertical" />
          ))}
        </div>
      </section>

      <section className={cm.cn('space-y-4')}>
        <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
          {t('subscriptions.feedHeading', {}, { defaultValue: 'Latest from your subscriptions' })}
        </h2>
        <VideoGrid
          videos={videos}
          emptyMessage={t(
            'subscriptions.empty',
            {},
            { defaultValue: 'No new videos yet — try the Trending page.' },
          )}
        />
      </section>
    </div>
  )
}
