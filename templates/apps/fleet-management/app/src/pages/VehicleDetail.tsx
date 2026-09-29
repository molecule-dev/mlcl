import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Vehicle {
  id: string
  plate: string
  vin: string
  make: string
  model: string
  year: number
  driver: string | null
  driver_id: string | null
  status: 'operational' | 'in_transit' | 'idle' | 'alert' | 'offline'
  location: string
  odometer: number
  speed_mph: number
  engine_temp: number
  battery_pct: number
  fuel_pct: number
  next_maintenance_miles: number
  vehicle_type: string
}

interface Trip {
  id: string
  vehicle_id: string
  driver: string
  origin: string
  destination: string
  miles: number
  duration_minutes: number
  started_at: string
  completed_at: string | null
}

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  operational: 'bg-success-container text-on-success-container',
  in_transit: 'bg-info-container text-on-info-container',
  idle: 'bg-warning-container text-on-warning-container',
  alert: 'bg-error-container text-on-error-container',
  offline: 'bg-surface-container text-on-surface',
}

export function VehicleDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = '' } = useParams<{ id: string }>()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/vehicles/${id}`), http.get(`/trips?vehicle_id=${id}`)])
      .then(([v, t]) => {
        if (cancelled) return
        setVehicle(unwrapSingle<Vehicle>(v))
        setTrips(unwrapList<Trip>(t).slice(0, 6))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('vehicleDetail.loadError', {}, { defaultValue: 'Failed to load vehicle.' }))
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
  if (!vehicle)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('vehicleDetail.notFound', {}, { defaultValue: 'Vehicle not found.' })}
      </p>
    )

  // The design's "Current Trip" card: the vehicle's in-progress trip, if any
  // (the seeded data keeps two trips open with completed_at = null).
  const activeTrip = trips.find((tr) => !tr.completed_at) ?? null
  const activeStartedMs = activeTrip ? new Date(activeTrip.started_at).getTime() : 0
  const activeElapsedMin = activeTrip
    ? Math.max(0, Math.round((Date.now() - activeStartedMs) / 60000))
    : 0
  const activePct = activeTrip
    ? Math.min(100, Math.round((activeElapsedMin / Math.max(1, activeTrip.duration_minutes)) * 100))
    : 0
  const activeEta = activeTrip
    ? new Date(activeStartedMs + activeTrip.duration_minutes * 60000).toLocaleTimeString(
        undefined,
        { hour: '2-digit', minute: '2-digit' },
      )
    : ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/vehicles"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('vehicleDetail.backLink', {}, { defaultValue: 'All vehicles' })}
      </Link>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.fontWeight('medium'),
                'uppercase tracking-wider',
              )}
            >
              {t('vehicleDetail.label', {}, { defaultValue: 'Vehicle' })}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'font-mono',
              )}
            >
              {vehicle.plate}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.vehicle_type}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant',
                cm.sp('mt', 1),
                'font-mono',
              )}
            >
              {t('vehicleDetail.vinLabel', { vin: vehicle.vin }, { defaultValue: 'VIN: {{vin}}' })}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-full',
              STATUS_COLOR[vehicle.status],
            )}
          >
            {t(
              `vehicleDetail.status.${vehicle.status}`,
              {},
              { defaultValue: vehicle.status.replace('_', ' ') },
            )}
          </span>
        </div>
      </header>

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <Stat
          label={t('vehicleDetail.kpi.odometer', {}, { defaultValue: 'Odometer' })}
          value={vehicle.odometer.toLocaleString()}
          unit="mi"
        />
        <Stat
          label={t('vehicleDetail.kpi.speed', {}, { defaultValue: 'Speed' })}
          value={`${vehicle.speed_mph}`}
          unit="mph"
          accent
        />
        <Stat
          label={t('vehicleDetail.kpi.fuel', {}, { defaultValue: 'Fuel' })}
          value={`${vehicle.fuel_pct}`}
          unit="%"
          warn={vehicle.fuel_pct < 20}
        />
        <Stat
          label={t('vehicleDetail.kpi.engineTemp', {}, { defaultValue: 'Engine' })}
          value={`${vehicle.engine_temp}`}
          unit="°F"
          warn={vehicle.engine_temp > 220}
        />
      </section>

      {/* Map placeholder */}
      <div
        className={'rounded relative overflow-hidden'}
        style={{
          aspectRatio: '21/8',
          backgroundColor: 'var(--color-map-bg)',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.4) 0%, transparent 35%)',
        }}
      >
        <p
          className={cm.cn(cm.textSize('xs'), 'absolute top-3 left-3 font-mono')}
          style={{ color: '#cbd5e1' }}
        >
          {t(
            'vehicleDetail.mapLabel',
            { location: vehicle.location },
            { defaultValue: '{{location}} · live' },
          )}
        </p>
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-vehicle-in-transit)',
            border: '2px solid white',
            boxShadow: '0 0 0 6px rgba(6, 182, 212, 0.3)',
          }}
          aria-hidden="true"
        />
      </div>

      <section className={cm.grid({ cols: 2, gap: 'md' })}>
        {activeTrip ? (
          <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-primary text-base')}
                >
                  route
                </span>
                {t('vehicleDetail.currentTrip', {}, { defaultValue: 'Current trip' })}
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
                  #{activeTrip.id}
                </span>
              </h2>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded uppercase tracking-wide bg-info-container text-on-info-container',
                )}
              >
                {t('vehicleDetail.trip.onSchedule', {}, { defaultValue: 'On schedule' })}
              </span>
            </div>
            <div>
              <div
                className={cm.cn('h-1.5 w-full bg-surface-container rounded-full overflow-hidden')}
              >
                <div
                  className={cm.cn('h-full bg-primary rounded-full')}
                  style={{ width: `${activePct}%` }}
                />
              </div>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  cm.sp('mt', 2),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn('truncate')}>
                  {activeTrip.origin}
                  <span className={cm.cn('block font-mono')}>
                    {new Date(activeTrip.started_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <span className={cm.cn('truncate text-right')}>
                  {activeTrip.destination}
                  <span className={cm.cn('block font-mono')}>
                    {t(
                      'vehicleDetail.trip.eta',
                      { time: activeEta },
                      { defaultValue: '{{time}} (est)' },
                    )}
                  </span>
                </span>
              </div>
            </div>
            <div
              className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'border-t border-outline/40 pt-3')}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-wide',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('vehicleDetail.trip.elapsed', {}, { defaultValue: 'Elapsed time' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface')}>
                  {Math.floor(activeElapsedMin / 60)}h {activeElapsedMin % 60}m
                </p>
              </div>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-wide',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('vehicleDetail.trip.distance', {}, { defaultValue: 'Distance' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'font-mono text-on-surface')}>
                  {Math.round((activeTrip.miles * activePct) / 100)}{' '}
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    / {activeTrip.miles} mi
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider',
              'text-on-surface-variant',
            )}
          >
            {t('vehicleDetail.assignedHeading', {}, { defaultValue: 'Assigned driver' })}
          </h2>
          {vehicle.driver ? (
            <Link
              to={`/drivers/${vehicle.driver_id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 2),
                'rounded hover:bg-surface-container',
              )}
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                badge
              </span>
              <span className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {vehicle.driver}
              </span>
            </Link>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('vehicleDetail.noDriver', {}, { defaultValue: 'No driver assigned.' })}
            </p>
          )}
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
            {t('vehicleDetail.maintenanceHeading', {}, { defaultValue: 'Maintenance' })}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'vehicleDetail.nextService',
              { miles: vehicle.next_maintenance_miles.toLocaleString() },
              { defaultValue: 'Next service: {{miles}} mi' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'vehicleDetail.dueIn',
              { miles: (vehicle.next_maintenance_miles - vehicle.odometer).toLocaleString() },
              { defaultValue: 'Due in {{miles}} mi' },
            )}
          </p>
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
          {t('vehicleDetail.recentTripsHeading', {}, { defaultValue: 'Recent trips' })}
        </h2>
        <ul className={'space-y-1'}>
          {trips.map((t) => (
            <li
              key={t.id}
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
                style={{ width: '120px' }}
              >
                {new Date(t.started_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'truncate')}>
                {t.origin} → {t.destination}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
              >
                {t.miles} mi
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'shrink-0 font-mono',
                )}
              >
                {Math.floor(t.duration_minutes / 60)}h {t.duration_minutes % 60}m
              </span>
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
  unit: string
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
