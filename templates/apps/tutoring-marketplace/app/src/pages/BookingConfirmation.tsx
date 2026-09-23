import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

type BookingRow = {
  id: string
  tutor_id: string
  student_id: string
  subject?: string | null
  scheduled_at?: string
  duration_hours?: number | string
  total_amount?: number | string
  currency?: string
  status?: string
  tutor_name?: string | null
  hourly_rate?: number | string | null
}

const PREP_CHECKLIST = [
  { key: 'bringNotes', label: 'Bring last week’s problem set + your sticking points.' },
  { key: 'quietRoom', label: 'Find a quiet space with a stable connection.' },
  { key: 'twoMinutesBefore', label: 'Open the session room 2 minutes before the start time.' },
  { key: 'reschedule', label: 'Reschedule any time before 12 hours from start with no fee.' },
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '—', time: '—' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return { date, time }
}

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function toGoogleParam(d: Date): string {
  return toIcsDate(d).replace(/Z$/, 'Z')
}

function buildIcs(booking: BookingRow): string {
  const startStr = booking.scheduled_at ?? new Date().toISOString()
  const start = new Date(startStr)
  const durHours = Number(booking.duration_hours ?? 1)
  const end = new Date(start.getTime() + durHours * 60 * 60 * 1000)
  const tutor = booking.tutor_name ?? 'Tutor'
  const subject = booking.subject ?? 'Tutoring session'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME} Tutoring//EN`,
    'BEGIN:VEVENT',
    `UID:booking-${booking.id}@${APP_NAME.toLowerCase()}.tutoring`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${subject} with ${tutor}`,
    `DESCRIPTION:Tutoring session booked via ${APP_NAME}. Booking ID ${booking.id}.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function BookingConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { tutorId } = useParams<{ tutorId: string }>()
  const [params] = useSearchParams()
  const bookingId = params.get('bookingId') ?? ''

  const [booking, setBooking] = useState<BookingRow | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) {
      setLoadError(
        t(
          'bookingConfirm.error.missingId',
          {},
          { defaultValue: 'Booking ID missing — start a new booking from the tutor profile.' },
        ),
      )
      return
    }
    let active = true
    http
      .get<BookingRow>(`/api/bookings/${bookingId}`)
      .then((res) => {
        if (!active) return
        const data = (res as { data?: BookingRow | null }).data
        if (data?.id) {
          setBooking(data)
        } else {
          setLoadError(
            t(
              'bookingConfirm.error.notFound',
              {},
              { defaultValue: 'Could not find that booking.' },
            ),
          )
        }
      })
      .catch(() => {
        if (!active) return
        setLoadError(
          t(
            'bookingConfirm.error.fetchFailed',
            {},
            { defaultValue: 'Failed to load booking details.' },
          ),
        )
      })
    return () => {
      active = false
    }
  }, [bookingId, http, t])

  const tutor = booking?.tutor_name ?? 'Tutor'
  const subject = booking?.subject ?? 'Tutoring session'
  const { date, time } = formatDateTime(booking?.scheduled_at)
  const durationMinutes = Math.round(Number(booking?.duration_hours ?? 1) * 60)
  const ratePerHour = Number(booking?.hourly_rate ?? 0)
  const totalDollars = Number(booking?.total_amount ?? 0)

  const googleHref = useMemo(() => {
    if (!booking?.scheduled_at) return ''
    const start = new Date(booking.scheduled_at)
    const end = new Date(start.getTime() + Number(booking.duration_hours ?? 1) * 60 * 60 * 1000)
    const text = encodeURIComponent(`${subject} with ${tutor}`)
    const dates = `${toGoogleParam(start)}/${toGoogleParam(end)}`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=Tutoring+session+booked+via+${encodeURIComponent(APP_NAME)}.+Booking+ID+${booking.id}.`
  }, [booking, subject, tutor])

  const handleDownloadIcs = () => {
    if (!booking) return
    downloadFile(
      `${APP_NAME.toLowerCase()}-booking-${booking.id}.ics`,
      buildIcs(booking),
      'text/calendar',
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      {loadError && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl border border-amber-300 bg-warning-light text-warning',
          )}
        >
          {loadError}
        </div>
      )}
      <header
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
          cm.sp('p', 10),
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--chalk-available) 0%, var(--mol-color-primary) 70%, var(--mol-color-primary-dark) 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full backdrop-blur-md',
            )}
            style={{
              width: 56,
              height: 56,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-3xl')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </span>
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'opacity-85 uppercase tracking-widest',
              )}
            >
              {t('bookingConfirm.eyebrow', {}, { defaultValue: 'Booking confirmed' })}
            </p>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-display text-3xl md:text-4xl tracking-tight',
              )}
            >
              {t(
                'bookingConfirm.title',
                {},
                { defaultValue: 'You’re booked. We’ll handle the rest.' },
              )}
            </h1>
          </div>
        </div>

        <dl className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-3 mt-8 relative z-10')}>
          <SummaryStat
            label={t('bookingConfirm.with', {}, { defaultValue: 'With tutor' })}
            value={tutor}
          />
          <SummaryStat
            label={t('form.when', {}, { defaultValue: 'When' })}
            value={`${date} • ${time}`}
          />
          <SummaryStat
            label={t('bookingConfirm.subject', {}, { defaultValue: 'Subject' })}
            value={subject}
          />
        </dl>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn(cm.stack(8), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-7')}>
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
              {t('bookingConfirm.prep.title', {}, { defaultValue: 'Get ready in four steps' })}
            </h2>
            <ul className={cm.stack(3)}>
              {PREP_CHECKLIST.map((row, idx) => (
                <li
                  key={row.key}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-full text-on-primary shrink-0',
                    )}
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: 'var(--mol-color-primary)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`bookingConfirm.prep.${row.key}`, {}, { defaultValue: row.label })}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            <a
              href={googleHref || '#'}
              target={googleHref ? '_blank' : undefined}
              rel="noreferrer"
              aria-disabled={!googleHref}
              data-testid="add-to-google-calendar"
              onClick={(e) => {
                if (!googleHref) e.preventDefault()
              }}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full px-5 py-3 text-on-primary transition-transform hover:scale-[1.03]',
                !googleHref ? 'opacity-50 pointer-events-none' : '',
              )}
              style={{ backgroundColor: 'var(--mol-color-primary)' }}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                event
              </span>
              {t('bookingConfirm.addToGoogle', {}, { defaultValue: 'Add to Google Calendar' })}
            </a>
            <button
              type="button"
              onClick={handleDownloadIcs}
              disabled={!booking}
              data-testid="download-ics"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full px-5 py-3 border border-outline-variant/40 hover:bg-surface-container transition-colors disabled:opacity-50',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                download
              </span>
              {t('bookingConfirm.downloadIcs', {}, { defaultValue: 'Download .ics' })}
            </button>
            <Link
              to={booking?.tutor_id ? `/messages?with=${booking.tutor_id}` : '/messages'}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full px-5 py-3 border border-outline-variant/40 hover:bg-surface-container transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                chat
              </span>
              {t('bookingConfirm.messageTutor', {}, { defaultValue: 'Message tutor' })}
            </Link>
          </section>
        </div>

        <aside className={cm.cn('col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-5')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm',
            )}
            style={{ borderTop: '4px solid var(--chalk-available)' }}
          >
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'font-display tracking-tight',
              )}
            >
              {t('bookingConfirm.receipt.title', {}, { defaultValue: 'Receipt' })}
            </h2>
            <Row
              label={t('bookingConfirm.receipt.tutor', {}, { defaultValue: 'Tutor' })}
              value={tutor}
            />
            <Row
              label={t('form.duration', {}, { defaultValue: 'Duration' })}
              value={t(
                'bookingConfirm.minutes',
                { mins: durationMinutes },
                { defaultValue: '{{mins}} min' },
              )}
            />
            <Row
              label={t('form.rate', {}, { defaultValue: 'Rate' })}
              value={`$${ratePerHour.toFixed(2)} / hr`}
            />
            <Row
              label={t('nav.total', {}, { defaultValue: 'Total' })}
              value={`$${totalDollars.toFixed(2)}`}
              emphasis
            />
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'bookingConfirm.receipt.assurance',
                {},
                { defaultValue: 'Card on file is held — final charge after the session ends.' },
              )}
            </p>
            <Link
              to={`/sessions`}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'self-start text-primary hover:underline decoration-2 underline-offset-4',
              )}
            >
              {t('bookingConfirm.viewSessions', {}, { defaultValue: 'View all sessions →' })}
            </Link>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'bookingConfirm.bookingId',
                { id: bookingId || tutorId || '' },
                { defaultValue: 'Booking ID: {{id}}' },
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(1)}>
      <dt
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'opacity-85 uppercase tracking-widest',
        )}
      >
        {label}
      </dt>
      <dd
        className={cm.cn(cm.fontWeight('bold'), 'font-display text-xl md:text-2xl tracking-tight')}
      >
        {value}
      </dd>
    </div>
  )
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'baseline', justify: 'between' }),
        emphasis && cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant/30'),
      )}
    >
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
        className={cm.cn(
          emphasis ? cm.textSize('2xl') : cm.textSize('sm'),
          cm.fontWeight('bold'),
          emphasis ? 'font-display tracking-tight tabular-nums' : 'tabular-nums',
        )}
      >
        {value}
      </span>
    </div>
  )
}
