import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  unread: boolean
  created_at: string
}

const TONE_BG: Record<string, string> = {
  reminder: 'bg-warning-light/60 text-warning',
  due: 'bg-primary-container/15 text-primary',
  mastery: 'bg-success-light/60 text-success',
  digest: 'bg-surface-container-high text-on-surface-variant',
  tip: 'bg-surface-container-high text-on-surface-variant',
}

const ICON_FOR_TYPE: Record<string, string> = {
  reminder: 'local_fire_department',
  due: 'schedule',
  mastery: 'auto_awesome',
  digest: 'campaign',
  tip: 'tips_and_updates',
}

const formatAge = (iso: string): string => {
  const d = new Date(iso)
  const now = Date.now()
  const ms = now - d.getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams] = useSearchParams()
  const filterRaw = searchParams.get('filter')
  const filter: 'all' | 'unread' = filterRaw === 'unread' ? 'unread' : 'all'
  const [items, setItems] = useState<NotificationRow[] | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = (currentFilter: 'all' | 'unread' = filter) => {
    http
      .get<{ data: NotificationRow[]; unread_count: number }>(
        `/api/notifications${currentFilter === 'unread' ? '?filter=unread' : ''}`,
      )
      .then((res) => {
        setItems(res.data?.data ?? [])
        setUnreadCount(res.data?.unread_count ?? 0)
        setError(null)
      })
      .catch((e: unknown) => {
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
  }

  useEffect(() => {
    refresh(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, filter])

  const handleMarkAllRead = async () => {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      refresh(filter)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markAllError', {}, { defaultValue: 'Could not mark all as read.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    setBusy(true)
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      refresh(filter)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.markError', {}, { defaultValue: 'Could not mark as read.' }),
      )
    } finally {
      setBusy(false)
    }
  }

  const visible = items ?? []

  return (
    <div
      data-mol-id="page-notifications"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        subtitle={t(
          'notifications.subtitle',
          { count: unreadCount },
          { defaultValue: '{{count}} unread updates' },
        )}
        actions={
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {unreadCount > 0 ? (
              <button
                type="button"
                data-mol-id="notifications-mark-all"
                onClick={handleMarkAllRead}
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-wider transition-colors bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                )}
              >
                {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
              </button>
            ) : null}
            <div
              className={cm.cn(
                cm.flex({ gap: 'xs' }),
                'rounded-full bg-surface-container-high p-1',
              )}
            >
              {(['all', 'unread'] as const).map((opt) => (
                <Link
                  key={opt}
                  to={{ pathname: '/notifications', search: `?filter=${opt}` }}
                  data-mol-id={`notifications-filter-${opt}`}
                  role="tab"
                  aria-selected={filter === opt}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full uppercase tracking-wider',
                    filter === opt
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t(
                    `notifications.filter.${opt}`,
                    {},
                    { defaultValue: opt === 'all' ? 'All' : 'Unread' },
                  )}
                </Link>
              ))}
            </div>
          </div>
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {items === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('notifications.loading', {}, { defaultValue: 'Loading notifications…' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {visible.map((n) => {
              const tone = TONE_BG[n.type] ?? TONE_BG.tip
              const icon = ICON_FOR_TYPE[n.type] ?? 'notifications'
              return (
                <li
                  key={n.id}
                  data-mol-id="notifications-item"
                  data-unread={n.unread ? 'true' : 'false'}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ align: 'start', gap: 'md' }),
                    'rounded-2xl border border-outline-variant/15 bg-surface-container-lowest transition-colors hover:bg-surface-container-low',
                    n.unread && 'border-l-4 border-l-primary',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 shrink-0 rounded-2xl',
                      tone,
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {icon}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <div
                      className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 'sm' }))}
                    >
                      <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{n.title}</p>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'uppercase tracking-wider text-on-surface-variant/70',
                        )}
                      >
                        {formatAge(n.created_at)}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'serif-text text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {n.body}
                    </p>
                  </div>
                  {n.unread ? (
                    <button
                      type="button"
                      data-mol-id="notifications-mark-read"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={busy}
                      aria-label={t('common.markAsRead', {}, { defaultValue: 'Mark as read' })}
                      className={cm.cn(
                        cm.w(8),
                        cm.h(8),
                        cm.flex({ align: 'center', justify: 'center' }),
                        'rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50',
                      )}
                    >
                      <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                        done
                      </span>
                    </button>
                  ) : null}
                </li>
              )
            })}
            {visible.length === 0 && !error ? (
              <li
                data-mol-id="notifications-empty"
                className={cm.cn(
                  cm.sp('p', 12),
                  cm.textCenter,
                  'rounded-3xl border border-dashed border-outline-variant/30 text-on-surface-variant',
                )}
              >
                <span
                  className={'material-symbols-outlined text-5xl mb-3 opacity-50'}
                  aria-hidden="true"
                >
                  inbox
                </span>
                <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-1')}>
                  {t('notifications.empty.title', {}, { defaultValue: "You're all caught up" })}
                </p>
                <p className="serif-text italic">
                  {t(
                    'notifications.empty.body',
                    {},
                    { defaultValue: 'New updates will land here.' },
                  )}
                </p>
              </li>
            ) : null}
          </ul>
        )}
      </PageBody>
    </div>
  )
}
