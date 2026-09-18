import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Report {
  miles_30d: number
  fuel_30d_gal: number
  fuel_cost_30d: number
  hours_30d: number
  alerts_30d: number
  on_time_rate: number
  by_vehicle_type: { type: string; count: number; miles: number; fuel_gal: number }[]
  daily_miles: { date: string; miles: number }[]
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/reports/analytics')
      .then((res) => {
        if (!cancelled) setReport(unwrapSingle<Report>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadReports', {}, { defaultValue: 'Failed to load reports.' }))
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

  const maxDay = Math.max(...report.daily_miles.map((d) => d.miles), 1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('reports.subheading', {}, { defaultValue: 'Last 30 days of fleet activity' })}
        </p>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Kpi
          label={t('reports.kpi.miles', {}, { defaultValue: 'Miles' })}
          value={report.miles_30d.toLocaleString()}
        />
        <Kpi
          label={t('reports.kpi.fuel', {}, { defaultValue: 'Fuel' })}
          value={`${report.fuel_30d_gal.toLocaleString()} gal`}
        />
        <Kpi
          label={t('reports.kpi.fuelCost', {}, { defaultValue: 'Fuel cost' })}
          value={`$${report.fuel_cost_30d.toLocaleString()}`}
        />
        <Kpi
          label={t('reports.kpi.onTime', {}, { defaultValue: 'On-time rate' })}
          value={`${Math.round(report.on_time_rate * 100)}%`}
          accent
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
          {t('reports.dailyHeading', {}, { defaultValue: 'Daily miles (30d)' })}
        </h2>
        <div className={cm.flex({ align: 'end', gap: 'xs' })} style={{ height: '160px' }}>
          {report.daily_miles.map((d) => (
            <div
              key={d.date}
              className={cm.flex({ direction: 'col', align: 'center' })}
              style={{ flex: 1 }}
            >
              <div
                title={`${d.date}: ${d.miles}`}
                style={{
                  width: '100%',
                  height: `${(d.miles / maxDay) * 100}%`,
                  backgroundColor: 'var(--mol-color-primary)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: '2px',
                }}
              />
            </div>
          ))}
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
          {t('reports.byTypeHeading', {}, { defaultValue: 'By vehicle type' })}
        </h2>
        <table className={'w-full text-left text-sm'}>
          <thead>
            <tr className={'border-b border-outline-variant'}>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'uppercase tracking-wider',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'uppercase tracking-wider',
                )}
              >
                {t('reports.col.count', {}, { defaultValue: 'Count' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'uppercase tracking-wider',
                )}
              >
                {t('reports.col.miles', {}, { defaultValue: 'Miles' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'uppercase tracking-wider',
                )}
              >
                {t('reports.col.fuel', {}, { defaultValue: 'Fuel (gal)' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  cm.fontWeight('medium'),
                  'uppercase tracking-wider',
                )}
              >
                {t('reports.col.mpg', {}, { defaultValue: 'MPG' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {report.by_vehicle_type.map((v) => (
              <tr key={v.type} className={'border-b border-outline-variant'}>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2))}>{v.type}</td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-mono')}>{v.count}</td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-mono')}>
                  {v.miles.toLocaleString()}
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-mono')}>
                  {v.fuel_gal.toLocaleString()}
                </td>
                <td className={cm.cn(cm.sp('px', 3), cm.sp('py', 2), 'font-mono')}>
                  {(v.miles / v.fuel_gal).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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
          accent ? cm.textPrimary : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}
