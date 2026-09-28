import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, BRAND_COLOR } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface StudioStats {
  total_views: number
  watch_time_hours: number
  subscribers: number
  subscribers_delta_7d: number
  revenue_cents: number
  revenue_delta_pct: number
  ctr_pct: number
}

interface StudioVideo {
  id: string
  title: string
  status: 'published' | 'draft' | 'scheduled' | 'processing'
  views: number
  likes: number
  comments: number
  published_at: string
  cover_index: number
  duration_seconds: number
}

const SAMPLE_STATS: StudioStats = {
  total_views: 38_400_000,
  watch_time_hours: 124_700,
  subscribers: 482_000,
  subscribers_delta_7d: 4_120,
  revenue_cents: 1_842_300,
  revenue_delta_pct: 12.4,
  ctr_pct: 8.2,
}

const SAMPLE_VIDEOS: StudioVideo[] = [
  {
    id: 'sv-1',
    title: 'How a film label fell in love with reels again',
    status: 'published',
    views: 482_000,
    likes: 18_400,
    comments: 1_120,
    published_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    cover_index: 0,
    duration_seconds: 1458,
  },
  {
    id: 'sv-2',
    title: 'Inside an indie 4K transfer studio',
    status: 'published',
    views: 180_000,
    likes: 9_400,
    comments: 412,
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    cover_index: 2,
    duration_seconds: 740,
  },
  {
    id: 'sv-3',
    title: 'A walking tour of our Brooklyn studio',
    status: 'scheduled',
    views: 0,
    likes: 0,
    comments: 0,
    published_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    cover_index: 1,
    duration_seconds: 482,
  },
  {
    id: 'sv-4',
    title: 'Untitled draft — synth pedal review',
    status: 'draft',
    views: 0,
    likes: 0,
    comments: 0,
    published_at: new Date().toISOString(),
    cover_index: 3,
    duration_seconds: 0,
  },
  {
    id: 'sv-5',
    title: 'Restoring a 16mm print frame by frame',
    status: 'processing',
    views: 0,
    likes: 0,
    comments: 0,
    published_at: new Date().toISOString(),
    cover_index: 4,
    duration_seconds: 2_640,
  },
]

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #db2777 50%, #9d174d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #155e75 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
]

const STATUS_LABEL: Record<StudioVideo['status'], string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
  processing: 'Processing',
}

const STATUS_TINT: Record<StudioVideo['status'], string> = {
  published: 'bg-emerald-500/20 text-success',
  draft: 'bg-surface-container text-on-surface-variant',
  scheduled: 'bg-amber-500/20 text-warning',
  processing: 'bg-violet-500/20 text-violet-700',
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDuration(s: number): string {
  if (s === 0) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtCurrency(c: number): string {
  return `$${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function Studio() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<StudioStats>(SAMPLE_STATS)
  const [videos, setVideos] = useState<StudioVideo[]>(SAMPLE_VIDEOS)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/studio/stats').catch(() => null),
      http.get('/api/studio/videos').catch(() => null),
    ]).then(([s, v]) => {
      if (cancelled) return
      if (s) {
        const apiS = unwrapSingle<StudioStats>(s)
        if (apiS) setStats(apiS)
      }
      if (v) {
        const apiV = unwrapList<StudioVideo>(v)
        if (apiV.length > 0) setVideos(apiV)
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-10')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.cn('space-y-2')}>
          <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('studio.eyebrow', {}, { defaultValue: 'Creator studio' })}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}
          >
            {t('studio.heading', {}, { defaultValue: 'Channel analytics' })}
          </h1>
        </div>
        <Link
          to="/upload"
          className={cm.cn(
            'inline-flex items-center gap-2 px-6 h-12 rounded-full text-sm font-bold uppercase tracking-widest text-white shadow hover:opacity-90 transition-opacity',
          )}
          style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            add
          </span>
          {t('studio.uploadCta', {}, { defaultValue: 'Upload video' })}
        </Link>
      </header>

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
        <div className={cm.cn('relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center')}>
          <div className={cm.cn('lg:col-span-7 space-y-3')}>
            <span
              className={cm.cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md inline-block',
              )}
            >
              {t('studio.heroEyebrow', {}, { defaultValue: 'Last 28 days' })}
            </span>
            <p
              className={cm.cn('text-6xl md:text-7xl font-extrabold tracking-tighter tabular-nums')}
            >
              {fmt(stats.total_views)}
            </p>
            <p className={cm.cn('text-sm md:text-base text-white/85')}>
              {t(
                'studio.heroDescription',
                {},
                { defaultValue: 'Total views across all your published videos.' },
              )}
            </p>
            <div className={cm.cn('flex items-center gap-3 mt-2')}>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  trending_up
                </span>
                {t(
                  'studio.heroDelta',
                  { pct: stats.revenue_delta_pct.toFixed(1) },
                  { defaultValue: '+{{pct}}% vs last 28 days' },
                )}
              </span>
            </div>
          </div>
          <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
            <div
              className={cm.cn(
                'w-48 h-48 rounded-2xl shadow-2xl shadow-black/30 flex items-center justify-center',
              )}
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[120px] text-white/85')}>
                analytics
              </span>
            </div>
          </div>
        </div>
      </section>

      <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        <li
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            cm.accentCard({ tone: 'primary' }),
          )}
        >
          <p className={cm.accentCardLabel({ tone: 'primary' })}>
            {t('studio.kpiWatch', {}, { defaultValue: 'Watch time' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
            {fmt(stats.watch_time_hours)}h
          </p>
        </li>
        <li
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-rose-500)' }}
        >
          <p className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('nav.subscribers', {}, { defaultValue: 'Subscribers' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
            {fmt(stats.subscribers)}
          </p>
          <p className={cm.cn('text-[11px] font-bold text-success tabular-nums mt-1')}>
            {t(
              'studio.kpiSubscribersDelta',
              { count: fmt(stats.subscribers_delta_7d) },
              { defaultValue: '+{{count}} this week' },
            )}
          </p>
        </li>
        <li
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-emerald-500)' }}
        >
          <p className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('studio.kpiRevenue', {}, { defaultValue: 'Revenue (mo)' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
            {fmtCurrency(stats.revenue_cents)}
          </p>
          <p className={cm.cn('text-[11px] font-bold text-success tabular-nums mt-1')}>
            {t(
              'studio.kpiRevenueDelta',
              { pct: stats.revenue_delta_pct.toFixed(1) },
              { defaultValue: '+{{pct}}% vs last month' },
            )}
          </p>
        </li>
        <li
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl p-5 hover:-translate-y-0.5 transition-transform',
            cm.accentCard({ tone: 'custom' }),
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-amber-500)' }}
        >
          <p className={cm.accentCardLabel({ tone: 'custom' })}>
            {t('studio.kpiCtr', {}, { defaultValue: 'CTR' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums mt-1')}>
            {stats.ctr_pct.toFixed(1)}%
          </p>
          <p className={cm.cn('text-[11px] text-on-surface-variant mt-1')}>
            {t('studio.kpiCtrSub', {}, { defaultValue: 'Impression → click' })}
          </p>
        </li>
      </ul>

      <section className={cm.cn('space-y-4')}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('studio.videosHeading', {}, { defaultValue: 'Your videos' })}
          </h2>
          <span className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'studio.videosSub',
              { count: videos.length },
              { defaultValue: '{{count}} total · most recent first' },
            )}
          </span>
        </div>
        <div className={cm.cn('overflow-hidden rounded-2xl bg-surface-container-lowest')}>
          <div
            className={cm.cn(
              'hidden md:flex items-center gap-4 px-5 py-3 border-b border-outline-variant text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            <span className={cm.cn('flex-1')}>
              {t('studio.colVideo', {}, { defaultValue: 'Video' })}
            </span>
            <span className={cm.cn('w-28')}>{t('nav.status', {}, { defaultValue: 'Status' })}</span>
            <span className={cm.cn('w-24 text-right')}>
              {t('studio.colViews', {}, { defaultValue: 'Views' })}
            </span>
            <span className={cm.cn('w-24 text-right')}>
              {t('studio.colLikes', {}, { defaultValue: 'Likes' })}
            </span>
            <span className={cm.cn('w-32 text-right')}>
              {t('studio.colComments', {}, { defaultValue: 'Comments' })}
            </span>
          </div>
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {videos.map((v) => {
              const grad = COVER_GRADIENTS[v.cover_index % COVER_GRADIENTS.length]
              return (
                <li
                  key={v.id}
                  className={cm.cn(
                    'flex items-center gap-4 px-5 py-4 hover:bg-surface-container transition-colors',
                  )}
                >
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
                    {v.duration_seconds > 0 && (
                      <span
                        className={cm.cn(
                          'absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-foreground/75 text-white',
                        )}
                      >
                        {fmtDuration(v.duration_seconds)}
                      </span>
                    )}
                  </div>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <h3 className={cm.cn('text-sm font-bold tracking-tight line-clamp-1')}>
                      {v.title}
                    </h3>
                    <p className={cm.cn('text-xs text-on-surface-variant tabular-nums mt-0.5')}>
                      {v.status === 'scheduled'
                        ? t(
                            'studio.scheduledFor',
                            { date: new Date(v.published_at).toLocaleDateString() },
                            { defaultValue: 'Scheduled · {{date}}' },
                          )
                        : new Date(v.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      'w-28 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-center',
                      STATUS_TINT[v.status],
                    )}
                  >
                    {t(`studio.status.${v.status}`, {}, { defaultValue: STATUS_LABEL[v.status] })}
                  </span>
                  <span className={cm.cn('w-24 text-right text-sm font-bold tabular-nums')}>
                    {fmt(v.views)}
                  </span>
                  <span className={cm.cn('w-24 text-right text-sm tabular-nums')}>
                    {fmt(v.likes)}
                  </span>
                  <span className={cm.cn('w-32 text-right text-sm tabular-nums')}>
                    {fmt(v.comments)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
