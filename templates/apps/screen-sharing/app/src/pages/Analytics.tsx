import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LibraryStatsHero } from '../components/LibraryStatsHero.js'

interface AnalyticsTopRecording {
  id: string
  title: string
  views: number
  watchPercent: number
}

interface AnalyticsViewer {
  id: string
  name: string
  recordingTitle: string
  watchedAt: string
  watchedSeconds: number
  durationSeconds: number
  watchPercent?: number
}

interface AnalyticsData {
  totalRecordings: number
  totalViews: number
  averageWatchPercent: number
  trend7d: number[]
  weeklyChangePercent: number
  viewsToday: number
  avgWatchSeconds: number
  commentsThisWeek: number
  topRecordings: AnalyticsTopRecording[]
  recentViewers: AnalyticsViewer[]
  heatmap: number[]
}

const EMPTY_DATA: AnalyticsData = {
  totalRecordings: 0,
  totalViews: 0,
  averageWatchPercent: 0,
  trend7d: [0, 0, 0, 0, 0, 0, 0],
  weeklyChangePercent: 0,
  viewsToday: 0,
  avgWatchSeconds: 0,
  commentsThisWeek: 0,
  topRecordings: [],
  recentViewers: [],
  heatmap: new Array(24).fill(0),
}

function unwrap(payload: unknown): AnalyticsData | null {
  if (!payload || typeof payload !== 'object') return null
  const data = (payload as { data?: unknown }).data
  const candidate = (data && typeof data === 'object' ? data : payload) as Partial<AnalyticsData>
  if (!Array.isArray(candidate.heatmap) || !Array.isArray(candidate.trend7d)) return null
  return {
    ...EMPTY_DATA,
    ...candidate,
    topRecordings: Array.isArray(candidate.topRecordings) ? candidate.topRecordings : [],
    recentViewers: Array.isArray(candidate.recentViewers) ? candidate.recentViewers : [],
  } as AnalyticsData
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<AnalyticsData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/analytics/overview')
      .then((res) => {
        if (cancelled) return
        const parsed = unwrap(res?.data)
        setData(parsed ?? EMPTY_DATA)
        if (!parsed)
          setError(
            t('analytics.error.shape', {}, { defaultValue: 'Analytics payload was unexpected.' }),
          )
      })
      .catch(() => {
        if (cancelled) return
        setError(t('analytics.error.load', {}, { defaultValue: 'Could not load analytics.' }))
        setData(EMPTY_DATA)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const heatmapMax = useMemo(() => Math.max(...data.heatmap, 1), [data.heatmap])
  const isEmpty = data.totalRecordings === 0

  return (
    <div data-mol-id="analytics-page" className={cm.cn(cm.stack(8), cm.maxW('2xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-to)]',
            )}
          >
            insights
          </span>
          {t('analytics.eyebrow', {}, { defaultValue: 'Engagement analytics' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
          )}
        >
          {t('analytics.title', {}, { defaultValue: 'How your screencasts travel' })}
        </h1>
      </header>

      {error && (
        <p
          data-mol-id="analytics-error"
          role="alert"
          className={cm.cn('rounded-2xl bg-error-light text-error p-3 text-sm')}
        >
          {error}
        </p>
      )}

      <LibraryStatsHero
        totalRecordings={data.totalRecordings}
        totalViews={data.totalViews}
        averageWatchPercent={data.averageWatchPercent}
        trend7d={data.trend7d}
        weeklyChangePercent={data.weeklyChangePercent}
      />

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <KpiCard
          accent="var(--color-brand-gradient-from)"
          tile="bg-violet-50 text-violet-600"
          icon="visibility"
          label={t('analytics.kpi.viewsToday', {}, { defaultValue: 'Views today' })}
          value={String(data.viewsToday)}
          molId="kpi-views-today"
        />
        <KpiCard
          accent="var(--color-brand-gradient-to)"
          tile="bg-cyan-50 text-cyan-600"
          icon="schedule"
          label={t('analytics.kpi.avgWatchTime', {}, { defaultValue: 'Avg watch time' })}
          value={formatDuration(data.avgWatchSeconds)}
          molId="kpi-avg-watch"
        />
        <KpiCard
          accent="var(--color-emerald-500)"
          tile="bg-success-light text-success"
          icon="forum"
          label={t('analytics.kpi.commentsThisWeek', {}, { defaultValue: 'Comments this week' })}
          value={String(data.commentsThisWeek)}
          molId="kpi-comments-week"
        />
      </section>

      <section
        data-mol-id="analytics-heatmap"
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-sm uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('analytics.heatmap.title', {}, { defaultValue: 'Viewer attention heatmap' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'analytics.heatmap.subtitle',
              {},
              { defaultValue: 'Bucketed across all watched recordings' },
            )}
          </span>
        </header>
        <div className={cm.cn(cm.flex({ align: 'end', gap: 1 }), 'h-32')}>
          {data.heatmap.map((v, i) => {
            const heightPct = Math.max(8, (v / heatmapMax) * 100)
            return (
              <div
                key={i}
                className={cm.cn(
                  'flex-1 rounded-t-md bg-gradient-to-t from-[var(--color-brand-gradient-from)]/40 via-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
                )}
                style={{ height: `${heightPct}%` }}
                aria-label={t(
                  'analytics.heatmap.bar',
                  { index: i + 1, value: v },
                  { defaultValue: 'Segment {{index}}: {{value}} viewers' },
                )}
              />
            )
          })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'text-on-surface-variant font-mono tabular-nums',
          )}
        >
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-2')}>
        <div
          data-mol-id="analytics-top"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(3),
            'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-sm uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('analytics.top.title', {}, { defaultValue: 'Top recordings' })}
          </h2>
          {data.topRecordings.length === 0 ? (
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t('analytics.top.empty', {}, { defaultValue: 'No recordings yet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.stack(2))}>
              {data.topRecordings.map((rec, i) => (
                <li
                  key={rec.id}
                  data-mol-id={`analytics-top-${rec.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 3 }),
                    cm.sp('py', 2),
                    'border-b border-outline-variant/40 last:border-b-0',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      cm.fontWeight('bold'),
                      'rounded-lg bg-gradient-to-br from-[var(--color-brand-gradient-from)]/15 to-[var(--color-brand-gradient-to)]/15 text-[var(--color-brand-gradient-from)] text-sm font-mono shrink-0',
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <div
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface truncate',
                      )}
                    >
                      {rec.title}
                    </div>
                    <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'analytics.top.viewsAndWatch',
                        { views: rec.views, percent: rec.watchPercent },
                        { defaultValue: '{{views}} views · {{percent}}% avg watch' },
                      )}
                    </div>
                  </div>
                  <div
                    className={cm.cn('w-24 h-2 rounded-full bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn(
                        'h-full rounded-full bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]',
                      )}
                      style={{ width: `${rec.watchPercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          data-mol-id="analytics-recent"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(3),
            'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-sm uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('analytics.recent.title', {}, { defaultValue: 'Recent viewers' })}
          </h2>
          {data.recentViewers.length === 0 ? (
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t('analytics.recent.empty', {}, { defaultValue: 'No viewers yet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.stack(2))}>
              {data.recentViewers.map((v) => {
                const watchPercent =
                  v.watchPercent ??
                  (v.durationSeconds > 0
                    ? Math.round((v.watchedSeconds / v.durationSeconds) * 100)
                    : 0)
                return (
                  <li
                    key={v.id}
                    data-mol-id={`analytics-viewer-${v.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 3 }),
                      cm.sp('py', 2),
                      'border-b border-outline-variant/40 last:border-b-0',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(9),
                        cm.h(9),
                        cm.fontWeight('bold'),
                        'rounded-full bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white text-xs shrink-0',
                      )}
                    >
                      {v.name
                        .split(/\s|@/)
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className={cm.cn(cm.flex1, 'min-w-0')}>
                      <div
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-on-surface truncate',
                        )}
                      >
                        {v.name}
                      </div>
                      <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                        {t(
                          'analytics.recent.watching',
                          { title: v.recordingTitle, percent: watchPercent },
                          { defaultValue: 'Watched {{title}} · {{percent}}%' },
                        )}
                      </div>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'shrink-0 text-on-surface-variant uppercase tracking-widest font-bold',
                      )}
                    >
                      {formatRelative(v.watchedAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {loading && (
        <p
          data-mol-id="analytics-loading"
          className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.textCenter)}
        >
          {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
        </p>
      )}

      {!loading && isEmpty && (
        <p
          data-mol-id="analytics-empty"
          className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.textCenter)}
        >
          {t(
            'analytics.empty',
            {},
            { defaultValue: 'Record your first clip to see engagement here.' },
          )}
        </p>
      )}
    </div>
  )
}

function KpiCard({
  accent,
  tile,
  icon,
  label,
  value,
  molId,
}: {
  accent: string
  tile: string
  icon: string
  label: string
  value: string
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={molId}
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(2),
        cm.accentCard({ tone: 'custom' }),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
      )}
      style={{ ['--mol-accent' as string]: accent }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-xl',
            tile,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
        </div>
        <span className={cm.accentCardLabel({ tone: 'custom' })}>{label}</span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 2 }))}>
        <span className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
          {value}
        </span>
      </div>
    </div>
  )
}
