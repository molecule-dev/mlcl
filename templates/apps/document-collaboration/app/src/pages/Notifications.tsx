import { useEffect, useMemo, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuillonActivityRow, type QuillonActivityType } from '../components/QuillonActivityRow.js'
import { unwrapList } from '../lib/unwrap.js'

interface NotificationRow {
  id: string
  type: string
  actor: string
  description: string
  href: string | null
  unread: boolean
  created_at: string
}

const KNOWN_TYPES: ReadonlySet<QuillonActivityType> = new Set([
  'comment_added',
  'comment_resolved',
  'mention',
  'shared',
  'edited',
  'suggestion',
  'restored',
  'system_message',
])

function asActivityType(t: string): QuillonActivityType {
  return KNOWN_TYPES.has(t as QuillonActivityType) ? (t as QuillonActivityType) : 'system_message'
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all')
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await http.get('/api/notifications')
      setItems(unwrapList<NotificationRow>(res))
    } catch (error) {
      logError('notifications.load', error)
      setError(
        t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === 'unread') return n.unread
      if (filter === 'mentions') return n.type === 'mention'
      return true
    })
  }, [items, filter])

  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items])

  const markAllRead = async (): Promise<void> => {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (error) {
      logError('notifications.markAllRead', error)
      setError(
        t('notifications.markAllFailed', {}, { defaultValue: 'Could not mark all as read.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-6')}
      data-testid="notifications-root"
    >
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('notifications.eyebrow', {}, { defaultValue: 'Studio activity' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p
            className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}
            data-testid="notifications-unread-count"
          >
            {t(
              'notifications.subtitle',
              { count: unreadCount },
              {
                defaultValue:
                  '{{count}} unread · comments, mentions, share invites, and suggestion requests.',
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
            'rounded-full border border-outline text-on-surface hover:bg-surface-container disabled:opacity-50',
          )}
          data-testid="notifications-mark-all-read"
        >
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'error' }),
            'rounded-xl bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      <nav className={cm.flex({ align: 'center', gap: 'sm' })}>
        {(['all', 'unread', 'mentions'] as const).map((opt) => {
          const isActive = filter === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              data-testid={`notifications-filter-${opt}`}
            >
              {t(
                `notifications.filter.${opt}`,
                {},
                { defaultValue: opt === 'all' ? 'All' : opt === 'unread' ? 'Unread' : 'Mentions' },
              )}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('notifications.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
          data-testid="notifications-empty"
        >
          {t('notifications.empty', {}, { defaultValue: 'You\u2019re all caught up.' })}
        </p>
      ) : (
        <ol
          className={cm.cn(
            'space-y-1 rounded-2xl bg-surface-container-lowest p-2 ring-1 ring-outline-variant',
          )}
          data-testid="notifications-list"
        >
          {filtered.map((n) => (
            <li key={n.id} data-testid={`notification-item-${n.id}`}>
              <QuillonActivityRow
                id={n.id}
                type={asActivityType(n.type)}
                actor={n.actor}
                description={n.description}
                createdAt={n.created_at}
                href={n.href ?? undefined}
                unread={n.unread}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default Notifications
