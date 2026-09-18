import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type PriceDropEvent, PriceDropFeed } from '../components/PriceDropFeed.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiNotification {
  id: string
  type: string
  payload: {
    product_id?: string
    product_name?: string
    retailer?: string
    old_price_cents?: number
    new_price_cents?: number
  }
  read_at: string | null
  created_at: string
}

const FILTERS = [
  { key: 'all', label: 'All', glyph: 'inbox' },
  { key: 'drop', label: 'Drops', glyph: 'trending_down' },
  { key: 'rise', label: 'Rises', glyph: 'trending_up' },
  { key: 'alert', label: 'Alerts', glyph: 'notifications_active' },
  { key: 'restock', label: 'Back in stock', glyph: 'inventory' },
] as const

const toEvent = (n: ApiNotification): PriceDropEvent => ({
  id: n.id,
  product_id: n.payload?.product_id ?? '',
  product_name: n.payload?.product_name ?? 'Unknown product',
  retailer: n.payload?.retailer ?? APP_NAME,
  kind:
    n.type === 'drop' || n.type === 'alert' || n.type === 'rise' || n.type === 'restock'
      ? (n.type as PriceDropEvent['kind'])
      : 'drop',
  old_price_cents: n.payload?.old_price_cents ?? 0,
  new_price_cents: n.payload?.new_price_cents ?? 0,
  ts: n.created_at,
})

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [events, setEvents] = useState<PriceDropEvent[]>([])
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get('/api/notifications?limit=50')
        if (cancelled) return
        const list = unwrapList<ApiNotification>(res)
        setEvents(list.map(toEvent))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const markAllRead = async () => {
    try {
      await http.post('/api/notifications/mark-all-read', {})
    } catch (_error) {
      // non-fatal: mark-all-read is a best-effort UI action; feed remains readable
    }
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter)

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
      data-test="notifications-page"
    >
      <header
        className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </p>
          <h1
            className={cm.cn(
              'mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('notifications.heading', {}, { defaultValue: 'Recent price activity' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              'text-on-surface-variant max-w-3xl',
            )}
          >
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Every drop, restock, and alert from your watchlist — newest first. Tap a row to jump to the product.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-test="notifications-mark-read"
          onClick={() => void markAllRead()}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-full uppercase tracking-wider bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <div
        className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}
        data-test="notifications-filters"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            data-test={`notifications-filter-${f.key}`}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-wider transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              {f.glyph}
            </span>
            {t(`notifications.filter.${f.key}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          data-test="notifications-loading"
          className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('notifications.loading', {}, { defaultValue: 'Loading activity…' })}
        </div>
      ) : (
        <div data-test="notifications-feed">
          <PriceDropFeed
            events={filtered}
            emptyLabel={t(
              'notifications.empty',
              { appName: APP_NAME },
              { defaultValue: 'Nothing yet — {{appName}} will fill this up shortly.' },
            )}
          />
        </div>
      )}
    </div>
  )
}
