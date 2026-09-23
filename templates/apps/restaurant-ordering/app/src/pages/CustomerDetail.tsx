import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ApiOrderRow {
  id: string
  total: number | string
  status: string
  table_number?: number | null
  created_at?: string
}

interface ApiCustomer {
  id: string
  name: string
  email: string | null
  phone?: string | null
  total_visits?: number
  total_spent?: number | string
  last_visit_at?: string | null
  recentOrders?: ApiOrderRow[]
}

function fmtUsd(amount: number) {
  return `$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function CustomerDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<ApiCustomer | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = unwrapSingle<ApiCustomer>(await http.get(`/api/customers/${id}`))
      if (data?.id) setCustomer(data)
      else setError(t('customerDetail.notFound', {}, { defaultValue: 'Customer not found.' }))
    } catch (error) {
      logError('customerDetail.load', error)
      setError(t('customerDetail.loadError', {}, { defaultValue: 'Could not load customer.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleAddReservation = useCallback(async () => {
    if (!customer) return
    const partySize = Number(
      window.prompt(t('customerDetail.partyPrompt', {}, { defaultValue: 'Party size' })) || '2',
    )
    if (!Number.isFinite(partySize) || partySize <= 0) return
    const when = window.prompt(
      t(
        'customerDetail.whenPrompt',
        {},
        { defaultValue: 'When? (e.g. tomorrow 7pm — leave blank for now)' },
      ),
    )
    const scheduled = when ? new Date(when) : new Date()
    if (Number.isNaN(scheduled.getTime())) return
    setBusy(true)
    setError(null)
    try {
      await http.post('/api/reservations', {
        party_name: customer.name,
        party_size: partySize,
        scheduled_for: scheduled.toISOString(),
        customer_id: customer.id,
      })
      void track({
        name: 'reservation.created',
        properties: { partySize, customerId: customer.id },
      })
      setStatus(
        t('customerDetail.reservationCreated', {}, { defaultValue: 'Reservation created.' }),
      )
    } catch (error) {
      logError('customerDetail.addReservation', error)
      setError(
        t('customerDetail.reservationError', {}, { defaultValue: 'Could not create reservation.' }),
      )
    } finally {
      setBusy(false)
    }
  }, [customer, http, t])

  const handleDelete = useCallback(async () => {
    if (!customer) return
    if (
      !window.confirm(
        t('customerDetail.confirmDelete', {}, { defaultValue: 'Delete this guest record?' }),
      )
    )
      return
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/api/customers/${customer.id}`)
      void track({ name: 'customer.deleted', properties: { customerId: customer.id } })
      navigate('/customers')
    } catch (error) {
      logError('customerDetail.delete', error)
      setError(t('customerDetail.deleteError', {}, { defaultValue: 'Could not delete customer.' }))
      setBusy(false)
    }
  }, [customer, http, navigate, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error && !customer) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.stack(4),
        )}
      >
        <p
          data-testid="customerdetail-error"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}
        >
          {error}
        </p>
        <Link to="/customers" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('nav.guests', {}, { defaultValue: 'Guests' })}
        </Link>
      </div>
    )
  }

  if (!customer) return null
  const recentOrders = customer.recentOrders ?? []

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/customers"
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-base align-middle')}
          aria-hidden="true"
        >
          arrow_back
        </span>
        {t('nav.guests', {}, { defaultValue: 'Guests' })}
      </Link>

      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.sp('p', 8),
          'rounded-3xl bg-gradient-to-br from-primary-container to-surface-container-lowest',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'bg-gradient-to-br from-primary to-tertiary text-on-primary text-3xl font-extrabold font-display shadow-lg shadow-primary/20',
          )}
        >
          {initials(customer.name)}
        </span>
        <div className={cm.flex1}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {(customer.total_visits ?? 0) >= 10
              ? t('customerDetail.vip', {}, { defaultValue: 'VIP guest' })
              : t('customerDetail.regular', {}, { defaultValue: 'Regular' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {customer.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {customer.email ?? ''}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            onClick={handleAddReservation}
            disabled={busy}
            type="button"
            data-testid="customerdetail-add-reservation"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            {t('customerDetail.book', {}, { defaultValue: 'Add reservation' })}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            type="button"
            data-testid="customerdetail-delete"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'rounded-full border border-error text-error hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50',
            )}
          >
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </header>

      {error ? (
        <p data-testid="customerdetail-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          data-testid="customerdetail-success"
          className={cm.cn(cm.textSize('sm'), 'text-primary')}
        >
          {status}
        </p>
      ) : null}

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-3')}>
        <Stat
          icon="local_dining"
          tint="text-primary"
          label={t('customerDetail.visitsLabel', {}, { defaultValue: 'Visits' })}
          value={String(customer.total_visits ?? 0)}
        />
        <Stat
          icon="paid"
          tint="text-success"
          label={t('customerDetail.lifetimeLabel', {}, { defaultValue: 'Lifetime' })}
          value={fmtUsd(Number(customer.total_spent ?? 0))}
        />
        <Stat
          icon="event_seat"
          tint="text-tertiary"
          label={t('customerDetail.lastVisitLabel', {}, { defaultValue: 'Last visit' })}
          value={
            customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString() : '—'
          }
        />
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight font-display')}>
          {t('customerDetail.recentOrders', {}, { defaultValue: 'Recent orders' })}
        </h2>
        {recentOrders.length === 0 ? (
          <p
            data-testid="customerdetail-no-orders"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-low rounded-2xl text-on-surface-variant',
            )}
          >
            {t('customerDetail.noOrders', {}, { defaultValue: 'No orders yet for this guest.' })}
          </p>
        ) : (
          <div
            className={cm.cn('overflow-x-auto rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <table className={cm.cn('w-full text-left', cm.textSize('sm'))}>
              <thead>
                <tr
                  className={cm.cn(
                    'border-b border-outline-variant text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>#</th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold')}>
                    {t('customerDetail.col.table', {}, { defaultValue: 'Table' })}
                  </th>
                  <th className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), 'font-bold text-right')}>
                    {t('nav.total', {}, { defaultValue: 'Total' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-surface-container')}>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        cm.fontWeight('bold'),
                        'text-primary',
                      )}
                    >
                      <Link to={`/orders/${o.id}`} className={cm.cn('hover:underline')}>
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>{o.status}</td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 4))}>
                      {o.table_number ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 4),
                        'text-right font-bold tabular-nums',
                      )}
                    >
                      {fmtUsd(Number(o.total ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  icon,
  tint,
  label,
  value,
}: {
  icon: string
  tint: string
  label: string
  value: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.cn(cm.sp('p', 3), 'inline-flex bg-surface rounded-xl shadow-sm', tint)}>
        <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mt', 4),
          cm.sp('mb', 1),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums font-display')}>
        {value}
      </p>
    </div>
  )
}
