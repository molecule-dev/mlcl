import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  license_number: string
  license_class: string
  license_expires: string
  vehicle_id: string | null
  vehicle_plate: string | null
  status: 'on_duty' | 'off_duty' | 'on_break'
  safety_score: number
  hours_today: number
  hours_week: number
  hours_max_week: number
  total_miles: number
  hire_date: string
  certifications: string[]
}

interface Trip {
  id: string
  vehicle_id: string
  vehicle_plate: string
  origin: string
  destination: string
  miles: number
  duration_minutes: number
  started_at: string
  events: number
}

export function DriverDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/drivers/${id}`), http.get(`/trips?driver_id=${id}`)])
      .then(([d, t]) => {
        if (cancelled) return
        setDriver(unwrapSingle<Driver>(d))
        setTrips(unwrapList<Trip>(t).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('driverDetail.loadError', {}, { defaultValue: 'Failed to load driver.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!driver)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('driverDetail.notFound', {}, { defaultValue: 'Driver not found.' })}
      </p>
    )

  const hourPct = Math.round((driver.hours_week / driver.hours_max_week) * 100)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/drivers"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('driverDetail.backLink', {}, { defaultValue: 'All drivers' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6), cm.flex({ align: 'center', gap: 'md' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(20),
            cm.w(20),
            'rounded-full bg-primary-container text-on-primary-container shrink-0',
            cm.fontWeight('bold'),
          )}
          style={{ fontSize: '24px' }}
        >
          {driver.name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div className={cm.flex1}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{driver.name}</h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {driver.license_class} · <span className="font-mono">{driver.license_number}</span> ·{' '}
            {t(
              'driverDetail.licenseExpires',
              { date: new Date(driver.license_expires).toLocaleDateString() },
              { defaultValue: 'expires {{date}}' },
            )}
          </p>
        </div>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Stat
          label={t('driverDetail.kpi.score', {}, { defaultValue: 'Safety score' })}
          value={`${driver.safety_score}`}
          accent
        />
        <Stat
          label={t('driverDetail.kpi.miles', {}, { defaultValue: 'Total miles' })}
          value={driver.total_miles.toLocaleString()}
        />
        <Stat
          label={t('driverDetail.kpi.hoursToday', {}, { defaultValue: 'Hours today' })}
          value={driver.hours_today.toFixed(1)}
          unit="h"
        />
        <Stat
          label={t('driverDetail.kpi.hoursWeek', {}, { defaultValue: 'Hours this week' })}
          value={`${driver.hours_week.toFixed(1)} / ${driver.hours_max_week}`}
          unit="h"
          warn={hourPct > 85}
        />
      </section>

      <section className={cm.grid({ cols: 2, gap: 'md' })}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
            )}
          >
            {t('nav.contact', {}, { defaultValue: 'Contact' })}
          </h2>
          <KV
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={driver.email}
          />
          <KV label={t('form.phone', {}, { defaultValue: 'Phone' })} value={driver.phone} mono />
          <KV
            label={t('driverDetail.hireDate', {}, { defaultValue: 'Hire date' })}
            value={new Date(driver.hire_date).toLocaleDateString()}
          />
        </div>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
            )}
          >
            {t('driverDetail.assignmentHeading', {}, { defaultValue: 'Assignment' })}
          </h2>
          {driver.vehicle_plate ? (
            <Link
              to={`/vehicles/${driver.vehicle_id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 2),
                'rounded hover:bg-surface-container',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                local_shipping
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'font-mono')}>
                {driver.vehicle_plate}
              </span>
            </Link>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('driverDetail.noVehicle', {}, { defaultValue: 'No vehicle assigned.' })}
            </p>
          )}
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.fontWeight('medium'),
                'uppercase tracking-wider',
                cm.sp('mt', 2),
              )}
            >
              {t('driverDetail.certificationsLabel', {}, { defaultValue: 'Certifications' })}
            </p>
            <div
              className={cm.flex({ align: 'center', gap: 'xs' })}
              style={{ flexWrap: 'wrap', marginTop: '4px' }}
            >
              {driver.certifications.map((c, i) => (
                <span
                  key={i}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'rounded bg-primary-container text-on-primary-container',
                  )}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
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
          {t('driverDetail.recentTripsHeading', {}, { defaultValue: 'Recent trips' })}
        </h2>
        <ul className={'space-y-1'}>
          {trips.map((trip) => (
            <li
              key={trip.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded hover:bg-surface-container',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
                style={{ width: '90px' }}
              >
                {new Date(trip.started_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
                style={{ width: '90px' }}
              >
                {trip.vehicle_plate}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'truncate')}>
                {trip.origin} → {trip.destination}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
              >
                {trip.miles} mi
              </span>
              {trip.events > 0 && (
                <span className={cm.cn(cm.textSize('xs'), 'shrink-0 text-warning')}>
                  {t(
                    'driverDetail.tripEvents',
                    { count: trip.events },
                    { defaultValue: '{{count}} events' },
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({
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
    <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
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
          cm.textSize('2xl'),
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

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), mono ? 'font-mono' : '')}>
        {value}
      </span>
    </div>
  )
}
