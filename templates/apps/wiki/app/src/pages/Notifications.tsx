import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ApiNotification {
  id: string
  user_id: string
  kind: string
  title: string
  body: string | null
  page_id: string | null
  actor_id: string | null
  read_at: string | null
  created_at: string
}

const KIND_ICON: Record<string, string> = {
  mention: 'alternate_email',
  reply: 'forum',
  edit: 'edit_note',
  assignment: 'task_alt',
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Returns a stable bucket key (translated at render); never a display string.
function bucketKey(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days < 2) return 'yesterday'
  if (days < 7) return 'thisWeek'
  if (days < 30) return 'thisMonth'
  return 'older'
}

const BUCKET_DEFAULTS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This week',
  thisMonth: 'This month',
  older: 'Older',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiNotification[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await http.get<ApiNotification[]>('/notifications')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  const handleMarkAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/notifications/mark-all-read')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all read')
    } finally {
      setMarking(false)
    }
  }

  const handleMarkOne = async (id: string) => {
    try {
      await http.patch(`/notifications/${id}/read`)
      await load()
    } catch (_error) {
      // Recoverable: mark-read failure is non-fatal; user can refresh to retry.
    }
  }

  const visible = useMemo(() => {
    if (!items) return []
    return filter === 'all' ? items : items.filter((n) => !n.read_at)
  }, [items, filter])

  const grouped = useMemo(() => {
    const out = new Map<string, ApiNotification[]>()
    for (const n of visible) {
      const key = bucketKey(n.created_at)
      if (!out.has(key)) out.set(key, [])
      out.get(key)!.push(n)
    }
    return Array.from(out.entries())
  }, [visible])

  const unreadTotal = items ? items.filter((n) => !n.read_at).length : 0

  return (
    <div className={cm.stack(8)} data-testid="notifications-page">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'notifications.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Inbox · {{appName}}' },
            )}
          </span>
          <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
            <h1
              className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h1>
            {unreadTotal > 0 ? (
              <span
                data-testid="notifications-unread-badge"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  'rounded-full bg-primary text-on-primary font-black',
                )}
              >
                {t(
                  'common.countUnread',
                  { count: unreadTotal },
                  { defaultValue: '{{count}} unread' },
                )}
              </span>
            ) : null}
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'notifications.subtitle',
              {},
              { defaultValue: 'Mentions, replies, and assignments — grouped by day.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('p', 1),
              'rounded-full bg-surface-container-low',
            )}
          >
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                data-testid={`notifications-filter-${f}`}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.textSize('xs'),
                  'h-8 rounded-full font-black uppercase tracking-widest transition-colors',
                  filter === f
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {f === 'all'
                  ? t('status.all', {}, { defaultValue: 'All' })
                  : t('status.unread', {}, { defaultValue: 'Unread' })}
              </button>
            ))}
          </div>
          {unreadTotal > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={marking}
              data-testid="notifications-mark-all-read"
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'h-8 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-60',
              )}
            >
              {marking
                ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
                : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border-l-4 border-error bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {items === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : grouped.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
          data-testid="notifications-empty"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[40px] text-on-surface-variant/60')}
            aria-hidden="true"
          >
            mark_email_read
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('notifications.empty.title', {}, { defaultValue: 'Inbox quiet — nothing waiting.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notifications.empty.body',
              {},
              {
                defaultValue:
                  'You will see mentions, replies, and assignments here as they happen.',
              },
            )}
          </p>
        </div>
      ) : (
        grouped.map(([label, group]) => (
          <section key={label} className={cm.stack(4)}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                `notifications.bucket.${label}`,
                {},
                { defaultValue: BUCKET_DEFAULTS[label] ?? label },
              )}
            </h2>
            <ul className={cm.stack(3)}>
              {group.map((n) => (
                <li key={n.id} data-testid={`notifications-item-${n.id}`}>
                  <Link
                    to={n.page_id ? `/page/${n.page_id}` : '/home'}
                    onClick={() => !n.read_at && handleMarkOne(n.id)}
                    className={cm.cn(
                      cm.flex({ align: 'start', gap: 'md' }),
                      cm.sp('p', 5),
                      'group rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-sm transition-all',
                      !n.read_at ? 'border-l-[3px] border-l-primary' : '',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-10 w-10 shrink-0 rounded-full bg-secondary/15 text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                        {KIND_ICON[n.kind] ?? 'circle_notifications'}
                      </span>
                    </span>
                    <div className={cm.cn(cm.stack(1), 'min-w-0 flex-1')}>
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'text-on-surface uppercase tracking-widest',
                          )}
                        >
                          {n.kind}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {formatRelative(n.created_at)}
                        </span>
                        {!n.read_at ? (
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.textSize('xs'),
                              'rounded-full bg-primary/15 text-primary font-black uppercase tracking-widest text-[10px]',
                            )}
                          >
                            {t('status.new', {}, { defaultValue: 'New' })}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface leading-snug',
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-on-surface-variant leading-relaxed',
                          )}
                        >
                          {n.body}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
