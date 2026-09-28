import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NotificationRow {
  id: string
  /** Server canonical type tag — `kind` in the schema. */
  kind?: string
  /** Optional UI-friendly type override (older fixtures used `type`). */
  type?: string
  /** Optional title — backend may store the title inside `body` only. */
  title?: string
  body?: string
  read?: boolean
  link?: string
  occurred_at?: string
  created_at?: string
}

const ICON_BY_TYPE: Record<string, string> = {
  match: 'auto_awesome',
  application: 'send',
  interview: 'event',
  offer: 'celebration',
  rejected: 'cancel',
  job: 'work',
  default: 'notifications',
}

function iconFor(type?: string): string {
  if (!type) return ICON_BY_TYPE.default
  return ICON_BY_TYPE[type] ?? ICON_BY_TYPE.default
}

function relativeTime(t: TranslateFunction, iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('timeAgo.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('timeAgo.hours', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return t('timeAgo.days', { count: Math.floor(diffH / 24) }, { defaultValue: '{{count}}d ago' })
}

function deriveTitle(t: TranslateFunction, n: NotificationRow): string {
  if (n.title) return n.title
  const kind = n.kind ?? n.type
  if (!kind) return t('notifications.newActivity', {}, { defaultValue: 'New activity' })
  const pretty = kind
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
  return pretty
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications?limit=50')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<NotificationRow>(res))
      })
      .catch((err) => {
        if (cancelled) return
        const message =
          err instanceof Error
            ? err.message
            : t(
                'nav.couldNotLoadNotifications',
                {},
                { defaultValue: 'Could not load notifications.' },
              )
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const markRead = useCallback(
    async (id: string) => {
      setBusy(true)
      setError(null)
      const previous = items
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      try {
        await http.put(`/api/notifications/${id}/read`, {})
        track({ name: 'notification.read', properties: { notification_id: id } })
      } catch (err) {
        setItems(previous)
        const message =
          err instanceof Error
            ? err.message
            : t(
                'notifications.markReadError',
                {},
                { defaultValue: 'Could not mark notification as read.' },
              )
        setError(message)
      } finally {
        setBusy(false)
      }
    },
    [http, items, t],
  )

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return
    setBusy(true)
    setError(null)
    const previous = items
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await http.put('/api/notifications/read-all', {})
      track({ name: 'notification.all_read', properties: { count: unreadCount } })
    } catch (err) {
      setItems(previous)
      const message =
        err instanceof Error
          ? err.message
          : t('notifications.markAllReadError', {}, { defaultValue: 'Could not mark all as read.' })
      setError(message)
    } finally {
      setBusy(false)
    }
  }, [http, items, t, unreadCount])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </p>
        <div
          className={cm.cn(
            cm.sp('mt', 2),
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <button
            type="button"
            onClick={markAllRead}
            disabled={busy || unreadCount === 0}
            className={cm.cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest',
              unreadCount === 0
                ? 'border border-outline-variant/40 text-on-surface-variant cursor-not-allowed'
                : 'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
              busy ? 'opacity-60 cursor-wait' : '',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[16px]')}>
              done_all
            </span>
            {t(
              'notifications.markAllRead',
              { count: unreadCount },
              {
                defaultValue: unreadCount > 0 ? `Mark all read (${unreadCount})` : 'All caught up',
              },
            )}
          </button>
        </div>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'notifications.subheading',
            {},
            {
              defaultValue:
                'Application updates, interview invites, fresh matches \u2014 newest first.',
            },
          )}
        </p>
        {error ? (
          <p
            role="alert"
            className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-error font-medium')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        {loading ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('notifications.loading', {}, { defaultValue: 'Loading\u2026' })}
          </p>
        ) : items.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'notifications.empty',
              {},
              { defaultValue: 'You\u2019re all caught up. Quiet day.' },
            )}
          </p>
        ) : (
          <ol className={cm.cn('divide-y divide-outline-variant/20')}>
            {items.map((n) => {
              const ts = n.occurred_at ?? n.created_at
              const typeKey = n.kind ?? n.type
              const title = deriveTitle(t, n)
              return (
                <li
                  key={n.id}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    cm.flex({ align: 'start', gap: 'md' }),
                    n.read ? '' : cm.cn(cm.accentCard({ tone: 'primary' }), 'bg-primary/[0.03]'),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary material-symbols-outlined text-[20px]',
                    )}
                  >
                    {iconFor(typeKey)}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        className={cm.cn(
                          'text-sm font-bold tracking-tight text-on-surface hover:text-primary transition-colors',
                        )}
                      >
                        {title}
                      </Link>
                    ) : (
                      <p className={cm.cn('text-sm font-bold tracking-tight text-on-surface')}>
                        {title}
                      </p>
                    )}
                    {n.body ? (
                      <p className={cm.cn('mt-1 text-sm leading-relaxed text-on-surface-variant')}>
                        {n.body}
                      </p>
                    ) : null}
                    <p
                      className={cm.cn(
                        'mt-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant tabular-nums',
                      )}
                    >
                      {relativeTime(t, ts)}
                    </p>
                  </div>
                  {!n.read ? (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      disabled={busy}
                      className={cm.cn(
                        'shrink-0 self-center rounded-full border border-outline-variant/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary hover:border-primary transition-colors',
                        busy ? 'opacity-60 cursor-wait' : '',
                      )}
                    >
                      {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
