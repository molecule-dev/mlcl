import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatDateTime, formatMoney } from '../lib/format.js'

interface SplitRow {
  id: string
  name: string
  contact: string | null
  amount_cents: number
  currency: string
  status: 'pending' | 'paid'
  pay_token: string
  paid_at: string | null
  created_at: string
  booking: {
    id: string
    trip_id: string | null
    flight_number: string
    origin_iata: string
    destination_iata: string
    depart_at: string
    total_cents: number
    currency: string
  } | null
}

/** Every share the agent handed out, who has paid, and what is still owed. */
function Bills() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [splits, setSplits] = useState<SplitRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<SplitRow[]>('/splits')
        if (cancelled) return
        setSplits(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('bills.fetchError', {}, { defaultValue: 'Could not load bills.' }),
        )
        setSplits([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const outstanding = useMemo(() => {
    const pending = (splits ?? []).filter((s) => s.status === 'pending')
    const currency = pending[0]?.currency ?? 'USD'
    return {
      cents: pending.reduce((sum, s) => sum + s.amount_cents, 0),
      currency,
      count: pending.length,
    }
  }, [splits])

  const groups = useMemo(() => {
    const map = new Map<string, SplitRow[]>()
    for (const s of splits ?? []) {
      const key = s.booking?.id ?? 'unknown'
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()]
  }, [splits])

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
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.textMuted,
              'uppercase tracking-widest font-semibold',
            )}
          >
            {t('bills.eyebrow', {}, { defaultValue: 'Who owes what' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('nav.bills', {}, { defaultValue: 'Bills' })}
          </h1>
        </div>
        <span
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-2xl bg-primary/15 border border-primary/30',
          )}
          data-mol-id="bills-outstanding"
        >
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tabular-nums text-primary',
            )}
          >
            {formatMoney(outstanding.cents, outstanding.currency)}
          </span>
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'uppercase tracking-widest')}>
            {t(
              'bills.outstanding',
              { count: outstanding.count },
              { defaultValue: 'owed by {{count}}' },
            )}
          </span>
        </span>
      </header>

      <main
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), cm.mxAuto, cm.w('full'), 'max-w-[960px]')}
      >
        {splits === null ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('bills.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : splits.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('py', 16),
              cm.textCenter,
            )}
            data-mol-id="bills-empty"
          >
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'h-16 w-16 bg-surface border border-border text-foreground-tertiary',
              )}
            >
              <span className="material-symbols-outlined text-[28px]">call_split</span>
            </span>
            <p className={cm.fontWeight('semibold')}>
              {t('bills.emptyTitle', {}, { defaultValue: 'No bills split yet.' })}
            </p>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t(
                'bills.emptyBody',
                {},
                { defaultValue: 'Ask the agent to split a booking, or do it from a trip.' },
              )}
            </p>
            <Link to="/trips" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
              {t('bills.goToTrips', {}, { defaultValue: 'Go to trips' })}
            </Link>
          </div>
        ) : (
          <div
            className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}
            data-mol-id="bills-list"
          >
            {groups.map(([bookingId, rows]) => {
              const booking = rows[0]?.booking ?? null
              return (
                <section
                  key={bookingId}
                  className={cm.cn(cm.sp('p', 5), 'rounded-2xl bg-surface border border-border')}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                      cm.sp('mb', 3),
                    )}
                  >
                    {booking ? (
                      <Link
                        to={booking.trip_id ? `/trips/${booking.trip_id}` : '/trips'}
                        className={cm.cn(cm.fontWeight('bold'), 'hover:underline')}
                      >
                        {booking.flight_number} · {booking.origin_iata} → {booking.destination_iata}{' '}
                        · {formatDateTime(booking.depart_at)}
                      </Link>
                    ) : (
                      <span className={cm.fontWeight('bold')}>
                        {t('bills.unknownBooking', {}, { defaultValue: 'Booking' })}
                      </span>
                    )}
                    {booking ? (
                      <span className={cm.cn(cm.textSize('sm'), cm.textMuted, 'tabular-nums')}>
                        {t(
                          'bills.total',
                          { total: formatMoney(booking.total_cents, booking.currency) },
                          { defaultValue: 'Total {{total}}' },
                        )}
                      </span>
                    ) : null}
                  </div>
                  <ul className={cm.cn(cm.flex({ direction: 'col' }))}>
                    {rows.map((s) => (
                      <li
                        key={s.id}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                          cm.textSize('sm'),
                          cm.sp('py', 2),
                          'border-t border-border',
                        )}
                        data-mol-id="bill-row"
                      >
                        <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                          <span className={cm.fontWeight('semibold')}>{s.name}</span>
                          <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'truncate')}>
                            {s.contact ?? t('bills.noContact', {}, { defaultValue: 'No contact' })}
                          </span>
                        </span>
                        <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
                            {formatMoney(s.amount_cents, s.currency)}
                          </span>
                          <span
                            data-mol-id={`bill-${s.status}`}
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
                </section>
              )
            })}
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default Bills
export { Bills, Bills as BillsPage }
