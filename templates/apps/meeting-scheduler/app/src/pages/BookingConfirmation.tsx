/**
 * Public booking confirmation: `/book/:slug/confirmed?token=...`
 *
 * Reads the booking back from the API by its cancellation token (so it
 * survives reload) and lets the invitee:
 *   - see the host name + meeting title + scheduled time
 *   - download a real .ics file (handled client-side; no API call needed)
 *   - cancel the booking via POST /api/bookings/by-token/:token/cancel
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ConfirmationPayload {
  booking: {
    id: string
    invitee_name: string
    invitee_email: string
    invitee_timezone: string
    start_at: string
    end_at: string
    status: string
    location_kind: string
    location_value: unknown
    notes: string | null
    cancellation_token: string | null
  }
  eventType: {
    name: string
    slug: string
    duration_minutes: number
    location_kind: string
  } | null
  host: {
    name: string | null
    email: string | null
  } | null
}

function fmt(iso?: string) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return { day, time }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toIcsDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function buildIcs(payload: ConfirmationPayload): string {
  const { booking, eventType, host } = payload
  const summary = eventType?.name ?? 'Meeting'
  const description = [
    `Hosted by ${host?.name ?? host?.email ?? 'host'}`,
    booking.notes ? `\\n\\nNotes:\\n${booking.notes}` : '',
  ]
    .filter(Boolean)
    .join('')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME}//Meeting//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@meeting-scheduler.local`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(booking.start_at)}`,
    `DTEND:${toIcsDate(booking.end_at)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

function googleCalendarUrl(payload: ConfirmationPayload): string {
  const { booking, eventType, host } = payload
  const summary = encodeURIComponent(eventType?.name ?? 'Meeting')
  const dates = `${toIcsDate(booking.start_at)}/${toIcsDate(booking.end_at)}`
  const details = encodeURIComponent(
    [
      `Hosted by ${host?.name ?? host?.email ?? 'host'}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  )
  return `https://calendar.google.com/calendar/r/eventedit?action=TEMPLATE&text=${summary}&dates=${dates}&details=${details}`
}

export function BookingConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ slug: string }>()
  const slug = params.slug || ''
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const http = useHttpClient()

  const [data, setData] = useState<ConfirmationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoadError(
        t(
          'bookingConfirmation.missingToken',
          {},
          {
            defaultValue: 'Booking confirmation link is missing its token.',
          },
        ),
      )
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    http
      .get<ConfirmationPayload>(`/api/bookings/by-token/${encodeURIComponent(token)}`)
      .then((res) => {
        if (cancelled) return
        const next = unwrapSingle<ConfirmationPayload>(res)
        if (!next?.booking) {
          setLoadError(
            t(
              'bookingConfirmation.notFound',
              {},
              {
                defaultValue: 'This booking confirmation could not be found.',
              },
            ),
          )
          return
        }
        setData(next)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(
          t(
            'bookingConfirmation.notFound',
            {},
            {
              defaultValue: 'This booking confirmation could not be found.',
            },
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, token, t])

  const startMeta = data ? fmt(data.booking.start_at) : null
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local', [])
  const isCancelled = data?.booking.status === 'cancelled'

  const handleDownloadIcs = useCallback(() => {
    if (!data) return
    const ics = buildIcs(data)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.eventType?.slug ?? 'meeting'}-${data.booking.id}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [data])

  const handleGoogle = useCallback(() => {
    if (!data) return
    window.open(googleCalendarUrl(data), '_blank', 'noopener')
  }, [data])

  const handleCancel = useCallback(async () => {
    if (!data || cancelling) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await http.post<{ booking: { status: string } }>(
        `/api/bookings/by-token/${encodeURIComponent(token)}/cancel`,
        {},
      )
      const next = unwrapSingle<{ booking: { status: string } }>(res)
      if (next?.booking?.status === 'cancelled' || next?.booking?.status === 'no_show') {
        setData((prev) =>
          prev
            ? {
                ...prev,
                booking: { ...prev.booking, status: next.booking.status },
              }
            : prev,
        )
        // Invitee cancelled from their confirmation link.
        void track({
          name: 'booking.cancelled',
          properties: { booking_id: data.booking.id, via: 'invitee' },
        })
      }
    } catch (error) {
      logError('bookingConfirmation.cancel', error)
      setCancelError(
        t(
          'bookingConfirmation.cancelError',
          {},
          {
            defaultValue: 'Could not cancel — please try again.',
          },
        ),
      )
    } finally {
      setCancelling(false)
    }
  }, [data, cancelling, http, token, t])

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-gradient-to-br from-surface-container-low via-surface to-surface-container text-on-surface',
      )}
    >
      <div className={cm.cn(cm.w('full'), cm.maxW('lg'))}>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            cm.stack(8),
            cm.textCenter,
            'relative overflow-hidden bg-surface-container-lowest rounded-3xl shadow-2xl shadow-primary/10',
          )}
        >
          <div
            className={cm.cn(
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              cm.mxAuto,
              'shadow-md shadow-primary/20',
            )}
            style={{
              background: isCancelled
                ? 'linear-gradient(135deg, var(--color-danger), var(--color-danger-gradient-to))'
                : 'linear-gradient(135deg, var(--color-success), var(--color-success-gradient-to))',
            }}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined text-white text-4xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isCancelled ? 'cancel' : 'check'}
            </span>
          </div>

          {loading ? (
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t('bookingConfirmation.loading', {}, { defaultValue: 'Loading your booking…' })}
            </p>
          ) : loadError ? (
            <p
              role="alert"
              data-testid="booking-confirmation-error"
              className={cm.cn(cm.textSize('base'), 'text-error font-semibold')}
            >
              {loadError}
            </p>
          ) : data ? (
            <>
              <div className={cm.stack(3)}>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest',
                    isCancelled ? 'text-error' : 'text-success',
                  )}
                  data-testid="booking-confirmation-status"
                >
                  {isCancelled
                    ? t(
                        'bookingConfirmation.cancelledEyebrow',
                        {},
                        {
                          defaultValue: 'Booking cancelled',
                        },
                      )
                    : t('bookingConfirmation.eyebrow', {}, { defaultValue: 'You’re booked' })}
                </p>
                <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
                  {isCancelled
                    ? t(
                        'bookingConfirmation.cancelledHeading',
                        {},
                        {
                          defaultValue: 'No worries — you can rebook anytime.',
                        },
                      )
                    : t('bookingConfirmation.heading', {}, { defaultValue: 'See you soon' })}
                </h1>
                <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                  {t(
                    'bookingConfirmation.subheading',
                    {
                      host: data.host?.name ?? data.host?.email ?? 'host',
                      meeting: data.eventType?.name ?? 'meeting',
                    },
                    {
                      defaultValue: 'Booking confirmed with {{host}} for {{meeting}}.',
                    },
                  )}
                </p>
              </div>

              {startMeta ? (
                <div
                  data-testid="booking-confirmation-time"
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    cm.sp('p', 6),
                    'bg-primary/5 rounded-2xl border border-primary/20',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('bookingConfirmation.scheduledFor', {}, { defaultValue: 'Scheduled for' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-extrabold tabular-nums text-on-surface',
                    )}
                  >
                    {startMeta.time}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface-variant')}>
                    {startMeta.day}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t('bookingConfirmation.timezone', { tz }, { defaultValue: '{{tz}}' })}
                  </p>
                </div>
              ) : null}

              {!isCancelled ? (
                <div className={cm.stack(3)}>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'bookingConfirmation.addToCalendar',
                      {},
                      { defaultValue: 'Add to calendar' },
                    )}
                  </p>
                  <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 'sm' }))}>
                    <button
                      type="button"
                      data-testid="add-to-google"
                      onClick={handleGoogle}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                      )}
                      style={{ color: '#4285f4' }}
                    >
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        event_available
                      </span>
                      {t(
                        'bookingConfirmation.calendar.google',
                        {},
                        { defaultValue: 'Google Calendar' },
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="download-ics"
                      onClick={handleDownloadIcs}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                      )}
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        download
                      </span>
                      {t(
                        'bookingConfirmation.calendar.ical',
                        {},
                        { defaultValue: 'Download .ics' },
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="cancel-booking"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.sp('mt', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'mx-auto uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-50',
                    )}
                  >
                    {cancelling
                      ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                      : t('bookingConfirmation.cancel', {}, { defaultValue: 'Cancel booking' })}
                  </button>
                  {cancelError ? (
                    <p
                      role="alert"
                      data-testid="booking-cancel-error"
                      className={cm.cn(cm.textSize('xs'), 'text-error')}
                    >
                      {cancelError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                  cm.sp('pt', 4),
                  'border-t border-outline-variant/40',
                )}
              >
                <Link
                  to={`/book/${slug}`}
                  className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
                >
                  {t('bookingConfirmation.bookAnother', {}, { defaultValue: 'Book another time' })}
                </Link>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>·</span>
                <Link
                  to="/"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t(
                    'bookingConfirmation.poweredBy',
                    { app: APP_NAME },
                    { defaultValue: 'Powered by {{app}}' },
                  )}
                </Link>
              </div>
            </>
          ) : null}

          <div
            className={
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none'
            }
          />
          <div
            className={
              'absolute -left-16 top-0 w-40 h-40 rounded-full bg-success/10 blur-2xl pointer-events-none'
            }
          />
        </div>
      </div>
    </div>
  )
}

export default BookingConfirmation
