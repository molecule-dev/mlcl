import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface ApiInventoryRow {
  id: string
  name?: string
  sku?: string
  bin?: string | null
  onHand?: number | string | null
  reorderPoint?: number | string | null
  price?: number | string | null
  description?: string | null
  movements?: ApiMovement[]
}

interface ApiMovement {
  id: string
  type?: string
  quantity?: number
  reason?: string
  createdAt?: string
}

export function InventoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ sku: string }>()
  const id = params.sku ?? ''
  const [row, setRow] = useState<ApiInventoryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [delta, setDelta] = useState('1')
  const [reason, setReason] = useState('manual_adjust')
  const [submitting, setSubmitting] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiInventoryRow>(`/inventory/${id}`)
      setRow(res.data ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiInventoryRow>(`/inventory/${id}`)
        if (cancelled) return
        setRow(res.data ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const numeric = Number(delta)
      if (Number.isFinite(numeric) && numeric !== 0) {
        await http.post(`/inventory/${id}/adjust`, { delta: numeric, reason })
        void track({
          name: 'stock.adjusted',
          properties: { productId: id, delta: numeric, reason },
        })
      }
      setAdjustOpen(false)
      setDelta('1')
      await refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !row) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.textMuted)} data-testid="inventory-detail-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (!row) {
    return (
      <div className={cm.stack(4)} data-testid="inventory-detail-empty">
        <Link to="/inventory" className={cm.cn('text-primary hover:underline')}>
          ← {t('inventoryDetail.back', {}, { defaultValue: 'Back to inventory' })}
        </Link>
        <p className={cm.textMuted}>
          {t('inventoryDetail.notFound', {}, { defaultValue: 'Item not found.' })}
        </p>
      </div>
    )
  }

  const onHand = Number(row.onHand ?? 0)
  const reorder = Number(row.reorderPoint ?? 10)
  const movements = Array.isArray(row.movements) ? row.movements : []

  return (
    <div className={cm.stack(8)} data-testid="inventory-detail-page">
      <header className={cm.stack(2)}>
        <Link
          to="/inventory"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="arrow_back">
            arrow_back
          </span>
          {t('inventoryDetail.back', {}, { defaultValue: 'Back to inventory' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn('font-mono text-3xl font-extrabold tracking-wider')}
            style={{ color: 'var(--color-sku)' }}
          >
            {row.sku}
          </span>
          <h1
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {row.name}
          </h1>
        </div>
        {row.description && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{row.description}</p>
        )}
      </header>

      <section className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
        <FulfillmentKpiCard
          label={t('inventoryDetail.kpis.onHand', {}, { defaultValue: 'On hand' })}
          value={onHand.toLocaleString()}
          tone="primary"
          icon="inventory_2"
        />
        <FulfillmentKpiCard
          label={t('inventoryDetail.kpis.reorder', {}, { defaultValue: 'Reorder pt' })}
          value={reorder.toLocaleString()}
          tone="warning"
          icon="warning"
        />
        <FulfillmentKpiCard
          label={t('inventoryDetail.kpis.bin', {}, { defaultValue: 'Bin' })}
          value={String(row.bin ?? '—')}
          tone="info"
          icon="inventory"
        />
        <FulfillmentKpiCard
          label={t('inventoryDetail.kpis.price', {}, { defaultValue: 'Unit price' })}
          value={`$${(Number(row.price ?? 0) / 100).toFixed(2)}`}
          tone="success"
          icon="payments"
        />
      </section>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(4),
        )}
        data-testid="inventory-adjust-card"
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div className={cm.stack(1)}>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('inventoryDetail.adjust.eyebrow', {}, { defaultValue: 'Adjust on-hand' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('inventoryDetail.adjust.title', {}, { defaultValue: 'Manual adjustment' })}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAdjustOpen((v) => !v)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary',
            )}
            data-testid="inventory-adjust-toggle"
          >
            {adjustOpen
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('inventoryDetail.adjust.open', {}, { defaultValue: 'Adjust' })}
          </button>
        </header>
        {adjustOpen && (
          <form
            onSubmit={handleAdjust}
            className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap items-end')}
            data-testid="inventory-adjust-form"
          >
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('inventoryDetail.adjust.delta', {}, { defaultValue: 'Delta (+/−)' })}
              </span>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                data-testid="inventory-adjust-delta"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant bg-surface text-on-surface w-32',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), 'flex-1 min-w-[200px]')}>
              <span
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('inventoryDetail.adjust.reason', {}, { defaultValue: 'Reason' })}
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="inventory-adjust-reason"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant bg-surface text-on-surface w-full',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              data-testid="inventory-adjust-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
              )}
            >
              {t('inventoryDetail.adjust.save', {}, { defaultValue: 'Save adjustment' })}
            </button>
          </form>
        )}
      </article>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(4),
        )}
        data-testid="inventory-movements-card"
      >
        <header className={cm.stack(1)}>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
            )}
          >
            {t('inventoryDetail.movements.eyebrow', {}, { defaultValue: 'Recent movements' })}
          </p>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('inventoryDetail.movements.title', {}, { defaultValue: 'Ledger' })}
          </h2>
        </header>
        {movements.length === 0 ? (
          <p
            className={cm.cn(cm.textSize('sm'), cm.textMuted)}
            data-testid="inventory-movements-empty"
          >
            {t('inventoryDetail.movements.empty', {}, { defaultValue: 'No movements yet.' })}
          </p>
        ) : (
          <div className={cm.cn('divide-y divide-outline-variant/40')}>
            {movements.map((m) => {
              const qty = Number(m.quantity ?? 0)
              const positive = m.type === 'in'
              const color = positive ? 'var(--color-stock-in)' : 'var(--color-stock-out)'
              return (
                <div
                  key={m.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div className={cm.cn('min-w-0', cm.stack(0))}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface',
                      )}
                    >
                      {m.reason ?? m.type}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[11px] text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <span
                    className={cm.cn('font-mono text-sm font-bold tabular-nums')}
                    style={{ color }}
                  >
                    {positive ? '+' : '−'}
                    {qty}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </div>
  )
}

export default InventoryDetail
