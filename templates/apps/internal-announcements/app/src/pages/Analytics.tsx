/**
 * Analytics — /analytics dashboard for reach + ack rates.
 *
 * KPIs and per-channel rates are computed from the live announcement
 * list, the team roster, and the per-announcement acknowledgment rosters.
 * The "trend" sparkline aggregates ack counts grouped by day for the
 * last 30 days. With zero data the page shows a calm empty state instead
 * of meaningless 0% bars.
 */
import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  type ApiUser,
  categoryColor,
} from '../lib/announcements.js'

const DATE_RANGES = [
  { id: '7d', labelKey: 'analytics.range7d', defaultLabel: 'Last 7 days', days: 7 },
  { id: '30d', labelKey: 'analytics.range30d', defaultLabel: 'Last 30 days', days: 30 },
  { id: 'qtd', labelKey: 'analytics.rangeQtd', defaultLabel: 'Quarter to date', days: 92 },
] as const

interface AckPair {
  announcementId: string
  acks: ApiAcknowledgment[]
}

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [team, setTeam] = useState<ApiUser[]>([])
  const [ackBuckets, setAckBuckets] = useState<AckPair[]>([])
  const [range, setRange] = useState<(typeof DATE_RANGES)[number]['id']>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<ApiAnnouncement[]>('/announcements'),
      http.get<ApiCategory[]>('/categories'),
      http.get<ApiUser[]>('/team'),
    ])
      .then(async ([annsR, catsR, teamR]) => {
        if (cancelled) return
        setAnnouncements(annsR.data)
        setCategories(catsR.data)
        setTeam(Array.isArray(teamR.data) ? teamR.data : [])
        const buckets = await Promise.all(
          annsR.data.map(async (a) => {
            try {
              const r = await http.get<ApiAcknowledgment[]>(
                `/announcements/${a.id}/acknowledgments`,
              )
              return { announcementId: a.id, acks: r.data }
            } catch (_error) {
              // best-effort — ack fetch fails gracefully; counts default to 0
              return { announcementId: a.id, acks: [] }
            }
          }),
        )
        if (!cancelled) setAckBuckets(buckets)
      })
      .catch((e) => {
        // Surface the failure instead of rendering a silent empty dashboard.
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
        if (!cancelled) setAnnouncements([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const days = useMemo(() => DATE_RANGES.find((r) => r.id === range)?.days ?? 30, [range])
  const since = useMemo(() => Date.now() - days * 24 * 60 * 60 * 1000, [days])

  const ackByAnn = useMemo(() => {
    const out: Record<string, ApiAcknowledgment[]> = {}
    for (const b of ackBuckets) out[b.announcementId] = b.acks
    return out
  }, [ackBuckets])

  const teamSize = Math.max(team.length, 1)
  const inRange = useMemo(
    () =>
      announcements.filter((a) => {
        const at = new Date(a.published_at ?? a.created_at).getTime()
        return at >= since && a.status === 'published'
      }),
    [announcements, since],
  )

  const totalReach = inRange.length * teamSize
  const totalAcks = inRange.reduce((sum, a) => sum + (ackByAnn[a.id]?.length ?? 0), 0)
  const ackRate = totalReach > 0 ? Math.round((totalAcks / totalReach) * 100) : 0
  const requireAckCount = inRange.filter((a) => a.requires_acknowledgment).length

  // Median time-to-ack in hours: per-announcement (median across acks of
  // ack.created_at - ann.published_at), then mean across announcements.
  const timeToAck = useMemo(() => {
    const perAnn: number[] = []
    for (const a of inRange) {
      const acks = ackByAnn[a.id] ?? []
      if (acks.length === 0) continue
      const annT = new Date(a.published_at ?? a.created_at).getTime()
      const deltas = acks
        .map((k) => new Date(k.acknowledged_at).getTime() - annT)
        .filter((d) => Number.isFinite(d) && d > 0)
      if (deltas.length === 0) continue
      deltas.sort((x, y) => x - y)
      const med = deltas[Math.floor(deltas.length / 2)] ?? 0
      perAnn.push(med)
    }
    if (perAnn.length === 0) return null
    const mean = perAnn.reduce((s, x) => s + x, 0) / perAnn.length
    const hours = mean / (1000 * 60 * 60)
    if (hours < 1) return `${Math.round(mean / (1000 * 60))}m`
    if (hours < 48) return `${hours.toFixed(1)}h`
    return `${Math.round(hours / 24)}d`
  }, [inRange, ackByAnn])

  const channelStats = useMemo(
    () =>
      categories.map((c) => {
        const items = inRange.filter((a) => a.category_id === c.id)
        const acked = items.reduce((s, a) => s + (ackByAnn[a.id]?.length ?? 0), 0)
        const total = items.filter((a) => a.requires_acknowledgment).length * teamSize
        const pct = total > 0 ? Math.round((acked / total) * 100) : 100
        return { ...c, posts: items.length, acked, total, pct, color: categoryColor(c) }
      }),
    [categories, inRange, ackByAnn, teamSize],
  )

  const trendValues = useMemo(() => {
    const buckets: number[] = new Array(days).fill(0)
    for (const a of inRange) {
      const acks = ackByAnn[a.id] ?? []
      for (const k of acks) {
        const dayIdx = Math.floor((Date.now() - new Date(k.acknowledged_at).getTime()) / 86_400_000)
        const slot = days - 1 - dayIdx
        if (slot >= 0 && slot < days) buckets[slot] = (buckets[slot] ?? 0) + 1
      }
    }
    return buckets
  }, [inRange, ackByAnn, days])

  const hasData = inRange.length > 0

  const trend = useMemo(() => {
    const max = Math.max(...trendValues, 1)
    const min = 0
    const r = max - min || 1
    const points = trendValues
      .map((v, i) => {
        const x = (i / Math.max(trendValues.length - 1, 1)) * 100
        const y = 100 - ((v - min) / r) * 90
        return `${x},${y}`
      })
      .join(' ')
    const areaPoints = `0,100 ${points} 100,100`
    return { points, areaPoints }
  }, [trendValues])

  const summary = [
    {
      label: t('status.published', {}, { defaultValue: 'Published' }),
      value: inRange.length,
      accent: 'normal' as const,
      delta: t(
        'analytics.kpiPostsDelta',
        { count: requireAckCount },
        { defaultValue: '{{count}} need ack' },
      ),
    },
    {
      label: t('analytics.kpiAckRate', {}, { defaultValue: 'Ack rate' }),
      value: `${ackRate}%`,
      accent: 'pinned' as const,
      delta: t(
        'analytics.kpiAckDelta',
        { acked: totalAcks, total: totalReach },
        { defaultValue: '{{acked}} of {{total}} possible' },
      ),
    },
    {
      label: t('analytics.kpiTta', {}, { defaultValue: 'Median time to ack' }),
      value: timeToAck ?? '—',
      accent: 'urgent' as const,
      delta: timeToAck ?? t('analytics.kpiTtaEmpty', {}, { defaultValue: 'No acks yet' }),
    },
    {
      label: t('analytics.kpiPeople', {}, { defaultValue: 'Team size' }),
      value: team.length,
      accent: 'fyi' as const,
      delta: t('analytics.kpiPeopleDelta', {}, { defaultValue: 'Roster' }),
    },
  ]

  const PRIORITY_ACCENT: Record<string, string> = {
    normal: 'var(--color-priority-normal, #4f46e5)',
    pinned: 'var(--color-priority-pinned, #d97706)',
    urgent: 'var(--color-priority-urgent, #dc2626)',
    fyi: 'var(--color-priority-fyi, #94a3b8)',
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('analytics.eyebrow', { company: APP_NAME }, { defaultValue: '{{company}} · admin' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-3xl md:text-4xl tracking-tight text-on-surface',
          )}
        >
          {t(
            'analytics.title',
            {},
            { defaultValue: 'Reach, acknowledgments, and the rooms you talk to.' },
          )}
        </h1>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {DATE_RANGES.map((r) => {
            const isActive = range === r.id
            return (
              <button
                key={r.id}
                type="button"
                data-testid={`analytics-range-${r.id}`}
                onClick={() => setRange(r.id)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.sp('px', 3),
                  'py-1.5',
                  'rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
                )}
              >
                {t(r.labelKey, {}, { defaultValue: r.defaultLabel })}
              </button>
            )
          })}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container',
          )}
        >
          {t(
            'analytics.loadError',
            { message: error },
            { defaultValue: 'Could not load analytics: {{message}}' },
          )}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('analytics.loading', {}, { defaultValue: 'Crunching numbers…' })}
        </p>
      ) : !hasData ? (
        <div
          data-testid="analytics-empty"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('py', 16),
            'rounded-2xl border border-dashed border-outline-variant/40 text-center text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-4xl text-primary">monitoring</span>
          <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}>
            {t(
              'analytics.emptyTitle',
              {},
              { defaultValue: 'No published announcements in this window yet.' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'max-w-md')}>
            {t(
              'analytics.emptyBody',
              {},
              {
                defaultValue:
                  'Publish your first announcement (or widen the date range) and the dashboard will populate from real ack data.',
              },
            )}
          </p>
        </div>
      ) : (
        <>
          <div
            data-testid="analytics-kpis"
            className={cm.cn('grid gap-3 grid-cols-2 lg:grid-cols-4')}
          >
            {summary.map((card) => (
              <div
                key={card.label}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-low/40',
                )}
                style={{ borderLeftWidth: '4px', borderLeftColor: PRIORITY_ACCENT[card.accent] }}
              >
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {card.label}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-3xl font-extrabold tabular-nums text-on-surface tracking-tight',
                  )}
                >
                  {card.value}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                  )}
                  style={{ color: PRIORITY_ACCENT[card.accent] }}
                >
                  {card.delta}
                </span>
              </div>
            ))}
          </div>

          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/40 bg-surface',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                'flex-wrap',
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'analytics.trendLabel',
                    { days },
                    { defaultValue: 'Acks · last {{days}} days' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-4xl font-extrabold tabular-nums text-on-surface',
                  )}
                >
                  {totalAcks}
                </span>
              </div>
            </div>
            <div className={cm.cn(cm.w('full'), 'h-32')}>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={cm.cn('w-full h-full')}
              >
                <defs>
                  <linearGradient id="ackTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--mol-color-primary, #4f46e5)"
                      stopOpacity="0.30"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--mol-color-primary, #4f46e5)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <polygon points={trend.areaPoints} fill="url(#ackTrendFill)" />
                <polyline
                  fill="none"
                  stroke="var(--mol-color-primary, #4f46e5)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={trend.points}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </section>

          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/40 bg-surface',
            )}
          >
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight text-on-surface')}>
              {t(
                'analytics.byChannelTitle',
                {},
                { defaultValue: 'Acknowledgment rate by channel' },
              )}
            </h2>
            {channelStats.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('analytics.noChannels', {}, { defaultValue: 'No channels yet.' })}
              </p>
            ) : (
              <table className={cm.cn(cm.w('full'), 'border-separate border-spacing-0 text-sm')}>
                <thead>
                  <tr className={cm.cn('text-left text-on-surface-variant')}>
                    <th
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.sp('py', 2),
                        'text-[10px] uppercase tracking-widest border-b border-outline-variant/40',
                      )}
                    >
                      {t('analytics.colChannel', {}, { defaultValue: 'Channel' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.sp('py', 2),
                        'text-[10px] uppercase tracking-widest border-b border-outline-variant/40',
                      )}
                    >
                      {t('analytics.colPosts', {}, { defaultValue: 'Posts' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.sp('py', 2),
                        'text-[10px] uppercase tracking-widest border-b border-outline-variant/40',
                      )}
                    >
                      {t('analytics.colAck', {}, { defaultValue: 'Acked / Possible' })}
                    </th>
                    <th
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.sp('py', 2),
                        'text-[10px] uppercase tracking-widest border-b border-outline-variant/40',
                      )}
                    >
                      {t('form.rate', {}, { defaultValue: 'Rate' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channelStats.map((c) => (
                    <tr
                      key={c.id}
                      data-testid={`analytics-row-${c.name}`}
                      className={cm.cn('hover:bg-surface-container-low/40 transition-colors')}
                    >
                      <td className={cm.cn(cm.sp('py', 3), 'border-b border-outline-variant/20')}>
                        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                          <span
                            className={cm.cn('material-symbols-outlined text-base')}
                            style={{ color: c.color }}
                            aria-hidden="true"
                          >
                            {c.icon ?? 'tag'}
                          </span>
                          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            #{c.name}
                          </span>
                        </span>
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          'border-b border-outline-variant/20 tabular-nums text-on-surface',
                        )}
                      >
                        {c.posts}
                      </td>
                      <td
                        className={cm.cn(
                          cm.sp('py', 3),
                          'border-b border-outline-variant/20 tabular-nums text-on-surface-variant',
                        )}
                      >
                        {c.acked} / {c.total || '—'}
                      </td>
                      <td className={cm.cn(cm.sp('py', 3), 'border-b border-outline-variant/20')}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            cm.sp('px', 2),
                            'py-0.5',
                            'rounded-full text-[10px] uppercase tracking-widest tabular-nums',
                          )}
                          style={
                            c.pct >= 80
                              ? {
                                  backgroundColor: 'var(--color-acknowledged-light, #d1fae5)',
                                  color: 'var(--color-acknowledged, #059669)',
                                }
                              : {
                                  backgroundColor: 'var(--color-priority-pinned-light, #fef3c7)',
                                  color: 'var(--color-priority-pinned, #d97706)',
                                }
                          }
                        >
                          {c.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Analytics
