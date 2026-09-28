import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Notification {
  id: string
  category: 'pay_run' | 'tax' | 'integration' | 'mention'
  title: string
  body: string
  href: string | null
  unread: boolean
  created_at: string
}

const CATEGORY_STYLES: Record<Notification['category'], { icon: string; tint: string }> = {
  pay_run: { icon: 'event_available', tint: 'text-primary    bg-primary/10' },
  tax: { icon: 'receipt_long', tint: 'text-secondary  bg-secondary/10' },
  integration: { icon: 'sync_alt', tint: 'text-tertiary   bg-tertiary/10' },
  mention: { icon: 'forum', tint: 'text-info       bg-info/10' },
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [busy, setBusy] = useState(false)

  const reload = () =>
    http
      .get('/api/notifications')
      .then((res) => setNotifications(unwrapList<Notification>(res)))
      .catch(() => setNotifications([]))

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setNotifications(unwrapList<Notification>(res))
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const markAllRead = async () => {
    if (busy) return
    setBusy(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      await reload()
      // banner planned for v2 — leave the list as-is on failure
    } catch (_error) {
      // surface via banner in v2 — for now just leave the list as-is.
    } finally {
      setBusy(false)
    }
  }

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    try {
      await http.patch(`/api/notifications/${id}/read`, {})
      // optimistic update — next reload will reconcile with server state
    } catch (_error) {
      // optimistic — next reload will fix it.
    }
  }

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('common.countUnread', { count: unreadCount }, { defaultValue: '{{count}} unread' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              {},
              {
                defaultValue:
                  'Approvals, deadlines, integration alerts, and mentions in one place.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={busy || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            cm.flex({ align: 'center', gap: 'xs' }),
            'border border-outline-variant hover:bg-surface-container-low disabled:opacity-50',
          )}
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
            mark_email_read
          </span>
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {notifications.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: 'You\u2019re all caught up.' })}
        </p>
      ) : (
        <ul className={cm.stack(2)}>
          {notifications.map((n) => {
            const style = CATEGORY_STYLES[n.category] ?? CATEGORY_STYLES.mention
            return (
              <li
                key={n.id}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest shadow-sm',
                  n.unread ? cm.accentCard({ tone: 'primary' }) : '',
                )}
              >
                <span
                  className={cm.cn(cm.sp('p', 2), cm.roundedFull, cm.shrink0, style.tint)}
                  aria-hidden="true"
                >
                  <span className={cm.cn(`material-symbols-outlined text-xl`)}>{style.icon}</span>
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
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
                        cm.fontWeight('bold'),
                        'text-on-surface',
                      )}
                    >
                      {n.title}
                    </h3>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {n.body}
                  </p>
                  <div className={cm.flex({ gap: 'sm', align: 'center', wrap: 'wrap' })}>
                    {n.href ? (
                      <Link
                        to={n.href}
                        onClick={() => {
                          if (n.unread) void markRead(n.id)
                        }}
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 3),
                          cm.fontWeight('bold'),
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'text-primary hover:underline',
                        )}
                      >
                        {t('notifications.view', {}, { defaultValue: 'View' })}
                        <span
                          className={cm.cn(`material-symbols-outlined text-base`)}
                          aria-hidden="true"
                        >
                          arrow_forward
                        </span>
                      </Link>
                    ) : null}
                    {n.unread ? (
                      <button
                        type="button"
                        onClick={() => {
                          void markRead(n.id)
                        }}
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 3),
                          cm.fontWeight('semibold'),
                          'text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        {t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
