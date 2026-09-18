import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Trip {
  id: string
  property_id: string
  property_name: string
  city: string
  country: string
  address: string
  check_in_iso: string
  check_out_iso: string
  guests: number
  status: string
  gallery: string[]
  host_name: string
  host_message_count: number
  subtotal_cents: number
  taxes_cents: number
  resort_fee_cents: number
  total_cents: number
  cancellable: boolean
  modifiable: boolean
  confirmation_number: string | null
}

function fmt(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TripDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/trips/${id}`)
      .then((res) => {
        if (!cancelled) setTrip(unwrapSingle<Trip>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('tripDetail.loadError', {}, { defaultValue: 'Failed to load trip.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  async function handleCancel() {
    if (!id || !trip || !trip.cancellable || cancelling) return
    if (
      !window.confirm(
        t(
          'tripDetail.cancelConfirm',
          {},
          { defaultValue: 'Cancel this booking? This cannot be undone.' },
        ),
      )
    ) {
      return
    }
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await http.put(`/api/trips/${id}/cancel`, {})
      const next = unwrapSingle<Trip>(res)
      if (next) setTrip(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setCancelError(
        t('tripDetail.cancelFailed', { message }, { defaultValue: 'Cancel failed: {{message}}' }),
      )
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/trips"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:underline')}
      >
        ← {t('tripDetail.backLink', {}, { defaultValue: 'Back to trips' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !trip ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('tripDetail.notFound', {}, { defaultValue: 'Trip not found.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.sp('mt', 4), 'space-y-6')}>
          <header>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
              {trip.property_name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {trip.city}, {trip.country}
            </p>
            {trip.confirmation_number ? (
              <p
                className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                data-testid="trip-confirmation"
              >
                {t(
                  'tripDetail.confirmation',
                  { id: trip.confirmation_number },
                  { defaultValue: 'Confirmation: {{id}}' },
                )}
              </p>
            ) : null}
            <p
              className={cm.cn(
                cm.sp('mt', 2),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'inline-block rounded-full',
                tripStatusBadge(trip.status),
              )}
              data-testid="trip-status"
            >
              {t(
                `trips.status.${trip.status}`,
                {},
                { defaultValue: trip.status.replace('_', ' ') },
              )}
            </p>
          </header>

          {trip.gallery.length > 0 ? (
            <div className={cm.grid({ cols: 4, gap: 'sm' })}>
              {trip.gallery.slice(0, 4).map((src, i) => (
                <div
                  key={i}
                  className={cm.cn(
                    'aspect-[4/3] bg-surface-variant rounded-lg overflow-hidden',
                    i === 0 ? 'col-span-2 row-span-2 aspect-square' : '',
                  )}
                >
                  <img src={src} alt="" className={'h-full w-full object-cover'} />
                </div>
              ))}
            </div>
          ) : null}

          <section
            className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-2 text-sm')}
          >
            <p>
              <span className={cm.fontWeight('medium')}>
                {t('tripDetail.checkIn', {}, { defaultValue: 'Check-in' })}:{' '}
              </span>
              {fmtDate(trip.check_in_iso)}
            </p>
            <p>
              <span className={cm.fontWeight('medium')}>
                {t('tripDetail.checkOut', {}, { defaultValue: 'Check-out' })}:{' '}
              </span>
              {fmtDate(trip.check_out_iso)}
            </p>
            <p>
              <span className={cm.fontWeight('medium')}>
                {t('nav.guests', {}, { defaultValue: 'Guests' })}:{' '}
              </span>
              {trip.guests}
            </p>
            <p>
              <span className={cm.fontWeight('medium')}>
                {t('form.address', {}, { defaultValue: 'Address' })}:{' '}
              </span>
              {trip.address}
            </p>
            <p>
              <span className={cm.fontWeight('medium')}>
                {t('tripDetail.host', {}, { defaultValue: 'Host' })}:{' '}
              </span>
              {trip.host_name}
            </p>
          </section>

          <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
              {t('tripDetail.priceHeading', {}, { defaultValue: 'Price summary' })}
            </h2>
            <dl className={cm.cn(cm.textSize('sm'), 'space-y-1')}>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</dt>
                <dd>{fmt(trip.subtotal_cents)}</dd>
              </div>
              {trip.resort_fee_cents > 0 ? (
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt>{t('tripDetail.resortFee', {}, { defaultValue: 'Resort fee' })}</dt>
                  <dd>{fmt(trip.resort_fee_cents)}</dd>
                </div>
              ) : null}
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <dt>{t('tripDetail.taxes', {}, { defaultValue: 'Taxes & fees' })}</dt>
                <dd>{fmt(trip.taxes_cents)}</dd>
              </div>
            </dl>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('pt', 3),
                cm.sp('mt', 2),
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'border-t border-outline-variant',
              )}
            >
              <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
              <span>{fmt(trip.total_cents)}</span>
            </div>
          </section>

          {cancelError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {cancelError}
            </p>
          ) : null}

          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
            <Link
              to={`/property/${trip.property_id}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary-hover',
              )}
            >
              {t('tripDetail.viewPropertyCta', {}, { defaultValue: 'View property' })}
            </Link>
            {trip.cancellable ? (
              <button
                type="button"
                data-testid="cancel-trip"
                onClick={handleCancel}
                disabled={cancelling}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'border border-outline text-error rounded-full hover:bg-error/5 disabled:opacity-60',
                )}
              >
                {cancelling
                  ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                  : t('tripDetail.cancelCta', {}, { defaultValue: 'Cancel booking' })}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/trips')}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'border border-outline rounded-full hover:bg-surface-container',
              )}
            >
              {t('tripDetail.backToTripsCta', {}, { defaultValue: 'Back to trips' })}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function tripStatusBadge(status: string): string {
  switch (status) {
    case 'upcoming':
      return 'bg-info/10 text-info'
    case 'in_progress':
      return 'bg-primary/10 text-primary'
    case 'completed':
      return 'bg-success/10 text-success'
    case 'cancelled':
      return 'bg-error/10 text-error'
    default:
      return 'bg-surface-container text-on-surface-variant'
  }
}
