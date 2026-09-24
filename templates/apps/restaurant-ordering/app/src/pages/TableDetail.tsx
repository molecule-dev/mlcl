import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'cleaning', label: 'Cleaning' },
] as const

type TableStatus = (typeof STATUS_OPTIONS)[number]['value']

interface ApiOrder {
  id: string
  status: string
  total: number
  subtotal?: number
  tax?: number
  table_number?: number
  created_at?: string
  table_id?: string | null
}

interface ApiTable {
  id: string
  table_number: number
  seats: number
  section?: string
  status: string
  user_id?: string
  activeOrders?: ApiOrder[]
}

const fmt = (n?: number) => `$${Math.abs(Number(n ?? 0)).toFixed(2)}`

export function TableDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [table, setTable] = useState<ApiTable | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = unwrapSingle<ApiTable>(await http.get(`/api/tables/${id}`))
      if (data?.id) setTable(data)
      else setError(t('tableDetail.notFound', {}, { defaultValue: 'Table not found.' }))
    } catch (error) {
      logError('tableDetail.load', error)
      setError(t('tableDetail.loadError', {}, { defaultValue: 'Could not load table.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleStatus = useCallback(
    async (status: TableStatus) => {
      if (!id) return
      setBusy(true)
      setError(null)
      try {
        await http.put(`/api/tables/${id}/status`, { status })
        void track({ name: 'table.status_updated', properties: { tableId: id, status } })
        await reload()
      } catch (error) {
        logError('tableDetail.updateStatus', error)
        setError(t('tableDetail.statusError', {}, { defaultValue: 'Could not update status.' }))
      } finally {
        setBusy(false)
      }
    },
    [http, id, reload, t],
  )

  const handleDelete = useCallback(async () => {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/api/tables/${id}`)
      void track({ name: 'table.deleted', properties: { tableId: id } })
      navigate('/tables')
    } catch (error) {
      logError('tableDetail.delete', error)
      setError(t('tableDetail.deleteError', {}, { defaultValue: 'Could not delete table.' }))
      setBusy(false)
    }
  }, [http, id, navigate, t])

  const subtotal = useMemo(
    () => (table?.activeOrders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0),
    [table],
  )

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

  if (error && !table) {
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
          data-testid="tabledetail-error"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}
        >
          {error}
        </p>
        <Link to="/tables" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('tableDetail.backToFloor', {}, { defaultValue: 'Floor plan' })}
        </Link>
      </div>
    )
  }

  if (!table) return null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.stack(2)}>
        <Link
          to="/tables"
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
          {t('tableDetail.backToFloor', {}, { defaultValue: 'Floor plan' })}
        </Link>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <div>
            <h1
              className={cm.cn(cm.textSize('5xl'), 'font-extrabold tracking-tighter font-display')}
            >
              {t(
                'tableDetail.heading',
                { label: String(table.table_number) },
                { defaultValue: 'Table {{label}}' },
              )}
            </h1>
            <p
              data-testid="tabledetail-status"
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
            >
              {t(
                'tableDetail.statusLine',
                { status: table.status, seats: table.seats },
                { defaultValue: 'Status: {{status}} · seats {{seats}}' },
              )}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {STATUS_OPTIONS.map((opt) => {
              const active = table.status === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatus(opt.value)}
                  disabled={busy || active}
                  data-testid={`tabledetail-status-${opt.value}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                  )}
                >
                  {t(`tableDetail.status.${opt.value}`, {}, { defaultValue: opt.label })}
                </button>
              )
            })}
            <ConfirmButton
              label={t('tableDetail.delete', {}, { defaultValue: 'Delete' })}
              confirmLabel={t(
                'tableDetail.confirmDelete',
                {},
                { defaultValue: 'Delete this table?' },
              )}
              disarmSeconds={6}
              disabled={busy}
              data-testid="tabledetail-delete"
              onConfirm={handleDelete}
            />
          </div>
        </div>
        {error ? (
          <p data-testid="tabledetail-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        ) : null}
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section className={cm.cn('lg:col-span-2', cm.stack(6))}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight font-display')}>
            {t('tableDetail.activeOrders', {}, { defaultValue: 'Active orders' })}
          </h2>
          {(table.activeOrders ?? []).length === 0 ? (
            <div
              data-testid="tabledetail-no-orders"
              className={cm.cn(
                cm.sp('p', 10),
                cm.textCenter,
                'bg-surface-container-low rounded-2xl text-on-surface-variant',
              )}
            >
              {t(
                'tableDetail.noActive',
                {},
                { defaultValue: 'This table has no active order yet.' },
              )}
            </div>
          ) : (
            (table.activeOrders ?? []).map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'block bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-low transition-colors',
                  cm.flex({ align: 'baseline', justify: 'between' }),
                )}
              >
                <div className={cm.stack(1)}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-primary',
                    )}
                  >
                    {t(
                      'tableDetail.orderNumber',
                      { id: o.id.slice(0, 8) },
                      { defaultValue: 'Order #{{id}}' },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t(`tableDetail.orderStatus.${o.status}`, {}, { defaultValue: o.status })}
                  </p>
                </div>
                <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
                  {fmt(o.total)}
                </p>
              </Link>
            ))
          )}
        </section>

        <aside className={cm.stack(6)}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.stack(2),
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('tableDetail.runningTotal', {}, { defaultValue: 'Running total' })}
            </h3>
            <p
              data-testid="tabledetail-total"
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums font-display')}
            >
              {fmt(subtotal)}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('tableDetail.runningHint', {}, { defaultValue: 'Sum of active (unpaid) orders.' })}
            </p>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.stack(2),
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('tableDetail.section', {}, { defaultValue: 'Section' })}
            </h3>
            <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>
              {table.section ?? 'main'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
