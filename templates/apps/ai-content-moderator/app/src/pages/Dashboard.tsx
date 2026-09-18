import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { QueueItem } from '../components/QueueItemRow.js'
import { QueueItemRow } from '../components/QueueItemRow.js'
import { SiftLayout } from '../components/SiftLayout.js'
import { SiftStatsCard } from '../components/SiftStatsCard.js'
import type { Verdict } from '../components/VerdictBadge.js'
import { VerdictBadge } from '../components/VerdictBadge.js'

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

interface ApiFlaggedRow {
  id: string
  content_preview: string | null
  source: string
  decision: string | null
  status: string
  submitted_at: string
  metadata: { confidence?: number; priority?: QueueItem['priority'] } | null
}

const STATUS_TO_VERDICT: Record<string, Verdict> = {
  queued: 'pending',
  in_review: 'reviewing',
  decided: 'approved',
  escalated: 'escalated',
}

function decisionToVerdict(row: ApiFlaggedRow): Verdict {
  if (row.decision === 'approve') return 'approved'
  if (row.decision === 'reject') return 'rejected'
  if (row.status === 'escalated') return 'escalated'
  return STATUS_TO_VERDICT[row.status] ?? 'pending'
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [volume, setVolume] = useState<VolumeBucket[] | null>(null)
  const [recent, setRecent] = useState<QueueItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<SummaryResponse>('/api/moderation/stats/summary'),
      http.get<VolumeResponse>('/api/moderation/stats/volume'),
      http.get<ApiFlaggedRow[]>('/api/moderation/stats/recent'),
    ])
      .then(([summaryRes, volumeRes, recentRes]) => {
        if (cancelled) return
        setSummary(summaryRes.data)
        setVolume(volumeRes.data?.series ?? [])
        setRecent(
          (recentRes.data ?? []).map((row) => ({
            id: row.id,
            preview:
              row.content_preview ??
              t('dashboard.noPreview', {}, { defaultValue: 'No preview available' }),
            source: row.source,
            verdict: decisionToVerdict(row),
            confidence: row.metadata?.confidence ?? 0.5,
            age: relativeAge(row.submitted_at),
            priority: row.metadata?.priority ?? 'normal',
          })),
        )
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t(
            'dashboard.loadError',
            {},
            { defaultValue: 'Could not load dashboard metrics. Try again later.' },
          ),
        )
        setRecent([])
        setVolume([])
        setSummary({
          queued: 0,
          in_review: 0,
          decided: 0,
          escalated: 0,
          total: 0,
          approved: 0,
          rejected: 0,
        })
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalDonut = summary?.total ?? 0
  const approvedPct = totalDonut > 0 ? ((summary?.approved ?? 0) / totalDonut) * 100 : 0
  const rejectedPct = totalDonut > 0 ? ((summary?.rejected ?? 0) / totalDonut) * 100 : 0
  const escalatedPct = totalDonut > 0 ? ((summary?.escalated ?? 0) / totalDonut) * 100 : 0
  const pendingPct = Math.max(0, 100 - approvedPct - rejectedPct - escalatedPct)

  const maxVolume = Math.max(0, ...(volume ?? []).map((b) => b.value))

  return (
    <SiftLayout>
      <section>
        <h1
          className={cm.cn(
            'text-4xl md:text-5xl font-bold tracking-tight font-headline text-on-surface mb-2',
          )}
        >
          {t('dashboard.heading', {}, { defaultValue: 'Overview' })}
        </h1>
        <p className={cm.cn('text-on-surface-variant font-body')}>
          {t(
            'dashboard.subheading',
            {},
            { defaultValue: 'Monitor your queue and automation performance.' },
          )}
        </p>
        {error && (
          <div
            role="alert"
            className={cm.cn(
              'mt-4 rounded-lg border-l-4 border-amber-500 bg-warning-light px-4 py-3 text-sm text-warning',
            )}
          >
            {error}
          </div>
        )}
      </section>

      <section
        aria-label={t('dashboard.kpis', {}, { defaultValue: 'KPIs' })}
        className={cm.cn(cm.grid({ cols: 4, gap: 6 }))}
      >
        <SiftStatsCard
          label={t('dashboard.queueVolume', {}, { defaultValue: 'Queue volume' })}
          value={summary?.queued ?? '—'}
          unit={t('dashboard.items', {}, { defaultValue: 'items' })}
          icon="inbox"
          tone="amber"
          bar={summary && summary.total > 0 ? Math.min(1, summary.queued / summary.total) : 0}
        />
        <SiftStatsCard
          label={t('dashboard.approvedTotal', {}, { defaultValue: 'Approved' })}
          value={summary?.approved ?? '—'}
          icon="check_circle"
          tone="emerald"
        />
        <SiftStatsCard
          label={t('dashboard.rejectedTotal', {}, { defaultValue: 'Rejected' })}
          value={summary?.rejected ?? '—'}
          icon="cancel"
          tone="red"
        />
        <SiftStatsCard
          label={t('dashboard.totalReviewed', {}, { defaultValue: 'Total reviewed' })}
          value={summary?.total ?? '—'}
          icon="task_alt"
          tone="primary"
          accented
        />
      </section>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <article
          className={cm.cn(
            'col-span-12 lg:col-span-4 rounded-xl bg-surface-container-lowest shadow-sm p-6 flex flex-col',
          )}
        >
          <h3
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label mb-6',
            )}
          >
            {t('dashboard.verdictBreakdown', {}, { defaultValue: 'Verdict Breakdown' })}
          </h3>
          <div className={cm.cn('flex justify-center items-center h-48 relative')}>
            <DonutChart
              approvedPct={approvedPct}
              rejectedPct={rejectedPct}
              escalatedPct={escalatedPct}
              pendingPct={pendingPct}
            />
            <div
              className={cm.cn(
                'absolute inset-0 flex flex-col items-center justify-center pointer-events-none',
              )}
            >
              <span
                className={cm.cn('text-2xl font-bold text-on-surface font-headline tabular-nums')}
              >
                {totalDonut}
              </span>
              <span
                className={cm.cn('text-[10px] text-on-surface-variant uppercase tracking-widest')}
              >
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
            </div>
          </div>
          <ul
            className={cm.cn(
              'grid grid-cols-2 gap-3 mt-6 text-xs font-medium text-on-surface-variant',
            )}
          >
            <DonutLegend
              color="bg-emerald-500"
              label={t('dashboard.legend.approved', {}, { defaultValue: 'Approved' })}
            />
            <DonutLegend
              color="bg-red-500"
              label={t('dashboard.legend.rejected', {}, { defaultValue: 'Rejected' })}
            />
            <DonutLegend
              color="bg-purple-500"
              label={t('dashboard.legend.escalated', {}, { defaultValue: 'Escalated' })}
            />
            <DonutLegend
              color="bg-amber-500"
              label={t('status.pending', {}, { defaultValue: 'Pending' })}
            />
          </ul>
        </article>

        <article
          className={cm.cn(
            'col-span-12 lg:col-span-8 rounded-xl bg-surface-container-lowest shadow-sm p-6',
          )}
        >
          <header
            className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}
          >
            <h3
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
              )}
            >
              {t('dashboard.weeklyVolume', {}, { defaultValue: '7-Day Volume' })}
            </h3>
            <Link
              to="/analytics"
              className={cm.cn(
                'text-xs text-primary font-medium hover:underline flex items-center gap-1',
              )}
            >
              {t('dashboard.viewReport', {}, { defaultValue: 'View report' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[14px]')}>
                arrow_forward
              </span>
            </Link>
          </header>
          {volume === null ? (
            <p className={cm.cn('text-sm text-on-surface-variant py-12 text-center')}>
              {t('dashboard.volumeLoading', {}, { defaultValue: 'Loading volume…' })}
            </p>
          ) : volume.length === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant py-12 text-center')}>
              {t(
                'dashboard.volumeEmpty',
                {},
                { defaultValue: 'No volume yet — submissions will appear here.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('h-48 flex items-end justify-between gap-3')}>
              {volume.map((bar) => {
                const isMax = maxVolume > 0 && bar.value === maxVolume
                return (
                  <div
                    key={bar.date}
                    className={cm.cn('flex-1 flex flex-col items-center gap-2 h-full')}
                  >
                    <div className={cm.cn('w-full flex-1 flex items-end')}>
                      <div
                        className={cm.cn(
                          'w-full rounded-t-md transition-colors',
                          isMax ? 'bg-primary' : 'bg-surface-container-high',
                        )}
                        role="img"
                        style={{ height: `${Math.max(2, bar.height * 100)}%` }}
                        aria-label={t(
                          'dashboard.volumeBar',
                          { label: bar.label, count: bar.value },
                          { defaultValue: `${bar.label} ${bar.value} items` },
                        )}
                        title={t(
                          'dashboard.volumeBarTitle',
                          { count: bar.value },
                          { defaultValue: `${bar.value} items` },
                        )}
                      />
                    </div>
                    <span
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest font-bold',
                        isMax ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {bar.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>

      <section
        className={cm.cn('rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden')}
      >
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 5),
          )}
        >
          <h3
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label',
            )}
          >
            {t('dashboard.recentItems', {}, { defaultValue: 'Recent items' })}
          </h3>
          <Link
            to="/queue"
            className={cm.cn(
              'bg-gradient-to-br from-primary to-primary-container text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow-md transition-shadow',
            )}
          >
            {t('dashboard.manageQueue', {}, { defaultValue: 'Manage queue' })}
          </Link>
        </header>
        <div className={cm.cn('overflow-x-auto')}>
          <table className={cm.cn('w-full text-left border-collapse')}>
            <thead>
              <tr
                className={cm.cn(
                  'bg-surface-container-low text-[10px] uppercase tracking-widest text-on-surface-variant font-bold',
                )}
              >
                <th className={cm.cn('py-3 px-4 w-12 text-center')}></th>
                <th className={cm.cn('py-3 px-4 w-1/3')}>
                  {t('queue.col.preview', {}, { defaultValue: 'Content preview' })}
                </th>
                <th className={cm.cn('py-3 px-4')}>
                  {t('queue.col.source', {}, { defaultValue: 'Source' })}
                </th>
                <th className={cm.cn('py-3 px-4')}>
                  {t('queue.col.verdict', {}, { defaultValue: 'Verdict' })}
                </th>
                <th className={cm.cn('py-3 px-4 text-center')}>
                  {t('queue.col.confidence', {}, { defaultValue: 'Confidence' })}
                </th>
                <th className={cm.cn('py-3 px-4 text-right')}>
                  {t('queue.col.time', {}, { defaultValue: 'Time' })}
                </th>
              </tr>
            </thead>
            <tbody
              className={cm.cn(
                'text-sm divide-y divide-surface-container text-on-surface bg-surface-container-lowest',
              )}
            >
              {recent === null && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn('px-6 py-10 text-center text-sm text-on-surface-variant')}
                  >
                    {t('dashboard.recentLoading', {}, { defaultValue: 'Loading recent items…' })}
                  </td>
                </tr>
              )}
              {recent !== null && recent.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={cm.cn('px-6 py-10 text-center text-sm text-on-surface-variant')}
                  >
                    {t('dashboard.recentEmpty', {}, { defaultValue: 'No items submitted yet.' })}
                  </td>
                </tr>
              )}
              {recent?.map((item) => (
                <QueueItemRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'rounded-xl bg-surface-container-lowest shadow-sm p-6',
        )}
      >
        <div>
          <h3 className={cm.cn('text-lg font-bold text-on-surface font-headline')}>
            {t('dashboard.activeRules', {}, { defaultValue: 'Active rules' })}
          </h3>
          <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>
            {t(
              'dashboard.activeRulesBody',
              {},
              { defaultValue: 'Manage automation rules in the rule builder.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
          <VerdictBadge
            verdict="auto_moderated"
            label={t('dashboard.autoBadge', {}, { defaultValue: 'AUTO' })}
          />
          <Link
            to="/rules"
            className={cm.cn(
              'text-xs text-primary font-bold uppercase tracking-wider hover:underline',
            )}
          >
            {t('dashboard.editRules', {}, { defaultValue: 'Edit rules' })}
          </Link>
        </div>
      </section>
    </SiftLayout>
  )
}

function DonutChart({
  approvedPct,
  rejectedPct,
  escalatedPct,
  pendingPct,
}: {
  approvedPct: number
  rejectedPct: number
  escalatedPct: number
  pendingPct: number
}) {
  const cm = getClassMap()
  let offset = 0
  const segments: Array<{ length: number; color: string }> = [
    { length: approvedPct, color: '#16a34a' },
    { length: rejectedPct, color: '#dc2626' },
    { length: escalatedPct, color: '#a855f7' },
    { length: pendingPct, color: '#f59e0b' },
  ]
  return (
    <svg viewBox="0 0 36 36" className={cm.cn('w-40 h-40 -rotate-90')} aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="var(--color-surface-container-high)"
        strokeWidth="6"
      />
      {segments.map((s, i) => {
        const dash = `${s.length} 100`
        const node = (
          <circle
            key={i}
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={s.color}
            strokeWidth="6"
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            pathLength={100}
          />
        )
        offset += s.length
        return node
      })}
    </svg>
  )
}

function DonutLegend({ color, label }: { color: string; label: string }) {
  const cm = getClassMap()
  return (
    <li className={cm.cn('flex items-center gap-2')}>
      <span className={`w-3 h-3 rounded-full ${color}`} aria-hidden="true" />
      <span>{label}</span>
    </li>
  )
}

export default Dashboard
