import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ApiNotification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read: boolean
  created_at: string
}

const TYPE_META: Record<string, { icon: string; tint: string }> = {
  helpful: { icon: 'thumb_up', tint: 'text-accent-on-surface bg-accent/10' },
  follow: { icon: 'group_add', tint: 'text-primary bg-primary/10' },
  reply: { icon: 'forum', tint: 'text-info bg-info/10' },
  mention: { icon: 'alternate_email', tint: 'text-warning bg-warning/10' },
  restaurant_update: { icon: 'restaurant_menu', tint: 'text-success bg-success-light' },
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffH = (Date.now() - d.getTime()) / 3_600_000
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${Math.round(diffH)}h ago`
  if (diffH < 24 * 7) return `${Math.round(diffH / 24)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications?limit=100')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<ApiNotification>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const unreadCount = items.filter((n) => !n.read).length

  async function markAllRead() {
    if (marking || unreadCount === 0) return
    setMarking(true)
    const previous = items
    // Optimistic flip — server returns the count, but the client already
    // knows what it expects (every unread → read). Rollback on failure.
    setItems((cur) => cur.map((n) => (n.read ? n : { ...n, read: true })))
    try {
      await http.patch('/api/notifications/mark-all-read', {})
    } catch (err) {
      console.error('[Notifications] markAllRead failed', err)
      setItems(previous)
    } finally {
      setMarking(false)
    }
  }

  return (
    <main className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 8),
        )}
      >
        <div>
          <p
            data-testid="notifications-eyebrow"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t('common.countNew', { count: unreadCount }, { defaultValue: '{{count}} new' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {t('nav.activity', {}, { defaultValue: 'Activity' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={marking || unreadCount === 0}
          data-testid="notifications-mark-all"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {loading ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
          {t('nav.loadingNotifications', {}, { defaultValue: 'Loading notifications…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-error')}>{error}</p>
      ) : items.length === 0 ? (
        <p
          data-testid="notifications-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant',
          )}
        >
          {t('notifications.empty', {}, { defaultValue: 'You’re all caught up.' })}
        </p>
      ) : (
        <ul
          data-testid="notifications-list"
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/40',
          )}
        >
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.restaurant_update!
            const node = (
              <span
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ align: 'start', gap: 'md' }),
                  'transition-colors',
                  n.read ? 'bg-surface' : 'bg-primary/5',
                  'block',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'shrink-0',
                    meta.tint,
                  )}
                >
                  <span
                    className={'material-symbols-outlined text-base'}
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {meta.icon}
                  </span>
                </span>
                <span className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'leading-snug text-on-surface block',
                    )}
                  >
                    {n.title}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-snug block',
                    )}
                  >
                    {n.body}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant block')}>
                    {formatRelative(n.created_at)}
                  </span>
                </span>
                {!n.read ? (
                  <span
                    className={cm.cn(cm.w(2), cm.h(2), 'rounded-full bg-primary mt-2 shrink-0')}
                    aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                  />
                ) : null}
              </span>
            )
            return (
              <li
                key={n.id}
                data-testid={`notification-${n.id}`}
                data-read={n.read ? 'true' : 'false'}
              >
                {n.href ? (
                  <Link to={n.href} className={'block'}>
                    {node}
                  </Link>
                ) : (
                  node
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
