import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type AvailabilitySlot = {
  id: string
  tutor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurring: boolean
}

type TutorRow = {
  id: string
  display_name?: string
  name?: string
  hourly_rate?: number
  rate_per_hour_cents?: number
  subjects?: string[]
  subject?: string
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DURATIONS = [30, 45, 60, 90, 120] as const

/** Generates a list of (date, weekday) for the next 7 days starting today. */
function nextSevenDays(): Array<{ date: Date; dow: number; label: string; date_label: string }> {
  const days: Array<{ date: Date; dow: number; label: string; date_label: string }> = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      date: d,
      dow: d.getDay(),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : (DAY_LABELS[d.getDay()] ?? ''),
      date_label: `${SHORT_DAYS[d.getDay()]} ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    })
  }
  return days
}

/** Returns a list of HH:MM strings between start and end at hour intervals. */
function expandSlot(start: string, end: string): string[] {
  const [sh] = start.split(':').map(Number) as [number]
  const [eh] = end.split(':').map(Number) as [number]
  const slots: string[] = []
  for (let h = sh; h < eh; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function Booking() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { tutorId } = useParams<{ tutorId: string }>()
  const [params] = useSearchParams()

  const [tutor, setTutor] = useState<TutorRow | null>(null)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState<number>(60)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedDayKey, setSelectedDayKey] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>(params.get('time') ?? '')

  useEffect(() => {
    if (!tutorId) return
    let active = true
    Promise.all([
      http.get<TutorRow>(`/api/tutors/${tutorId}`),
      http.get<AvailabilitySlot[]>(`/api/tutors/${tutorId}/availability`),
    ])
      .then(([tutorRes, slotsRes]) => {
        if (!active) return
        const tutorData = (tutorRes as { data?: TutorRow | null }).data ?? null
        const slotsData = (slotsRes as { data?: AvailabilitySlot[] | null }).data ?? []
        setTutor(tutorData)
        setAvailability(Array.isArray(slotsData) ? slotsData : [])
        if (tutorData?.subjects && tutorData.subjects.length > 0 && !subject) {
          setSubject(tutorData.subjects[0]!)
        } else if (tutorData?.subject && !subject) {
          setSubject(tutorData.subject)
        }
      })
      .catch(() => {
        if (!active) return
        setErrorMessage(
          t('booking.error.loadFailed', {}, { defaultValue: 'Could not load tutor — try again.' }),
        )
      })
    return () => {
      active = false
    }
    // subject intentionally not in deps; only initialised when empty
  }, [http, tutorId, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => nextSevenDays(), [])

  const slotsByDay = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {}
    days.forEach((d) => {
      const dayKey = `${d.date.getFullYear()}-${pad(d.date.getMonth() + 1)}-${pad(d.date.getDate())}`
      const matchingSlots = availability.filter((s) => s.day_of_week === d.dow)
      const times = matchingSlots.flatMap((s) => expandSlot(s.start_time, s.end_time))
      const now = new Date()
      const filtered =
        d.dow === now.getDay() && d.date.toDateString() === now.toDateString()
          ? times.filter((time) => {
              const [h] = time.split(':').map(Number) as [number]
              return h > now.getHours() + 1
            })
          : times
      out[dayKey] = filtered
    })
    return out
  }, [availability, days])

  // Auto-select first available slot if user landed without ?time
  useEffect(() => {
    if (selectedDayKey || selectedTime) return
    for (const d of days) {
      const dayKey = `${d.date.getFullYear()}-${pad(d.date.getMonth() + 1)}-${pad(d.date.getDate())}`
      const slots = slotsByDay[dayKey] ?? []
      if (slots.length > 0) {
        setSelectedDayKey(dayKey)
        setSelectedTime(slots[0]!)
        return
      }
    }
  }, [days, slotsByDay, selectedDayKey, selectedTime])

  const subjectsList = useMemo<string[]>(() => {
    if (tutor?.subjects && tutor.subjects.length > 0) return tutor.subjects
    if (tutor?.subject) return [tutor.subject]
    return ['General tutoring']
  }, [tutor])

  const ratePerHour = useMemo<number>(() => {
    if (typeof tutor?.hourly_rate === 'number') return tutor.hourly_rate
    if (typeof tutor?.rate_per_hour_cents === 'number')
      return Math.round(tutor.rate_per_hour_cents / 100)
    return 0
  }, [tutor])

  const totalCents = Math.round((ratePerHour / 60) * duration * 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tutorId) return
    if (!selectedDayKey || !selectedTime) {
      setErrorMessage(t('booking.error.noSlot', {}, { defaultValue: 'Pick a day and time first.' }))
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const [hh, mm] = selectedTime.split(':').map(Number) as [number, number]
      const [yy, mo, dd] = selectedDayKey.split('-').map(Number) as [number, number, number]
      const scheduledAt = new Date(yy, mo - 1, dd, hh, mm, 0).toISOString()
      const response = (await http.post<{ id?: string }>(`/api/bookings`, {
        tutor_id: tutorId,
        subject,
        scheduled_at: scheduledAt,
        duration_hours: duration / 60,
      })) as { data?: { id?: string } | null; status?: number }
      const bookingId = response.data?.id
      if (!bookingId) {
        setErrorMessage(
          t('booking.error.createFailed', {}, { defaultValue: 'Could not create booking.' }),
        )
        setSubmitting(false)
        return
      }
      // Conversion event: the booking request committed.
      void track({
        name: 'session.booked',
        properties: { bookingId, tutorId, subject, durationMinutes: duration },
      })
      navigate(`/book/${tutorId}/confirm?bookingId=${bookingId}`)
    } catch (err) {
      setErrorMessage(
        (err as { message?: string }).message ??
          t('booking.error.createFailed', {}, { defaultValue: 'Could not create booking.' }),
      )
      setSubmitting(false)
    }
  }

  const tutorName =
    tutor?.display_name ?? tutor?.name ?? t('booking.unknownTutor', {}, { defaultValue: 'Tutor' })

  return (
    <form onSubmit={handleSubmit} className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('booking.eyebrow', {}, { defaultValue: 'Book a session' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'font-display text-4xl md:text-5xl tracking-tight',
          )}
        >
          {t('booking.title', {}, { defaultValue: 'Pick a slot, lock it in.' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'booking.subtitle',
            {},
            {
              defaultValue:
                'Sessions can be rescheduled up to 12 hours before. Your card is only charged when the session ends.',
            },
          )}
        </p>
      </header>

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
              {t('booking.slot.title', {}, { defaultValue: '1. Choose a time' })}
            </h2>
            {availability.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'booking.slot.noAvailability',
                  {},
                  { defaultValue: 'This tutor has no open slots in the next 7 days.' },
                )}
              </p>
            ) : (
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
                {days.map((day) => {
                  const dayKey = `${day.date.getFullYear()}-${pad(day.date.getMonth() + 1)}-${pad(day.date.getDate())}`
                  const times = slotsByDay[dayKey] ?? []
                  if (times.length === 0) return null
                  return (
                    <div
                      key={dayKey}
                      className={cm.cn(
                        cm.sp('p', 4),
                        'rounded-xl border border-outline-variant/30',
                        selectedDayKey === dayKey ? 'ring-2 ring-primary/40' : '',
                      )}
                    >
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {day.label} • {day.date_label}
                      </p>
                      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 3))}>
                        {times.map((time) => {
                          const isActive = selectedDayKey === dayKey && selectedTime === time
                          return (
                            <button
                              key={`${dayKey}-${time}`}
                              type="button"
                              onClick={() => {
                                setSelectedDayKey(dayKey)
                                setSelectedTime(time)
                              }}
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.fontWeight('semibold'),
                                'rounded-full px-4 py-2 transition-all',
                                isActive
                                  ? 'text-on-primary shadow-md scale-[1.02]'
                                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                              )}
                              style={
                                isActive
                                  ? { backgroundColor: 'var(--mol-color-primary)' }
                                  : undefined
                              }
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

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
              {t('booking.subject.title', {}, { defaultValue: '2. What are we covering?' })}
            </h2>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'sm' }), 'md:grid-cols-2')}>
              {subjectsList.map((s) => (
                <label
                  key={s}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/30 cursor-pointer transition-colors',
                    subject === s
                      ? 'ring-2 ring-primary/40 bg-surface-container-low'
                      : 'hover:bg-surface-container-low',
                  )}
                >
                  <input
                    type="radio"
                    name="booking-subject"
                    value={s}
                    checked={subject === s}
                    onChange={() => setSubject(s)}
                    className={cm.cn('accent-primary')}
                  />
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{s}</span>
                </label>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'booking.notesPlaceholder',
                {},
                { defaultValue: 'Optional: anything specific you’d like to focus on?' },
              )}
              rows={3}
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30',
              )}
            />
          </section>

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
              {t('booking.duration.title', {}, { defaultValue: '3. How long?' })}
            </h2>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-full px-5 py-2 transition-all',
                    duration === d
                      ? 'text-on-primary shadow-md scale-[1.02]'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                  )}
                  style={
                    duration === d ? { backgroundColor: 'var(--mol-color-primary)' } : undefined
                  }
                >
                  {t('booking.minutes', { mins: d }, { defaultValue: '{{mins}} min' })}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className={cm.cn('col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm sticky top-24',
            )}
            style={{ borderTop: '4px solid var(--mol-color-primary)' }}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'font-display tracking-tight',
              )}
            >
              {t('booking.summary.title', {}, { defaultValue: 'Booking summary' })}
            </h2>
            <SummaryRow
              label={t('booking.summary.tutor', {}, { defaultValue: 'Tutor' })}
              value={tutorName}
            />
            <SummaryRow
              label={t('form.when', {}, { defaultValue: 'When' })}
              value={
                selectedDayKey && selectedTime
                  ? `${selectedDayKey} • ${selectedTime}`
                  : t('booking.summary.pickSlot', {}, { defaultValue: 'Pick a slot' })
              }
            />
            <SummaryRow
              label={t('booking.summary.subject', {}, { defaultValue: 'Subject' })}
              value={subject || t('booking.summary.noSubject', {}, { defaultValue: '—' })}
            />
            <SummaryRow
              label={t('form.duration', {}, { defaultValue: 'Duration' })}
              value={t('booking.minutes', { mins: duration }, { defaultValue: '{{mins}} min' })}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'baseline', justify: 'between' }),
                cm.sp('mt', 2),
                cm.sp('pt', 4),
                'border-t border-outline-variant/30',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.total', {}, { defaultValue: 'Total' })}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'font-display text-3xl tracking-tight tabular-nums',
                )}
              >
                ${(totalCents / 100).toFixed(0)}
              </span>
            </div>
            {errorMessage && (
              <p
                role="alert"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('p', 3),
                  'rounded-xl bg-error-container text-on-error-container',
                )}
              >
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                'rounded-full py-4 text-on-primary transition-transform hover:scale-[1.02] disabled:opacity-60',
              )}
              style={{ backgroundColor: 'var(--mol-color-primary)' }}
            >
              {submitting
                ? t('booking.summary.submitting', {}, { defaultValue: 'Confirming…' })
                : t('booking.summary.cta', {}, { defaultValue: 'Confirm booking' })}
              {!submitting && (
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                  lock
                </span>
              )}
            </button>
            <p className={cm.cn(cm.textSize('xs'), cm.textCenter, 'text-on-surface-variant')}>
              {t(
                'booking.summary.assurance',
                {},
                { defaultValue: 'No charge until session ends • Cancel free up to 12h before' },
              )}
            </p>
            <Link
              to={`/tutor/${tutorId ?? ''}`}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.textCenter,
                'text-on-surface-variant hover:text-primary',
              )}
            >
              {t('booking.summary.back', {}, { defaultValue: '← Back to tutor profile' })}
            </Link>
          </div>
        </aside>
      </div>
    </form>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <span
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-right max-w-[60%]')}
      >
        {value}
      </span>
    </div>
  )
}
