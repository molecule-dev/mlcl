import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DurationKpiCard } from '../components/DurationKpiCard.js'
import { formatCents, formatHourMinute } from '../lib/format.js'
import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

const RANGES = [
  { key: 'this-week', label: 'This week', days: 7, anchor: 'week-start' },
  { key: 'this-month', label: 'This month', days: 31, anchor: 'month-start' },
  { key: 'last-month', label: 'Last month', days: 31, anchor: 'last-month' },
  { key: 'this-year', label: 'This year', days: 365, anchor: 'year-start' },
] as const

type RangeKey = (typeof RANGES)[number]['key']

function rangeBounds(key: RangeKey): { start: Date; end: Date } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (key === 'this-week') {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date()
    return { start, end }
  }
  if (key === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date()
    return { start, end }
  }
  if (key === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { start, end }
  }
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date()
  return { start, end }
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { entriesVersion } = useTimer()

  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [clients, setClients] = useState<ReadonlyArray<ApiClient>>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>('this-week')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/entries').catch(() => null),
      http.get('/api/projects').catch(() => null),
      http.get('/api/clients').catch(() => null),
    ])
      .then(([e, p, c]) => {
        if (cancelled) return
        setEntries(unwrapList<ApiTimeEntry>(e))
        setProjects(unwrapList<ApiProject>(p))
        setClients(unwrapList<ApiClient>(c))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, entriesVersion])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const bounds = useMemo(() => rangeBounds(range), [range])

  const inRange = useMemo(() => {
    return entries.filter((e) => {
      const ms = new Date(e.started_at).getTime()
      return ms >= bounds.start.getTime() && ms <= bounds.end.getTime()
    })
  }, [entries, bounds])

  const totalSeconds = inRange.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
  const billableSeconds = inRange
    .filter((e) => e.is_billable)
    .reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0)
  const totalRevenueCents = inRange
    .filter((e) => e.is_billable)
    .reduce((acc, e) => {
      const project = e.project_id ? projectById.get(e.project_id) : null
      const rate = project?.hourly_rate_cents ?? 0
      return acc + Math.round(((e.duration_seconds ?? 0) / 3600) * rate)
    }, 0)
  const billablePct = totalSeconds > 0 ? Math.round((billableSeconds / totalSeconds) * 100) : 0

  // Per-day buckets for the bar chart (week or last 7 days).
  const dayBuckets = useMemo(() => {
    const buckets: { label: string; hours: number; index: number }[] = []
    if (range === 'this-week') {
      const start = bounds.start
      for (let i = 0; i < 7; i++) {
        buckets.push({ label: DAY_LABELS[i][0], hours: 0, index: i })
      }
      for (const e of inRange) {
        const d = new Date(e.started_at)
        d.setHours(0, 0, 0, 0)
        const diff = Math.floor((d.getTime() - start.getTime()) / 86_400_000)
        if (diff >= 0 && diff < 7) {
          buckets[diff].hours += (e.duration_seconds ?? 0) / 3600
        }
      }
      return buckets
    }
    // For other ranges, bucket by 7 equal slices.
    const slices = 7
    const span = bounds.end.getTime() - bounds.start.getTime()
    const sliceMs = span / slices
    for (let i = 0; i < slices; i++) {
      buckets.push({ label: '', hours: 0, index: i })
    }
    for (const e of inRange) {
      const ms = new Date(e.started_at).getTime() - bounds.start.getTime()
      const idx = Math.min(slices - 1, Math.max(0, Math.floor(ms / sliceMs)))
      buckets[idx].hours += (e.duration_seconds ?? 0) / 3600
    }
    return buckets
  }, [inRange, bounds, range])

  const maxBar = Math.max(...dayBuckets.map((b) => b.hours), 1)

  // Per-project rows
  type Row = {
    project_id: string | null
    name: string
    client: string
    color: string
    seconds: number
    revenueCents: number
  }

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>()
    for (const e of inRange) {
      const project = e.project_id ? projectById.get(e.project_id) : null
      const client = project?.client_id ? clientById.get(project.client_id) : null
      const key = e.project_id ?? '__no_project'
      const existing = map.get(key) ?? {
        project_id: e.project_id,
        name: project?.name ?? t('reports.unassigned', {}, { defaultValue: 'No project' }),
        client: client?.name ?? t('reports.internal', {}, { defaultValue: 'Internal' }),
        color: project?.color ?? '#94a3b8',
        seconds: 0,
        revenueCents: 0,
      }
      existing.seconds += e.duration_seconds ?? 0
      if (e.is_billable && project?.hourly_rate_cents) {
        existing.revenueCents += Math.round(
          ((e.duration_seconds ?? 0) / 3600) * project.hourly_rate_cents,
        )
      }
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds)
  }, [inRange, projectById, clientById, t])

  const onExport = () => {
    const lines = ['project,client,hours,revenue_usd']
    for (const r of rows) {
      lines.push(
        [
          JSON.stringify(r.name),
          JSON.stringify(r.client),
          (r.seconds / 3600).toFixed(2),
          (r.revenueCents / 100).toFixed(2),
        ].join(','),
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="reports-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('reports.eyebrow', {}, { defaultValue: 'Insights' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'reports.subtitle',
              {},
              { defaultValue: 'Where your hours go and how much they earn.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 1),
            'inline-flex bg-surface rounded-full border border-border',
          )}
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                range === r.key
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'text-foreground-secondary hover:text-foreground',
              )}
              data-test={`range-${r.key}`}
            >
              {t(`reports.range.${r.key}`, {}, { defaultValue: r.label })}
            </button>
          ))}
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
        <DurationKpiCard
          label={t('reports.kpi.totalHours', {}, { defaultValue: 'Total hours' })}
          value={formatHourMinute(totalSeconds)}
          icon="schedule"
          accent="primary"
        />
        <DurationKpiCard
          label={t('reports.kpi.billable', {}, { defaultValue: 'Billable hours' })}
          value={formatHourMinute(billableSeconds)}
          icon="attach_money"
          accent="violet"
        />
        <DurationKpiCard
          label={t('reports.kpi.revenue', {}, { defaultValue: 'Estimated revenue' })}
          value={formatCents(totalRevenueCents)}
          icon="payments"
          accent="emerald"
        />
        <DurationKpiCard
          label={t('reports.kpi.billablePct', {}, { defaultValue: 'Billable %' })}
          value={`${billablePct}%`}
          icon="bolt"
          accent="amber"
          mono={false}
        />
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6 items-start')}>
        <div className={cm.cn('lg:col-span-2 bg-surface rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
            <div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
                {t('reports.weekly.title', {}, { defaultValue: 'Hours per day' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(`reports.range.${range}`, {}, { defaultValue: range })}
              </p>
            </div>
          </div>
          {totalSeconds === 0 ? (
            <p
              className={cm.cn(
                cm.sp('py', 12),
                cm.textCenter,
                cm.textSize('sm'),
                'text-foreground-secondary',
              )}
              data-test="reports-bar-empty"
            >
              {t('reports.empty', {}, { defaultValue: 'No tracked time in this period.' })}
            </p>
          ) : (
            <div className={cm.cn('h-64 grid grid-cols-7 gap-3 items-end')}>
              {dayBuckets.map((b, i) => (
                <div
                  key={i}
                  className={cm.cn('flex flex-col items-center gap-2 h-full justify-end')}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'tabular-nums font-mono font-bold text-foreground',
                    )}
                  >
                    {b.hours > 0 ? b.hours.toFixed(1) : ''}
                  </span>
                  <div
                    className={cm.cn(
                      'w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-emerald-500',
                    )}
                    style={{
                      height: `${(b.hours / maxBar) * 100}%`,
                      minHeight: b.hours > 0 ? '12px' : '0',
                    }}
                  />
                  <span
                    className={cm.cn(
                      'text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
                    )}
                  >
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cm.cn('bg-surface rounded-2xl shadow-sm', cm.sp('p', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-foreground',
              cm.sp('mb', 6),
            )}
          >
            {t('reports.mix.title', {}, { defaultValue: 'Billable mix' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}>
            <svg
              width="180"
              height="180"
              viewBox="0 0 36 36"
              className={cm.cn('transform -rotate-90')}
            >
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="var(--mol-color-border)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="var(--color-billable)"
                strokeWidth="3"
                strokeDasharray={`${billablePct} ${100 - billablePct}`}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('mt', 4),
              cm.stack(1),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('3xl'),
                'font-extrabold tabular-nums font-mono text-foreground',
              )}
            >
              {billablePct}%
            </span>
            <span
              className={cm.cn(
                'text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
              )}
            >
              {t('reports.mix.label', {}, { defaultValue: 'Billable' })}
            </span>
          </div>
        </div>
      </section>

      <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            cm.sp('py', 5),
            'border-b border-border',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-foreground')}>
            {t('reports.byProject.title', {}, { defaultValue: 'By project' })}
          </h2>
          <button
            onClick={onExport}
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg bg-surface-secondary hover:bg-surface-secondary text-foreground transition-colors',
            )}
            data-test="reports-export"
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              file_download
            </span>
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
        </div>
        <div
          className={cm.cn(
            'grid items-center bg-surface-secondary border-b border-border text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
          )}
          style={{
            gridTemplateColumns:
              'minmax(220px,1.6fr) minmax(120px,0.8fr) minmax(120px,0.8fr) minmax(160px,1fr)',
          }}
        >
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 3))}>
            {t('reports.col.project', {}, { defaultValue: 'Project' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('reports.col.hours', {}, { defaultValue: 'Hours' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3))}>
            {t('common.share', {}, { defaultValue: 'Share' })}
          </div>
          <div className={cm.cn(cm.sp('py', 3), cm.textRight, cm.sp('pr', 6))}>
            {t('reports.col.revenue', {}, { defaultValue: 'Revenue' })}
          </div>
        </div>
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : rows.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-foreground-secondary',
            )}
            data-test="reports-table-empty"
          >
            {t('reports.empty', {}, { defaultValue: 'No tracked time in this period.' })}
          </p>
        ) : (
          rows.map((r) => {
            const share = totalSeconds > 0 ? (r.seconds / totalSeconds) * 100 : 0
            return (
              <div
                key={r.project_id ?? '__no_project'}
                className={cm.cn(
                  'grid items-center border-b border-border last:border-b-0 hover:bg-surface-secondary transition-colors',
                )}
                style={{
                  gridTemplateColumns:
                    'minmax(220px,1.6fr) minmax(120px,0.8fr) minmax(120px,0.8fr) minmax(160px,1fr)',
                }}
                data-test={`report-row-${r.project_id ?? 'no-project'}`}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                  )}
                >
                  <span
                    className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'shrink-0')}
                    style={{ backgroundColor: r.color }}
                  />
                  <div className={cm.cn('min-w-0')}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-foreground truncate',
                      )}
                    >
                      {r.name}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[11px] text-foreground-secondary truncate uppercase tracking-wider',
                      )}
                    >
                      {r.client}
                    </p>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-bold text-foreground',
                  )}
                >
                  {(r.seconds / 3600).toFixed(1)}h
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <div
                    className={cm.cn(
                      'relative h-2 w-32 rounded-full bg-surface-secondary overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn('absolute inset-y-0 left-0 rounded-full')}
                      style={{ width: `${share}%`, backgroundColor: r.color }}
                    />
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'tabular-nums font-mono font-bold text-foreground-secondary',
                    )}
                  >
                    {share.toFixed(0)}%
                  </span>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('pr', 6),
                    cm.textRight,
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-bold text-foreground',
                  )}
                >
                  {r.revenueCents > 0 ? formatCents(r.revenueCents) : '—'}
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

export default Reports
export { Reports as ReportsPage }
