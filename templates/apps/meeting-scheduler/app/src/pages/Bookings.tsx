/**
 * Authed bookings list — every booking the host owns, filterable by
 * upcoming/past/cancelled. Real data only; no fallback.
 */

import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookingListItem, type BookingRow } from '../components/BookingListItem.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiBooking {
  id: string
  invitee_name: string
  invitee_email: string | null
  start_at: string
  end_at: string
  status: string
  notes: string | null
  event_type_id: string
}

interface ApiEventType {
  id: string
  name: string
  duration_minutes: number
}

const FILTERS = [
  {
    key: 'upcoming',
    label: 'Upcoming',
    match: (b: ApiBooking) =>
      (b.status === 'scheduled' || b.status === 'pending') &&
      new Date(b.start_at).getTime() >= Date.now(),
  },
  {
    key: 'past',
    label: 'Past',
    match: (b: ApiBooking) =>
      b.status === 'completed' ||
      b.status === 'no_show' ||
      (b.status === 'scheduled' && new Date(b.end_at).getTime() < Date.now()),
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    match: (b: ApiBooking) => b.status === 'cancelled',
  },
] as const

function makeRow(b: ApiBooking, eventTypes: Record<string, ApiEventType>): BookingRow {
  const et = eventTypes[b.event_type_id]
  return {
    id: b.id,
    invitee_name: b.invitee_name,
    invitee_email: b.invitee_email,
    start_at: typeof b.start_at === 'string' ? b.start_at : new Date(b.start_at).toISOString(),
    end_at: typeof b.end_at === 'string' ? b.end_at : new Date(b.end_at).toISOString(),
    status: b.status,
    event_type_name: et ? `${et.name} · ${et.duration_minutes} min` : null,
    notes: b.notes,
  }
}

export function Bookings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [eventTypes, setEventTypes] = useState<Record<string, ApiEventType>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('upcoming')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/bookings').then((res) => unwrapList<ApiBooking>(res)),
      http.get('/api/event-types').then((res) => unwrapList<ApiEventType>(res)),
    ])
      .then(([bookingList, eventTypeList]) => {
        if (cancelled) return
        setBookings(bookingList)
        setEventTypes(Object.fromEntries(eventTypeList.map((et) => [et.id, et])))
      })
      .catch(() => {
        if (cancelled) return
        setError(t('bookings.loadError', {}, { defaultValue: 'Could not load your bookings.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filterPredicate = useMemo(
    () => FILTERS.find((f) => f.key === filter)?.match ?? (() => true),
    [filter],
  )
  const visible = useMemo(
    () => bookings.filter(filterPredicate).map((b) => makeRow(b, eventTypes)),
    [bookings, eventTypes, filterPredicate],
  )

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), 'max-w-[1200px] mx-auto')}>
      <header className={cm.cn(cm.stack(2))}>
        <p className={cm.cn(cm.textSize('xs'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('bookings.title', {}, { defaultValue: 'Bookings' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('medium'),
            'text-on-surface-variant/80 max-w-2xl',
          )}
        >
          {t(
            'bookings.subtitle',
            {},
            {
              defaultValue: 'Every meeting on your calendar — confirmed, pending, and historical.',
            },
          )}
        </p>
      </header>

      <div
        data-testid="bookings-filters"
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('p', 1),
          'gap-1 bg-surface-container-low rounded-full self-start',
        )}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            data-testid={`bookings-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(`bookings.filter.${f.key}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'bg-surface-container-lowest rounded-3xl shadow-sm',
        )}
      >
        {error ? (
          <p
            role="alert"
            data-testid="bookings-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('bookings.loading', {}, { defaultValue: 'Loading bookings…' })}
          </p>
        ) : visible.length === 0 ? (
          <div data-testid="bookings-empty" className={cm.cn(cm.textCenter, cm.sp('py', 12))}>
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
              event_note
            </span>
            <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 4), 'font-bold text-on-surface')}>
              {t('bookings.empty.title', {}, { defaultValue: 'Nothing here yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'bookings.empty.body',
                {},
                { defaultValue: 'Bookings show up here as invitees pick a slot.' },
              )}
            </p>
          </div>
        ) : (
          <ul data-testid="bookings-list" className={cm.stack(3)}>
            {visible.map((b) => (
              <li key={b.id}>
                <BookingListItem booking={b} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Bookings
