import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface NotificationItem {
  id: string
  kind: 'comment' | 'view' | 'invite'
  actor: string
  actor_initials: string
  recording_id: string | null
  recording_title: string | null
  excerpt: string | null
  created_at: string
  unread: boolean
  link: string | null
}

const FILTERS: { id: 'all' | NotificationItem['kind']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'comment', label: 'Comments' },
  { id: 'view', label: 'Views' },
  { id: 'invite', label: 'Invites' },
]

const KIND_ICON: Record<NotificationItem['kind'], string> = {
  comment: 'chat',
  view: 'visibility',
  invite: 'person_add',
}

const KIND_TINT: Record<NotificationItem['kind'], string> = {
  comment: 'bg-cyan-50 text-cyan-600',
  view: 'bg-violet-50 text-violet-600',
  invite: 'bg-success-light text-success',
}

function unwrapList(payload: unknown): NotificationItem[] {
  if (Array.isArray(payload)) return payload as NotificationItem[]
  if (payload && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data as NotificationItem[]
  }
  return []
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(ts).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [filter, setFilter] = useState<'all' | NotificationItem['kind']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList(res?.data))
      })
      .catch(() => {
        if (cancelled) return
        setError(
          t('nav.failedToLoadNotifications', {}, { defaultValue: 'Failed to load notifications.' }),
        )
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.kind === filter)
  }, [items, filter])

  const unreadCount = useMemo(() => visible.filter((item) => item.unread).length, [visible])

  return (
    <div data-mol-id="notifications-page" className={cm.cn(cm.stack(8), cm.maxW('xl'), 'mx-auto')}>
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant w-fit',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined text-base text-[var(--color-brand-gradient-from)]',
            )}
          >
            notifications_active
          </span>
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </span>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 3 }), 'flex-wrap')}
        >
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold text-on-surface',
            )}
          >
            {t('notifications.title', {}, { defaultValue: 'What is new for you' })}
          </h1>
          {unreadCount > 0 && (
            <span
              data-mol-id="notifications-unread-badge"
              className={cm.cn(
                'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-[var(--color-brand-gradient-from)]/20',
              )}
            >
              {t(
                'common.countUnread',
                { count: unreadCount },
                { defaultValue: '{{count}} unread' },
              )}
            </span>
          )}
        </div>
      </header>

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {FILTERS.map((f) => {
          const active = f.id === filter
          return (
            <button
              key={f.id}
              type="button"
              data-mol-id={`notifications-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'uppercase tracking-widest rounded-full transition-colors',
                active
                  ? 'text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/20'
                  : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {t(`notifications.filter.${f.id}`, {}, { defaultValue: f.label })}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p
          data-mol-id="notifications-error"
          role="alert"
          className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')}
        >
          {error}
        </p>
      ) : loading ? (
        <div data-mol-id="notifications-loading" className={cm.cn(cm.stack(3))}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={cm.cn('h-20 rounded-2xl bg-surface-container-lowest animate-pulse')}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          data-mol-id="notifications-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            cm.stack(3),
            'rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mx-auto')}
          >
            notifications_off
          </span>
          <h3 className={cm.cn(cm.fontWeight('bold'), 'text-xl text-on-surface')}>
            {t('notifications.empty.title', {}, { defaultValue: 'You are all caught up' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-sm mx-auto')}>
            {t(
              'notifications.empty.body',
              {},
              { defaultValue: 'New comments, views, and invites will land here as they happen.' },
            )}
          </p>
        </div>
      ) : (
        <ul data-mol-id="notifications-list" className={cm.cn(cm.stack(3))}>
          {visible.map((item) => (
            <li
              key={item.id}
              data-mol-id={`notifications-row-${item.id}`}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 3 }),
                cm.sp('p', 4),
                'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(11),
                  cm.h(11),
                  'rounded-xl shrink-0',
                  KIND_TINT[item.kind],
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>
                  {KIND_ICON[item.kind]}
                </span>
              </div>
              <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface truncate')}>
                    {item.actor}
                  </span>
                  <span className={cm.cn('text-on-surface-variant')}>·</span>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface-variant')}>
                    {t(`notifications.kind.${item.kind}`, {}, { defaultValue: item.kind })}
                  </span>
                </div>
                {item.recording_title ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface truncate font-semibold')}>
                    {item.recording_title}
                  </p>
                ) : null}
                {item.excerpt ? (
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'leading-relaxed')}>
                    {item.excerpt}
                  </p>
                ) : null}
              </div>
              <div className={cm.cn(cm.stack(2), cm.textRight, 'shrink-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant uppercase tracking-widest font-semibold',
                  )}
                >
                  {formatRelative(item.created_at)}
                </span>
                {item.link ? (
                  <Link
                    to={item.link}
                    data-mol-id={`notifications-row-${item.id}-link`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-[var(--color-brand-gradient-from)] hover:underline',
                    )}
                  >
                    {t('notifications.open', {}, { defaultValue: 'Open' })}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
