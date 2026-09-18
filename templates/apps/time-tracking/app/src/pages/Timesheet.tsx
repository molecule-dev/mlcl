import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useTimer } from '../lib/TimerContext.js'
import type { ApiClient, ApiProject, ApiTimeEntry } from '../lib/types.js'
import { unwrapList } from '../lib/unwrap.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const offset = day === 0 ? 6 : day - 1
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  return date
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtHours(h: number): string {
  if (h === 0) return '—'
  return h.toFixed(2)
}

export function Timesheet() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { entriesVersion } = useTimer()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [entries, setEntries] = useState<ReadonlyArray<ApiTimeEntry>>([])
  const [projects, setProjects] = useState<ReadonlyArray<ApiProject>>([])
  const [clients, setClients] = useState<ReadonlyArray<ApiClient>>([])
  const [loading, setLoading] = useState(true)

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

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [weekStart],
  )

  const todayIdx = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return days.findIndex((d) => d.getTime() === today.getTime())
  }, [days])

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  type Row = {
    projectId: string
    projectName: string
    client: string
    color: string
    hours: number[]
  }

  const rows = useMemo<Row[]>(() => {
    const buckets = new Map<string, Row>()
    const weekStartMs = weekStart.getTime()
    const weekEndMs = weekStartMs + 7 * 86_400_000
    for (const e of entries) {
      const ms = new Date(e.started_at).getTime()
      if (ms < weekStartMs || ms >= weekEndMs) continue
      const dayIndex = Math.floor((ms - weekStartMs) / 86_400_000)
      if (dayIndex < 0 || dayIndex > 6) continue
      const key = e.project_id ?? '__no_project'
      const project = e.project_id ? projectById.get(e.project_id) : null
      const client = project?.client_id ? clientById.get(project.client_id) : null
      const row =
        buckets.get(key) ??
        ({
          projectId: e.project_id ?? '',
          projectName:
            project?.name ?? t('timesheet.unassigned', {}, { defaultValue: 'No project' }),
          client: client?.name ?? t('timesheet.internal', {}, { defaultValue: 'Internal' }),
          color: project?.color ?? '#94a3b8',
          hours: [0, 0, 0, 0, 0, 0, 0],
        } as Row)
      row.hours[dayIndex] += (e.duration_seconds ?? 0) / 3600
      buckets.set(key, row)
    }
    return Array.from(buckets.values()).sort(
      (a, b) => b.hours.reduce((x, y) => x + y, 0) - a.hours.reduce((x, y) => x + y, 0),
    )
  }, [entries, weekStart, projectById, clientById, t])

  const dayTotals = DAY_LABELS.map((_, i) => rows.reduce((acc, r) => acc + r.hours[i], 0))
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0)

  const shiftWeek = (delta: number) => {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
  }

  const goToday = () => setWeekStart(startOfWeek(new Date()))

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1400px] mx-auto')}
      data-test="timesheet-page"
    >
      <section className={cm.flex({ justify: 'between', align: 'end', wrap: 'wrap' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
            {t('timesheet.eyebrow', {}, { defaultValue: 'Weekly view' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-foreground')}
          >
            {t('timesheet.title', {}, { defaultValue: 'Timesheet' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-foreground-secondary')}>
            {t(
              'timesheet.subtitle',
              {},
              { defaultValue: 'Hours per project per day, tallied from your tracked entries.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label={t('timesheet.previousWeek', {}, { defaultValue: 'Previous week' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
            data-test="timesheet-prev"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={goToday}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full bg-surface border border-border text-foreground hover:bg-surface-secondary tabular-nums',
            )}
            data-test="timesheet-today"
          >
            {fmtDate(days[0])} – {fmtDate(days[6])}
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label={t('timesheet.nextWeek', {}, { defaultValue: 'Next week' })}
            className={cm.cn(
              cm.sp('p', 2),
              cm.roundedFull,
              'bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
            )}
            data-test="timesheet-next"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              chevron_right
            </span>
          </button>
        </div>
      </section>

      <section className={cm.cn('bg-surface rounded-2xl shadow-sm overflow-hidden')}>
        <div
          className={cm.cn(
            'grid items-center bg-surface-secondary border-b border-border text-[10px] uppercase tracking-widest font-bold text-foreground-secondary',
          )}
          style={{
            gridTemplateColumns: 'minmax(220px,1.4fr) repeat(7, minmax(0,1fr)) minmax(80px,0.8fr)',
          }}
        >
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 3))}>
            {t('timesheet.column.project', {}, { defaultValue: 'Project' })}
          </div>
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 3),
                'tabular-nums',
                i === todayIdx ? 'text-blue-600' : '',
              )}
            >
              {label}
              <div className={cm.cn('text-[11px] tracking-normal text-foreground-secondary')}>
                {days[i].getDate()}
              </div>
            </div>
          ))}
          <div className={cm.cn(cm.textRight, cm.sp('px', 6), cm.sp('py', 3))}>
            {t('nav.total', {}, { defaultValue: 'Total' })}
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
            data-test="timesheet-empty"
          >
            {t('timesheet.empty', {}, { defaultValue: 'No tracked entries this week.' })}
          </p>
        ) : (
          rows.map((r) => {
            const rowTotal = r.hours.reduce((a, b) => a + b, 0)
            return (
              <div
                key={r.projectId || r.projectName}
                className={cm.cn(
                  'grid items-center border-b border-border hover:bg-surface-secondary transition-colors',
                )}
                style={{
                  gridTemplateColumns:
                    'minmax(220px,1.4fr) repeat(7, minmax(0,1fr)) minmax(80px,0.8fr)',
                }}
                data-test={`timesheet-row-${r.projectId || 'no-project'}`}
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
                    {r.projectId ? (
                      <Link
                        to={`/projects/${r.projectId}`}
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-foreground truncate hover:underline',
                        )}
                      >
                        {r.projectName}
                      </Link>
                    ) : (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-foreground truncate',
                        )}
                      >
                        {r.projectName}
                      </span>
                    )}
                    <p
                      className={cm.cn(
                        'text-[11px] text-foreground-secondary truncate uppercase tracking-wider',
                      )}
                    >
                      {r.client}
                    </p>
                  </div>
                </div>
                {r.hours.map((h, i) => (
                  <div
                    key={i}
                    className={cm.cn(
                      cm.textCenter,
                      cm.sp('py', 4),
                      cm.textSize('sm'),
                      'tabular-nums font-mono',
                      h === 0 ? 'text-foreground-tertiary' : 'text-foreground font-semibold',
                      i === todayIdx ? 'bg-blue-50/40' : '',
                    )}
                  >
                    {fmtHours(h)}
                  </div>
                ))}
                <div
                  className={cm.cn(
                    cm.textRight,
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.textSize('sm'),
                    'tabular-nums font-mono font-bold text-foreground',
                  )}
                >
                  {rowTotal.toFixed(2)}
                </div>
              </div>
            )
          })
        )}

        <div
          className={cm.cn('grid items-center bg-surface-secondary border-t-2 border-border')}
          style={{
            gridTemplateColumns: 'minmax(220px,1.4fr) repeat(7, minmax(0,1fr)) minmax(80px,0.8fr)',
          }}
        >
          <div
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-foreground uppercase tracking-wider',
            )}
          >
            {t('timesheet.dailyTotal', {}, { defaultValue: 'Daily total' })}
          </div>
          {dayTotals.map((d, i) => (
            <div
              key={i}
              className={cm.cn(
                cm.textCenter,
                cm.sp('py', 4),
                cm.textSize('sm'),
                'tabular-nums font-mono font-bold',
                i === todayIdx ? 'text-blue-700' : 'text-foreground',
              )}
            >
              {d > 0 ? d.toFixed(2) : '—'}
            </div>
          ))}
          <div
            className={cm.cn(
              cm.textRight,
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.textSize('lg'),
              'tabular-nums font-mono font-extrabold text-blue-700',
            )}
            data-test="timesheet-total"
          >
            {weekTotal.toFixed(2)}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Timesheet
export { Timesheet as TimesheetPage }
