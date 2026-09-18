import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, BRAND_COLOR } from '../branding.js'
import type { VideoCardData } from '../components/VideoCard.js'
import { VideoGrid } from '../components/VideoGrid.js'
import { unwrapList } from '../lib/unwrap.js'

interface TrendingVideo extends VideoCardData {
  category?: string
}

const SAMPLE_VIDEOS: TrendingVideo[] = [
  {
    id: 't-1',
    title: 'How a film label fell in love with reels again',
    channel_id: 'c-1',
    channel_name: 'Northern Field Studio',
    duration_seconds: 1458,
    view_count: 4_820_000,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
    category: 'film',
  },
  {
    id: 't-2',
    title: 'Live: building a synth in 60 minutes',
    channel_id: 'c-5',
    channel_name: 'Resonant Labs',
    duration_seconds: 3_600,
    view_count: 1_240_000,
    published_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    cover_index: 4,
    live: true,
    category: 'tech',
  },
  {
    id: 't-3',
    title: 'Late-night ambient cooking — chickpea three ways',
    channel_id: 'c-3',
    channel_name: 'Slow Spoon',
    duration_seconds: 2_640,
    view_count: 1_980_000,
    published_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    cover_index: 2,
    category: 'food',
  },
  {
    id: 't-4',
    title: 'Every camera lens explained in 8 minutes',
    channel_id: 'c-6',
    channel_name: 'Aperture Daily',
    duration_seconds: 482,
    view_count: 12_000_000,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 5,
    category: 'photography',
  },
  {
    id: 't-5',
    title: 'I built a 1M-viewer channel from a closet',
    channel_id: 'c-2',
    channel_name: 'Lina Reyes',
    duration_seconds: 924,
    view_count: 3_120_000,
    published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    cover_index: 1,
    category: 'creators',
  },
  {
    id: 't-6',
    title: 'Why this 90s sitcom theme still slaps',
    channel_id: 'c-7',
    channel_name: 'Off-Tempo',
    duration_seconds: 740,
    view_count: 2_480_000,
    published_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    cover_index: 6,
    category: 'culture',
  },
  {
    id: 't-7',
    title: 'I gave up coffee for a week — here\u2019s what happened',
    channel_id: 'c-8',
    channel_name: 'Petra Vlogs',
    duration_seconds: 1_140,
    view_count: 865_000,
    published_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    cover_index: 0,
    category: 'lifestyle',
  },
  {
    id: 't-8',
    title: 'The last analogue cinema in Lisbon',
    channel_id: 'c-4',
    channel_name: 'Cosmo Reels',
    duration_seconds: 1_812,
    view_count: 874_000,
    published_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    cover_index: 3,
    category: 'film',
  },
]

const CATEGORIES = [
  'all',
  'film',
  'tech',
  'food',
  'photography',
  'creators',
  'culture',
  'lifestyle',
] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_LABEL: Record<Category, string> = {
  all: 'All',
  film: 'Film',
  tech: 'Tech',
  food: 'Food',
  photography: 'Photography',
  creators: 'Creators',
  culture: 'Culture',
  lifestyle: 'Lifestyle',
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export function Trending() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [videos, setVideos] = useState<TrendingVideo[]>(SAMPLE_VIDEOS)
  const [category, setCategory] = useState<Category>('all')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/videos?sort=trending&limit=50')
      .then((res) => {
        if (cancelled) return
        const raw = unwrapList<Record<string, unknown>>(res)
        if (raw.length === 0) return
        const apiVideos: TrendingVideo[] = raw.map((r) => ({
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
          category: typeof r.category === 'string' ? r.category : 'all',
        }))
        setVideos(apiVideos)
      })
      .catch(() => {
        /* sample data fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(
    () => (category === 'all' ? videos : videos.filter((v) => v.category === category)),
    [videos, category],
  )

  const top = filtered[0] ?? videos[0]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t(
            'trending.eyebrow',
            { appName: APP_NAME },
            { defaultValue: 'Trending across {{appName}}' },
          )}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('trending.heading', {}, { defaultValue: 'What everyone\u2019s watching' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'trending.subheading',
            {},
            {
              defaultValue: 'Refreshed every 15 minutes from view, share, and watch-time signals.',
            },
          )}
        </p>
      </header>

      {top && (
        <section
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] text-white p-8 md:p-10 shadow-2xl',
          )}
          style={{ background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${ACCENT_COLOR} 100%)` }}
        >
          <div
            className={cm.cn(
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn('relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center')}
          >
            <div className={cm.cn('lg:col-span-7 space-y-3')}>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  trending_up
                </span>
                {t('trending.topPickEyebrow', {}, { defaultValue: 'Top pick · #1 trending' })}
              </span>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.05]',
                )}
              >
                {top.title}
              </h2>
              <p className={cm.cn('text-sm text-white/85')}>
                {top.channel_name} ·{' '}
                {t(
                  'common.countViews',
                  { count: fmtViews(top.view_count) },
                  { defaultValue: '{{count}} views' },
                )}
              </p>
            </div>
            <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
              <div
                className={cm.cn(
                  'w-48 h-32 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
                )}
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
                aria-hidden="true"
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[64px] text-white/90')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_circle
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <nav
        aria-label={t('trending.categoriesLabel', {}, { defaultValue: 'Trending categories' })}
        className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
      >
        {CATEGORIES.map((c) => {
          const active = category === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cm.cn(
                'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant hover:text-on-surface',
              )}
              aria-pressed={active}
            >
              {t(`trending.category.${c}`, {}, { defaultValue: CATEGORY_LABEL[c] })}
            </button>
          )
        })}
      </nav>

      <VideoGrid
        videos={filtered}
        emptyMessage={t(
          'trending.empty',
          {},
          { defaultValue: 'Nothing trending in this category yet.' },
        )}
      />
    </div>
  )
}
