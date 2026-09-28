import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
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
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  gallery: string[]
  host_name: string
  host_message_count: number
  subtotal_cents: number
  taxes_cents: number
  total_cents: number
  cancellable: boolean
  modifiable: boolean
  confirmation_code?: string
  thumbnail_url?: string | null
}

const STATUS_THEME: Record<
  Trip['status'],
  { bg: string; text: string; label: string; icon: string }
> = {
  upcoming: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Upcoming', icon: 'event_upcoming' },
  in_progress: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'Checked in',
    icon: 'flight_land',
  },
  completed: {
    bg: 'bg-surface-secondary',
    text: 'text-foreground-secondary',
    label: 'Completed',
    icon: 'check_circle',
  },
  cancelled: { bg: 'bg-rose-100', text: 'text-error', label: 'Cancelled', icon: 'cancel' },
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

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
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
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [hostMessage, setHostMessage] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [messageSent, setMessageSent] = useState(false)

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

  async function sendHostMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !hostMessage.trim()) return
    setActionPending(true)
    setActionError(null)
    try {
      await http.post(`/api/trips/${id}/host-message`, { message: hostMessage.trim() })
      // The host message persists as an itinerary_item (kind=note).
      track({ name: 'itinerary.item_added', properties: { trip_id: id, kind: 'note' } })
      setMessageSent(true)
      setHostMessage('')
      setTrip((prev) =>
        prev ? { ...prev, host_message_count: (prev.host_message_count ?? 0) + 1 } : prev,
      )
      setTimeout(() => setShowMessageModal(false), 800)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setActionPending(false)
    }
  }

  async function cancelTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setActionPending(true)
    setActionError(null)
    try {
      await http.put(`/api/trips/${id}/cancel`, { reason: cancelReason || null })
      track({ name: 'trip.cancelled', properties: { trip_id: id } })
      setTrip((prev) =>
        prev ? { ...prev, status: 'cancelled', cancellable: false, modifiable: false } : prev,
      )
      setShowCancelModal(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setActionPending(false)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/trips"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant hover:text-primary',
        )}
      >
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          arrow_back
        </span>
        {t('tripDetail.backLink', {}, { defaultValue: 'Back to trips' })}
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
        <>
          <section
            data-testid="trip-detail-hero"
            className={cm.cn(
              cm.sp('p', 8),
              cm.sp('mt', 6),
              'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                cm.w(64),
                cm.h(64),
                cm.roundedFull,
                'absolute -right-20 -bottom-20 bg-accent/40 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.w(48),
                cm.h(48),
                cm.roundedFull,
                'absolute -left-16 -top-16 bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div className="relative z-10">
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                <span
                  data-testid="trip-status-badge"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'uppercase tracking-widest rounded-full',
                    STATUS_THEME[trip.status].bg,
                    STATUS_THEME[trip.status].text,
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    {STATUS_THEME[trip.status].icon}
                  </span>
                  {t(
                    `tripDetail.status.${trip.status}`,
                    {},
                    { defaultValue: STATUS_THEME[trip.status].label },
                  )}
                </span>
                {trip.confirmation_code ? (
                  <span
                    data-testid="trip-confirmation-code"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-white tabular-nums',
                    )}
                  >
                    {t(
                      'tripDetail.confCode',
                      { code: trip.confirmation_code },
                      { defaultValue: 'Code · {{code}}' },
                    )}
                  </span>
                ) : null}
              </div>
              <h1
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 4),
                  'leading-tight tracking-tight',
                )}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {trip.property_name}
              </h1>
              <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-white/85')}>
                {trip.city}, {trip.country}
              </p>
              <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 6))}>
                <button
                  type="button"
                  data-testid="trip-message-host"
                  onClick={() => {
                    setShowMessageModal(true)
                    setActionError(null)
                    setMessageSent(false)
                  }}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-full bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-md',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    forum
                  </span>
                  {t(
                    'tripDetail.messageHostCta',
                    { count: trip.host_message_count },
                    { defaultValue: 'Message host ({{count}})' },
                  )}
                </button>
                {trip.modifiable ? (
                  <button
                    type="button"
                    data-testid="trip-modify"
                    onClick={() => navigate(`/property/${trip.property_id}`)}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                    )}
                  >
                    {t('tripDetail.modifyCta', {}, { defaultValue: 'Modify booking' })}
                  </button>
                ) : null}
                {trip.cancellable ? (
                  <button
                    type="button"
                    data-testid="trip-cancel"
                    onClick={() => {
                      setShowCancelModal(true)
                      setActionError(null)
                    }}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-surface/40 text-white hover:bg-surface/10 transition-colors',
                    )}
                  >
                    {t('tripDetail.cancelCta', {}, { defaultValue: 'Cancel booking' })}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          {trip.gallery.length > 0 ? (
            <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 md:grid-cols-3 gap-3')}>
              {trip.gallery.slice(0, 3).map((src, i) => (
                <div
                  key={i}
                  className={cm.cn(
                    'aspect-[4/3] bg-surface-variant rounded-2xl overflow-hidden',
                    i === 0 ? 'md:col-span-2 md:row-span-2' : '',
                  )}
                >
                  <img src={src} alt="" className={'h-full w-full object-cover'} />
                </div>
              ))}
            </div>
          ) : null}

          <div className={cm.cn(cm.sp('mt', 8), 'grid grid-cols-1 lg:grid-cols-12 gap-6')}>
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'lg:col-span-7 bg-surface rounded-2xl shadow-sm',
                cm.accentCard({ tone: 'primary' }),
              )}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('tripDetail.itineraryHeading', {}, { defaultValue: 'Itinerary' })}
              </h2>
              <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
                <Row label={t('tripDetail.checkInLabel', {}, { defaultValue: 'Check-in' })}>
                  {fmtDate(trip.check_in_iso)} · {fmtTime(trip.check_in_iso)}
                </Row>
                <Row label={t('tripDetail.checkOutLabel', {}, { defaultValue: 'Check-out' })}>
                  {fmtDate(trip.check_out_iso)} · {fmtTime(trip.check_out_iso)}
                </Row>
                <Row label={t('tripDetail.lengthLabel', {}, { defaultValue: 'Length' })}>
                  {t(
                    'tripDetail.nightsValue',
                    { count: nightsBetween(trip.check_in_iso, trip.check_out_iso) },
                    { defaultValue: '{{count}} nights' },
                  )}
                </Row>
                <Row label={t('nav.guests', {}, { defaultValue: 'Guests' })}>
                  {t(
                    'common.countGuests',
                    { count: trip.guests },
                    { defaultValue: '{{count}} guests' },
                  )}
                </Row>
                <Row label={t('form.address', {}, { defaultValue: 'Address' })}>{trip.address}</Row>
              </dl>
            </section>

            <section
              className={cm.cn(
                cm.sp('p', 6),
                'lg:col-span-5 bg-surface rounded-2xl shadow-sm',
                cm.accentCard({ tone: 'custom' }),
              )}
              style={{ ['--mol-accent' as string]: 'var(--color-accent)' }}
            >
              <h2
                className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('tripDetail.priceHeading', {}, { defaultValue: 'Price summary' })}
              </h2>
              <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}
                  </dt>
                  <dd className="tabular-nums font-semibold">{fmt(trip.subtotal_cents)}</dd>
                </div>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <dt className="text-on-surface-variant">
                    {t('tripDetail.taxes', {}, { defaultValue: 'Taxes & fees' })}
                  </dt>
                  <dd className="tabular-nums font-semibold">{fmt(trip.taxes_cents)}</dd>
                </div>
              </dl>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('pt', 3),
                  cm.sp('mt', 3),
                  cm.fontWeight('extrabold'),
                  cm.textSize('xl'),
                  'border-t border-outline-variant',
                )}
              >
                <span>{t('nav.total', {}, { defaultValue: 'Total' })}</span>
                <span data-testid="trip-total" className="tabular-nums">
                  {fmt(trip.total_cents)}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 4), 'text-on-surface-variant')}>
                {t(
                  'tripDetail.hostInfo',
                  { name: trip.host_name },
                  {
                    defaultValue:
                      'Hosted by {{name}}. Free cancellation up to 7 days before check-in.',
                  },
                )}
              </p>
            </section>
          </div>

          {showMessageModal ? (
            <Backdrop labelledBy="trip-message-title" onClose={() => setShowMessageModal(false)}>
              <h3
                id="trip-message-title"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('tripDetail.messageHostHeading', {}, { defaultValue: 'Message your host' })}
              </h3>
              {messageSent ? (
                <p
                  data-testid="trip-message-sent"
                  className={cm.cn(cm.textSize('sm'), 'text-success font-semibold')}
                >
                  {t('tripDetail.messageSent', {}, { defaultValue: 'Message sent.' })}
                </p>
              ) : (
                <form
                  onSubmit={sendHostMessage}
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
                >
                  <textarea
                    data-testid="trip-message-input"
                    value={hostMessage}
                    onChange={(e) => setHostMessage(e.target.value)}
                    rows={5}
                    placeholder={t(
                      'tripDetail.messagePlaceholder',
                      {},
                      {
                        defaultValue:
                          'Let your host know your arrival time, dietary needs, or anything else.',
                      },
                    )}
                    required
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                    )}
                  />
                  {actionError ? <p className="text-error text-sm">{actionError}</p> : null}
                  <button
                    type="submit"
                    data-testid="trip-message-submit"
                    disabled={actionPending || !hostMessage.trim()}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60',
                    )}
                  >
                    {actionPending
                      ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                      : t('tripDetail.messageSend', {}, { defaultValue: 'Send message' })}
                  </button>
                </form>
              )}
            </Backdrop>
          ) : null}

          {showCancelModal ? (
            <Backdrop labelledBy="trip-cancel-title" onClose={() => setShowCancelModal(false)}>
              <h3
                id="trip-cancel-title"
                className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'), cm.sp('mb', 4))}
                style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
              >
                {t('tripDetail.cancelHeading', {}, { defaultValue: 'Cancel this trip?' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
                {t(
                  'tripDetail.cancelHint',
                  {},
                  {
                    defaultValue:
                      'Free cancellation up to 7 days before check-in. We will notify your host immediately.',
                  },
                )}
              </p>
              <form
                onSubmit={cancelTrip}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
              >
                <textarea
                  data-testid="trip-cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder={t(
                    'tripDetail.cancelReasonPlaceholder',
                    {},
                    { defaultValue: 'Optional — reason for cancellation' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                />
                {actionError ? <p className="text-error text-sm">{actionError}</p> : null}
                <div className={cm.flex({ gap: 'sm' })}>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('semibold'),
                      'rounded-xl border border-outline-variant flex-1',
                    )}
                  >
                    {t('tripDetail.keepBookingCta', {}, { defaultValue: 'Keep booking' })}
                  </button>
                  <button
                    type="submit"
                    data-testid="trip-cancel-confirm"
                    disabled={actionPending}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-error text-on-error hover:opacity-90 flex-1 disabled:opacity-60',
                    )}
                  >
                    {actionPending
                      ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                      : t('tripDetail.confirmCancelCta', {}, { defaultValue: 'Cancel trip' })}
                  </button>
                </div>
              </form>
            </Backdrop>
          ) : null}
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
      <dt
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </dt>
      <dd
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'tabular-nums text-right max-w-[60%]',
        )}
      >
        {children}
      </dd>
    </div>
  )
}

function Backdrop({
  children,
  labelledBy,
  onClose,
}: {
  children: React.ReactNode
  labelledBy: string
  onClose: () => void
}) {
  const cm = getClassMap()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-2xl max-w-md w-full')}
      >
        {children}
      </div>
    </div>
  )
}
