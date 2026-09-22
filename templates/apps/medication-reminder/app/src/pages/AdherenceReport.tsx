import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface AdherenceReportData {
  current_adherence: number
  current_streak: number
  longest_streak: number
  doses_taken_30d: number
  doses_missed_30d: number
  doses_skipped_30d: number
  by_medication: {
    medication_id: string
    medication_name: string
    pill_color: string
    adherence_rate: number
    missed_count: number
  }[]
  daily_30d: { date: string; total: number; taken: number }[]
}

export function AdherenceReport() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [report, setReport] = useState<AdherenceReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/reports/adherence')
      .then((res) => {
        if (!cancelled) setReport(unwrapSingle<AdherenceReportData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('adherence.loadError', {}, { defaultValue: 'Failed to load adherence report.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!report) return null

  const maxDay = Math.max(...report.daily_30d.map((d) => d.total), 1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('adherence.heading', {}, { defaultValue: 'Adherence report' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'adherence.subheading',
            {},
            { defaultValue: 'Last 30 days · share with your care team if useful' },
          )}
        </p>
      </header>

      {/* 4 KPI tiles cramp to ~80px columns at 390px — 2-up on phones. */}
      <section className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
        <Kpi
          label={t('adherence.kpi.current', {}, { defaultValue: 'Adherence' })}
          value={`${Math.round(report.current_adherence * 100)}%`}
          accent
        />
        <Kpi
          label={t('adherence.kpi.streak', {}, { defaultValue: 'Streak' })}
          value={`${report.current_streak}`}
          unit={t('adherence.kpi.days', {}, { defaultValue: 'days' })}
        />
        <Kpi
          label={t('adherence.kpi.taken', {}, { defaultValue: 'Doses taken (30d)' })}
          value={`${report.doses_taken_30d}`}
        />
        <Kpi
          label={t('adherence.kpi.missed', {}, { defaultValue: 'Doses missed (30d)' })}
          value={`${report.doses_missed_30d}`}
          warn={report.doses_missed_30d > 0}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
            cm.sp('mb', 4),
          )}
        >
          {t('adherence.dailyHeading', {}, { defaultValue: 'Daily adherence (30 days)' })}
        </h2>
        <div className={cm.flex({ align: 'end', gap: 'xs' })} style={{ height: '160px' }}>
          {report.daily_30d.map((d) => {
            const totalPct = (d.total / maxDay) * 100
            const takenPct = d.total > 0 ? d.taken / d.total : 0
            return (
              <div
                key={d.date}
                className={cm.flex({ direction: 'col', align: 'center' })}
                style={{ flex: 1, height: '100%' }}
              >
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${totalPct}%`,
                      backgroundColor: 'var(--color-dose-missed)',
                      borderRadius: '3px 3px 0 0',
                      minHeight: '2px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${takenPct * 100}%`,
                        backgroundColor: 'var(--color-dose-taken)',
                        borderRadius: takenPct >= 1 ? '3px 3px 0 0' : '0',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider',
            'text-on-surface-variant',
            cm.sp('mb', 3),
          )}
        >
          {t('adherence.byMedHeading', {}, { defaultValue: 'By medication' })}
        </h2>
        {report.by_medication.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'adherence.byMedEmpty',
              {},
              { defaultValue: 'No medications yet — add one to see per-medication adherence.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {report.by_medication.map((m) => (
              <li key={m.medication_id}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {m.medication_name}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {Math.round(m.adherence_rate * 100)}%
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.fontWeight('normal'),
                        cm.sp('ml', 2),
                      )}
                    >
                      {t(
                        'adherence.missedCount',
                        { count: m.missed_count },
                        { defaultValue: '({{count}} missed)' },
                      )}
                    </span>
                  </span>
                </div>
                <div
                  className={cm.cn('w-full', cm.sp('mt', 1))}
                  style={{
                    height: '6px',
                    backgroundColor: 'var(--color-border)',
                    borderRadius: '3px',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(m.adherence_rate * 100)}%`,
                      height: '100%',
                      backgroundColor:
                        m.adherence_rate >= 0.9
                          ? 'var(--color-dose-taken)'
                          : m.adherence_rate >= 0.7
                            ? 'var(--mol-color-secondary)'
                            : 'var(--color-dose-missed)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  unit,
  accent,
  warn,
}: {
  label: string
  value: string
  unit?: string
  accent?: boolean
  warn?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          accent ? cm.textPrimary : warn ? 'text-error' : '',
        )}
      >
        {value}
        {unit ? (
          <span
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.fontWeight('normal'))}
          >
            {' '}
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  )
}
