import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface NotificationEvent {
  id: string
  kind: string
  icon: string
  actor_name: string
  actor_initial: string
  title: string
  body: string
  occurred_at: string
  link: string
  unread: boolean
}

type Translate = ReturnType<typeof useTranslation>['t']

function fmtRelative(iso: string, t: Translate): string {
  const date = new Date(iso)
  const diffH = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH }, { defaultValue: '{{hours}}h ago' })
  return t('time.daysAgo', { days: Math.floor(diffH / 24) }, { defaultValue: '{{days}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<NotificationEvent>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const unreadCount = items.filter((i) => i.unread).length

  async function markAllRead() {
    setMarking(true)
    setError(null)
    try {
      await http.post('/api/notifications/read-all', {})
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (_error) {
      // Error surfaced to the user via setError below; no additional logging needed.
      setError(
        t(
          'notifications.markFailed',
          {},
          { defaultValue: 'Failed to mark notifications as read.' },
        ),
      )
    } finally {
      setMarking(false)
    }
  }

  async function markOneRead(id: string) {
    try {
      await http.patch(`/api/notifications/${id}`, { read: true })
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    } catch (_error) {
      // Silently no-op for individual click; the user can use mark-all
      // to recover if read-receipts fall behind.
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'notifications.subheading',
              { count: unreadCount },
              { defaultValue: '{{count}} unread — PTO, documents, mentions, and anniversaries.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={marking || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50',
          )}
        >
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</p>
        ) : items.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: 'You’re all caught up.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-outline-variant/20')}>
            {items.map((n) => (
              <li
                key={n.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'md' }),
                  'hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark material-symbols-outlined text-[20px] shrink-0',
                  )}
                  aria-hidden="true"
                >
                  {n.icon}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <Link
                    to={n.link || '/dashboard'}
                    onClick={() => n.unread && markOneRead(n.id)}
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface hover:text-primary transition-colors',
                    )}
                  >
                    {n.title}
                  </Link>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      cm.textSize('xs'),
                      'leading-relaxed text-on-surface-variant',
                    )}
                  >
                    {n.body}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {fmtRelative(n.occurred_at, t)} · {n.actor_name}
                  </p>
                </div>
                {n.unread ? (
                  <span
                    aria-hidden="true"
                    className={cm.cn('mt-2 inline-block h-2 w-2 rounded-full bg-primary')}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
