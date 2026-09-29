import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents, formatDate } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface ReservationRow {
  id: string
  guest_name: string
  room_type_id: string
  check_in: string
  check_out: string
  guests: number
  nights: number
  total_cents: number
  status: string
  source: string
  confirmation_code: string
}

const STATUS_FILTERS = [
  'all',
  'held',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const

/**
 * Status chip tone — the design's chip grammar: confirmed rides the green
 * tertiary pair, in-house/held ride the gold secondary accent, terminal and
 * broken states go error, everything else stays neutral surface.
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

/** Chip status dot — gold/green/ink to match the chip tone. */
function statusDotClass(status: string): string {
  if (status === 'confirmed') return 'bg-on-tertiary-container'
  if (status === 'checked_in' || status === 'held') return 'bg-secondary'
  if (status === 'cancelled' || status === 'no_show') return 'bg-error'
  return 'bg-on-surface-variant'
}

/** Source glyph — the acquisition channel icon from the ledger design. */
function sourceIcon(source: string): string {
  if (source === 'phone') return 'call'
  if (source === 'online') return 'public'
  return 'desk'
}

/** Up-to-two-letter initials for the guest avatar tile. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** One bento KPI card — micro-label row, serif figure, ruled sub-line. */
function KpiCard(props: {
  label: string
  icon: string
  value: string
  unit: string
  sub: string
  tone?: 'gold'
  id: string
}) {
  const cm = getClassMap()
  const gold = props.tone === 'gold'
  return (
    <div
      data-mol-id={props.id}
      className={cm.cn(
        cm.sp('p', 5),
        'sb-card-shadow flex flex-col justify-between rounded-lg border bg-surface-container-lowest',
        gold ? 'border-secondary/40' : 'border-outline-variant/50',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 3),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-wider',
          gold ? 'text-secondary' : 'text-on-surface-variant',
        )}
      >
        <span>{props.label}</span>
        <span
          className={cm.cn(
            'sb-icon flex h-5 w-5 items-center justify-center',
            gold && 'text-secondary',
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{props.icon}</span>
        </span>
      </div>
      <div>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }))}>
          <span className={cm.cn('sb-serif text-3xl font-medium tracking-tight text-primary')}>
            {props.value}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              gold ? cm.fontWeight('semibold') : cm.fontWeight('normal'),
              gold ? 'text-secondary' : 'text-primary',
            )}
          >
            {props.unit}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.sp('mt', 3),
            cm.sp('pt', 3),
            cm.textSize('xs'),
            'border-t border-outline-variant/30 text-on-surface-variant',
          )}
        >
          {props.sub}
        </div>
      </div>
    </div>
  )
}

export function Reservations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [rows, setRows] = useState<ReservationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    ;(async () => {
      try {
        const query = status === 'all' ? '' : '?status=' + status
        const res = await http.get('/api/reservations' + query)
        if (cancelled) return
        setRows(unwrapList<ReservationRow>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(
            t('reservations.loadError', {}, { defaultValue: 'Failed to load reservations.' }),
          )
          setRows([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t, status])

  // Ledger telemetry — derived from the SAME fetched list (the unfiltered
  // "all" response), so the KPI strip stays stable while a filter narrows
  // the table below.
  const kpis = useMemo(() => {
    const list = rows ?? []
    const voice = list.filter((r) => r.source === 'phone').length
    const nights = list.reduce((acc, r) => acc + r.nights, 0)
    const folio = list.reduce((acc, r) => acc + r.total_cents, 0)
    return { count: list.length, voice, nights, folio }
  }, [rows])

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header strip — eyebrow ledger trail, serif headline, ink action */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'border-b border-outline-variant/60 pb-6',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            <span>
              {t('reservations.eyebrow', {}, { defaultValue: 'Switchboard autonomous ledger' })}
            </span>
            <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
              <span className="material-symbols-outlined">chevron_right</span>
            </span>
            <span className="text-secondary">
              {t('reservations.eyebrowSegment', {}, { defaultValue: 'Reservation dispatch' })}
            </span>
          </p>
          <h1
            className={cm.cn('sb-serif mt-1 text-3xl font-normal tracking-tight text-primary')}
            data-mol-id="reservations-heading"
          >
            {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'reservations.description',
              {},
              {
                defaultValue:
                  'The live booking folio — every stay the voice agent, the web, and the front desk put their name on.',
              },
            )}
          </p>
        </div>
        <Link
          to="/reservations/new"
          data-mol-id="reservations-new-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg bg-primary text-on-primary hover:bg-primary-light transition-colors',
          )}
        >
          <span className="sb-icon flex h-4 w-4 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">add</span>
          </span>
          <span>{t('reservations.newButton', {}, { defaultValue: 'New reservation' })}</span>
        </Link>
      </div>

      {/* KPI bento strip — ledger telemetry from the fetched rows */}
      <div className={cm.cn('mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
        <KpiCard
          id="reservations-kpi-active"
          label={t('reservations.kpiActive', {}, { defaultValue: 'Active ledger' })}
          icon="calendar_month"
          value={kpis.count > 0 ? String(kpis.count) : '—'}
          unit={t('reservations.kpiBookings', {}, { defaultValue: 'bookings' })}
          sub={t(
            'reservations.kpiActiveSub',
            {},
            { defaultValue: 'Every status on the book, held to checked out' },
          )}
        />
        <KpiCard
          id="reservations-kpi-voice"
          label={t('reservations.kpiVoice', {}, { defaultValue: 'Voice captured' })}
          icon="record_voice_over"
          value={rows === null ? '—' : String(kpis.voice)}
          unit={t('reservations.kpiViaPhone', {}, { defaultValue: 'via phone' })}
          sub={t(
            'reservations.kpiVoiceSub',
            {},
            { defaultValue: 'Booked autonomously by the AI receptionist' },
          )}
          tone="gold"
        />
        <KpiCard
          id="reservations-kpi-nights"
          label={t('reservations.kpiNights', {}, { defaultValue: 'Room nights' })}
          icon="hotel_class"
          value={rows === null ? '—' : String(kpis.nights)}
          unit={t('common.nights', {}, { defaultValue: 'nights' })}
          sub={t(
            'reservations.kpiNightsSub',
            {},
            { defaultValue: 'Sold across the current ledger' },
          )}
        />
        <KpiCard
          id="reservations-kpi-folio"
          label={t('reservations.kpiFolio', {}, { defaultValue: 'Folio value' })}
          icon="payments"
          value={rows === null ? '—' : formatCents(kpis.folio)}
          unit={t('reservations.kpiTotal', {}, { defaultValue: 'total' })}
          sub={t(
            'reservations.kpiFolioSub',
            {},
            { defaultValue: 'Gross for the listed reservations' },
          )}
        />
      </div>

      {/* Status filter pills */}
      <div
        className={cm.cn(cm.sp('mt', 6), cm.flex({ gap: 'sm', wrap: 'wrap' }))}
        role="group"
        aria-label={t('reservations.filterGroupLabel', {}, { defaultValue: 'Filter by status' })}
      >
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            data-mol-id={'reservations-filter-' + value}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1.5),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'whitespace-nowrap rounded-full border transition-colors',
              status === value
                ? 'border-primary-container bg-primary-container text-on-primary-container'
                : 'border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary hover:text-primary',
            )}
          >
            {value === 'all'
              ? t('reservations.filterAll', {}, { defaultValue: 'All' })
              : t('reservationStatus.' + value, {}, { defaultValue: value.replace(/_/g, ' ') })}
          </button>
        ))}
      </div>

      {error ? (
        <p
          data-mol-id="reservations-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* Reservation ledger */}
      <div
        className={cm.cn(
          cm.sp('mt', 4),
          'sb-card-shadow overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
        )}
      >
        {rows === null ? (
          <p
            data-mol-id="reservations-loading"
            className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : rows.length === 0 ? (
          <p
            data-mol-id="reservations-empty"
            className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant')}
          >
            {t('reservations.empty', {}, { defaultValue: 'No reservations match this filter.' })}
          </p>
        ) : (
          // Horizontal scroll on narrow screens — the ledger stays legible
          // instead of being crushed into the card.
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low/70 text-left text-on-surface-variant">
                  <th
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider',
                    )}
                    scope="col"
                  >
                    {t('reservations.guest', {}, { defaultValue: 'Guest' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider',
                    )}
                    scope="col"
                  >
                    {t('reservations.dates', {}, { defaultValue: 'Dates' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider',
                    )}
                    scope="col"
                  >
                    {t('reservations.total', {}, { defaultValue: 'Total' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider',
                    )}
                    scope="col"
                  >
                    {t('reservations.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-wider',
                    )}
                    scope="col"
                  >
                    {t('reservations.source', {}, { defaultValue: 'Source' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="bg-surface/80 transition-colors hover:bg-surface-container-low/60"
                  >
                    <td className={cm.sp('px', 5)}>
                      <div
                        className={cm.cn(cm.sp('py', 4), cm.flex({ align: 'center', gap: 'sm' }))}
                      >
                        <span
                          aria-hidden="true"
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            'h-9 w-9 shrink-0 rounded-full border border-outline-variant/60 bg-surface-container-high text-primary',
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                          )}
                        >
                          {initials(r.guest_name)}
                        </span>
                        <span>
                          <Link
                            to={'/reservations/' + r.id}
                            data-mol-id={'reservation-row-' + r.confirmation_code}
                            className={cm.cn(
                              '-my-2 inline-block py-2 text-primary',
                              cm.fontWeight('semibold'),
                              'hover:text-secondary hover:underline',
                            )}
                          >
                            {r.guest_name}
                          </Link>
                          <span
                            className={cm.cn(
                              'block font-mono text-on-surface-variant',
                              cm.sp('mt', 0.5),
                              cm.textSize('xs'),
                            )}
                          >
                            {r.confirmation_code}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'whitespace-nowrap')}>
                      <span className="font-medium text-primary">
                        {formatDate(r.check_in)} → {formatDate(r.check_out)}
                      </span>
                      <span
                        className={cm.cn(
                          'block text-on-surface-variant',
                          cm.sp('mt', 0.5),
                          cm.textSize('xs'),
                        )}
                      >
                        {r.nights} {t('common.nights', {}, { defaultValue: 'nights' })} · {r.guests}{' '}
                        {r.guests === 1
                          ? t('reservations.guestOne', {}, { defaultValue: 'guest' })
                          : t('reservations.guestsCol', {}, { defaultValue: 'guests' })}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4), 'whitespace-nowrap')}>
                      <span className={cm.fontWeight('semibold') + ' text-primary'}>
                        {formatCents(r.total_cents)}
                      </span>
                      {r.nights > 0 ? (
                        <span
                          className={cm.cn(
                            'block text-on-surface-variant',
                            cm.sp('mt', 0.5),
                            cm.textSize('xs'),
                          )}
                        >
                          {formatCents(Math.round(r.total_cents / r.nights))}{' '}
                          {t('common.perNight', {}, { defaultValue: '/night' })}
                        </span>
                      ) : null}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}>
                      <span
                        data-mol-id={'reservation-status-' + r.confirmation_code}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'whitespace-nowrap rounded border',
                          statusChipClass(r.status),
                        )}
                      >
                        <span
                          className={cm.cn('h-1.5 w-1.5 rounded-full', statusDotClass(r.status))}
                          aria-hidden="true"
                        />
                        {t(
                          'reservationStatus.' + r.status,
                          {},
                          { defaultValue: r.status.replace(/_/g, ' ') },
                        )}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                          'whitespace-nowrap text-on-surface-variant',
                        )}
                      >
                        <span
                          className="sb-icon flex h-4 w-4 items-center justify-center"
                          aria-hidden="true"
                        >
                          <span className="material-symbols-outlined">{sourceIcon(r.source)}</span>
                        </span>
                        {t(
                          'reservationSource.' + r.source,
                          {},
                          { defaultValue: r.source.replace(/_/g, ' ') },
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Ledger footer strip */}
        {rows !== null && rows.length > 0 ? (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'border-t border-outline-variant/40 bg-surface-container-low/50 text-on-surface-variant',
              cm.textSize('xs'),
            )}
          >
            <span>
              {t(
                'reservations.showing',
                { count: rows.length },
                { defaultValue: 'Showing {{count}} in this view' },
              )}
            </span>
            <span
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.fontWeight('medium'))}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-on-tertiary-container"
                aria-hidden="true"
              />
              {t(
                'reservations.ledgerLive',
                {},
                { defaultValue: 'Folio synced — PMS, web, and voice in one book' },
              )}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
