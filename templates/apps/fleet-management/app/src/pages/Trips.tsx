import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Trip {
  id: string
  vehicle_plate: string
  driver: string
  origin: string
  destination: string
  miles: number
  duration_minutes: number
  fuel_used_gal: number
  events: number
  started_at: string
  completed_at: string | null
}

export function Trips() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/trips')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Trip>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('trips.loadError', {}, { defaultValue: 'Failed to load trips.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('trips.eyebrow', {}, { defaultValue: 'Trip log' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('trips.heading', {}, { defaultValue: 'Trips' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'trips.subheading',
            { count: list.length },
            { defaultValue: 'Last 30 days · {{count}} trips' },
          )}
        </p>
        {!loading && !error && list.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider tabular-nums',
              )}
            >
              {t(
                'trips.milesTotal',
                { miles: list.reduce((s, x) => s + x.miles, 0).toLocaleString() },
                { defaultValue: '{{miles}} mi total' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-success-light text-success uppercase tracking-wider tabular-nums',
              )}
            >
              {t(
                'trips.fuelTotal',
                { gal: list.reduce((s, x) => s + x.fuel_used_gal, 0).toFixed(1) },
                { defaultValue: '{{gal}} gal fuel' },
              )}
            </span>
            {(() => {
              const eventCount = list.reduce((s, x) => s + x.events, 0)
              return eventCount > 0 ? (
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'bg-warning-light text-warning uppercase tracking-wider',
                  )}
                >
                  {t(
                    'trips.eventsTotal',
                    { count: eventCount },
                    { defaultValue: '{{count}} events' },
                  )}
                </span>
              ) : null
            })()}
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('trips.empty', {}, { defaultValue: 'No trips yet.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('form.date', {}, { defaultValue: 'Date' })}</Th>
                <Th>{t('trips.col.vehicle', {}, { defaultValue: 'Vehicle' })}</Th>
                <Th>{t('trips.col.driver', {}, { defaultValue: 'Driver' })}</Th>
                <Th>{t('trips.col.route', {}, { defaultValue: 'Route' })}</Th>
                <Th>{t('trips.col.miles', {}, { defaultValue: 'Miles' })}</Th>
                <Th>{t('form.duration', {}, { defaultValue: 'Duration' })}</Th>
                <Th>{t('trips.col.fuel', {}, { defaultValue: 'Fuel' })}</Th>
                <Th>{t('trips.col.events', {}, { defaultValue: 'Events' })}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr
                  key={t.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'font-mono',
                    )}
                  >
                    {new Date(t.started_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'font-mono',
                      cm.textSize('xs'),
                    )}
                  >
                    {t.vehicle_plate}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>{t.driver}</td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                      'truncate',
                    )}
                  >
                    {t.origin} → {t.destination}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>{t.miles}</td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>
                    {Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono')}>
                    {t.fuel_used_gal} gal
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {t.events > 0 ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded bg-warning-container text-on-warning-container',
                        )}
                      >
                        {t.events}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
