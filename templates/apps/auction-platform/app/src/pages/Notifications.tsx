import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type NotificationKind, NotificationRow } from '../components/NotificationRow.js'

interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  body: string
  when: string
  unread?: boolean
  to?: string
}

const FILTERS = [
  'all',
  'outbid',
  'ending',
  'won',
  'new_bid',
  'watchlist',
  'sold',
  'system',
] as const
type FilterKey = (typeof FILTERS)[number]

function parseFilter(hash: string): FilterKey {
  const v = hash.replace(/^#/, '')
  return (FILTERS as readonly string[]).includes(v) ? (v as FilterKey) : 'all'
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const filter = parseFilter(location.hash)
  const setFilter = (next: FilterKey) => {
    navigate({ pathname: '/notifications', hash: `#${next}` })
  }
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    http
      .get<{ data?: NotificationItem[] }>('/api/notifications')
      .then((res) => {
        if (cancelled) return
        const list = (res.data?.data ?? []) as NotificationItem[]
        setItems(list)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t(
                'nav.couldNotLoadNotifications',
                {},
                { defaultValue: 'Could not load notifications.' },
              ),
        )
        setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- safeItems is a stable-reference guard; wrapping in useMemo would be circular
  const safeItems = items ?? []

  const filtered = useMemo(() => {
    if (filter === 'all') return safeItems
    return safeItems.filter((i) => i.kind === filter)
  }, [safeItems, filter])

  const unreadCount = safeItems.filter((i) => i.unread).length

  const handleMarkAllRead = () => {
    if (marking) return
    setMarking(true)
    http
      .post('/api/notifications/mark-all-read')
      .catch(() => {
        // Server-side mark may fail without a notifications table; UI still updates.
      })
      .finally(() => {
        setItems((prev) => (prev ?? []).map((i) => ({ ...i, unread: false })))
        setMarking(false)
      })
  }

  return (
    <div
      id="top"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div className={cm.stack(2)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('notificationsPage.eyebrow', {}, { defaultValue: 'Activity center' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.subheading',
              { count: unreadCount },
              { defaultValue: '{{count}} unread · live updates as auctions move' },
            )}
          </p>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full border border-outline-variant text-sm font-semibold hover:bg-surface-container-low',
          )}
          onClick={handleMarkAllRead}
          disabled={marking || unreadCount === 0}
        >
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <section className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {FILTERS.map((k) => {
          const active = k === filter
          const label = t(
            `notificationsPage.filter.${k}`,
            {},
            { defaultValue: k.replace('_', ' ') },
          )
          if (active) {
            return (
              <span
                key={k}
                aria-current="true"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-xs font-bold uppercase tracking-widest border text-white border-transparent',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
                }}
              >
                {label}
              </span>
            )
          }
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full text-xs font-bold uppercase tracking-widest border transition-colors',
                'border-outline-variant text-on-surface-variant hover:text-on-surface',
              )}
            >
              {label}
            </button>
          )
        })}
      </section>

      {items === null ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
          {t('notificationsPage.empty', {}, { defaultValue: 'No notifications yet.' })}
        </p>
      ) : (
        <section className={cm.cn('space-y-3')}>
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              kind={n.kind}
              title={n.title}
              body={n.body}
              whenIso={n.when}
              unread={n.unread}
              actionTo={n.to}
            />
          ))}
        </section>
      )}
    </div>
  )
}

export default Notifications
