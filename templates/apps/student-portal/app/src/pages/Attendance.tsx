import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { type ApiAttendance, weekdayLabel } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface AttendanceSummary {
  total: number
  present: number
  tardy: number
  absent: number
  excused: number
  presentRate: number
}

const STATUS_TONE = {
  present: 'bg-success-light text-success',
  absent: 'bg-rose-100 text-error',
  tardy: 'bg-warning-light text-warning',
  excused: 'bg-surface-secondary text-foreground-secondary',
} as const

const STATUS_DOT = {
  present: 'bg-emerald-500',
  absent: 'bg-rose-500',
  tardy: 'bg-amber-500',
  excused: 'bg-slate-400',
} as const

export function Attendance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [rows, setRows] = useState<ApiAttendance[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Returns the promise so the shared LoadErrorBanner's retry button owns
  // the pending/disabled state while a refetch is in flight.
  const load = useCallback((): Promise<void> => {
    setLoading(true)
    setError(false)
    return Promise.all([
      http.get('/api/attendance').then((r) => unwrapList<ApiAttendance>(r)),
      http.get('/api/attendance/summary').then((r) => unwrapSingle<AttendanceSummary>(r)),
    ])
      .then(([list, sum]) => {
        setRows(list)
        if (sum) setSummary(sum)
      })
      .catch(() => {
        // Surface the failure — never a silent blank.
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const presentPct = summary ? Math.round(summary.presentRate * 100) : 0

  const summaryCards = [
    {
      label: t('attendance.summary.attendance', {}, { defaultValue: 'Attendance' }),
      value: `${presentPct}%`,
      caption: t(
        'attendance.summary.attendanceCaption',
        { count: summary?.present ?? 0 },
        { defaultValue: '{{count}} present days this term' },
      ),
      tone: 'text-success',
      icon: 'how_to_reg',
    },
    {
      label: t('attendance.summary.absences', {}, { defaultValue: 'Absences' }),
      value: String(summary?.absent ?? 0),
      caption: t(
        'attendance.summary.absencesCaption',
        {},
        { defaultValue: 'Below the 5-day intervention threshold' },
      ),
      tone: 'text-error',
      icon: 'event_busy',
    },
    {
      label: t('attendance.summary.tardies', {}, { defaultValue: 'Tardies' }),
      value: String(summary?.tardy ?? 0),
      caption: t(
        'attendance.summary.tardiesCaption',
        {},
        { defaultValue: 'Including notes for bus / appointment delays' },
      ),
      tone: 'text-warning',
      icon: 'schedule',
    },
  ]

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-attendance">
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('attendance.eyebrow', {}, { defaultValue: 'Spring term · Last 4 weeks' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('attendance.title', {}, { defaultValue: 'Attendance history' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'attendance.subtitle',
            {},
            {
              defaultValue:
                'A daily log of presence, absences, and tardies — with notes when applicable.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
        {summaryCards.map((card) => (
          <div
            key={card.label}
            data-mol-id={`attendance-summary-${card.label.toLowerCase()}`}
            className={cm.cn(
              cm.sp('p', 6),
              cm.accentCard({ tone: 'primary' }),
              'rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
          >
            <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
              <span
                className={cm.cn(
                  cm.sp('p', 3),
                  'inline-flex bg-surface rounded-xl shadow-sm',
                  card.tone,
                )}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  {card.icon}
                </span>
              </span>
            </div>
            <p className={cm.accentCardLabel({ tone: 'primary' })}>{card.label}</p>
            <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tabular-nums')}>
              {card.value}
            </p>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {card.caption}
            </p>
          </div>
        ))}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm overflow-x-auto',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('attendance.loading', {}, { defaultValue: 'Loading attendance…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner
            message={t(
              'attendance.loadError',
              {},
              { defaultValue: 'Couldn’t load attendance records.' },
            )}
            onRetry={load}
            retryLabel={t('common.retry', {}, { defaultValue: 'Try again' })}
            retryMolId="attendance-retry"
          />
        ) : rows.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('attendance.empty', {}, { defaultValue: 'No attendance records yet.' })}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left')}>
            <thead>
              <tr
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <th className={cm.sp('py', 3)}>{t('form.date', {}, { defaultValue: 'Date' })}</th>
                <th className={cm.sp('py', 3)}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
                <th className={cm.sp('py', 3)}>
                  {t('attendance.col.note', {}, { defaultValue: 'Note' })}
                </th>
                <th className={cm.cn(cm.sp('py', 3), cm.textRight)}>
                  {t('attendance.col.classes', {}, { defaultValue: 'Classes' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {rows.map((row) => {
                const date = new Date(row.date)
                return (
                  <tr
                    key={row.id}
                    data-mol-id={`attendance-row-${row.id}`}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.sp('py', 3)}>
                      <div className={cm.flex({ direction: 'col' })}>
                        <span className={cm.cn('font-semibold text-on-surface')}>
                          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {weekdayLabel(row.weekday ?? date.getUTCDay())}
                        </span>
                      </div>
                    </td>
                    <td className={cm.sp('py', 3)}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          'inline-flex text-[10px] font-black uppercase tracking-widest',
                          STATUS_TONE[row.status],
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.w(2),
                            cm.h(2),
                            cm.roundedFull,
                            STATUS_DOT[row.status],
                          )}
                        />
                        {t(`attendance.status.${row.status}`, {}, { defaultValue: row.status })}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {row.note ?? t('attendance.noNote', {}, { defaultValue: '—' })}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 3),
                        cm.textRight,
                        cm.textSize('sm'),
                        'tabular-nums font-semibold',
                      )}
                    >
                      {row.classes}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default Attendance
export { Attendance as AttendancePage }
