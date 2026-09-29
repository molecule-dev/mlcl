import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LowStockAlertCard, type LowStockAlertItem } from '../components/LowStockAlertCard.js'
import { type MovementEntry, type MovementKind, MovementRow } from '../components/MovementRow.js'

interface ApiNotification {
  id: string
  kind: string
  icon: string
  title: string
  body: string
  href?: string | null
  read: boolean
  created_at?: string | null
}

interface ApiAlert {
  id: string
  product_id?: string | null
  warehouse_id?: string | null
  message: string
  severity: string
  status: string
  created_at?: string | null
}

interface ApiProduct {
  id: string
  name: string
  sku: string
  low_stock_threshold?: number | null
}

interface ApiWarehouse {
  id: string
  name: string
  code?: string | null
}

interface ApiMovement {
  id: string
  product_id?: string | null
  warehouse_id?: string | null
  quantity_change: number
  reason: string
  reference?: string | null
  created_at?: string | null
}

interface ApiStockLevel {
  id: string
  product_id: string
  warehouse_id: string
  quantity: number
}

const SYSTEM_TONE: Record<string, { bg: string; text: string }> = {
  notifications: { bg: 'var(--color-stock-incoming-bg)', text: 'var(--color-stock-incoming)' },
  inventory_2: { bg: 'var(--color-stock-in-bg)', text: 'var(--color-stock-in)' },
  local_shipping: { bg: 'var(--color-stock-incoming-bg)', text: 'var(--color-stock-incoming)' },
  description: { bg: 'var(--color-stock-overstock-bg)', text: 'var(--color-stock-overstock)' },
  sync_problem: { bg: 'var(--color-stock-low-bg)', text: 'var(--color-stock-low)' },
  verified_user: { bg: 'var(--color-stock-in-bg)', text: 'var(--color-stock-in)' },
}

function reasonToKind(reason: string, qty: number): MovementKind {
  if (reason === 'transfer') return 'transfer'
  if (reason === 'adjustment') return 'adjustment'
  if (qty >= 0) return 'inbound'
  return 'outbound'
}

function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tab, setTab] = useState<'all' | 'alerts' | 'movement' | 'system'>('all')

  const [system, setSystem] = useState<ApiNotification[]>([])
  const [alerts, setAlerts] = useState<ApiAlert[]>([])
  const [movements, setMovements] = useState<ApiMovement[]>([])
  const [stockLevels, setStockLevels] = useState<ApiStockLevel[]>([])
  const [products, setProducts] = useState<Map<string, ApiProduct>>(new Map())
  const [warehouses, setWarehouses] = useState<Map<string, ApiWarehouse>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [notifResp, alertResp, movResp, lvlResp, prodResp, whResp] = await Promise.all([
        http.get<ApiNotification[]>('/notifications?limit=50'),
        http.get<ApiAlert[]>('/alerts?status=active&limit=50'),
        http.get<ApiMovement[]>('/stock/movements?limit=15'),
        http.get<ApiStockLevel[]>('/stock?limit=500'),
        http.get<ApiProduct[]>('/products?limit=500'),
        http.get<ApiWarehouse[]>('/warehouses'),
      ])
      setSystem(Array.isArray(notifResp.data) ? notifResp.data : [])
      setAlerts(Array.isArray(alertResp.data) ? alertResp.data : [])
      setMovements(Array.isArray(movResp.data) ? movResp.data : [])
      setStockLevels(Array.isArray(lvlResp.data) ? lvlResp.data : [])
      const prodMap = new Map<string, ApiProduct>()
      for (const p of Array.isArray(prodResp.data) ? prodResp.data : [])
        prodMap.set(String(p.id), p)
      setProducts(prodMap)
      const whMap = new Map<string, ApiWarehouse>()
      for (const w of Array.isArray(whResp.data) ? whResp.data : []) whMap.set(String(w.id), w)
      setWarehouses(whMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void load()
  }, [load])

  const showAlerts = tab === 'all' || tab === 'alerts'
  const showMovement = tab === 'all' || tab === 'movement'
  const showSystem = tab === 'all' || tab === 'system'

  const onMarkAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/notifications/mark-all-read', {})
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read')
    } finally {
      setMarking(false)
    }
  }

  // Map alerts → LowStockAlertItem with the matching stock level + threshold
  const alertItems: LowStockAlertItem[] = useMemo(() => {
    return alerts.map((a) => {
      const product = a.product_id ? products.get(String(a.product_id)) : undefined
      const wh = a.warehouse_id ? warehouses.get(String(a.warehouse_id)) : undefined
      const level = stockLevels.find(
        (s) =>
          String(s.product_id) === String(a.product_id) &&
          String(s.warehouse_id) === String(a.warehouse_id),
      )
      const quantity = level ? Number(level.quantity) : 0
      const threshold = product?.low_stock_threshold ?? 10
      return {
        id: String(a.id),
        productName: product?.name ?? 'Unknown product',
        sku: product?.sku ?? '—',
        warehouse: wh?.name,
        quantity,
        threshold,
        href: product?.id ? `/products/${product.id}` : undefined,
      }
    })
  }, [alerts, products, warehouses, stockLevels])

  const movementEntries: MovementEntry[] = useMemo(() => {
    return movements.map((m) => {
      const product = m.product_id ? products.get(String(m.product_id)) : undefined
      const wh = m.warehouse_id ? warehouses.get(String(m.warehouse_id)) : undefined
      return {
        id: String(m.id),
        kind: reasonToKind(m.reason, Number(m.quantity_change)),
        productName: product?.name ?? '—',
        sku: product?.sku ?? '—',
        quantity: Number(m.quantity_change),
        warehouse: wh?.name,
        reason: m.reference ?? m.reason,
        occurredAt: m.created_at ?? new Date().toISOString(),
      }
    })
  }, [movements, products, warehouses])

  const onAlertReorder = async (alert: LowStockAlertItem) => {
    // Acknowledging the alert as a quick "I see this, will reorder" action.
    try {
      await http.post(`/alerts/${alert.id}/acknowledge`)
      track({ name: 'alert.acknowledged', properties: { id: alert.id, sku: alert.sku } })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert')
    }
  }

  const onSystemClick = async (n: ApiNotification) => {
    if (n.read) return
    try {
      await http.post(`/notifications/${n.id}/read`, { read: true })
      setSystem((cur) => cur.map((row) => (row.id === n.id ? { ...row, read: true } : row)))
    } catch (_error) {
      // best-effort: marking a notification read is non-critical; UI already reflects the click
    }
  }

  return (
    <div className={cm.stack(6)}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              {},
              {
                defaultValue:
                  'Low-stock alerts, ledger movements, and system events all in one place.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={marking || system.every((s) => s.read)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="done_all">
            done_all
          </span>
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            'rounded-lg bg-error-container text-on-error-container px-4 py-3 text-sm',
          )}
        >
          {error}
        </div>
      )}

      <nav
        className={cm.cn(
          cm.flex({ gap: 'xs' }),
          'rounded-lg border border-outline-variant bg-surface-container-lowest p-1 w-fit',
        )}
      >
        {(['all', 'alerts', 'movement', 'system'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-md uppercase tracking-wider transition-colors',
              tab === option
                ? 'bg-primary text-white shadow'
                : 'text-on-surface-variant hover:bg-background-secondary',
            )}
          >
            {t(
              `notifications.tabs.${option}`,
              {},
              { defaultValue: option[0].toUpperCase() + option.slice(1) },
            )}
          </button>
        ))}
      </nav>

      {/* [&>*]:min-w-0 — grid items otherwise propagate truncated min-content
          past the 390px viewport. */}
      <div className={cm.cn('grid lg:grid-cols-2 gap-6 [&>*]:min-w-0')}>
        {showAlerts && (
          <section
            className={cm.cn(
              cm.stack(4),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
            )}
          >
            <header>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('notifications.alerts.eyebrow', {}, { defaultValue: 'Reorder queue' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('notifications.alerts.title', {}, { defaultValue: 'Low-stock alerts' })}
              </h2>
            </header>
            <div className={cm.stack(3)}>
              {loading && (
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              )}
              {!loading && alertItems.length === 0 && (
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'notifications.alerts.empty',
                    {},
                    { defaultValue: 'No active low-stock alerts.' },
                  )}
                </p>
              )}
              {alertItems.map((alert) => (
                <LowStockAlertCard
                  key={alert.id}
                  alert={alert}
                  actionLabel={t('notifications.acknowledge', {}, { defaultValue: 'Acknowledge' })}
                  onAction={onAlertReorder}
                />
              ))}
            </div>
          </section>
        )}
        {showAlerts && alertItems.length > 0 && (
          <section
            className={cm.cn(
              cm.stack(3),
              cm.sp('p', 6),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
            )}
            data-mol-id="subscribed-watchlist"
          >
            <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-on-surface-variant text-lg')}
                >
                  visibility
                </span>
                {t('notifications.watchlist.title', {}, { defaultValue: 'Subscribed Watchlist' })}
              </h2>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-surface-container text-on-surface-variant uppercase tracking-wide',
                )}
              >
                {t(
                  'notifications.watchlist.count',
                  { count: alertItems.length },
                  { defaultValue: '{{count}} SKUs' },
                )}
              </span>
            </header>
            <ul className={cm.stack(2)}>
              {alertItems.slice(0, 6).map((alert) => {
                const depleted = alert.quantity < alert.threshold
                const close = !depleted && alert.quantity <= alert.threshold * 1.2
                return (
                  <li
                    key={`watch-${alert.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg border border-outline-variant/40',
                    )}
                  >
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono text-primary',
                          cm.sp('mb', 1),
                        )}
                      >
                        {alert.sku}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface truncate')}>
                        {alert.productName}
                        {alert.warehouse ? (
                          <span className={cm.cn('text-on-surface-variant')}>
                            {' '}
                            · {alert.warehouse}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className={cm.cn('text-right shrink-0')}>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant tabular-nums',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t('notifications.watchlist.min', {}, { defaultValue: 'Min' })}:{' '}
                        {alert.threshold}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'tabular-nums',
                          depleted ? 'text-error' : close ? 'text-warning' : 'text-on-surface',
                        )}
                      >
                        {alert.quantity}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {showMovement && (
          <section
            className={cm.cn(
              cm.stack(2),
              'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden',
            )}
          >
            <header className={cm.cn(cm.sp('px', 6), cm.sp('pt', 6))}>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
                )}
              >
                {t('notifications.movement.eyebrow', {}, { defaultValue: 'Ledger updates' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('notifications.movement.title', {}, { defaultValue: 'Stock movements' })}
              </h2>
            </header>
            <div className={cm.cn('divide-y divide-outline-variant/40')}>
              {loading && (
                <p className={cm.cn('text-sm text-on-surface-variant px-6 py-4')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              )}
              {!loading && movementEntries.length === 0 && (
                <p className={cm.cn('text-sm text-on-surface-variant px-6 py-4')}>
                  {t(
                    'notifications.movement.empty',
                    {},
                    { defaultValue: 'No stock movements yet.' },
                  )}
                </p>
              )}
              {movementEntries.map((entry) => (
                <MovementRow key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showSystem && (
        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('notifications.system.eyebrow', {}, { defaultValue: 'System' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('notifications.system.title', {}, { defaultValue: 'Console events' })}
            </h2>
          </header>
          <ul className={cm.stack(3)}>
            {loading && (
              <li className={cm.cn('text-sm text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </li>
            )}
            {!loading && system.length === 0 && (
              <li className={cm.cn('text-sm text-on-surface-variant')}>
                {t('notifications.system.empty', {}, { defaultValue: 'No system events.' })}
              </li>
            )}
            {system.map((event) => {
              const tone = SYSTEM_TONE[event.icon] ?? SYSTEM_TONE.notifications
              return (
                <li key={event.id}>
                  {/* Whole-row mark-as-read target; a real <button> cannot wrap this
                      flow content, so the row is a keyboard-operable button widget. */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-disabled={event.read}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      cm.sp('p', 4),
                      'rounded-xl border bg-background-secondary cursor-pointer hover:bg-surface',
                      event.read ? 'border-outline-variant/40 opacity-70' : 'border-primary/40',
                    )}
                    onClick={() => void onSystemClick(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void onSystemClick(event)
                      }
                    }}
                  >
                    <span
                      className={cm.cn(
                        'h-9 w-9 rounded-full',
                        cm.flex({ align: 'center', justify: 'center' }),
                      )}
                      style={{ backgroundColor: tone.bg, color: tone.text }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[18px]')}
                        data-icon={event.icon}
                      >
                        {event.icon || 'notifications'}
                      </span>
                    </span>
                    <div className={cm.cn('flex-1')}>
                      <p className={cm.cn('text-sm font-bold text-on-surface')}>{event.title}</p>
                      <p className={cm.cn('text-xs text-on-surface-variant mt-1')}>{event.body}</p>
                    </div>
                    <span
                      className={cm.cn(
                        'text-[10px] uppercase tracking-wider text-on-surface-variant',
                      )}
                    >
                      {formatRelative(event.created_at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default Notifications
