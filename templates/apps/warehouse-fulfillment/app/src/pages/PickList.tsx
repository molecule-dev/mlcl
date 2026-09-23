import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { OrderStatusBadge } from '../components/OrderStatusBadge.js'
import { type PickListEntry, PickListItem } from '../components/PickListItem.js'

interface ApiOrderItem {
  id: string
  productId?: string
  name: string
  quantity?: number
}

interface ApiOrderDetail {
  id: string
  externalOrderId?: string
  status?: string
  items?: ApiOrderItem[]
}

interface ApiInventoryRow {
  id: string
  sku?: string
  bin?: string | null
  name?: string
}

const STORAGE_KEY = 'wf-pick-progress'

interface StoredProgress {
  [orderId: string]: {
    [itemId: string]: number
  }
}

function readProgress(): StoredProgress {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredProgress) : {}
  } catch (_error) {
    // corrupt localStorage data — fall back to empty progress
    return {}
  }
}

function writeProgress(state: StoredProgress) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_error) {
    // storage quota exceeded — pick progress is best-effort, safe to skip
  }
}

export function PickList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ id: string }>()
  const orderId = params.id ?? ''
  const [order, setOrder] = useState<ApiOrderDetail | null>(null)
  const [entries, setEntries] = useState<PickListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [orderResp, inventoryResp] = await Promise.all([
          http.get<ApiOrderDetail>(`/orders/${orderId}`),
          http.get<ApiInventoryRow[]>('/inventory'),
        ])
        if (cancelled) return
        const orderRes = orderResp.data ?? null
        const inventoryRes = inventoryResp.data
        setOrder(orderRes)
        const items = orderRes?.items ?? []
        const inv = Array.isArray(inventoryRes) ? inventoryRes : []
        const skuByProductId: Record<string, { sku: string; bin: string }> = {}
        for (const it of inv) {
          if (it.id) skuByProductId[it.id] = { sku: it.sku ?? '', bin: it.bin ?? '' }
        }
        const stored = readProgress()[orderId] ?? {}
        const mapped: PickListEntry[] = items.map((item) => {
          const meta = item.productId ? skuByProductId[item.productId] : undefined
          return {
            id: item.id,
            sku: meta?.sku ?? item.productId?.slice(0, 8) ?? '—',
            productName: item.name,
            bin: meta?.bin ?? '—',
            quantityRequested: Number(item.quantity ?? 1),
            quantityPicked: Number(stored[item.id] ?? 0),
          }
        })
        setEntries(mapped)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, orderId])

  function persist(next: PickListEntry[]) {
    const stored = readProgress()
    stored[orderId] = next.reduce<Record<string, number>>((acc, e) => {
      acc[e.id] = e.quantityPicked
      return acc
    }, {})
    writeProgress(stored)
  }

  function toggle(target: PickListEntry) {
    setEntries((prev) => {
      const next = prev.map((e) => {
        if (e.id !== target.id) return e
        const newPicked = e.quantityPicked >= e.quantityRequested ? 0 : e.quantityRequested
        return { ...e, quantityPicked: newPicked }
      })
      persist(next)
      return next
    })
  }

  const totalRequested = entries.reduce((sum, e) => sum + e.quantityRequested, 0)
  const totalPicked = entries.reduce((sum, e) => sum + e.quantityPicked, 0)
  const completionPercent =
    totalRequested === 0 ? 0 : Math.round((totalPicked / totalRequested) * 100)
  const allComplete = totalPicked >= totalRequested && totalRequested > 0

  async function complete() {
    if (!allComplete || !order) return
    setAdvancing(true)
    try {
      const status = order.status ?? 'pending'
      const next = status === 'pending' || status === 'picking' ? 'packed' : status
      await http.patch(`/orders/${orderId}`, { status: next })
      void track({ name: 'order.packed', properties: { orderId } })
      window.location.href = `/orders/${orderId}`
    } finally {
      setAdvancing(false)
    }
  }

  if (loading && !order) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.textMuted)} data-testid="picklist-loading">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (!order) {
    return (
      <div className={cm.stack(4)} data-testid="picklist-empty">
        <Link
          to="/orders"
          className={cm.cn(
            'inline-flex min-h-[36px] items-center self-start text-primary hover:underline',
          )}
        >
          ← {t('pickList.back', {}, { defaultValue: 'Back to orders' })}
        </Link>
        <p className={cm.textMuted}>
          {t('pickList.notFound', {}, { defaultValue: 'Order not found.' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.stack(6)} data-testid="picklist-page">
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <Link
            to={`/orders/${orderId}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} data-icon="arrow_back">
              arrow_back
            </span>
            {t('pickList.back', {}, { defaultValue: 'Back to order' })}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <h1
              className={cm.cn('font-mono text-3xl font-extrabold tracking-wider text-on-surface')}
            >
              PICK · {order.externalOrderId ?? orderId.slice(0, 8)}
            </h1>
            <OrderStatusBadge status={(order.status as 'picking' | 'packed') ?? 'picking'} />
          </div>
        </div>
        <button
          type="button"
          disabled={!allComplete || advancing}
          onClick={complete}
          data-testid="picklist-complete"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 6),
            cm.h(12),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-gradient-to-br from-secondary to-secondary-light text-on-secondary shadow shadow-secondary/30 hover:opacity-95 disabled:opacity-50 transition-all uppercase tracking-wider',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="check_circle">
            check_circle
          </span>
          {t('pickList.completeCta', {}, { defaultValue: 'Complete pick' })}
        </button>
      </header>

      <article
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 5),
          'rounded-2xl text-on-primary flex-wrap',
        )}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        }}
        data-testid="picklist-progress"
      >
        <div className={cm.stack(1)}>
          <p
            className={cm.cn(
              'text-[10px] font-bold uppercase tracking-[0.22em] text-on-primary/70',
            )}
          >
            {t('pickList.progress.eyebrow', {}, { defaultValue: 'Pick progress' })}
          </p>
          <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
            {totalPicked}
            <span className={cm.cn('text-on-primary/60')}> / {totalRequested}</span>
            <span className={cm.cn('text-base text-on-primary/70 font-bold ml-2')}>
              · {completionPercent}%
            </span>
          </p>
        </div>
        <div className={cm.cn('w-1/2 min-w-[160px]')}>
          <div className={cm.cn('h-3 rounded-full bg-surface/15 overflow-hidden')}>
            <div
              className={cm.cn('h-full bg-secondary transition-all')}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </article>

      <article
        className={cm.cn(
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
        )}
        data-testid="picklist-items"
      >
        {entries.length === 0 ? (
          <p
            className={cm.cn(cm.sp('p', 6), cm.textMuted, 'text-sm')}
            data-testid="picklist-empty-list"
          >
            {t('pickList.empty', {}, { defaultValue: 'No items on this order.' })}
          </p>
        ) : (
          <div className={cm.cn('divide-y divide-outline-variant/50')}>
            {entries.map((entry) => (
              <PickListItem key={entry.id} entry={entry} onToggle={toggle} />
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

export default PickList
