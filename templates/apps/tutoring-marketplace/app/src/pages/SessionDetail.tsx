import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { getRealtimeConnection } from '../lib/realtime.js'

type BookingRow = {
  id: string
  tutor_id: string
  student_id: string
  tutor_name?: string | null
  subject?: string | null
  scheduled_at?: string
  duration_hours?: number | string
  status?: string
}

type TutoringSessionRow = {
  id: string
  booking_id: string
  status?: string
  started_at?: string
  ended_at?: string | null
  notes?: string | null
}

type ReviewRow = {
  id: string
  booking_id?: string
  rating: number
  body?: string | null
  created_at?: string
}

function formatStart(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  return (
    d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) +
    ', ' +
    time
  )
}

function deriveStatus(b: BookingRow): 'upcoming' | 'in_progress' | 'completed' | 'cancelled' {
  const raw = (b.status ?? 'pending').toLowerCase()
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'completed') return 'completed'
  if (raw === 'in_progress') return 'in_progress'
  if (b.scheduled_at) {
    const start = new Date(b.scheduled_at)
    const now = Date.now()
    const startMs = start.getTime()
    const durMs = Number(b.duration_hours ?? 1) * 60 * 60 * 1000
    if (now < startMs) return 'upcoming'
    if (now >= startMs && now <= startMs + durMs) return 'in_progress'
    return 'completed'
  }
  return 'upcoming'
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming',
  in_progress: 'In session now',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_BG: Record<string, string> = {
  upcoming: 'var(--chalk-booked)',
  in_progress: 'var(--chalk-in-session)',
  completed: 'var(--chalk-available)',
  cancelled: 'var(--chalk-cancelled)',
}

export function SessionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [booking, setBooking] = useState<BookingRow | null>(null)
  const [session, setSession] = useState<TutoringSessionRow | null>(null)
  const [errored, setErrored] = useState(false)
  const [actionPending, setActionPending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [existingReview, setExistingReview] = useState<ReviewRow | null>(null)
  const [reviewLoaded, setReviewLoaded] = useState(false)
  const [reviewDraftRating, setReviewDraftRating] = useState(5)
  const [reviewDraftBody, setReviewDraftBody] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    http
      .get<BookingRow>(`/api/bookings/${id}`)
      .then(async (res) => {
        if (!active) return
        const data = (res as { data?: BookingRow | null }).data
        if (!data?.id) {
          setErrored(true)
          return
        }
        setBooking(data)
        if ((data.status ?? '').toLowerCase() === 'in_progress') {
          try {
            const sessions = (await http.get<TutoringSessionRow[]>(
              `/api/bookings/${data.id}/sessions`,
            )) as { data?: TutoringSessionRow[] | null } | null
            const list = sessions?.data
            if (Array.isArray(list)) {
              const live = list.find((s) => (s.status ?? '').toLowerCase() === 'active') ?? list[0]
              if (live?.id) setSession(live)
            }
          } catch (_error) {
            // Session lookup is optional — UI still functions without it
          }
        }
      })
      .catch(() => {
        if (!active) return
        setErrored(true)
      })
    return () => {
      active = false
    }
  }, [http, id])

  // Live session lifecycle: both the student and the tutor join `booking:<id>` on
  // open (they always know the booking id), so BOTH see a session start/end live —
  // even the party who didn't trigger it, and even before any session row exists
  // (the session-id-keyed room can't reach the non-starting party pre-start).
  // Server: api/src/handlers/sessions.ts (broadcasts to booking:<id> too).
  useEffect(() => {
    if (!id) return
    const room = `booking:${id}`
    let active = true
    let connection: RealtimeConnection | null = null

    const asSession = (data: unknown): TutoringSessionRow | null =>
      typeof data === 'object' && data !== null && typeof (data as { id?: unknown }).id === 'string'
        ? (data as TutoringSessionRow)
        : null

    const onStarted = (data: unknown) => {
      const s = asSession(data)
      if (s) setSession(s)
      setBooking((prev) => (prev ? { ...prev, status: 'in_progress' } : prev))
    }
    const onEnded = (data: unknown) => {
      const s = asSession(data)
      if (s) setSession(s)
      setBooking((prev) => (prev ? { ...prev, status: 'completed' } : prev))
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('session-started', onStarted)
        conn.on('session-ended', onEnded)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Realtime is best-effort; the initial fetch already populated the view.
      })

    return () => {
      active = false
      if (connection) {
        connection.off('session-started', onStarted)
        connection.off('session-ended', onEnded)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id])

  const status = useMemo(() => (booking ? deriveStatus(booking) : 'upcoming'), [booking])

  // After a session completes the only meaningful next user action is to
  // rate it. We fetch the existing review (if any) so the UI either shows
  // a pre-filled "✓ You rated X" badge or an inline rating form.
  useEffect(() => {
    if (!booking?.id) return
    if (status !== 'completed') {
      setReviewLoaded(true)
      return
    }
    let active = true
    setReviewLoaded(false)
    http
      .get<ReviewRow>(`/api/reviews/booking/${booking.id}`)
      .then((res) => {
        if (!active) return
        const data = (res as { data?: ReviewRow | null }).data
        if (data?.id) setExistingReview(data)
        setReviewLoaded(true)
      })
      .catch(() => {
        if (!active) return
        setReviewLoaded(true)
      })
    return () => {
      active = false
    }
  }, [http, booking?.id, status])

  const handleSubmitReview = async () => {
    if (!booking?.id || !booking?.tutor_id) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      const response = (await http.post<ReviewRow>('/api/reviews', {
        tutor_id: booking.tutor_id,
        booking_id: booking.id,
        rating: reviewDraftRating,
        body: reviewDraftBody.trim() || undefined,
      })) as { data?: ReviewRow | null }
      if (response.data?.id) {
        setExistingReview(response.data)
        setFeedback(
          t('sessionDetail.reviewSubmitted', {}, { defaultValue: 'Thanks for the rating!' }),
        )
        void track({
          name: 'review.added',
          properties: {
            bookingId: booking.id,
            tutorId: booking.tutor_id,
            rating: reviewDraftRating,
          },
        })
      } else {
        setReviewError(
          t('sessionDetail.reviewError', {}, { defaultValue: 'Could not submit review.' }),
        )
      }
    } catch (err) {
      setReviewError(
        (err as { message?: string }).message ??
          t('sessionDetail.reviewError', {}, { defaultValue: 'Could not submit review.' }),
      )
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleStart = async () => {
    if (!booking) return
    setActionPending(true)
    setFeedback(null)
    try {
      const response = (await http.post<TutoringSessionRow>('/api/sessions/start', {
        booking_id: booking.id,
      })) as { data?: TutoringSessionRow | null }
      if (response.data?.id) {
        setSession(response.data)
        setFeedback(
          t(
            'sessionDetail.startedFeedback',
            {},
            { defaultValue: 'Session started — happy learning.' },
          ),
        )
        setBooking({ ...booking, status: 'in_progress' })
      } else {
        setFeedback(
          t('sessionDetail.startError', {}, { defaultValue: 'Could not start the session.' }),
        )
      }
    } catch (err) {
      setFeedback(
        (err as { message?: string }).message ??
          t('sessionDetail.startError', {}, { defaultValue: 'Could not start the session.' }),
      )
    } finally {
      setActionPending(false)
    }
  }

  const handleEnd = async () => {
    if (!session?.id) return
    setActionPending(true)
    setFeedback(null)
    try {
      const response = (await http.post<TutoringSessionRow>(
        `/api/sessions/${session.id}/end`,
        {},
      )) as { data?: TutoringSessionRow | null }
      if (response.data?.id) {
        setSession(response.data)
        if (booking) setBooking({ ...booking, status: 'completed' })
        setFeedback(
          t(
            'sessionDetail.endedFeedback',
            {},
            { defaultValue: 'Session ended. Receipt will be issued shortly.' },
          ),
        )
      }
    } catch (err) {
      setFeedback(
        (err as { message?: string }).message ??
          t('sessionDetail.endError', {}, { defaultValue: 'Could not end the session.' }),
      )
    } finally {
      setActionPending(false)
    }
  }

  const handleCancel = async () => {
    if (!booking) return
    setActionPending(true)
    setFeedback(null)
    try {
      await http.put(`/api/bookings/${booking.id}/cancel`, {})
      setBooking({ ...booking, status: 'cancelled' })
      setFeedback(t('sessionDetail.cancelledFeedback', {}, { defaultValue: 'Booking cancelled.' }))
      void track({
        name: 'session.cancelled',
        properties: { bookingId: booking.id, tutorId: booking.tutor_id },
      })
    } catch (err) {
      setFeedback(
        (err as { message?: string }).message ??
          t('sessionDetail.cancelError', {}, { defaultValue: 'Could not cancel the booking.' }),
      )
    } finally {
      setActionPending(false)
    }
  }

  if (!booking && !errored) {
    return (
      <div className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('sessionDetail.loading', {}, { defaultValue: 'Loading session…' })}
      </div>
    )
  }

  if (errored || !booking) {
    return (
      <div className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.stack(4))}>
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
          {t('sessionDetail.notFound', {}, { defaultValue: 'Could not find that session.' })}
        </p>
        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className={cm.cn(
            cm.fontWeight('semibold'),
            'self-center rounded-full px-5 py-2 bg-primary text-on-primary',
          )}
        >
          {t('sessionDetail.backToSessions', {}, { defaultValue: '← All sessions' })}
        </button>
      </div>
    )
  }

  const tutorName = booking.tutor_name ?? 'Tutor'
  const subject = booking.subject ?? 'Tutoring session'
  const startsAt = formatStart(booking.scheduled_at)
  const durationMinutes = Math.round(Number(booking.duration_hours ?? 1) * 60)
  const statusLabel = t(
    `sessionDetail.status.${status}`,
    {},
    { defaultValue: STATUS_LABEL[status] },
  )
  const statusColor = STATUS_BG[status] ?? 'var(--mol-color-primary)'

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
          cm.sp('p', 10),
        )}
        style={{
          background: `linear-gradient(135deg, ${statusColor} 0%, var(--mol-color-primary) 70%, var(--mol-color-primary-dark) 100%)`,
        }}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full px-3 py-1 backdrop-blur-md uppercase tracking-widest',
            )}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {status === 'in_progress' && (
              <span
                className={cm.cn('inline-block w-1.5 h-1.5 rounded-full bg-surface animate-pulse')}
              />
            )}
            {statusLabel}
          </span>
        </div>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'relative z-10 font-display text-4xl md:text-5xl tracking-tight',
          )}
        >
          {subject}
        </h1>
        <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 2), 'relative z-10 opacity-90')}>
          {t(
            'sessionDetail.subtitle',
            { name: tutorName, when: startsAt, mins: durationMinutes },
            { defaultValue: 'with {{name}} • {{when}} • {{mins}} min' },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mt', 6), 'relative z-10')}
        >
          {status === 'upcoming' && (
            <button
              type="button"
              onClick={handleStart}
              disabled={actionPending}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-6 py-3 bg-surface shadow-lg hover:scale-[1.03] transition-transform disabled:opacity-60',
              )}
              style={{ color: 'var(--mol-color-primary-dark)' }}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                video_call
              </span>
              {actionPending
                ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                : t('sessionDetail.start', {}, { defaultValue: 'Start session' })}
            </button>
          )}
          {status === 'in_progress' && session?.id && (
            <button
              type="button"
              onClick={handleEnd}
              disabled={actionPending}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-6 py-3 bg-surface shadow-lg hover:scale-[1.03] transition-transform disabled:opacity-60',
              )}
              style={{ color: 'var(--mol-color-primary-dark)' }}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                stop_circle
              </span>
              {actionPending
                ? t('sessionDetail.ending', {}, { defaultValue: 'Ending…' })
                : t('sessionDetail.end', {}, { defaultValue: 'End session' })}
            </button>
          )}
          <Link
            to={booking?.tutor_id ? `/messages?with=${booking.tutor_id}` : '/messages'}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-full px-6 py-3 backdrop-blur-md border border-surface/40 hover:bg-surface/15 transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              chat
            </span>
            {t('sessionDetail.openChat', {}, { defaultValue: 'Message tutor' })}
          </Link>
          {status === 'upcoming' && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={actionPending}
              data-testid="cancel-booking"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-6 py-3 backdrop-blur-md border border-surface/40 hover:bg-surface/15 transition-colors disabled:opacity-60',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                cancel
              </span>
              {t('sessionDetail.cancel', {}, { defaultValue: 'Cancel booking' })}
            </button>
          )}
        </div>
      </header>

      {feedback && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-2xl bg-surface-container-low border border-outline-variant/20',
          )}
        >
          {feedback}
        </div>
      )}

      {status === 'completed' && reviewLoaded && (
        <section
          data-testid="review-section"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm',
          )}
        >
          {existingReview ? (
            <div className={cm.cn(cm.stack(2))} data-testid="review-existing">
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'font-display tracking-tight',
                )}
              >
                {t(
                  'sessionDetail.reviewExistingTitle',
                  {},
                  { defaultValue: 'You rated this session' },
                )}
              </h2>
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('lg'))}
                aria-label={`Rated ${existingReview.rating} out of 5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined',
                      n <= existingReview.rating ? 'text-warning' : 'text-on-surface-variant/40',
                    )}
                  >
                    star
                  </span>
                ))}
                <span className={cm.cn(cm.fontWeight('semibold'))}>{existingReview.rating}/5</span>
              </div>
              {existingReview.body && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {existingReview.body}
                </p>
              )}
            </div>
          ) : (
            <div className={cm.cn(cm.stack(4))} data-testid="review-form">
              <header className={cm.stack(1)}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'font-display tracking-tight',
                  )}
                >
                  {t('sessionDetail.reviewTitle', {}, { defaultValue: 'Leave a review' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'sessionDetail.reviewSubtitle',
                    { name: booking.tutor_name ?? 'your tutor' },
                    { defaultValue: 'How was your session with {{name}}?' },
                  )}
                </p>
              </header>
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                role="radiogroup"
                aria-label="Star rating"
                data-testid="review-stars"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={reviewDraftRating === n}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    onClick={() => setReviewDraftRating(n)}
                    className={cm.cn('rounded-full p-1 hover:scale-110 transition-transform')}
                    data-testid={`review-star-${n}`}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'material-symbols-outlined text-2xl',
                        n <= reviewDraftRating ? 'text-warning' : 'text-on-surface-variant/40',
                      )}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <textarea
                value={reviewDraftBody}
                onChange={(e) => setReviewDraftBody(e.target.value)}
                placeholder={t(
                  'sessionDetail.reviewPlaceholder',
                  {},
                  { defaultValue: 'Share what went well (optional)' },
                )}
                data-testid="review-body"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline-variant/30 bg-surface min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary',
                )}
              />
              {reviewError && (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
                  {reviewError}
                </p>
              )}
              <div className={cm.flex({ justify: 'end' })}>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting}
                  data-testid="review-submit"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-full px-6 py-3 bg-primary text-on-primary shadow hover:bg-primary-dark disabled:opacity-60',
                  )}
                >
                  {reviewSubmitting
                    ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                    : t('sessionDetail.reviewSubmit', {}, { defaultValue: 'Submit review' })}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn(cm.stack(8), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-8')}>
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'font-display tracking-tight',
              )}
            >
              {t('sessionDetail.preNotes', {}, { defaultValue: 'Pre-session notes' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'leading-[1.7] text-on-surface-variant')}>
              {t(
                'sessionDetail.preNotesBody',
                {},
                {
                  defaultValue:
                    'Review last week’s sticking points, prep one or two questions you want to walk through, and join a few minutes early so we can dive in.',
                },
              )}
            </p>
          </section>
        </div>

        <aside className={cm.cn('col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'font-display tracking-tight',
              )}
            >
              {t('sessionDetail.timeline', {}, { defaultValue: 'Status timeline' })}
            </h3>
            <ol className={cm.stack(3)}>
              <TimelineRow
                done
                icon="event_available"
                label={t('sessionDetail.timeline.booked', {}, { defaultValue: 'Booked' })}
                when={startsAt}
              />
              <TimelineRow
                done={status !== 'cancelled'}
                icon="check_circle"
                label={t('sessionDetail.timeline.confirmed', {}, { defaultValue: 'Confirmed' })}
                when={startsAt}
              />
              <TimelineRow
                active={status === 'in_progress'}
                done={status === 'completed'}
                icon="video_call"
                label={t('sessionDetail.timeline.inSession', {}, { defaultValue: 'In session' })}
                when={
                  status === 'in_progress'
                    ? t('sessionDetail.timeline.now', {}, { defaultValue: 'Now' })
                    : startsAt
                }
              />
              <TimelineRow
                done={status === 'completed'}
                icon="rate_review"
                label={t('sessionDetail.timeline.review', {}, { defaultValue: 'Review prompt' })}
                when={t(
                  'sessionDetail.timeline.afterEnd',
                  {},
                  { defaultValue: 'After session ends' },
                )}
              />
              <TimelineRow
                done={status === 'completed'}
                icon="receipt_long"
                label={t('sessionDetail.timeline.receipt', {}, { defaultValue: 'Receipt issued' })}
                when={t('sessionDetail.timeline.auto', {}, { defaultValue: 'Auto' })}
              />
            </ol>
            <Link
              to={`/sessions`}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.textCenter,
                'text-on-surface-variant hover:text-primary',
              )}
            >
              {t('sessionDetail.backToSessions', {}, { defaultValue: '← All sessions' })}
            </Link>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
              {t('sessionDetail.idLine', { id: id ?? '' }, { defaultValue: 'Booking #{{id}}' })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TimelineRow({
  icon,
  label,
  when,
  done,
  active,
}: {
  icon: string
  label: string
  when: string
  done?: boolean
  active?: boolean
}) {
  const cm = getClassMap()
  return (
    <li className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(8),
          cm.h(8),
          'rounded-full shrink-0',
        )}
        style={
          active
            ? {
                backgroundColor: 'var(--chalk-in-session-light)',
                color: 'var(--chalk-in-session)',
              }
            : done
              ? {
                  backgroundColor: 'var(--chalk-available-light)',
                  color: 'var(--chalk-available)',
                }
              : {
                  backgroundColor: 'var(--mol-color-background-secondary)',
                  color: 'var(--mol-color-text-secondary)',
                }
        }
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>{icon}</span>
      </span>
      <div className={cm.flex1}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{when}</p>
      </div>
    </li>
  )
}
