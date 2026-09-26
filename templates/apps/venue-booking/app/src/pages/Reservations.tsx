import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type Reservation, ReservationRow } from '../components/ReservationRow.js'
import { unwrapList } from '../lib/unwrap.js'

const STATUS_TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

export function Reservations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['value']>('upcoming')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/reservations')
      .then((res) => {
        if (cancelled) return
        setReservations(unwrapList<Reservation>(res))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('reservations.loadError', {}, { defaultValue: 'Failed to load reservations.' }))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grouped = useMemo(() => {
    const upcoming = reservations.filter(
      (r) => r.status === 'upcoming' || r.status === 'in_progress',
    )
    const completed = reservations.filter((r) => r.status === 'completed')
    const cancelled = reservations.filter((r) => r.status === 'cancelled')
    return { upcoming, completed, cancelled }
  }, [reservations])

  const visible =
    tab === 'upcoming'
      ? grouped.upcoming
      : tab === 'completed'
        ? grouped.completed
        : grouped.cancelled

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('reservations.eyebrow', {}, { defaultValue: 'Your bookings' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight',
          )}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'reservations.summary',
            {
              upcoming: grouped.upcoming.length,
              past: grouped.completed.length,
              cancelled: grouped.cancelled.length,
            },
            { defaultValue: '{{upcoming}} upcoming · {{past}} past · {{cancelled}} cancelled' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {STATUS_TABS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setTab(s.value)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              tab === s.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {t(`reservations.tab.${s.value}`, {}, { defaultValue: s.label })}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cm.cn('h-32 rounded-2xl bg-surface-container animate-pulse')} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          )}
        >
          <span
            className="material-symbols-outlined text-6xl text-on-surface-variant"
            aria-hidden="true"
          >
            event_busy
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t(`reservations.empty.${tab}`, {}, { defaultValue: 'Nothing here yet.' })}
          </p>
          <Link
            to="/search"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
            )}
          >
            {t('reservations.browseCta', {}, { defaultValue: 'Browse spaces' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {visible.map((r) => (
            <ReservationRow key={r.id} reservation={r} />
          ))}
        </div>
      )}
    </div>
  )
}
