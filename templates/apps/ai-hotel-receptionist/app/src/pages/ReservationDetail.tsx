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

/**
 * Lifecycle chip tone — the design's chip grammar: confirmed/in-house ride
 * the green tertiary pair and the gold secondary accent, held goes gold,
 * terminal and broken states go error, everything else neutral.
 */
function statusChipClass(status: string): string {
  if (status === 'confirmed') {
    return 'bg-tertiary-fixed/40 border border-tertiary-fixed text-on-tertiary-fixed-variant'
  }
  if (status === 'checked_in' || status === 'held') {
    return 'bg-secondary/10 border border-secondary/30 text-secondary'
  }
  if (status === 'cancelled' || status === 'no_show') {
    return 'bg-error/10 border border-error/30 text-error'
  }
  return 'bg-surface-container border border-outline-variant text-on-surface'
}

function statusDotClass(status: string): string {
  if (status === 'confirmed') return 'bg-on-tertiary-container'
  if (status === 'checked_in' || status === 'held') return 'bg-secondary'
  if (status === 'cancelled' || status === 'no_show') return 'bg-error'
  return 'bg-on-surface-variant'
}

/** Card header — icon tile + serif title, the design's dossier pattern. */
function CardHeader(props: { icon: string; title: string; aside?: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('mb', 3),
        cm.sp('pb', 2),
        'border-b border-outline-variant/40',
      )}
    >
      <h2
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'sb-serif text-lg font-medium text-primary',
        )}
      >
        <span
          className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{props.icon}</span>
        </span>
        {props.title}
      </h2>
      {props.aside ? (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-mono uppercase tracking-wider text-on-surface-variant',
          )}
        >
          {props.aside}
        </span>
      ) : null}
    </div>
  )
}

/** Dossier field row — micro-label left, value right (the design's dl). */
function FieldRow(props: { label: string; value: string; id?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-on-surface-variant">{props.label}</dt>
      <dd data-mol-id={props.id} className="text-right text-sm font-medium text-primary">
        {props.value}
      </dd>
    </div>
  )
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
      <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <p
          data-mol-id="reservation-detail-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'inline-block rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
        <p
          data-mol-id="reservation-detail-loading"
          className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
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
      label: t('reservationDetail.source', {}, { defaultValue: 'Source' }),
      value: t(
        'reservationSource.' + reservation.source,
        {},
        { defaultValue: reservation.source.replace(/_/g, ' ') },
      ),
    },
  ]

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Breadcrumb strip — ledger trail + back link */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wider text-on-surface-variant',
        )}
      >
        <p className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <Link
            to="/reservations"
            data-mol-id="reservation-detail-back"
            className="-my-2 inline-block py-2 hover:text-primary"
          >
            {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
          </Link>
          <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">chevron_right</span>
          </span>
          <span className="font-mono normal-case tracking-normal text-secondary">
            {reservation.confirmation_code}
          </span>
        </p>
        <span
          data-mol-id="reservation-detail-status"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded border normal-case tracking-normal',
            statusChipClass(reservation.status),
          )}
        >
          <span
            className={cm.cn('h-1.5 w-1.5 rounded-full', statusDotClass(reservation.status))}
            aria-hidden="true"
          />
          {t(
            'reservationStatus.' + reservation.status,
            {},
            { defaultValue: reservation.status.replace(/_/g, ' ') },
          )}
        </span>
      </div>

      {/* Dossier headline + action deck */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mt', 2),
          'border-b border-outline-variant/60 pb-6',
        )}
      >
        <div>
          <h1
            className={cm.cn('sb-serif text-3xl font-normal tracking-tight text-primary')}
            data-mol-id="reservation-detail-heading"
          >
            {reservation.guest_name}
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 1),
              cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            <span
              className="sb-icon flex h-4 w-4 items-center justify-center text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">king_bed</span>
            </span>
            <span className="font-medium text-primary">{roomTypeName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {reservation.nights} {t('common.nights', {}, { defaultValue: 'nights' })} ·{' '}
              {reservation.guests}{' '}
              {reservation.guests === 1
                ? t('reservations.guestOne', {}, { defaultValue: 'guest' })
                : t('reservationDetail.guests', {}, { defaultValue: 'Guests' }).toLowerCase()}
            </span>
          </p>
        </div>
      </div>

      <div className={cm.cn('mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3')}>
        {/* LEFT: stay parameters + notes */}
        <div className={cm.cn('flex flex-col gap-6 lg:col-span-2')}>
          <section
            aria-label={t(
              'reservationDetail.lifecycleLabel',
              {},
              { defaultValue: 'Reservation lifecycle' },
            )}
            className="sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-5"
          >
            <CardHeader
              icon="timeline"
              title={t('reservationDetail.lifecycle', {}, { defaultValue: 'Lifecycle' })}
              aside={t(
                'reservationDetail.stateEngine',
                {},
                { defaultValue: 'Front-desk state engine' },
              )}
            />
            {nextStatuses.length === 0 ? (
              <p
                data-mol-id="reservation-detail-terminal"
                className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}
              >
                {t(
                  'reservationDetail.terminal',
                  {},
                  {
                    defaultValue: 'This reservation is in a final state — no further transitions.',
                  },
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
                      cm.fontWeight('semibold'),
                      'rounded-lg border transition-colors disabled:opacity-60',
                      next === 'cancelled' || next === 'no_show'
                        ? 'border-error/40 text-error hover:bg-error/10'
                        : 'bg-primary text-on-primary border-primary hover:bg-primary-light',
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

          <section
            className="sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-5"
            aria-label={t(
              'reservationDetail.stayParametersLabel',
              {},
              { defaultValue: 'Stay parameters' },
            )}
          >
            <CardHeader
              icon="hotel"
              title={t('reservationDetail.stayParameters', {}, { defaultValue: 'Stay parameters' })}
              aside={roomTypeName}
            />
            <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {rows.map((row) => (
                <FieldRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  id={
                    'reservation-detail-field-' + row.label.toLowerCase().replace(/[^a-z]+/g, '-')
                  }
                />
              ))}
            </dl>
          </section>

          {reservation.notes ? (
            <section
              className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-5"
              aria-label={t(
                'reservationDetail.notesLabel',
                {},
                { defaultValue: 'Front-desk notes' },
              )}
            >
              <CardHeader
                icon="forum"
                title={t('reservationDetail.notes', {}, { defaultValue: 'Front-desk notes' })}
              />
              <p
                data-mol-id="reservation-detail-notes"
                className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}
              >
                {reservation.notes}
              </p>
            </section>
          ) : null}
        </div>

        {/* RIGHT: folio accounting */}
        <div className={cm.cn('flex flex-col gap-6')}>
          <section
            className="sb-card-shadow h-fit rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-5 lg:sticky lg:top-6"
            aria-label={t('reservationDetail.folioLabel', {}, { defaultValue: 'Folio accounting' })}
          >
            <CardHeader
              icon="receipt_long"
              title={t('reservationDetail.folio', {}, { defaultValue: 'Folio accounting' })}
            />
            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-4">
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('reservationDetail.totalBalance', {}, { defaultValue: 'Estimated total' })}
              </div>
              <div
                className={cm.cn(
                  'sb-serif text-3xl font-normal tracking-tight text-primary',
                  cm.sp('mt', 1),
                )}
              >
                {formatCents(reservation.total_cents)}
              </div>
              {reservation.nights > 0 ? (
                <div
                  className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}
                >
                  {formatCents(Math.round(reservation.total_cents / reservation.nights))}{' '}
                  {t('common.perNight', {}, { defaultValue: '/night' })} × {reservation.nights}{' '}
                  {t('common.nights', {}, { defaultValue: 'nights' })}
                </div>
              ) : null}
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('pt', 3),
                cm.flex({ align: 'center', justify: 'between' }),
                cm.textSize('xs'),
                'border-t border-outline-variant/40',
              )}
            >
              <span
                className={cm.flex({ align: 'center', gap: 'xs' }) + ' text-on-surface-variant'}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-on-tertiary-container"
                  aria-hidden="true"
                />
                {t('reservationDetail.acquisition', {}, { defaultValue: 'Acquired via' })}{' '}
                {t(
                  'reservationSource.' + reservation.source,
                  {},
                  { defaultValue: reservation.source.replace(/_/g, ' ') },
                )}
              </span>
            </div>
          </section>

          <button
            type="button"
            data-mol-id="reservation-detail-back-button"
            onClick={() => void navigate('/reservations')}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg border border-outline-variant bg-surface-container-lowest text-primary transition-colors hover:border-primary',
            )}
          >
            <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">arrow_back</span>
            </span>
            {t('common.backToList', {}, { defaultValue: 'Back to the list' })}
          </button>
        </div>
      </div>
    </div>
  )
}
