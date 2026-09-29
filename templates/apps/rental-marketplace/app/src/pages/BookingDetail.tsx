import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface Booking {
  id: string
  listing_id: string
  listing_title: string
  city: string
  country: string
  thumbnail_url?: string | null
  host_id: string
  host_name: string
  host_photo: string
  check_in_iso: string
  check_out_iso: string
  guests: number
  nights: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  subtotal_cents: number
  cleaning_fee_cents: number
  service_fee_cents: number
  taxes_cents: number
  total_cents: number
  confirmation_code: string
  cancellable: boolean
  modifiable: boolean
  messages_unread: number
  instant_book: boolean
}

function fmtPrice(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_THEME: Record<Booking['status'], { className: string; label: string }> = {
  pending: { className: 'bg-warning-light text-warning', label: 'Pending' },
  confirmed: { className: 'bg-success-light text-success', label: 'Confirmed' },
  completed: { className: 'bg-surface-secondary text-foreground-secondary', label: 'Completed' },
  cancelled: { className: 'bg-rose-100 text-error', label: 'Cancelled' },
}

export function BookingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [actError, setActError] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    if (!id) return
    const res = await http.get(`/api/bookings/${id}`)
    setBooking(unwrapSingle<Booking>(res))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!id) return
    http
      .get(`/api/bookings/${id}`)
      .then((res) => {
        if (cancelled) return
        setBooking(unwrapSingle<Booking>(res))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.maxW('5xl'),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          'h-96 bg-surface-container animate-pulse rounded-2xl',
        )}
      />
    )
  }
  if (!booking) {
    return (
      <div
        className={cm.cn(cm.maxW('xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('bookingDetail.notFound', {}, { defaultValue: 'Booking not found.' })}
        </p>
        <Link
          to="/bookings"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'inline-block rounded-full bg-primary text-on-primary font-semibold',
          )}
        >
          {t('bookingDetail.backCta', {}, { defaultValue: 'Back to bookings' })}
        </Link>
      </div>
    )
  }
  const theme = STATUS_THEME[booking.status]

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary-dark',
          )}
        >
          {t(
            'bookingDetail.eyebrow',
            { code: booking.confirmation_code },
            { defaultValue: 'Confirmation · {{code}}' },
          )}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t(
            'bookingDetail.stayAtHeading',
            { title: booking.listing_title },
            { defaultValue: 'Your stay at {{title}}' },
          )}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            'text-on-surface-variant',
          )}
        >
          <span>
            {booking.city}, {booking.country}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full',
              theme.className,
            )}
          >
            {t(`bookingDetail.status.${booking.status}`, {}, { defaultValue: theme.label })}
          </span>
        </p>
      </header>

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'lg:col-span-2 rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.w(48),
              cm.h(48),
              cm.roundedFull,
              'absolute -right-12 -top-12 bg-accent/40 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={'relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6'}>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent-on-surface',
                )}
              >
                {t('bookingDetail.checkIn', {}, { defaultValue: 'Check in' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {fmtDate(booking.check_in_iso)}
              </p>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-white/80')}>
                {t('bookingDetail.afterTime', {}, { defaultValue: 'After 3:00 PM' })}
              </p>
            </div>
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-accent-on-surface',
                )}
              >
                {t('form.checkOut', {}, { defaultValue: 'Check out' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 2),
                  'leading-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {fmtDate(booking.check_out_iso)}
              </p>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-white/80')}>
                {t('bookingDetail.beforeTime', {}, { defaultValue: 'Before 11:00 AM' })}
              </p>
            </div>
            <div className={'col-span-full grid grid-cols-3 gap-4 pt-6 border-t border-surface/20'}>
              <Stat
                label={t('nav.guests', {}, { defaultValue: 'Guests' })}
                value={String(booking.guests)}
              />
              <Stat
                label={t('bookingDetail.nightsLabel', {}, { defaultValue: 'Nights' })}
                value={String(booking.nights)}
              />
              <Stat
                label={t('nav.total', {}, { defaultValue: 'Total' })}
                value={fmtPrice(booking.total_cents)}
              />
            </div>
          </div>
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 space-y-4',
          )}
        >
          <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <img
              src={booking.host_photo}
              alt=""
              className={cm.cn(cm.roundedFull, 'w-12 h-12 object-cover')}
            />
            <div>
              <p
                className={cm.fontWeight('bold')}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {booking.host_name}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('bookingDetail.yourHost', {}, { defaultValue: 'Your host' })}
              </p>
            </div>
          </header>
          <button
            type="button"
            onClick={async () => {
              if (!booking?.host_id) return
              try {
                const resp = (await http.post('/api/messages/threads', {
                  peer_id: booking.host_id,
                  listing_id: booking.listing_id,
                })) as { id?: string } | { data?: { id?: string } }
                const respObj = (resp ?? {}) as Record<string, unknown>
                const data = (respObj.data ?? respObj) as { id?: string }
                if (data?.id) {
                  navigate(`/messages/${data.id}`)
                } else {
                  navigate('/messages')
                }
              } catch (_error) {
                // Conversation creation failed; navigate to messages list as fallback.
                navigate('/messages')
              }
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
              cm.fontWeight('semibold'),
              'block w-full rounded-xl bg-primary text-on-primary hover:bg-primary-container',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              forum
            </span>
            {t('bookingDetail.messageHost', {}, { defaultValue: 'Message host' })}
          </button>
          <Link
            to={`/listings/${booking.listing_id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.flex({ align: 'center', gap: 'sm', justify: 'center' }),
              cm.fontWeight('semibold'),
              'block w-full rounded-xl border border-outline-variant hover:border-primary hover:text-primary',
            )}
          >
            {t('bookingDetail.viewListing', {}, { defaultValue: 'View listing' })}
          </Link>
        </aside>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.sp('mt', 6),
          'bg-surface rounded-2xl shadow-sm',
          cm.accentCard({ tone: 'primary' }),
        )}
      >
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('bookingDetail.priceBreakdown', {}, { defaultValue: 'Price breakdown' })}
        </h2>
        <div className={'space-y-2 tabular-nums'}>
          <Row
            label={t(
              'bookingDetail.subtotal',
              { nights: booking.nights },
              { defaultValue: '{{nights}} nights' },
            )}
            value={fmtPrice(booking.subtotal_cents)}
          />
          <Row
            label={t('bookingDetail.cleaningFee', {}, { defaultValue: 'Cleaning fee' })}
            value={fmtPrice(booking.cleaning_fee_cents)}
          />
          <Row
            label={t(
              'bookingDetail.serviceFee',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} service fee' },
            )}
            value={fmtPrice(booking.service_fee_cents)}
          />
          <Row
            label={t('bookingDetail.taxes', {}, { defaultValue: 'Taxes' })}
            value={fmtPrice(booking.taxes_cents)}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('pt', 3),
              'border-t border-outline-variant/40 font-bold',
            )}
          >
            <span>{t('bookingDetail.totalCharged', {}, { defaultValue: 'Total charged' })}</span>
            <span>{fmtPrice(booking.total_cents)}</span>
          </div>
        </div>

        <div
          className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}
        >
          {booking.cancellable ? (
            <ConfirmButton
              label={t('bookingDetail.cancel', {}, { defaultValue: 'Cancel reservation' })}
              confirmLabel={t(
                'bookingDetail.confirmCancel',
                {},
                { defaultValue: 'Cancel this reservation? This cannot be undone.' },
              )}
              pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
              color="error"
              disarmSeconds={5}
              onConfirm={async () => {
                if (!booking) return
                setActError(null)
                try {
                  await http.put(`/api/bookings/${booking.id}/cancel`, {
                    reason: 'guest_cancelled',
                  })
                  track({
                    name: 'booking.cancelled',
                    properties: { booking_id: booking.id },
                  })
                  await refresh()
                } catch (err) {
                  const e = err as { message?: string }
                  setActError(
                    e?.message ??
                      t(
                        'bookingDetail.cancelFailed',
                        {},
                        { defaultValue: 'Could not cancel — please try again.' },
                      ),
                  )
                }
              }}
            />
          ) : null}
        </div>
        {actError ? (
          <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error')}>{actError}</p>
        ) : null}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-[0.25em] text-accent-on-surface',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('extrabold'),
          cm.sp('mt', 1),
          'tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.textSize('sm'))}>
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
