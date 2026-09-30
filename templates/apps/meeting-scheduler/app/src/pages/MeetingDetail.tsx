/**
 * Authed meeting detail — shows the booking row from /api/bookings/:id,
 * lets the host cancel (PATCH status='cancelled' as the booking owner).
 * No fallback data — a 404 from the API renders a clear "not found".
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  invitee_name: string
  invitee_email: string | null
  invitee_timezone: string | null
  start_at: string
  end_at: string
  status: string
  location_kind: string
  location_value: unknown
  notes: string | null
  event_type_id: string
  cancellation_reason?: string | null
}

interface ApiEventType {
  id: string
  name: string
  duration_minutes: number
  location_kind: string
}

function fmt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function videoLinkFromLocation(kind: string, value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('http')) return value
  if (
    value &&
    typeof value === 'object' &&
    'url' in (value as Record<string, unknown>) &&
    typeof (value as { url: unknown }).url === 'string'
  ) {
    return (value as { url: string }).url
  }
  if (kind === 'jitsi') {
    return null
  }
  return null
}

export function MeetingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<ApiBooking | null>(null)
  const [eventType, setEventType] = useState<ApiEventType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<ApiBooking>(`/api/bookings/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (cancelled) return
        const item = unwrapSingle<ApiBooking>(res)
        if (!item) {
          setError(
            t('meetingDetail.notFound', {}, { defaultValue: 'This meeting no longer exists.' }),
          )
          return
        }
        setBooking(item)
        if (item.event_type_id) {
          try {
            const etRes = await http.get<ApiEventType>(
              `/api/event-types/${encodeURIComponent(item.event_type_id)}`,
            )
            if (!cancelled) {
              setEventType(unwrapSingle<ApiEventType>(etRes))
            }
          } catch (_error) {
            // best-effort; the meeting still renders without the event-type meta
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('meetingDetail.notFound', {}, { defaultValue: 'This meeting no longer exists.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleCancel = useCallback(async () => {
    if (!booking) return
    setCancelError(null)
    try {
      const res = await http.patch<ApiBooking>(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        status: 'cancelled',
      })
      const next = unwrapSingle<ApiBooking>(res)
      if (next) {
        setBooking(next)
        // Host cancelled a confirmed meeting.
        void track({
          name: 'booking.cancelled',
          properties: { booking_id: next.id, via: 'host' },
        })
      }
    } catch (error) {
      logError('meetingDetail.cancel', error)
      setCancelError(
        t(
          'meetingDetail.cancelError',
          {},
          { defaultValue: 'Could not cancel — please try again.' },
        ),
      )
    }
  }, [http, booking, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('meetingDetail.loading', {}, { defaultValue: 'Loading meeting…' })}
        </p>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div
        className={cm.cn(cm.sp('p', 8), cm.stack(4), 'max-w-[1200px] mx-auto')}
        data-testid="meeting-detail-not-found"
      >
        <Link to="/bookings" className={cm.cn(cm.textSize('sm'), 'font-bold text-primary')}>
          ← {t('meetingDetail.back', {}, { defaultValue: 'Back to bookings' })}
        </Link>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {error ??
            t('meetingDetail.notFound', {}, { defaultValue: 'This meeting no longer exists.' })}
        </p>
      </div>
    )
  }

  const initials = (booking.invitee_name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const eventTypeLabel = eventType
    ? `${eventType.name} · ${eventType.duration_minutes} min`
    : t('meetingDetail.defaultEventType', {}, { defaultValue: 'Meeting' })
  const videoLink = videoLinkFromLocation(booking.location_kind, booking.location_value)
  const isCancelled = booking.status === 'cancelled'

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.stack(2)}>
        <Link
          to="/bookings"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'font-bold text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_back
          </span>
          {t('meetingDetail.back', {}, { defaultValue: 'Back to bookings' })}
        </Link>
      </header>

      {cancelError ? (
        <p
          role="alert"
          data-testid="meeting-cancel-error"
          className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
        >
          {cancelError}
        </p>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-12')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 8),
            'gap-6 lg:col-span-8 bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <div
              className={cm.cn(
                cm.w(16),
                cm.h(16),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'bg-primary/10 text-primary',
              )}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className={cm.stack(1)}>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {eventTypeLabel}
              </p>
              <h1
                data-testid="meeting-detail-invitee"
                className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
              >
                {booking.invitee_name}
              </h1>
              {booking.invitee_email ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {booking.invitee_email}
                </p>
              ) : null}
              <p
                data-testid="meeting-detail-status"
                className={cm.cn(
                  cm.textSize('xs'),
                  'mt-2 font-bold uppercase tracking-widest',
                  isCancelled ? 'text-error' : 'text-success',
                )}
              >
                {t(
                  `bookingListItem.status.${booking.status}`,
                  {},
                  { defaultValue: booking.status.replace(/_/g, ' ') },
                )}
              </p>
            </div>
          </div>

          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            <div
              data-testid="meeting-detail-start"
              className={cm.cn(
                cm.stack(1),
                cm.sp('p', 4),
                cm.accentCard({ tone: 'primary' }),
                'bg-surface rounded-xl',
              )}
            >
              <p className={cm.accentCardLabel({ tone: 'primary' })}>
                {t('meetingDetail.startsAt', {}, { defaultValue: 'Starts' })}
              </p>
              <p className={cm.cn(cm.textSize('base'), 'font-bold tabular-nums')}>
                {fmt(booking.start_at)}
              </p>
            </div>
            <div
              data-testid="meeting-detail-end"
              className={cm.cn(
                cm.stack(1),
                cm.sp('p', 4),
                cm.accentCard({ tone: 'custom' }),
                'bg-surface rounded-xl',
              )}
              style={{ ['--mol-accent' as string]: 'var(--color-emerald-500)' }}
            >
              <p className={cm.accentCardLabel({ tone: 'custom' })}>
                {t('meetingDetail.endsAt', {}, { defaultValue: 'Ends' })}
              </p>
              <p className={cm.cn(cm.textSize('base'), 'font-bold tabular-nums')}>
                {fmt(booking.end_at)}
              </p>
            </div>
          </div>

          {booking.notes ? (
            <div className={cm.stack(2)}>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 1),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[14px]">question_answer</span>
                </span>
                {t('meetingDetail.guestAnswers', {}, { defaultValue: 'Guest answers' })}
              </h2>
              <p
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.textSize('sm'),
                  'italic bg-surface-container-low rounded-xl text-on-surface-variant leading-relaxed',
                )}
              >
                “{booking.notes}”
              </p>
            </div>
          ) : null}
        </div>

        <aside
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'lg:col-span-4 bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.actions', {}, { defaultValue: 'Actions' })}
          </h3>
          {videoLink ? (
            <a
              href={videoLink}
              data-testid="meeting-join-call"
              target="_blank"
              rel="noreferrer noopener"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('py', 3),
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'text-white hover:shadow-lg hover:shadow-primary/30 transition-all',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
              }}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                videocam
              </span>
              {t('meetingDetail.joinCall', {}, { defaultValue: 'Join video call' })}
            </a>
          ) : null}
          <button
            type="button"
            data-testid="meeting-back-to-bookings"
            onClick={() => navigate('/bookings')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('py', 3),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              list
            </span>
            {t('meetingDetail.viewAll', {}, { defaultValue: 'View all bookings' })}
          </button>
          {!isCancelled ? (
            <ConfirmButton
              label={t('meetingDetail.cancel', {}, { defaultValue: 'Cancel meeting' })}
              confirmLabel={t(
                'meetingDetail.confirmCancel',
                {},
                { defaultValue: 'Cancel this meeting? The invitee will see it as cancelled.' },
              )}
              pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
              onConfirm={handleCancel}
              disarmSeconds={6}
              data-mol-id="meeting-cancel"
            />
          ) : null}
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'meetingDetail.timezoneNote',
              { tz: booking.invitee_timezone || 'Local' },
              { defaultValue: 'Invitee timezone: {{tz}} — times shown in yours' },
            )}
          </p>
        </aside>
      </section>
    </div>
  )
}

export default MeetingDetail
