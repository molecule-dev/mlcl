import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { SessionStatus } from '../components/SessionCard.js'
import { SessionCard } from '../components/SessionCard.js'

type BookingRow = {
  id: string
  tutor_id: string
  tutor_name?: string | null
  subject?: string | null
  scheduled_at?: string
  duration_hours?: number | string
  status?: string
}

const TABS: { key: 'upcoming' | 'past' | 'all'; label: string; statuses: SessionStatus[] }[] = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['upcoming', 'in_progress'] },
  { key: 'past', label: 'Past', statuses: ['completed', 'cancelled'] },
  { key: 'all', label: 'All', statuses: ['upcoming', 'in_progress', 'completed', 'cancelled'] },
]

function deriveStatus(b: BookingRow): SessionStatus {
  const raw = (b.status ?? 'pending').toLowerCase()
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'completed') return 'completed'
  const start = b.scheduled_at ? new Date(b.scheduled_at) : null
  if (start) {
    const now = Date.now()
    const startMs = start.getTime()
    const durMs = Number(b.duration_hours ?? 1) * 60 * 60 * 1000
    const endMs = startMs + durMs
    if (now < startMs) return 'upcoming'
    if (now >= startMs && now <= endMs) return 'in_progress'
    return 'completed'
  }
  return 'upcoming'
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

export function Sessions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    http
      .get<BookingRow[]>('/api/bookings')
      .then((res) => {
        if (!active) return
        const data = (res as { data?: BookingRow[] | null }).data
        setBookings(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setErrored(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http])

  const filtered = useMemo(() => {
    const tab = TABS.find((tt) => tt.key === activeTab) ?? TABS[0]!
    return bookings
      .map((b) => ({ booking: b, status: deriveStatus(b) }))
      .filter(({ status }) => tab.statuses.includes(status))
      .sort((a, b) => {
        const at = a.booking.scheduled_at ? new Date(a.booking.scheduled_at).getTime() : 0
        const bt = b.booking.scheduled_at ? new Date(b.booking.scheduled_at).getTime() : 0
        return at - bt
      })
  }, [bookings, activeTab])

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.stack(2)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('sessions.eyebrow', {}, { defaultValue: 'Your sessions' })}
        </p>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'font-display text-4xl md:text-5xl tracking-tight',
          )}
        >
          {t('sessions.title', {}, { defaultValue: 'Every lesson, in one place.' })}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl')}>
          {t(
            'sessions.subtitle',
            {},
            {
              defaultValue:
                'Track upcoming bookings, jump into the active session room, and revisit completed lessons.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'rounded-full bg-surface-container-low p-1 self-start',
        )}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full px-5 py-2 transition-all',
              activeTab === tab.key
                ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(`sessions.tab.${tab.key}`, {}, { defaultValue: tab.label })}
          </button>
        ))}
      </div>

      {errored && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-2xl bg-warning-light text-warning border border-amber-200',
          )}
        >
          {t(
            'sessions.error',
            {},
            { defaultValue: 'Could not load your sessions — please try again.' },
          )}
        </div>
      )}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('sessions.loading', {}, { defaultValue: 'Loading sessions…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}>
            event_busy
          </span>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              cm.sp('mt', 3),
              'font-display',
            )}
          >
            {t('sessions.empty.title', {}, { defaultValue: 'Nothing scheduled here yet.' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-on-surface-variant max-w-md mx-auto',
            )}
          >
            {t(
              'sessions.empty.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Browse {{appName}} to find a tutor and book a slot. Confirmed sessions show up here.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.stack(3)}>
          {filtered.map(({ booking, status }) => (
            <SessionCard
              key={booking.id}
              id={booking.id}
              tutorId={booking.tutor_id}
              tutorName={booking.tutor_name ?? 'Tutor'}
              tutorAvatarSeed={booking.tutor_id}
              subject={booking.subject ?? 'Tutoring session'}
              startsAt={formatStart(booking.scheduled_at)}
              durationMinutes={Math.round(Number(booking.duration_hours ?? 1) * 60)}
              status={status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
