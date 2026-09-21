import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface RoomTypeRow {
  id: string
  name: string
  occupancy: number
  base_rate_cents: number
}

interface AvailabilityOption {
  room_type_id: string
  name: string
  occupancy: number
  rooms_available: number
  avg_rate_cents: number
  total_cents: number
}

interface ReservationRow {
  id: string
  confirmation_code: string
}

function isoPlusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function NewReservation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState(isoPlusDays(1))
  const [checkOut, setCheckOut] = useState(isoPlusDays(3))
  const [guests, setGuests] = useState(2)
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [notes, setNotes] = useState('')
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([])
  const [options, setOptions] = useState<AvailabilityOption[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const res = await http.get('/api/room-types').catch(() => null)
      setRoomTypes(unwrapList<RoomTypeRow>(res))
    })()
  }, [http])

  const search = async () => {
    setBusy(true)
    setError(null)
    setSelected(null)
    try {
      const res = await http.get(
        '/availability?check_in=' + checkIn + '&check_out=' + checkOut + '&guests=' + guests,
      )
      const payload = unwrapSingle<{ options: AvailabilityOption[] }>(res)
      setOptions(payload?.options ?? [])
      if ((payload?.options ?? []).length === 0) {
        setError(
          t(
            'newReservation.nothingAvailable',
            {},
            { defaultValue: 'Nothing available for those dates and party size.' },
          ),
        )
      }
    } catch (_e) {
      setError(t('newReservation.searchError', {}, { defaultValue: 'Availability search failed.' }))
      setOptions([])
    } finally {
      setBusy(false)
    }
  }

  const book = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const res = await http.post('/api/reservations', {
        room_type_id: selected,
        guest_name: guestName,
        guest_contact: guestContact || undefined,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        notes: notes || undefined,
      })
      const created = unwrapSingle<ReservationRow>(res)
      if (created) {
        void track({
          name: 'reservation.created',
          properties: { reservation_id: created.id, room_type_id: selected },
        })
      }
      navigate(created ? '/reservations/' + created.id : '/reservations')
    } catch (_e) {
      setError(t('newReservation.bookError', {}, { defaultValue: 'The booking was rejected.' }))
    } finally {
      setBusy(false)
    }
  }

  const inputClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
  )

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <Link
        to="/reservations"
        data-mol-id="new-reservation-back"
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          '-my-2 inline-block py-2 text-primary hover:underline',
        )}
      >
        ← {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
      </Link>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}
        data-mol-id="new-reservation-heading"
      >
        {t('newReservation.heading', {}, { defaultValue: 'New reservation' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'newReservation.subheading',
          {},
          {
            defaultValue:
              'Search availability, pick a room type, and confirm — same rules the voice agent uses.',
          },
        )}
      </p>

      {/* Search form */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
      >
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newReservation.checkIn', {}, { defaultValue: 'Check-in' })}
            </span>
            <input
              id="check_in"
              type="date"
              value={checkIn}
              min={isoPlusDays(0)}
              onChange={(e) => setCheckIn(e.target.value)}
              data-mol-id="new-reservation-check-in"
              className={inputClass}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newReservation.checkOut', {}, { defaultValue: 'Check-out' })}
            </span>
            <input
              id="check_out"
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              data-mol-id="new-reservation-check-out"
              className={inputClass}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newReservation.guests', {}, { defaultValue: 'Guests' })}
            </span>
            <input
              id="guests"
              type="number"
              min={1}
              max={12}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
              data-mol-id="new-reservation-guests"
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          data-mol-id="new-reservation-search"
          onClick={() => void search()}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.sp('mt', 4),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
          )}
        >
          {busy
            ? t('common.searchingEllipsis', {}, { defaultValue: 'Searching…' })
            : t('newReservation.searchButton', {}, { defaultValue: 'Search availability' })}
        </button>
      </section>

      {error ? (
        <p
          data-mol-id="new-reservation-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Options */}
      {options !== null && options.length > 0 ? (
        <section
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant',
          )}
          aria-label={t(
            'newReservation.optionsLabel',
            {},
            { defaultValue: 'Available room types' },
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('newReservation.available', {}, { defaultValue: 'Available room types' })}
          </h2>
          <ul
            className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'sm' }))}
            role="radiogroup"
          >
            {options.map((opt) => (
              <li key={opt.room_type_id}>
                <label
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl border cursor-pointer transition-colors',
                    selected === opt.room_type_id
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant hover:border-primary/50',
                  )}
                >
                  <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <input
                      type="radio"
                      name="room_type"
                      value={opt.room_type_id}
                      checked={selected === opt.room_type_id}
                      onChange={() => setSelected(opt.room_type_id)}
                      data-mol-id={'new-reservation-option-' + opt.room_type_id}
                    />
                    <span>
                      <span className={cm.fontWeight('bold')}>{opt.name}</span>
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.textSize('sm'),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'newReservation.sleepsUpTo',
                          { count: opt.occupancy },
                          { defaultValue: 'sleeps {{count}}' },
                        )}{' '}
                        · {opt.rooms_available}{' '}
                        {t('newReservation.roomsLeft', {}, { defaultValue: 'left' })}
                      </span>
                    </span>
                  </span>
                  <span className={cm.textRight}>
                    <span className={cm.fontWeight('bold')}>
                      {formatCents(opt.avg_rate_cents)}
                      {t('common.perNight', {}, { defaultValue: '/night' })}
                    </span>
                    <span className={cm.cn('block', cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'newReservation.totalOf',
                        { total: formatCents(opt.total_cents) },
                        { defaultValue: '{{total}} total' },
                      )}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {/* Guest details */}
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4', cm.sp('mt', 6))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('newReservation.guestName', {}, { defaultValue: 'Guest name' })}
              </span>
              <input
                id="guest_name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                data-mol-id="new-reservation-guest-name"
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(
                  'newReservation.guestContact',
                  {},
                  { defaultValue: 'Phone or email (optional)' },
                )}
              </span>
              <input
                id="guest_contact"
                type="text"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
                data-mol-id="new-reservation-guest-contact"
                className={inputClass}
              />
            </label>
          </div>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newReservation.notes', {}, { defaultValue: 'Notes (optional)' })}
            </span>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-mol-id="new-reservation-notes"
              className={inputClass}
            />
          </label>

          <button
            type="button"
            disabled={busy || !selected || guestName.trim() === ''}
            data-mol-id="new-reservation-book"
            onClick={() => void book()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.fontWeight('bold'),
              'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-60',
            )}
          >
            {t('newReservation.bookButton', {}, { defaultValue: 'Confirm reservation' })}
          </button>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'newReservation.bookHint',
              {},
              { defaultValue: 'Select a room type and enter the guest name to confirm.' },
            )}
          </p>
        </section>
      ) : null}

      {roomTypes.length === 0 ? null : (
        <p
          data-mol-id="new-reservation-type-count"
          className={cm.cn(cm.sp('mt', 4), cm.textSize('xs'), 'text-on-surface-variant')}
        >
          {t(
            'newReservation.catalogSize',
            { count: roomTypes.length },
            { defaultValue: '{{count}} room types configured — adjust them under Rooms & Rates.' },
          )}
        </p>
      )}
    </div>
  )
}
