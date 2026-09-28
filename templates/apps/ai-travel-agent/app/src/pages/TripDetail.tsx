import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookingStatusPill } from '../components/BookingStatusPill.js'
import { formatDateTime, formatMoney, formatTime } from '../lib/format.js'
import type { BookingSummary, TripSummary } from './Trips.js'

interface Split {
  id: string
  name: string
  contact: string | null
  amount_cents: number
  currency: string
  status: 'pending' | 'paid'
  pay_token: string
  paid_at: string | null
}

interface BookingDetail extends BookingSummary {
  flight_id: string | null
  traveler_names: string[] | string
  cabin: string
  rebooked_from_id: string | null
  rebooked_to_id: string | null
  splits: Split[]
}

interface TripDetailData extends Omit<TripSummary, 'bookings'> {
  bookings: BookingDetail[]
}

interface Person {
  name: string
  contact: string
}

function names(value: BookingDetail['traveler_names']): string[] {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch (_error) {
    // No stored names.
    return []
  }
}

/**
 * One trip: its live booking, the history of moves, the delay control, and
 * the bill split with each person's pay link and status.
 */
function TripDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [trip, setTrip] = useState<TripDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([{ name: '', contact: '' }])

  const load = useCallback(async () => {
    if (!id) return
    try {
      const res = await http.get<TripDetailData>(`/trips/${id}`)
      setTrip(res.data)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('trip.fetchError', {}, { defaultValue: 'Could not load this trip.' }),
      )
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  const live =
    trip?.bookings.filter((b) => b.status === 'booked' || b.status === 'delayed').at(-1) ??
    trip?.bookings.at(-1) ??
    null
  const canAct = live !== null && (live.status === 'booked' || live.status === 'delayed')

  async function act(key: string, fn: () => Promise<string | null>) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      const message = await fn()
      if (message) setNotice(message)
      await load()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('trip.actionError', {}, { defaultValue: 'That did not work.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  async function simulateDelay() {
    if (!live?.flight_id) return
    await act('delay', async () => {
      const res = await http.post<{ rebooked: string[] }>(`/flights/${live.flight_id}/delay`, {
        minutes: 90,
      })
      track({ name: 'delay.simulated', properties: { bookingId: live.id } })
      return res.data.rebooked.length > 0
        ? t(
            'trip.rebookedNotice',
            {},
            { defaultValue: 'The flight was delayed, so the agent moved you to the next one.' },
          )
        : t(
            'trip.delayNotice',
            {},
            { defaultValue: 'The flight is delayed and no later flight was found yet.' },
          )
    })
  }

  async function rebook() {
    if (!live) return
    await act('rebook', async () => {
      await http.post(`/bookings/${live.id}/rebook`, {})
      track({ name: 'booking.rebooked', properties: { bookingId: live.id } })
      return t('trip.movedNotice', {}, { defaultValue: 'Moved to the next available flight.' })
    })
  }

  async function cancel() {
    if (!live) return
    await act('cancel', async () => {
      await http.put(`/bookings/${live.id}/cancel`, {})
      track({ name: 'booking.cancelled', properties: { bookingId: live.id } })
      return t('trip.cancelledNotice', {}, { defaultValue: 'Booking cancelled.' })
    })
  }

  async function split(e: React.FormEvent) {
    e.preventDefault()
    if (!live) return
    const list = people
      .map((p) => ({ name: p.name.trim(), contact: p.contact.trim() || undefined }))
      .filter((p) => p.name)
    if (list.length === 0) return
    await act('split', async () => {
      await http.post(`/bookings/${live.id}/split`, { people: list })
      track({ name: 'bill.split', properties: { bookingId: live.id, people: list.length } })
      setPeople([{ name: '', contact: '' }])
      return t(
        'trip.splitNotice',
        { count: list.length },
        { defaultValue: 'Split {{count}} ways. Everyone with a phone number got a text.' },
      )
    })
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <Link
          to="/trips"
          className={cm.cn(cm.textSize('sm'), cm.textMuted, 'hover:text-foreground')}
        >
          {t('trip.back', {}, { defaultValue: '← All trips' })}
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            data-mol-id="trip-title"
          >
            {trip
              ? `${trip.origin_iata ?? '—'} → ${trip.destination_iata ?? '—'}`
              : t('trip.loading', {}, { defaultValue: 'Loading…' })}
          </h1>
          {live ? (
            <BookingStatusPill status={live.status} delayMinutes={live.delay_minutes} />
          ) : null}
        </div>
      </header>

      <main
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 6),
          cm.mxAuto,
          cm.w('full'),
          cm.flex({ direction: 'col' }),
          cm.stack(6),
          'max-w-[960px]',
        )}
      >
        {notice ? (
          <p
            role="status"
            data-mol-id="trip-notice"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-success/15 text-success border border-success/30',
            )}
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}

        {live ? (
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}
            data-mol-id="trip-booking"
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textMuted,
                    'uppercase tracking-widest font-semibold',
                  )}
                >
                  {live.airline} · {live.flight_number}
                </span>
                <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                  {formatTime(live.depart_at)} → {formatTime(live.arrive_at)}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {formatDateTime(live.depart_at)}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                  {t(
                    'trip.confirmation',
                    { code: live.confirmation_code },
                    { defaultValue: 'Confirmation {{code}}' },
                  )}
                  {' · '}
                  {t(
                    'trip.travelers',
                    { count: live.passenger_count },
                    { defaultValue: '{{count}} travelers' },
                  )}
                  {names(live.traveler_names).length > 0
                    ? ` (${names(live.traveler_names).join(', ')})`
                    : ''}
                </span>
              </div>
              <span
                className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tabular-nums')}
                data-mol-id="trip-total"
              >
                {formatMoney(live.total_cents, live.currency)}
              </span>
            </div>
            {/* The booking card carries its own status pill: the header pill
                scrolls away, and after an auto-rebook the reader needs the
                replacement booking's status right where the flight details
                are (the history list only covers the OLD bookings). */}
            <div className={cm.cn(cm.sp('mt', 4))}>
              <BookingStatusPill status={live.status} delayMinutes={live.delay_minutes} />
            </div>
            {canAct ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('mt', 5),
                )}
              >
                <button
                  type="button"
                  onClick={() => void rebook()}
                  disabled={busy !== null}
                  data-mol-id="trip-rebook"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 transition-colors',
                  )}
                >
                  {t('trip.rebook', {}, { defaultValue: 'Move to next flight' })}
                </button>
                {live.flight_id ? (
                  <button
                    type="button"
                    onClick={() => void simulateDelay()}
                    disabled={busy !== null}
                    data-mol-id="trip-simulate-delay"
                    className={cm.cn(
                      cm.roundedFull,
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'border border-border text-foreground hover:bg-surface-secondary disabled:opacity-50 transition-colors',
                    )}
                  >
                    {t('trip.simulateDelay', {}, { defaultValue: 'Simulate a 90-minute delay' })}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void cancel()}
                  disabled={busy !== null}
                  data-mol-id="trip-cancel"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'text-error hover:bg-error/10 disabled:opacity-50 transition-colors',
                  )}
                >
                  {t('trip.cancel', {}, { defaultValue: 'Cancel booking' })}
                </button>
              </div>
            ) : null}
          </section>
        ) : trip ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('trip.noBooking', {}, { defaultValue: 'Nothing booked on this trip.' })}
          </p>
        ) : null}

        {trip && trip.bookings.length > 1 ? (
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}
            data-mol-id="trip-history"
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
              {t('trip.history', {}, { defaultValue: 'What changed' })}
            </h2>
            <ol className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              {trip.bookings.map((b) => (
                <li
                  key={b.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span>
                    {b.flight_number} · {formatDateTime(b.depart_at)} · {b.confirmation_code}
                  </span>
                  <BookingStatusPill status={b.status} delayMinutes={b.delay_minutes} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {live ? (
          <section
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}
            data-mol-id="trip-split"
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 1))}>
              {t('trip.splitTitle', {}, { defaultValue: 'Split the bill' })}
            </h2>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('mb', 4))}>
              {t(
                'trip.splitBody',
                {},
                {
                  defaultValue:
                    'Everyone gets an even share and, with a phone number, a text with their pay link.',
                },
              )}
            </p>
            {live.splits.length > 0 ? (
              <ul
                className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2), cm.sp('mb', 5))}
                data-mol-id="trip-splits"
              >
                {live.splits.map((s) => (
                  <li
                    key={s.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.textSize('sm'),
                      cm.sp('py', 2),
                      'border-b border-border last:border-0',
                    )}
                  >
                    <span className={cm.cn(cm.flex({ direction: 'col' }))}>
                      <span className={cm.fontWeight('semibold')}>{s.name}</span>
                      <Link
                        to={`/pay/${s.pay_token}`}
                        className={cm.cn(cm.textSize('xs'), cm.textMuted, 'hover:text-foreground')}
                        data-mol-id="split-pay-link"
                      >
                        {t('trip.payLink', {}, { defaultValue: 'Pay link' })}
                      </Link>
                    </span>
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
                        {formatMoney(s.amount_cents, s.currency)}
                      </span>
                      <span
                        data-mol-id={`split-${s.status}`}
                        className={cm.cn(
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          'uppercase tracking-widest border',
                          s.status === 'paid'
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-warning/15 text-warning border-warning/30',
                        )}
                      >
                        {s.status === 'paid'
                          ? t('split.paid', {}, { defaultValue: 'Paid' })
                          : t('split.pending', {}, { defaultValue: 'Pending' })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {canAct ? (
              <form onSubmit={split} className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(3))}>
                {people.map((p, i) => (
                  <div key={String(i)} className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
                    <input
                      value={p.name}
                      onChange={(e) =>
                        setPeople((prev) =>
                          prev.map((row, j) => (j === i ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      placeholder={t('trip.personName', {}, { defaultValue: 'Name' })}
                      aria-label={t('trip.personName', {}, { defaultValue: 'Name' })}
                      data-mol-id="split-name"
                      className={cm.cn(
                        cm.flex1,
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'min-w-[140px] rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
                      )}
                    />
                    <input
                      value={p.contact}
                      onChange={(e) =>
                        setPeople((prev) =>
                          prev.map((row, j) =>
                            j === i ? { ...row, contact: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder={t(
                        'trip.personContact',
                        {},
                        { defaultValue: 'Phone or email (optional)' },
                      )}
                      aria-label={t(
                        'trip.personContact',
                        {},
                        { defaultValue: 'Phone or email (optional)' },
                      )}
                      data-mol-id="split-contact"
                      className={cm.cn(
                        cm.flex1,
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'min-w-[180px] rounded-xl bg-surface-secondary border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
                      )}
                    />
                  </div>
                ))}
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <button
                    type="button"
                    onClick={() => setPeople((prev) => [...prev, { name: '', contact: '' }])}
                    data-mol-id="split-add-person"
                    className={cm.cn(
                      cm.roundedFull,
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'border border-border text-foreground hover:bg-surface-secondary transition-colors',
                    )}
                  >
                    {t('trip.addPerson', {}, { defaultValue: 'Add a person' })}
                  </button>
                  <button
                    type="submit"
                    disabled={busy !== null || people.every((p) => !p.name.trim())}
                    data-mol-id="split-submit"
                    className={cm.cn(
                      cm.roundedFull,
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      'bg-gradient-to-r from-primary to-secondary text-white shadow shadow-primary/30 hover:opacity-90 disabled:opacity-40 transition-all',
                    )}
                  >
                    {t('trip.splitSubmit', {}, { defaultValue: 'Split and send links' })}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default TripDetail
export { TripDetail, TripDetail as TripDetailPage }
