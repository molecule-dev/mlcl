/**
 * Public booking page for `/book/:slug`. Anyone with the link can:
 *   - see the host's name and the event type's title/duration
 *   - pick a real available time slot for one of the next ~14 days
 *     (driven by /api/event-types/by-slug/:slug/availability?date=…)
 *   - submit name/email/notes to create a real booking via
 *     /api/bookings/public, then route to the confirmation page using the
 *     server-issued cancellation token.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { TimeSlotPicker } from '../components/TimeSlotPicker.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface PublicEventType {
  id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: string
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  requires_confirmation: boolean
  color: string | null
}

interface PublicHost {
  id: string
  name: string | null
  email: string | null
}

interface AvailabilitySlot {
  start: string
  end: string
  available: boolean
}

interface AvailabilityResponse {
  slots: AvailabilitySlot[]
  duration_minutes: number
}

interface PublicBookingResponse {
  booking: { id: string }
  cancellationToken: string
}

const DAY_COUNT = 14

function isoDate(d: Date): string {
  // Days are constructed in local time (so "today" matches what the user
  // sees on their wall clock), so the date string we send to the API must
  // also be in local-time components — using getUTCDate() here would shift
  // the date by one for any user east of UTC.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function BookingPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ slug: string }>()
  const slug = params.slug || 'demo'
  const http = useHttpClient()

  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [])

  const [eventType, setEventType] = useState<PublicEventType | null>(null)
  const [host, setHost] = useState<PublicHost | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)

  const [selectedDayIdx, setSelectedDayIdx] = useState(0)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local', [])

  useEffect(() => {
    let cancelled = false
    setLoadingDetails(true)
    setLoadError(null)
    http
      .get<{ eventType: PublicEventType; host: PublicHost | null }>(
        `/api/event-types/by-slug/${encodeURIComponent(slug)}`,
      )
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<{ eventType: PublicEventType; host: PublicHost | null }>(res)
        if (!data || !data.eventType) {
          setLoadError(
            t(
              'bookingPage.notFound',
              {},
              { defaultValue: 'This booking link is no longer active.' },
            ),
          )
          return
        }
        setEventType(data.eventType)
        setHost(data.host)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        setLoadError(
          status === 404
            ? t(
                'bookingPage.notFound',
                {},
                { defaultValue: 'This booking link is no longer active.' },
              )
            : t('bookingPage.loadError', {}, { defaultValue: 'Could not load this booking link.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, slug, t])

  const fetchSlotsForDay = useCallback(
    (date: Date) => {
      let cancelled = false
      setLoadingSlots(true)
      setSlotsError(null)
      setSelectedStart(null)
      http
        .get<AvailabilityResponse>(
          `/api/event-types/by-slug/${encodeURIComponent(slug)}/availability?date=${isoDate(date)}`,
        )
        .then((res) => {
          if (cancelled) return
          const data = unwrapSingle<AvailabilityResponse>(res) ?? { slots: [], duration_minutes: 0 }
          setSlots(Array.isArray(data.slots) ? data.slots : [])
        })
        .catch(() => {
          if (cancelled) return
          setSlots([])
          setSlotsError(
            t(
              'bookingPage.availabilityError',
              {},
              { defaultValue: 'Could not load available times — try again.' },
            ),
          )
        })
        .finally(() => {
          if (!cancelled) setLoadingSlots(false)
        })
      return () => {
        cancelled = true
      }
    },
    [http, slug, t],
  )

  useEffect(() => {
    if (!eventType) return
    const cleanup = fetchSlotsForDay(days[selectedDayIdx])
    return cleanup
  }, [eventType, days, selectedDayIdx, fetchSlotsForDay])

  const visibleSlots = useMemo(() => {
    const now = Date.now()
    return (
      slots
        // Hide slots that already started — showing a long "Booked" list of
        // past times for "today" is misleading and noisy.
        .filter((s) => Date.parse(s.start) > now)
        .map((s) => ({
          start: s.start,
          end: s.end,
          unavailable: !s.available,
        }))
    )
  }, [slots])

  const canSubmit =
    !!selectedStart && name.trim().length > 0 && email.trim().length > 3 && !submitting

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault()
    if (!eventType || !selectedStart) return
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await http.post<PublicBookingResponse>('/api/bookings/public', {
        event_type_slug: slug,
        invitee_name: name.trim(),
        invitee_email: email.trim(),
        invitee_timezone: tz,
        start_at: selectedStart,
        notes: notes.trim() || undefined,
      })
      const data = unwrapSingle<PublicBookingResponse>(res)
      if (!data?.cancellationToken) {
        setSubmitError(
          t(
            'bookingPage.submitError',
            {},
            {
              defaultValue: 'Booking created but no token returned. Try refreshing.',
            },
          ),
        )
        return
      }
      navigate(
        `/book/${encodeURIComponent(slug)}/confirmed?token=${encodeURIComponent(data.cancellationToken)}`,
      )
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })
        ?.response
      const errorMsg =
        status?.data?.error ??
        (status?.status === 409
          ? t(
              'bookingPage.slotTaken',
              {},
              { defaultValue: 'That slot was just taken — pick another.' },
            )
          : t(
              'bookingPage.submitError',
              {},
              { defaultValue: 'Could not complete your booking — try again.' },
            ))
      setSubmitError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-gradient-to-br from-surface-container-low via-surface to-surface-container text-on-surface',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 6),
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
            }}
            aria-hidden="true"
          >
            <span
              className={'material-symbols-outlined text-white text-base'}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-bold uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('bookingPage.eyebrow', {}, { defaultValue: 'Book a meeting' })}
        </span>
      </header>

      <main
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 16), cm.stack(8))}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 8),
            'gap-6 bg-surface-container-lowest rounded-3xl shadow-sm',
          )}
        >
          {loadingDetails ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('bookingPage.loading', {}, { defaultValue: 'Loading booking link…' })}
            </p>
          ) : loadError ? (
            <p
              role="alert"
              data-testid="booking-page-error"
              className={cm.cn(cm.textSize('base'), 'text-error font-semibold')}
            >
              {loadError}
            </p>
          ) : eventType ? (
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <div
                className={cm.cn(
                  cm.w(16),
                  cm.h(16),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.fontWeight('bold'),
                  cm.textSize('xl'),
                  'bg-primary/10 text-primary',
                )}
                aria-hidden="true"
              >
                {(host?.name ?? slug)[0]?.toUpperCase() ?? 'M'}
              </div>
              <div className={cm.stack(1)}>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('bookingPage.host', {}, { defaultValue: 'Hosted by' })}
                </p>
                <h1
                  data-testid="booking-page-host"
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {host?.name ?? host?.email ?? slug}
                </h1>
                <p
                  data-testid="booking-page-event"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {t(
                    'bookingPage.eventLine',
                    { name: eventType.name, mins: eventType.duration_minutes },
                    {
                      defaultValue: '{{name}} · {{mins}} minutes',
                    },
                  )}
                </p>
                {eventType.description ? (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 2),
                      'text-on-surface-variant max-w-2xl leading-relaxed',
                    )}
                  >
                    {eventType.description}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {eventType && !loadError ? (
          <form
            onSubmit={handleConfirm}
            className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 md:grid-cols-12')}
          >
            <aside
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                'gap-3 md:col-span-5 bg-surface-container-lowest rounded-3xl shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('bookingPage.pickDay', {}, { defaultValue: 'Pick a day' })}
              </h2>
              <div className={cm.stack(2)}>
                {days.map((d, i) => {
                  const isSelected = i === selectedDayIdx
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      data-testid={`day-${i}`}
                      onClick={() => setSelectedDayIdx(i)}
                      className={cm.cn(
                        cm.w('full'),
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        'rounded-xl border transition-colors',
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-surface border-outline-variant hover:bg-surface-container-low',
                      )}
                    >
                      <span>{dayLabel(d)}</span>
                      {isSelected ? (
                        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                          check_circle
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 4), 'text-on-surface-variant')}>
                {t('bookingPage.timezone', { tz }, { defaultValue: 'Times shown in {{tz}}' })}
              </p>
            </aside>

            <div
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                'gap-4 md:col-span-7 bg-surface-container-lowest rounded-3xl shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('bookingPage.pickTime', {}, { defaultValue: 'Available times' })}
              </h2>

              {loadingSlots ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('bookingPage.loadingSlots', {}, { defaultValue: 'Loading times…' })}
                </p>
              ) : slotsError ? (
                <p
                  role="alert"
                  data-testid="booking-page-slots-error"
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                >
                  {slotsError}
                </p>
              ) : (
                <TimeSlotPicker
                  slots={visibleSlots}
                  selectedStart={selectedStart}
                  onSelect={setSelectedStart}
                />
              )}

              <div className={cm.cn(cm.stack(3), cm.sp('mt', 4))}>
                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="invitee-name"
                >
                  {t('auth.signup.name', {}, { defaultValue: 'Your name' })}
                </label>
                <input
                  id="invitee-name"
                  data-testid="invitee-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none',
                  )}
                  autoComplete="name"
                />

                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="invitee-email"
                >
                  {t('bookingPage.field.email', {}, { defaultValue: 'Your email' })}
                </label>
                <input
                  id="invitee-email"
                  data-testid="invitee-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none',
                  )}
                  autoComplete="email"
                />

                <label
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                  htmlFor="invitee-notes"
                >
                  {t(
                    'bookingPage.field.notes',
                    {},
                    { defaultValue: 'Anything to add? (optional)' },
                  )}
                </label>
                <textarea
                  id="invitee-notes"
                  data-testid="invitee-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none resize-y',
                  )}
                />
              </div>

              {submitError ? (
                <p
                  role="alert"
                  data-testid="booking-page-submit-error"
                  className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
                >
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                data-testid="booking-confirm"
                className={cm.cn(
                  cm.sp('py', 4),
                  cm.roundedFull,
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'mt-2 text-white hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-gradient-to))',
                }}
              >
                {submitting
                  ? t('bookingPage.submitting', {}, { defaultValue: 'Booking…' })
                  : selectedStart
                    ? t('bookingPage.confirm', {}, { defaultValue: 'Confirm booking' })
                    : t(
                        'bookingPage.confirmDisabled',
                        {},
                        { defaultValue: 'Pick a time to continue' },
                      )}
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  )
}

export default BookingPage
