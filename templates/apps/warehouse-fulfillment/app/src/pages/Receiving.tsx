import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface ApiReceipt {
  id: string
  supplier?: string | null
  po_number?: string | null
  expected_units?: number | null
  expected_at?: string | null
  received_at?: string | null
  status?: string
}

const STATE_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  expected: {
    label: 'Expected',
    bg: 'var(--color-order-pending-bg)',
    color: 'var(--color-order-pending)',
    icon: 'schedule',
  },
  arrived: {
    label: 'Arrived',
    bg: 'var(--color-order-picking-bg)',
    color: 'var(--color-order-picking)',
    icon: 'move_to_inbox',
  },
  received: {
    label: 'Received',
    bg: 'var(--color-order-shipped-bg)',
    color: 'var(--color-order-shipped)',
    icon: 'check_circle',
  },
  putaway: {
    label: 'Put away',
    bg: 'var(--color-order-shipped-bg)',
    color: 'var(--color-order-shipped)',
    icon: 'check_circle',
  },
}

export function Receiving() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<ApiReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [supplier, setSupplier] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [units, setUnits] = useState('100')
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiReceipt[]>('/receipts')
      const data = res.data
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<ApiReceipt[]>('/receipts')
        if (cancelled) return
        const data = res.data
        setRows(Array.isArray(data) ? data : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!supplier.trim()) return
    setCreating(true)
    try {
      await http.post('/receipts', {
        supplier: supplier.trim(),
        po_number: poNumber.trim() || `PO-${Date.now().toString(36).toUpperCase()}`,
        expected_units: Number(units) || 0,
        status: 'expected',
      })
      void track({ name: 'receipt.created', properties: { supplier: supplier.trim() } })
      setSupplier('')
      setPoNumber('')
      setUnits('100')
      setShowForm(false)
      await refresh()
    } finally {
      setCreating(false)
    }
  }

  async function markReceived(id: string) {
    await http.patch(`/receipts/${id}`, {
      status: 'received',
      received_at: new Date().toISOString(),
    })
    void track({ name: 'receipt.completed', properties: { receiptId: id } })
    await refresh()
  }

  return (
    <div className={cm.stack(8)} data-testid="receiving-page">
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('receiving.eyebrow', {}, { defaultValue: 'Inbound goods' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('receiving.title', {}, { defaultValue: 'Receiving dock' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'receiving.subtitle',
              { count: rows.length },
              { defaultValue: '{{count}} ASNs scheduled this shift' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-testid="receiving-new-toggle"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-lg bg-primary text-on-primary shadow shadow-primary/30 hover:opacity-95',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('receiving.new', {}, { defaultValue: 'New ASN' })}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ gap: 'sm' }),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest items-end flex-wrap',
          )}
          data-testid="receiving-new-form"
        >
          <label className={cm.cn(cm.stack(1), 'min-w-[160px]')}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('receiving.supplier', {}, { defaultValue: 'Supplier' })}
            </span>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
              data-testid="receiving-supplier"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface w-full',
              )}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('receiving.po', {}, { defaultValue: 'PO #' })}
            </span>
            <input
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              data-testid="receiving-po"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface w-32',
              )}
              placeholder={t('receiving.poPlaceholder', {}, { defaultValue: 'auto' })}
            />
          </label>
          <label className={cm.stack(1)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('receiving.units', {}, { defaultValue: 'Units' })}
            </span>
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              data-testid="receiving-units"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface w-24',
              )}
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            data-testid="receiving-create-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
            )}
          >
            {t('receiving.create', {}, { defaultValue: 'Schedule ASN' })}
          </button>
        </form>
      )}

      <section className={cm.cn('grid grid-cols-2 sm:grid-cols-3 gap-4')}>
        <FulfillmentKpiCard
          label={t('receiving.kpis.expected', {}, { defaultValue: 'Expected' })}
          value={String(rows.filter((s) => s.status === 'expected').length)}
          tone="pending"
          icon="schedule"
        />
        <FulfillmentKpiCard
          label={t('receiving.kpis.arrived', {}, { defaultValue: 'Arrived' })}
          value={String(rows.filter((s) => s.status === 'arrived').length)}
          tone="picking"
          icon="move_to_inbox"
        />
        <FulfillmentKpiCard
          label={t('receiving.kpis.putaway', {}, { defaultValue: 'Received' })}
          value={String(rows.filter((s) => s.status === 'received').length)}
          tone="shipped"
          icon="check_circle"
        />
      </section>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="receiving-table"
      >
        <div className={cm.cn('divide-y divide-outline-variant/50')}>
          {loading && (
            <p className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          )}
          {!loading && rows.length === 0 && (
            <p
              className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}
              data-testid="receiving-empty"
            >
              {t('receiving.empty', {}, { defaultValue: 'No receipts yet.' })}
            </p>
          )}
          {!loading &&
            rows.map((row) => {
              const meta = STATE_META[row.status ?? 'expected'] ?? STATE_META.expected
              return (
                <div
                  key={row.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    'flex-wrap',
                  )}
                  data-testid="receipt-row"
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                    <span
                      className={cm.cn('font-mono text-sm font-bold rounded px-3 py-1')}
                      style={{
                        backgroundColor: 'var(--color-background-secondary)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {row.po_number ?? row.id.slice(0, 8)}
                    </span>
                    <div className={cm.stack(0)}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {row.supplier ?? '—'}
                      </p>
                      <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                        {t(
                          'receiving.row.units',
                          { units: Number(row.expected_units ?? 0) },
                          { defaultValue: '{{units}} units inbound' },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
                    {row.status !== 'received' && (
                      <button
                        type="button"
                        onClick={() => markReceived(row.id)}
                        data-testid="receipt-mark-received"
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-lg border border-outline-variant text-xs font-bold hover:bg-background-secondary',
                        )}
                      >
                        {t('receiving.markReceived', {}, { defaultValue: 'Mark received' })}
                      </button>
                    )}
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                      )}
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[12px]')}
                        data-icon={meta.icon}
                      >
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      </article>
    </div>
  )
}

export default Receiving
