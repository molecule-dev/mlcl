import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

interface TimesheetShiftRow {
  id: string
  date: string
  role: string
  time_label: string
  hours: number
  assigned_via: string
  published: boolean
  availability_warning: string | null
}

interface TimesheetRow {
  staff_id: string
  staff_name: string
  staff_initial: string
  role: string
  max_weekly_hours: number
  scheduled_hours: number
  scheduled_shifts: number
  claimed_hours: number
  claimed_shifts: number
  total_hours: number
  shifts: TimesheetShiftRow[]
}

interface TimesheetPayload {
  week_start: string
  total_hours: number
  staff: TimesheetRow[]
}

function isoWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function shiftWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function weekLabelParts(weekStart: string): { start: string; end: string } {
  const start = new Date(`${weekStart}T00:00:00Z`)
  const end = new Date(`${weekStart}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date): string =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return { start: fmt(start), end: fmt(end) }
}

/** CSV escape per RFC 4180 — quote a field when it contains , " or newline. */
function csvCell(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

/**
 * Client-side CSV export — no server dependency. Builds the blob from the
 * already-loaded timesheet payload and hands the browser a download link.
 */
function exportCsv(payload: TimesheetPayload): void {
  const header = [
    'staff',
    'role',
    'date',
    'role_on_shift',
    'start_end',
    'hours',
    'assigned_via',
    'published',
  ]
  const lines = [header.join(',')]
  for (const row of payload.staff) {
    for (const s of row.shifts) {
      lines.push(
        [
          csvCell(row.staff_name),
          csvCell(row.role),
          csvCell(s.date),
          csvCell(s.role),
          csvCell(s.time_label),
          csvCell(s.hours),
          csvCell(s.assigned_via),
          csvCell(s.published ? 'yes' : 'no'),
        ].join(','),
      )
    }
    // Totals row per staff member.
    lines.push(
      [
        csvCell(row.staff_name),
        csvCell(row.role),
        csvCell('TOTAL'),
        '',
        '',
        csvCell(Math.round(row.total_hours * 100) / 100),
        csvCell(`scheduled ${row.scheduled_hours} / claimed ${row.claimed_hours}`),
        '',
      ].join(','),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `timesheets-week-${payload.week_start}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  void track({
    name: 'timesheet.exported',
    properties: { week_start: payload.week_start, staff_rows: payload.staff.length },
  })
}

export function Timesheets() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [weekStart, setWeekStart] = useState(() => isoWeekStart(new Date()))
  const [payload, setPayload] = useState<TimesheetPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/timesheets?week_start=${weekStart}`)
      .then((res) => {
        if (!cancelled) setPayload(unwrapSingle<TimesheetPayload>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, weekStart])

  const label = weekLabelParts(weekStart)

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('timesheets.eyebrow', {}, { defaultValue: 'Payroll view' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('timesheets.heading', {}, { defaultValue: 'Timesheets' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'timesheets.subheading',
              {},
              {
                defaultValue:
                  'Completed shifts per person per week — scheduled versus claimed, exportable as CSV.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="timesheets-export"
          onClick={() => payload && exportCsv(payload)}
          disabled={!payload || payload.staff.length === 0}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            download
          </span>
          {t('timesheets.exportCta', {}, { defaultValue: 'Export CSV' })}
        </button>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            cm.sp('mb', 4),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              data-mol-id="timesheets-prev-week"
              onClick={() => setWeekStart((w) => shiftWeeks(w, -1))}
              aria-label={t('schedule.prevWeek', {}, { defaultValue: 'Previous week' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors material-symbols-outlined text-[20px]',
              )}
            >
              chevron_left
            </button>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface tabular-nums px-2',
              )}
            >
              {t('schedule.weekRange', label, { defaultValue: '{{start}} – {{end}}' })}
            </h2>
            <button
              type="button"
              data-mol-id="timesheets-next-week"
              onClick={() => setWeekStart((w) => shiftWeeks(w, 1))}
              aria-label={t('schedule.nextWeek', {}, { defaultValue: 'Next week' })}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors material-symbols-outlined text-[20px]',
              )}
            >
              chevron_right
            </button>
          </div>
          {payload ? (
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'timesheets.totalHours',
                { hours: payload.total_hours },
                { defaultValue: '{{hours}} hours completed' },
              )}
            </span>
          ) : null}
        </header>

        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner message={error} />
        ) : !payload || payload.staff.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('timesheets.empty', {}, { defaultValue: 'No completed shifts this week yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {payload.staff.map((row) => {
              const open = expanded === row.staff_id
              const over = row.max_weekly_hours > 0 && row.total_hours > row.max_weekly_hours
              return (
                <li key={row.staff_id} data-mol-id={`timesheet-row-${row.staff_id}`}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark font-bold',
                        cm.shrink0,
                      )}
                    >
                      {row.staff_initial}
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                        {row.staff_name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {row.role} ·{' '}
                        {t(
                          'timesheets.scheduledVsClaimed',
                          { scheduled: row.scheduled_hours, claimed: row.claimed_hours },
                          { defaultValue: '{{scheduled}}h scheduled · {{claimed}}h claimed' },
                        )}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        'font-extrabold tabular-nums tracking-tight',
                        over ? 'text-error' : 'text-on-surface',
                      )}
                    >
                      {Math.round(row.total_hours * 10) / 10}
                      <span
                        className={cm.cn(cm.textSize('xs'), 'font-medium text-on-surface-variant')}
                      >
                        {' '}
                        / {row.max_weekly_hours}
                        {t(
                          'shiftDetail.hours',
                          { count: row.max_weekly_hours },
                          { defaultValue: 'h' },
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : row.staff_id)}
                      aria-expanded={open}
                      aria-label={t(
                        'timesheets.toggleDetail',
                        {},
                        { defaultValue: 'Toggle shift detail' },
                      )}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors material-symbols-outlined text-[20px]',
                      )}
                    >
                      {open ? 'expand_less' : 'expand_more'}
                    </button>
                  </div>
                  {open ? (
                    <ul className={cm.cn(cm.sp('pb', 4), cm.stack(1))}>
                      {row.shifts.map((s) => (
                        <li
                          key={s.id}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            'rounded-lg bg-surface-container-low text-sm',
                            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          )}
                        >
                          <span className={cm.cn('tabular-nums text-on-surface-variant')}>
                            {s.date} · {s.time_label}
                          </span>
                          <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                            {s.availability_warning ? (
                              <span
                                title={t(
                                  'shiftDetail.availabilityWarning',
                                  {},
                                  { defaultValue: 'Outside declared availability' },
                                )}
                                className={cm.cn(
                                  'text-[color:var(--color-warn-flag)] material-symbols-outlined text-[16px]',
                                )}
                                aria-hidden="true"
                              >
                                warning
                              </span>
                            ) : null}
                            <span className={cm.cn('text-xs font-semibold text-primary-dark')}>
                              {s.role}
                            </span>
                            {s.assigned_via !== 'assigned' ? (
                              <span
                                className={cm.cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                                  'bg-primary/10 text-primary-dark',
                                )}
                              >
                                {s.assigned_via}
                              </span>
                            ) : null}
                            <span className={cm.cn('font-bold tabular-nums text-on-surface')}>
                              {s.hours}
                              {t('shiftDetail.hours', { count: s.hours }, { defaultValue: 'h' })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
