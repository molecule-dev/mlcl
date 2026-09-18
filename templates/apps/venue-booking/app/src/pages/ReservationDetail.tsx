import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Reservation } from '../components/ReservationRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

function fmtPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const STATUS_THEME: Record<
  Reservation['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  upcoming: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Upcoming', icon: 'event_upcoming' },
  in_progress: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'In progress',
    icon: 'event_available',
  },
  completed: {
    bg: 'bg-surface-secondary',
    text: 'text-foreground-secondary',
    label: 'Completed',
    icon: 'check_circle',
  },
  cancelled: { bg: 'bg-rose-100', text: 'text-error', label: 'Cancelled', icon: 'cancel' },
}

export function ReservationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/reservations/${id}`)
      .then((res) => {
        if (cancelled) return
        const r = unwrapSingle<Reservation>(res)
        if (r) setReservation(r)
        else throw new Error('not_found')
      })
      .catch(() => {
        // Fallback: fetch the list and pick by id (handy for the mock server)
        http
          .get('/api/reservations')
          .then((listRes) => {
            if (cancelled) return
            const list = unwrapList<Reservation>(listRes)
            const match = list.find((r) => r.id === id)
            if (match) setReservation(match)
            else
              setError(
                t('reservationDetail.notFound', {}, { defaultValue: 'Reservation not found.' }),
              )
          })
          .catch(() => {
            if (!cancelled)
              setError(
                t(
                  'reservationDetail.loadError',
                  {},
                  { defaultValue: 'Failed to load reservation.' },
                ),
              )
          })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
        <div className={cm.cn('aspect-[3/1] rounded-2xl bg-surface-container animate-pulse')} />
      </div>
    )
  }

  const handleCancel = async () => {
    if (!reservation || canceling) return
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            t(
              'reservationDetail.cancelConfirm',
              {},
              { defaultValue: 'Cancel this reservation? This cannot be undone.' },
            ),
          )
        : true
    if (!confirmed) return
    setCanceling(true)
    setCancelError(null)
    try {
      const res = await http.put(`/api/reservations/${reservation.id}/cancel`)
      const updated = unwrapSingle<Reservation>(res)
      if (updated) {
        setReservation(updated)
      } else {
        setReservation((prev) =>
          prev ? { ...prev, status: 'cancelled', cancellable: false, modifiable: false } : prev,
        )
      }
    } catch (_error) {
      setCancelError(
        t('reservationDetail.cancelError', {}, { defaultValue: 'Failed to cancel — try again.' }),
      )
    } finally {
      setCanceling(false)
    }
  }

  if (error || !reservation) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {error ?? t('reservationDetail.notFound', {}, { defaultValue: 'Reservation not found.' })}
        </p>
        <Link
          to="/reservations"
          className={cm.cn(cm.sp('mt', 4), 'inline-block text-primary font-bold')}
        >
          {t('reservationDetail.backToList', {}, { defaultValue: 'Back to reservations' })}
        </Link>
      </div>
    )
  }

  const theme = STATUS_THEME[reservation.status]

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/reservations"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 4),
          'inline-flex items-center gap-1 text-primary hover:underline',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('reservationDetail.backToList', {}, { defaultValue: 'Back to reservations' })}
      </Link>

      {/* Hero summary card with gradient */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          cm.sp('mb', 8),
          'relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary',
        )}
      >
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -right-24 -top-24 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -left-20 -bottom-20 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'uppercase tracking-widest rounded-full',
                theme.bg,
                theme.text,
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                {theme.icon}
              </span>
              {t(
                `reservationDetail.status.${reservation.status}`,
                {},
                { defaultValue: theme.label },
              )}
            </span>
            {reservation.confirmation_code ? (
              <span className={cm.cn(cm.textSize('xs'), 'tracking-widest text-on-primary/80')}>
                {t(
                  'reservationDetail.code',
                  { code: reservation.confirmation_code },
                  { defaultValue: 'Confirmation #{{code}}' },
                )}
              </span>
            ) : null}
          </div>
          <h1
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              'leading-tight',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {reservation.venue_name}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-primary/85')}>
            {fmtDateTime(reservation.starts_at_iso)}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-primary/70')}>
            {reservation.city}
            {reservation.guest_count ? ` · ${reservation.guest_count} guests` : ''}
          </p>
        </div>
      </section>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-2 bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('reservationDetail.summary', {}, { defaultValue: 'Booking summary' })}
          </h2>
          <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className="text-on-surface-variant">
                {t('common.start', {}, { defaultValue: 'Start' })}
              </dt>
              <dd className="font-semibold tabular-nums">
                {fmtDateTime(reservation.starts_at_iso)}
              </dd>
            </div>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt className="text-on-surface-variant">
                {t('reservationDetail.end', {}, { defaultValue: 'End' })}
              </dt>
              <dd className="font-semibold tabular-nums">{fmtDateTime(reservation.ends_at_iso)}</dd>
            </div>
            {typeof reservation.guest_count === 'number' ? (
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {t('nav.guests', {}, { defaultValue: 'Guests' })}
                </dt>
                <dd className="font-semibold tabular-nums">{reservation.guest_count}</dd>
              </div>
            ) : null}
            {typeof reservation.rate_unit_cents === 'number' ? (
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt className="text-on-surface-variant">
                  {reservation.rate_kind === 'day'
                    ? t('reservationDetail.dailyRate', {}, { defaultValue: 'Daily rate' })
                    : t('reservationDetail.hourlyRate', {}, { defaultValue: 'Hourly rate' })}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {fmtPrice(reservation.rate_unit_cents)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div
            className={cm.cn(
              cm.sp('mt', 5),
              cm.sp('pt', 4),
              'border-t border-outline-variant',
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.textSize('sm'),
            )}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className="text-on-surface-variant">
                {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
              </span>
              <span className="tabular-nums">
                {fmtPrice(reservation.total_cents - Math.round(reservation.total_cents * 0.0909))}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className="text-on-surface-variant">
                {t('reservationDetail.serviceFee', {}, { defaultValue: 'Service fee' })}
              </span>
              <span className="tabular-nums">
                {fmtPrice(Math.round(reservation.total_cents * 0.0909))}
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('pt', 3),
                cm.fontWeight('bold'),
                'border-t border-outline-variant',
              )}
            >
              <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
              <span className="tabular-nums">{fmtPrice(reservation.total_cents)}</span>
            </div>
          </div>
          <div
            className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}
          >
            <button
              type="button"
              onClick={async () => {
                if (!reservation.venue_id) return
                try {
                  const res = await http.post('/api/messages', { venue_id: reservation.venue_id })
                  const created = unwrapSingle<{ id: string }>(res)
                  if (created?.id) navigate(`/messages/${created.id}`)
                  else navigate('/messages')
                } catch (_error) {
                  // Message thread creation failed — navigate to messages list as fallback.
                  navigate('/messages')
                }
              }}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
              )}
            >
              {t('reservationDetail.messageHost', {}, { defaultValue: 'Message host' })}
            </button>
            {reservation.cancellable && reservation.status === 'upcoming' ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-rose-200 text-error hover:border-rose-400 transition-colors disabled:opacity-60',
                )}
              >
                {canceling
                  ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                  : t('reservationDetail.cancel', {}, { defaultValue: 'Cancel reservation' })}
              </button>
            ) : null}
            {cancelError ? (
              <span role="alert" className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>
                {cancelError}
              </span>
            ) : null}
          </div>
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {t('reservationDetail.host', {}, { defaultValue: 'Your host' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {reservation.host_avatar_url ? (
              <img
                src={reservation.host_avatar_url}
                alt=""
                className={'w-14 h-14 rounded-full object-cover'}
              />
            ) : (
              <div
                className={
                  'w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg'
                }
              >
                {(reservation.host_name ?? 'H').charAt(0)}
              </div>
            )}
            <div>
              <p className={cm.fontWeight('bold')}>{reservation.host_name ?? 'Host'}</p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'reservationDetail.hostMeta',
                  {},
                  { defaultValue: 'Verified host · responds quickly' },
                )}
              </p>
            </div>
          </div>
          <Link
            to={`/venue/${reservation.venue_id}`}
            className={cm.cn(
              cm.sp('mt', 5),
              'inline-block text-primary font-bold text-sm hover:underline',
            )}
          >
            {t('reservationDetail.viewVenue', {}, { defaultValue: 'View venue page →' })}
          </Link>
        </aside>
      </div>
    </div>
  )
}
