import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { t as translate } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type NotificationKind =
  | 'mention'
  | 'comment'
  | 'review_requested'
  | 'page_change'
  | 'shared'
  | 'article_published'
  | 'system'

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  payload: {
    title?: string
    actor?: string
    description?: string
    href?: string
    [k: string]: unknown
  } | null
  read_at: string | null
  created_at: string
}

const ICON: Record<NotificationKind, string> = {
  mention: 'alternate_email',
  comment: 'chat_bubble',
  review_requested: 'task_alt',
  page_change: 'edit',
  shared: 'share',
  article_published: 'campaign',
  system: 'info',
}

const TONE: Record<NotificationKind, string> = {
  mention: 'bg-primary/15 text-primary',
  comment: 'bg-warning/15 text-warning',
  review_requested: 'bg-success/15 text-success',
  page_change: 'bg-info/15 text-info',
  shared: 'bg-tertiary/15 text-tertiary',
  article_published: 'bg-info/15 text-info',
  system: 'bg-surface-container text-on-surface-variant',
}

function fmtRelative(iso: string): string {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return translate('common.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24)
    return translate('time.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  return translate(
    'time.daysAgo',
    { count: Math.floor(diffH / 24) },
    { defaultValue: '{{count}}d ago' },
  )
}

function defaultDescription(n: NotificationRow): string {
  const p = n.payload ?? {}
  if (p.description && typeof p.description === 'string') return p.description
  const title = typeof p.title === 'string' ? p.title : ''
  switch (n.kind) {
    case 'article_published':
      return title
        ? translate(
            'notifications.desc.publishedTitled',
            { title },
            { defaultValue: 'published “{{title}}”' },
          )
        : translate('notifications.desc.published', {}, { defaultValue: 'published an article' })
    case 'mention':
      return title
        ? translate(
            'notifications.desc.mentionTitled',
            { title },
            { defaultValue: 'mentioned you in “{{title}}”' },
          )
        : translate('notifications.desc.mention', {}, { defaultValue: 'mentioned you' })
    case 'comment':
      return title
        ? translate(
            'notifications.desc.commentTitled',
            { title },
            { defaultValue: 'commented on “{{title}}”' },
          )
        : translate('notifications.desc.comment', {}, { defaultValue: 'commented' })
    case 'review_requested':
      return title
        ? translate(
            'notifications.desc.reviewTitled',
            { title },
            { defaultValue: 'asked you to review “{{title}}”' },
          )
        : translate(
            'notifications.desc.review',
            {},
            { defaultValue: 'asked you to review a draft' },
          )
    case 'page_change':
      return title
        ? translate(
            'notifications.desc.editedTitled',
            { title },
            { defaultValue: 'edited “{{title}}”' },
          )
        : translate('notifications.desc.edited', {}, { defaultValue: 'edited an article' })
    case 'shared':
      return title
        ? translate(
            'notifications.desc.sharedTitled',
            { title },
            { defaultValue: 'shared “{{title}}”' },
          )
        : translate('notifications.desc.shared', {}, { defaultValue: 'shared an article' })
    default:
      return translate(
        'notifications.desc.generic',
        {},
        { defaultValue: 'sent you a notification' },
      )
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/notifications')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<NotificationRow>(res))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : translate(
                'notifications.loadFailed',
                {},
                { defaultValue: 'Could not load notifications' },
              ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = items.filter((n) => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'mentions') return n.kind === 'mention'
    return true
  })
  const unreadCount = items.filter((n) => !n.read_at).length

  async function markAllRead() {
    const unread = items.filter((n) => !n.read_at)
    if (unread.length === 0 || bulkBusy) return
    setBulkBusy(true)
    try {
      await Promise.all(
        unread.map((n) => http.patch(`/notifications/${n.id}/read`, {}).catch(() => null)),
      )
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function markRead(id: string) {
    try {
      await http.patch(`/notifications/${id}/read`, {})
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    } catch (_error) {
      // Best-effort UI; reload to recover
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('notifications.eyebrow', {}, { defaultValue: 'Workspace activity' })}
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
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              { count: unreadCount },
              {
                defaultValue:
                  '{{count}} unread \u2014 mentions, comments, page changes, and review requests.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={bulkBusy || unreadCount === 0}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full border border-outline text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50',
          )}
        >
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

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
          {t('notifications.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-lg bg-error/10 text-error',
          )}
        >
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('notifications.empty', {}, { defaultValue: 'You are caught up.' })}
        </p>
      ) : (
        <ol
          className={cm.cn(
            'space-y-1 rounded-2xl bg-surface-container-lowest p-2 ring-1 ring-outline-variant',
          )}
        >
          {filtered.map((n) => {
            const kind =
              (n.kind as NotificationKind) in ICON ? (n.kind as NotificationKind) : 'system'
            const actor = n.payload?.actor ?? ''
            const description = defaultDescription(n)
            const href = n.payload?.href
            const unread = !n.read_at
            const inner = (
              <>
                <span
                  className={cm.cn(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    TONE[kind],
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: '1.125rem' }}
                  >
                    {ICON[kind]}
                  </span>
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    {actor ? <span className={cm.fontWeight('extrabold')}>{actor} </span> : null}
                    {description}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {fmtRelative(n.created_at)}
                  </p>
                </div>
                {unread ? (
                  <span
                    aria-label={t('status.unread', {}, { defaultValue: 'Unread' })}
                    className={cm.cn(
                      'ml-auto inline-flex h-2 w-2 shrink-0 rounded-full bg-primary',
                    )}
                  />
                ) : null}
              </>
            )
            const wrapperClass = cm.cn(
              cm.flex({ align: 'start', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 3),
              'rounded-xl transition-colors hover:bg-surface-container',
              unread ? 'bg-primary/5' : '',
            )
            return (
              <li key={n.id}>
                {href ? (
                  <Link to={href} className={wrapperClass} onClick={() => unread && markRead(n.id)}>
                    {inner}
                  </Link>
                ) : (
                  <div
                    className={wrapperClass}
                    role="button"
                    tabIndex={0}
                    onClick={() => unread && markRead(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && unread) markRead(n.id)
                    }}
                  >
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default Notifications
