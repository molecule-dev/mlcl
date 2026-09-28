import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SiftLayout } from '../components/SiftLayout.js'
import { SiftStatsCard } from '../components/SiftStatsCard.js'

interface SummaryResponse {
  queued: number
  in_review: number
  decided: number
  escalated: number
  total: number
  approved: number
  rejected: number
}

interface VolumeBucket {
  date: string
  label: string
  value: number
  height: number
}

interface VolumeResponse {
  series: VolumeBucket[]
  max: number
}

const RANGES = [
  { id: '24h', label: 'Last 24h', days: 1 },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
] as const

/** Resolve a `?range=` id to the number of trailing days to chart. */
function rangeToDays(range: string): number {
  return RANGES.find((r) => r.id === range)?.days ?? 7
}

const CATEGORY_PALETTE = ['#dc2626', '#d97706', '#a855f7', '#0ea5e9', '#16a34a', '#64748b'] as const

export function Analytics() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const range = searchParams.get('range') ?? '7d'
  const setRange = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('range', next)
    setSearchParams(params, { replace: false })
  }
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [volume, setVolume] = useState<VolumeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const days = rangeToDays(range)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<SummaryResponse>('/api/moderation/stats/summary'),
      http.get<VolumeResponse>(`/api/moderation/stats/volume?days=${days}`),
    ])
      .then(([summaryRes, volumeRes]) => {
        if (cancelled) return
        setSummary(summaryRes.data)
        setVolume(volumeRes.data)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('analytics.loadError', {}, { defaultValue: 'Could not load analytics.' }))
        setSummary({
          queued: 0,
          in_review: 0,
          decided: 0,
          escalated: 0,
          total: 0,
          approved: 0,
          rejected: 0,
        })
        setVolume({ series: [], max: 1 })
      })
    return () => {
      cancelled = true
    }
  }, [http, t, days])

  const total = summary?.total ?? 0
  const approvedPct = total > 0 ? (summary?.approved ?? 0) / total : 0
  const rejectedPct = total > 0 ? (summary?.rejected ?? 0) / total : 0
  const escalatedPct = total > 0 ? (summary?.escalated ?? 0) / total : 0
  const aiAgreement =
    total > 0
      ? Math.round(((summary?.decided ?? 0) / Math.max(1, total - (summary?.queued ?? 0))) * 100)
      : 0

  const bars = useMemo(() => {
    const series = volume?.series ?? []
    return series.map((bar) => ({
      ...bar,
      approved: bar.value > 0 ? bar.height * approvedPct : 0,
      rejected: bar.value > 0 ? bar.height * rejectedPct : 0,
      escalated: bar.value > 0 ? bar.height * escalatedPct : 0,
    }))
  }, [volume, approvedPct, rejectedPct, escalatedPct])

  const categories = useMemo(() => {
    const distribution: { name: string; value: number }[] = [
      {
        name: t('analytics.cat.approved', {}, { defaultValue: 'Approved' }),
        value: approvedPct,
      },
      {
        name: t('analytics.cat.rejected', {}, { defaultValue: 'Rejected' }),
        value: rejectedPct,
      },
      {
        name: t('analytics.cat.escalated', {}, { defaultValue: 'Escalated' }),
        value: escalatedPct,
      },
      {
        name: t('status.pending', {}, { defaultValue: 'Pending' }),
        value: total > 0 ? (summary?.queued ?? 0) / total : 0,
      },
    ]
    return distribution.map((c, i) => ({
      ...c,
      tint: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }))
  }, [approvedPct, rejectedPct, escalatedPct, summary, total, t])

  async function exportCsv() {
    setExporting(true)
    setError(null)
    setFeedback(null)
    try {
      // Always fetch fresh volume data so the CSV reflects the latest
      // server state and isn't dependent on whether the page-load fetch
      // has resolved yet (race when user clicks Export immediately).
      let series = volume?.series ?? []
      try {
        const fresh = await http.get<VolumeResponse>(`/api/moderation/stats/volume?days=${days}`)
        series = fresh.data?.series ?? series
        setVolume(fresh.data)
      } catch (_error) {
        // Fall back to whatever we already have in state — a stale volume is acceptable for CSV export.
      }
      const lines = ['date,total']
      for (const bar of series) {
        lines.push(`${bar.date},${bar.value}`)
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${range}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setFeedback(t('analytics.exportOk', {}, { defaultValue: 'CSV export started.' }))
    } catch (error) {
      logError('analytics.exportCsv', error)
      setError(t('analytics.exportError', {}, { defaultValue: 'CSV export failed.' }))
    } finally {
      setExporting(false)
    }
  }

  return (
    <SiftLayout
      actions={
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className={cm.cn(
            'border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors inline-flex items-center gap-2 disabled:opacity-60',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[16px]')}>
            download
          </span>
          {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
        </button>
      }
    >
      <header className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), 'gap-4 flex-wrap')}>
        <div>
          <h1
            className={cm.cn(
              'text-4xl font-bold tracking-tight font-headline text-on-surface mb-2',
            )}
          >
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant')}>
            {t(
              'analytics.subheading',
              {},
              { defaultValue: 'Verdict trends, AI accuracy, reviewer throughput.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 flex-wrap')}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              className={cm.cn(
                'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors',
                range === r.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container',
              )}
            >
              {t(`analytics.range.${r.id}`, {}, { defaultValue: r.label })}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.accentCard({ tone: 'error' }),
            'rounded-lg bg-error-light pr-4 py-3 text-sm text-error',
          )}
        >
          {error}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className={cm.cn(
            cm.accentCard({ tone: 'success' }),
            'rounded-lg bg-success-light pr-4 py-3 text-sm text-success',
          )}
        >
          {feedback}
        </div>
      )}

      <section className={cm.cn(cm.grid({ cols: 4, gap: 6 }))}>
        <SiftStatsCard
          label={t('analytics.kpi.totalReviewed', {}, { defaultValue: 'Total reviewed' })}
          value={summary?.total ?? '—'}
          icon="task_alt"
          tone="primary"
          accented
        />
        <SiftStatsCard
          label={t('analytics.kpi.aiAgreement', {}, { defaultValue: 'AI agreement' })}
          value={total > 0 ? `${aiAgreement}%` : '—'}
          icon="psychology"
          tone="emerald"
        />
        <SiftStatsCard
          label={t('analytics.kpi.escalationRate', {}, { defaultValue: 'Escalation rate' })}
          value={total > 0 ? `${Math.round(escalatedPct * 100)}%` : '—'}
          icon="trending_down"
          tone="purple"
        />
        <SiftStatsCard
          label={t('analytics.kpi.queueDepth', {}, { defaultValue: 'Queue depth' })}
          value={summary?.queued ?? '—'}
          icon="schedule"
          tone="amber"
        />
      </section>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <article
          className={cm.cn(
            'col-span-12 lg:col-span-8 rounded-xl bg-surface-container-lowest shadow-sm p-6',
          )}
        >
          <h2
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-6',
            )}
          >
            {t('analytics.verdictTrend', {}, { defaultValue: 'Verdict trend' })}
          </h2>
          {volume === null ? (
            <p className={cm.cn('text-sm text-on-surface-variant py-12 text-center')}>
              {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
            </p>
          ) : bars.length === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant py-12 text-center')}>
              {t(
                'analytics.empty',
                {},
                { defaultValue: 'No activity yet — submissions will populate this chart.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('h-56 flex items-end justify-between gap-1')}>
              {bars.map((bar, index) => {
                // Long ranges (30/90 days) can't fit a label per bar — thin
                // them out so roughly seven labels remain readable.
                const labelEvery = Math.max(1, Math.ceil(bars.length / 7))
                const showLabel = index % labelEvery === 0
                return (
                  <div
                    key={bar.date}
                    className={cm.cn('flex-1 flex flex-col items-center gap-2 h-full min-w-0')}
                  >
                    <div className={cm.cn('w-full flex-1 flex flex-col justify-end gap-1')}>
                      <div
                        className={cm.cn('w-full rounded-t-md bg-purple-500')}
                        style={{ height: `${Math.max(0, bar.escalated * 100)}%` }}
                        title={t(
                          'analytics.barTitle.escalated',
                          { pct: Math.round(bar.escalated * 100) },
                          { defaultValue: `Escalated ${Math.round(bar.escalated * 100)}%` },
                        )}
                      />
                      <div
                        className={cm.cn('w-full bg-red-500')}
                        style={{ height: `${Math.max(0, bar.rejected * 100)}%` }}
                        title={t(
                          'analytics.barTitle.rejected',
                          { pct: Math.round(bar.rejected * 100) },
                          { defaultValue: `Rejected ${Math.round(bar.rejected * 100)}%` },
                        )}
                      />
                      <div
                        className={cm.cn('w-full rounded-b-md bg-emerald-500')}
                        style={{ height: `${Math.max(0, bar.approved * 100)}%` }}
                        title={t(
                          'analytics.barTitle.approved',
                          { pct: Math.round(bar.approved * 100) },
                          { defaultValue: `Approved ${Math.round(bar.approved * 100)}%` },
                        )}
                      />
                    </div>
                    <span
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {showLabel ? bar.label : ' '}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <ul
            className={cm.cn(
              'flex items-center gap-4 mt-6 text-xs text-on-surface-variant font-medium',
            )}
          >
            <li className={cm.cn('flex items-center gap-2')}>
              <span className={cm.cn('w-3 h-3 rounded-full bg-emerald-500')} />
              {t('analytics.legend.approved', {}, { defaultValue: 'Approved' })}
            </li>
            <li className={cm.cn('flex items-center gap-2')}>
              <span className={cm.cn('w-3 h-3 rounded-full bg-red-500')} />
              {t('analytics.legend.rejected', {}, { defaultValue: 'Rejected' })}
            </li>
            <li className={cm.cn('flex items-center gap-2')}>
              <span className={cm.cn('w-3 h-3 rounded-full bg-purple-500')} />
              {t('analytics.legend.escalated', {}, { defaultValue: 'Escalated' })}
            </li>
          </ul>
        </article>

        <article
          className={cm.cn(
            'col-span-12 lg:col-span-4 rounded-xl bg-surface-container-lowest shadow-sm p-6',
          )}
        >
          <h2
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-6',
            )}
          >
            {t('analytics.categoryBreakdown', {}, { defaultValue: 'Verdict mix' })}
          </h2>
          {summary === null ? (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
            </p>
          ) : total === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'analytics.empty',
                {},
                { defaultValue: 'No activity yet — submissions will populate this chart.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {categories.map((cat) => (
                <li key={cat.name}>
                  <div
                    className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), 'mb-1.5')}
                  >
                    <span className={cm.cn('text-sm font-medium text-on-surface')}>{cat.name}</span>
                    <span
                      className={cm.cn('text-xs font-bold text-on-surface-variant tabular-nums')}
                    >
                      {Math.round(cat.value * 100)}%
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn('h-full rounded-full')}
                      style={{ width: `${cat.value * 100}%`, backgroundColor: cat.tint }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section
        className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
      >
        <header className={cm.cn('px-6 py-4 border-b border-surface-container')}>
          <h2
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
            )}
          >
            {t('analytics.summaryHeading', {}, { defaultValue: 'Decision summary' })}
          </h2>
        </header>
        <table className={cm.cn('w-full text-left border-collapse')}>
          <thead>
            <tr
              className={cm.cn(
                'bg-surface-container-low text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
              )}
            >
              <th className={cm.cn('px-6 py-3')}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
              <th className={cm.cn('px-6 py-3 text-right')}>
                {t('analytics.col.count', {}, { defaultValue: 'Count' })}
              </th>
              <th className={cm.cn('px-6 py-3 text-right')}>
                {t('common.share', {}, { defaultValue: 'Share' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-surface-container text-sm')}>
            {summary === null ? (
              <tr>
                <td
                  colSpan={3}
                  className={cm.cn('px-6 py-10 text-center text-sm text-on-surface-variant')}
                >
                  {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
                </td>
              </tr>
            ) : (
              [
                {
                  key: 'approved',
                  label: t('analytics.row.approved', {}, { defaultValue: 'Approved' }),
                  value: summary.approved,
                  cls: 'text-success',
                },
                {
                  key: 'rejected',
                  label: t('analytics.row.rejected', {}, { defaultValue: 'Rejected' }),
                  value: summary.rejected,
                  cls: 'text-error',
                },
                {
                  key: 'escalated',
                  label: t('analytics.row.escalated', {}, { defaultValue: 'Escalated' }),
                  value: summary.escalated,
                  cls: 'text-purple-700',
                },
                {
                  key: 'queued',
                  label: t('status.queued', {}, { defaultValue: 'Queued' }),
                  value: summary.queued,
                  cls: 'text-warning',
                },
                {
                  key: 'in_review',
                  label: t('analytics.row.inReview', {}, { defaultValue: 'In review' }),
                  value: summary.in_review,
                  cls: 'text-on-surface',
                },
              ].map((row) => (
                <tr
                  key={row.key}
                  className={cm.cn('hover:bg-surface-container-low/50 transition-colors')}
                >
                  <td className={cm.cn('px-6 py-4 font-semibold', row.cls)}>{row.label}</td>
                  <td className={cm.cn('px-6 py-4 text-right tabular-nums')}>
                    {row.value.toLocaleString()}
                  </td>
                  <td
                    className={cm.cn('px-6 py-4 text-right tabular-nums text-on-surface-variant')}
                  >
                    {total > 0 ? `${Math.round((row.value / total) * 100)}%` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </SiftLayout>
  )
}

export default Analytics
