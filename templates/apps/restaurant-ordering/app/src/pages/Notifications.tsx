import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiNotification {
  id: string
  type: string
  title?: string
  body?: string
  payload?: Record<string, unknown> & { title?: string; body?: string }
  created_at: string
  read_at?: string | null
}

// The molecule HttpClient wraps responses as `{ data: <body> }`. Our list
// endpoint then returns `{ data: ApiNotification[], unreadCount, total }`.
// `unwrapList` peels both layers and returns the actual notifications array;
// don't cast `http.get(...)` directly to a list shape — that produces a
// nested object the page can't iterate over and crashes the render tree.
function unwrapMeta(res: unknown): { unreadCount?: number; total?: number } {
  if (res && typeof res === 'object' && 'data' in res) {
    const inner = (res as { data?: unknown }).data
    if (inner && typeof inner === 'object') {
      const meta = inner as { unreadCount?: number; total?: number }
      return { unreadCount: meta.unreadCount, total: meta.total }
    }
  }
  return {}
}

const KIND_THEME: Record<string, { tint: string; icon: string }> = {
  rush: { tint: 'text-error', icon: 'priority_high' },
  order_ready: { tint: 'text-success', icon: 'restaurant_menu' },
  kitchen_alert: { tint: 'text-warning', icon: 'soup_kitchen' },
  low_stock: { tint: 'text-warning', icon: 'inventory_2' },
  mention: { tint: 'text-tertiary', icon: 'alternate_email' },
  reservation: { tint: 'text-primary', icon: 'event_seat' },
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch (_error) {
    // invalid ISO string — return raw value as fallback
    return iso
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<ApiNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/notifications')
      const list = unwrapList<ApiNotification>(res)
      const meta = unwrapMeta(res)
      setItems(list)
      setUnread(meta.unreadCount ?? list.filter((n) => !n.read_at).length)
    } catch (error) {
      logError('notifications.load', error)
      setError(
        t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const markAllRead = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      await reload()
    } catch (error) {
      logError('notifications.markAllRead', error)
      setError(t('notifications.markError', {}, { defaultValue: 'Could not mark all read.' }))
    } finally {
      setBusy(false)
    }
  }, [http, reload, t])

  const markRead = useCallback(
    async (id: string) => {
      setBusy(true)
      try {
        await http.put(`/api/notifications/${id}/read`, {})
        await reload()
      } catch (error) {
        logError('notifications.markRead', error)
        setError(t('notifications.markError', {}, { defaultValue: 'Could not mark read.' }))
      } finally {
        setBusy(false)
      }
    },
    [http, reload, t],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('common.countUnread', { count: unread }, { defaultValue: '{{count}} unread' })}
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy}
            data-testid="notifications-mark-all"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        ) : null}
      </header>

      {error ? (
        <p
          data-testid="notifications-error"
          className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <p
          data-testid="notifications-empty"
          className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('notifications.empty', {}, { defaultValue: 'No notifications. The kitchen is calm.' })}
        </p>
      ) : (
        <ul
          className={cm.cn(
            cm.stack(0),
            'rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden',
          )}
        >
          {items.map((n) => {
            const theme = KIND_THEME[n.type] ?? {
              tint: 'text-on-surface-variant',
              icon: 'notifications',
            }
            const read = !!n.read_at
            return (
              <li
                key={n.id}
                data-testid={`notifications-item-${n.id}`}
                className={cm.cn(
                  'border-b border-outline-variant/40 last:border-0 hover:bg-surface-container-low transition-colors',
                  read ? 'opacity-70' : 'bg-primary/5',
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                    cm.cursorPointer,
                  )}
                  onClick={() => {
                    if (!read) void markRead(n.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!read) void markRead(n.id)
                    }
                  }}
                >
                  <span
                    className={cm.cn(
                      cm.sp('p', 3),
                      cm.roundedFull,
                      'bg-surface shadow-sm',
                      theme.tint,
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      {theme.icon}
                    </span>
                  </span>
                  <div className={cm.flex1}>
                    <div
                      className={cm.flex({
                        align: 'baseline',
                        justify: 'between',
                        wrap: 'wrap',
                        gap: 'sm',
                      })}
                    >
                      <h3
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'font-display',
                        )}
                      >
                        {n.title ??
                          n.payload?.title ??
                          t(
                            `notifications.type.${n.type}`,
                            {},
                            { defaultValue: n.type.replace(/_/g, ' ') },
                          )}
                      </h3>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'tabular-nums text-on-surface-variant')}
                      >
                        {fmtTime(n.created_at)}
                      </span>
                    </div>
                    {(n.body ?? n.payload?.body) ? (
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant',
                        )}
                      >
                        {n.body ?? n.payload?.body}
                      </p>
                    ) : null}
                  </div>
                  {!read && (
                    <span
                      className={cm.cn(
                        cm.w(2),
                        cm.h(2),
                        cm.roundedFull,
                        cm.sp('mt', 2),
                        'bg-primary',
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
