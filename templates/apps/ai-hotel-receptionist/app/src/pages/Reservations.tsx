import { useEffect, useState } from 'react'
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

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
        <h1
          className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
          data-mol-id="reservations-heading"
        >
          {t('reservations.heading', {}, { defaultValue: 'Reservations' })}
        </h1>
        <Link
          to="/reservations/new"
          data-mol-id="reservations-new-link"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg',
          )}
        >
          {t('reservations.newButton', {}, { defaultValue: 'New reservation' })}
        </Link>
      </div>

      {/* Status filter */}
      <div className={cm.cn(cm.sp('mt', 4), cm.flex({ gap: 'sm', wrap: 'wrap' }))} role="group">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            data-mol-id={'reservations-filter-' + value}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border transition-colors',
              status === value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary',
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
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      {/* List */}
      <div
        className={cm.cn(
          cm.sp('mt', 6),
          'rounded-2xl bg-surface border border-outline-variant overflow-hidden',
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
          // Horizontal scroll on narrow screens — the 6-column table stays
          // legible instead of being crushed into the card.
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.guest', {}, { defaultValue: 'Guest' })}
                  </th>
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.dates', {}, { defaultValue: 'Dates' })}
                  </th>
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.guestsCol', {}, { defaultValue: 'Guests' })}
                  </th>
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.total', {}, { defaultValue: 'Total' })}
                  </th>
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th className={cm.sp('p', 4)} scope="col">
                    {t('reservations.source', {}, { defaultValue: 'Source' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant/50 last:border-0">
                    <td className={cm.sp('p', 4)}>
                      <Link
                        to={'/reservations/' + r.id}
                        data-mol-id={'reservation-row-' + r.confirmation_code}
                        className="-my-2 inline-block py-2 font-semibold text-primary hover:underline"
                      >
                        {r.guest_name}
                      </Link>
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                        )}
                      >
                        {r.confirmation_code}
                      </span>
                    </td>
                    <td className={cm.sp('p', 4)}>
                      {formatDate(r.check_in)} → {formatDate(r.check_out)} ({r.nights}{' '}
                      {t('common.nights', {}, { defaultValue: 'nights' })})
                    </td>
                    <td className={cm.sp('p', 4)}>{r.guests}</td>
                    <td className={cm.sp('p', 4)}>{formatCents(r.total_cents)}</td>
                    <td className={cm.sp('p', 4)}>
                      <span
                        data-mol-id={'reservation-status-' + r.confirmation_code}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-full bg-surface-container-high',
                        )}
                      >
                        {t(
                          'reservationStatus.' + r.status,
                          {},
                          { defaultValue: r.status.replace(/_/g, ' ') },
                        )}
                      </span>
                    </td>
                    <td className={cm.sp('p', 4)}>
                      {t(
                        'reservationSource.' + r.source,
                        {},
                        { defaultValue: r.source.replace(/_/g, ' ') },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
