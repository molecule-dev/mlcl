import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface ApiReturn {
  id: string
  rma_number?: string | null
  reason?: string | null
  status?: string
  resolution?: string | null
  received_at?: string | null
  created_at?: string
}

const RES_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  inspect: {
    label: 'Inspect',
    bg: 'var(--color-order-pending-bg)',
    color: 'var(--color-order-pending)',
    icon: 'visibility',
  },
  restock: {
    label: 'Restock',
    bg: 'var(--color-order-shipped-bg)',
    color: 'var(--color-order-shipped)',
    icon: 'redo',
  },
  damage: {
    label: 'Damage',
    bg: 'var(--color-order-returned-bg)',
    color: 'var(--color-order-returned)',
    icon: 'error',
  },
  refurbish: {
    label: 'Refurbish',
    bg: 'var(--color-stock-backorder-bg)',
    color: 'var(--color-stock-backorder)',
    icon: 'build',
  },
}

const STATUS_OPTIONS = ['issued', 'in_transit', 'received', 'refunded', 'closed'] as const

export function Returns() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<ApiReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [reason, setReason] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await http.get<ApiReturn[]>('/returns')
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
        const res = await http.get<ApiReturn[]>('/returns')
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
    if (!reason.trim()) return
    setCreating(true)
    try {
      await http.post('/returns', { reason: reason.trim(), status: 'issued' })
      void track({ name: 'return.created', properties: { reason: reason.trim() } })
      setReason('')
      setShowForm(false)
      await refresh()
    } finally {
      setCreating(false)
    }
  }

  async function setStatus(id: string, next: string) {
    await http.patch(`/returns/${id}`, { status: next })
    void track({ name: 'return.status_changed', properties: { returnId: id, to: next } })
    await refresh()
  }

  return (
    <div className={cm.stack(8)} data-testid="returns-page">
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('returns.eyebrow', {}, { defaultValue: 'Reverse logistics' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('returns.title', {}, { defaultValue: 'Returns triage' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'returns.subtitle',
              { count: rows.length },
              { defaultValue: '{{count}} RMAs awaiting disposition' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-testid="returns-new-toggle"
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
            : t('returns.new', {}, { defaultValue: 'New RMA' })}
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
          data-testid="returns-new-form"
        >
          <label className={cm.cn(cm.stack(1), 'flex-1 min-w-[240px]')}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('returns.reason', {}, { defaultValue: 'Reason' })}
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="returns-reason"
              required
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface w-full',
              )}
              placeholder={t(
                'returns.reasonPlaceholder',
                {},
                { defaultValue: 'Why is this being returned?' },
              )}
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            data-testid="returns-create-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
            )}
          >
            {t('returns.create', {}, { defaultValue: 'Issue RMA' })}
          </button>
        </form>
      )}

      <section className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-4')}>
        <FulfillmentKpiCard
          label={t('returns.kpis.inspect', {}, { defaultValue: 'To inspect' })}
          value={String(rows.filter((s) => s.resolution === 'inspect').length)}
          tone="pending"
          icon="visibility"
        />
        <FulfillmentKpiCard
          label={t('returns.kpis.restock', {}, { defaultValue: 'Restock' })}
          value={String(rows.filter((s) => s.resolution === 'restock').length)}
          tone="shipped"
          icon="redo"
        />
        <FulfillmentKpiCard
          label={t('returns.kpis.received', {}, { defaultValue: 'Received' })}
          value={String(rows.filter((s) => s.status === 'received').length)}
          tone="success"
          icon="inbox"
        />
        <FulfillmentKpiCard
          label={t('common.open', {}, { defaultValue: 'Open' })}
          value={String(rows.filter((s) => s.status === 'issued').length)}
          tone="warning"
          icon="pending"
        />
      </section>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="returns-list"
      >
        <div className={cm.cn('divide-y divide-outline-variant/50')}>
          {loading && (
            <p className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}>
              {t('returns.loading', {}, { defaultValue: 'Loading returns…' })}
            </p>
          )}
          {!loading && rows.length === 0 && (
            <p
              className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}
              data-testid="returns-empty"
            >
              {t('returns.empty', {}, { defaultValue: 'No returns yet.' })}
            </p>
          )}
          {!loading &&
            rows.map((row) => {
              const meta = RES_META[row.resolution ?? 'inspect'] ?? RES_META.inspect
              return (
                <div
                  key={row.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    'border-l-4 hover:bg-background-secondary transition-colors flex-wrap',
                  )}
                  style={{ borderLeftColor: meta.color }}
                  data-testid="return-row"
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                    <span
                      className={cm.cn('h-9 w-9 rounded-full inline-flex')}
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[18px] m-auto')}
                        data-icon={meta.icon}
                      >
                        {meta.icon}
                      </span>
                    </span>
                    <div className={cm.stack(0)}>
                      <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }))}>
                        <span
                          className={cm.cn('font-mono text-xs font-bold')}
                          style={{ color: 'var(--color-sku)' }}
                        >
                          {row.rma_number ?? row.id.slice(0, 8)}
                        </span>
                        <span className={cm.cn('text-on-surface-variant')}>·</span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {row.reason ?? '—'}
                        </span>
                      </div>
                      <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                    <select
                      value={row.status ?? 'issued'}
                      onChange={(e) => setStatus(row.id, e.target.value)}
                      data-testid="return-status-select"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-lg border border-outline-variant bg-surface text-xs',
                      )}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
        </div>
      </article>
    </div>
  )
}

export default Returns
