import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents, formatDate } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ReservationRow {
  id: string
  guest_id: string | null
  guest_name: string
  guest_contact: string | null
  room_type_id: string
  check_in: string
  check_out: string
  guests: number
  nights: number
  total_cents: number
  status: string
  source: string
  confirmation_code: string
  notes: string | null
}

interface RoomTypeRow {
  id: string
  name: string
}

/** Legal next statuses per current status — mirrors api lib/pms.ts transitions. */
const NEXT_STATUSES: Record<string, string[]> = {
  held: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
}

export function ReservationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [reservation, setReservation] = useState<ReservationRow | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [res, typesRes] = await Promise.all([
        http.get('/api/reservations/' + id),
        http.get('/api/room-types'),
      ])
      setReservation(unwrapSingle<ReservationRow>(res))
      const list = unwrapList<RoomTypeRow>(typesRes)
      setRoomTypes(Array.isArray(list) ? list : [])
      setError(null)
    } catch (_e) {
      setError(t('reservations.loadError', {}, { defaultValue: 'Failed to load reservation.' }))
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <p
        data-mol-id="reservation-detail-error"
        className={cm.cn(
          cm.sp('mx', 6),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl bg-error/10 text-error border border-error/30 inline-block',
        )}
      >
        {error}
      </p>
    )
  }

  if (!reservation) {
    return (
      <p
        data-mol-id="reservation-detail-loading"
        className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }

  const roomTypeName =
    roomTypes.find((rt) => rt.id === reservation.room_type_id)?.name ??
    t('common.roomType', {}, { defaultValue: 'Room type' })
  const nextStatuses = NEXT_STATUSES[reservation.status] ?? []

  const transition = async (next: string) => {
    setBusy(true)
    try {
      await http.put('/api/reservations/' + reservation.id + '/status', { status: next })
      void track({
        name: 'reservation.status_changed',
        properties: { reservation_id: reservation.id, from: reservation.status, to: next },
      })
      await load()
    } catch (_e) {
      setError(
        t(
          'reservationDetail.transitionError',
          {},
          { defaultValue: 'That status change was rejected.' },
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t('reservationDetail.code', {}, { defaultValue: 'Confirmation code' }),
      value: reservation.confirmation_code,
    },
    {
      label: t('reservationDetail.guest', {}, { defaultValue: 'Guest' }),
      value: reservation.guest_name,
    },
    {
      label: t('reservationDetail.contact', {}, { defaultValue: 'Contact' }),
      value: reservation.guest_contact ?? '—',
    },
    {
      label: t('reservationDetail.roomType', {}, { defaultValue: 'Room type' }),
      value: roomTypeName,
    },
    {
      label: t('reservationDetail.checkIn', {}, { defaultValue: 'Check-in' }),
      value: formatDate(reservation.check_in),
    },
    {
      label: t('reservationDetail.checkOut', {}, { defaultValue: 'Check-out' }),
      value: formatDate(reservation.check_out),
    },
    {
      label: t('reservationDetail.nights', {}, { defaultValue: 'Nights' }),
      value: String(reservation.nights),
    },
    {
      label: t('reservationDetail.guests', {}, { defaultValue: 'Guests' }),
      value: String(reservation.guests),
    },
    {
      label: t('reservationDetail.total', {}, { defaultValue: 'Total' }),
      value: formatCents(reservation.total_cents),
    },
    {
      label: t('reservationDetail.source', {}, { defaultValue: 'Source' }),
      value: t(
        'reservationSource.' + reservation.source,
        {},
        { defaultValue: reservation.source.replace(/_/g, ' ') },
      ),
    },
  ]

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
        <div>
          <Link
            to="/reservations"
            data-mol-id="reservation-detail-back"
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
            data-mol-id="reservation-detail-heading"
          >
            {reservation.guest_name}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
            {roomTypeName} · {formatDate(reservation.check_in)} →{' '}
            {formatDate(reservation.check_out)} ·{' '}
            <span data-mol-id="reservation-detail-status">
              {t(
                'reservationStatus.' + reservation.status,
                {},
                { defaultValue: reservation.status.replace(/_/g, ' ') },
              )}
            </span>
          </p>
        </div>
      </div>

      <dl
        className={cm.cn(
          cm.sp('mt', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'rounded-2xl bg-surface border border-outline-variant',
          cm.sp('p', 6),
        )}
      >
        {rows.map((row) => (
          <div key={row.label} className={cm.flex({ align: 'center', justify: 'between' })}>
            <dt
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {row.label}
            </dt>
            <dd
              data-mol-id={
                'reservation-detail-field-' + row.label.toLowerCase().replace(/[^a-z]+/g, '-')
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {reservation.notes ? (
        <p
          data-mol-id="reservation-detail-notes"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('p', 4),
            'rounded-2xl bg-surface-container-low border border-outline-variant text-sm',
          )}
        >
          {reservation.notes}
        </p>
      ) : null}

      {/* Lifecycle transitions */}
      <section
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant',
        )}
        aria-label={t(
          'reservationDetail.lifecycleLabel',
          {},
          { defaultValue: 'Reservation lifecycle' },
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('reservationDetail.lifecycle', {}, { defaultValue: 'Lifecycle' })}
        </h2>
        {nextStatuses.length === 0 ? (
          <p
            data-mol-id="reservation-detail-terminal"
            className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'reservationDetail.terminal',
              {},
              { defaultValue: 'This reservation is in a final state — no further transitions.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm', wrap: 'wrap' }))}>
            {nextStatuses.map((next) => (
              <button
                key={next}
                type="button"
                disabled={busy}
                data-mol-id={'reservation-transition-' + next}
                onClick={() => void transition(next)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl border transition-colors disabled:opacity-60',
                  next === 'cancelled' || next === 'no_show'
                    ? 'border-error/40 text-error hover:bg-error/10'
                    : 'bg-primary text-on-primary border-primary hover:bg-primary-container',
                )}
              >
                {t('reservationActions.' + next, {}, { defaultValue: next.replace(/_/g, ' ') })}
              </button>
            ))}
          </div>
        )}
        {busy ? (
          <p
            data-mol-id="reservation-detail-busy"
            className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('common.workingEllipsis', {}, { defaultValue: 'Working…' })}
          </p>
        ) : null}
      </section>

      <button
        type="button"
        data-mol-id="reservation-detail-back-button"
        onClick={() => void navigate('/reservations')}
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-xl border border-outline-variant hover:border-primary',
        )}
      >
        {t('common.backToList', {}, { defaultValue: 'Back to the list' })}
      </button>
    </div>
  )
}
