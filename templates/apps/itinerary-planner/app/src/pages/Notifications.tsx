/**
 * Notifications — activity feed of trip updates, collaborator actions,
 * booking confirmations, and price alerts. Each row uses a category
 * icon + colored stripe + read/unread indicator. Top of the page
 * surfaces the unread count + a "mark all read" button.
 *
 * Real backend: GET /api/notifications returns the user's feed.
 * PUT /api/notifications/:id toggles `read`. POST /api/notifications/mark-all-read
 * flips every unread row.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { NotificationRow } from '../lib/api.js'

type NotificationKind = 'booking' | 'collaborator' | 'price_alert' | 'reminder' | 'system'

const KIND_THEME: Record<
  NotificationKind,
  { stripe: string; icon: string; chip: string; chipText: string; defaultLabel: string }
> = {
  booking: {
    stripe: 'border-cyan-700',
    icon: 'confirmation_number',
    chip: 'bg-cyan-100 dark:bg-cyan-900/40',
    chipText: 'text-cyan-800 dark:text-cyan-200',
    defaultLabel: 'Booking',
  },
  collaborator: {
    stripe: 'border-violet-500',
    icon: 'group',
    chip: 'bg-violet-100 dark:bg-violet-900/40',
    chipText: 'text-violet-800 dark:text-violet-200',
    defaultLabel: 'Traveler',
  },
  price_alert: {
    stripe: 'border-orange-600',
    icon: 'trending_down',
    chip: 'bg-orange-100 dark:bg-orange-900/40',
    chipText: 'text-orange-800 dark:text-orange-200',
    defaultLabel: 'Price',
  },
  reminder: {
    stripe: 'border-amber-500',
    icon: 'alarm',
    chip: 'bg-warning-light',
    chipText: 'text-warning',
    defaultLabel: 'Reminder',
  },
  system: {
    stripe: 'border-border-secondary',
    icon: 'campaign',
    chip: 'bg-surface-secondary',
    chipText: 'text-foreground',
    defaultLabel: APP_NAME,
  },
}

function coerceKind(kind: string): NotificationKind {
  if (
    kind === 'booking' ||
    kind === 'collaborator' ||
    kind === 'price_alert' ||
    kind === 'reminder' ||
    kind === 'system'
  )
    return kind
  return 'system'
}

function fmtRelative(iso: string, t: TranslateFunction): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60_000)
  if (mins < 1) return t('notifications.time.justNow', {}, { defaultValue: 'just now' })
  if (mins < 60)
    return t('notifications.time.minutesAgo', { count: mins }, { defaultValue: '{{count}}m ago' })
  const hours = Math.round(mins / 60)
  if (hours < 24)
    return t('notifications.time.hoursAgo', { count: hours }, { defaultValue: '{{count}}h ago' })
  const days = Math.round(hours / 24)
  return t('notifications.time.daysAgo', { count: days }, { defaultValue: '{{count}}d ago' })
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const resp = await http.get<NotificationRow[]>('/notifications')
      setItems(Array.isArray(resp.data) ? resp.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'nav.couldNotLoadNotifications',
              {},
              { defaultValue: 'Could not load notifications.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const unread = useMemo(() => items.filter((n) => !n.read), [items])

  const markAllRead = async () => {
    if (unread.length === 0) return
    // Optimistic update so UI feels instant; refresh confirms.
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await http.post('/notifications/mark-all-read', {})
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('notifications.errors.markAll', {}, { defaultValue: 'Could not mark all as read.' }),
      )
      await refresh()
    }
  }

  const toggleRead = async (id: string) => {
    const target = items.find((n) => n.id === id)
    if (!target) return
    const next = !target.read
    // Optimistic update
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: next } : n)))
    try {
      await http.put(`/notifications/${id}`, { read: next })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'notifications.errors.toggle',
              {},
              { defaultValue: 'Could not update notification.' },
            ),
      )
      await refresh()
    }
  }

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.sp('px', 8),
        cm.sp('py', 10),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.25em] text-primary',
            )}
          >
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 2),
              'leading-tight tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t(
              'notifications.heading',
              {},
              { defaultValue: 'What changed across your trips today.' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'notifications.subheading',
              { count: unread.length },
              {
                defaultValue:
                  '{{count}} new \u2014 booking confirmations, collaborator notes, fare drops, and reminders.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="notifications-mark-all-read"
          onClick={() => void markAllRead()}
          disabled={unread.length === 0}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-on-surface disabled:hover:border-outline-variant',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            mark_email_read
          </span>
          {t('common.markAllAsRead', {}, { defaultValue: 'Mark all as read' })}
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          data-testid="notifications-error"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl bg-surface-container-low border border-outline-variant/40',
          )}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-surface-variant"
            aria-hidden="true"
          >
            notifications_off
          </span>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 3),
              'tracking-tight',
            )}
            style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
          >
            {t('notifications.empty.heading', {}, { defaultValue: 'Nothing new yet.' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'notifications.empty.body',
              {},
              {
                defaultValue:
                  'Trip updates, booking confirmations, and collaborator activity will land here.',
              },
            )}
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <section
          className={cm.cn(
            'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul
            data-testid="notifications-list"
            className={cm.cn('divide-y divide-surface-container')}
          >
            {items.map((n) => {
              const kind = coerceKind(n.kind)
              const theme = KIND_THEME[kind]
              return (
                <li
                  key={n.id}
                  data-testid="notifications-row"
                  data-read={n.read ? 'true' : 'false'}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ gap: 'md' }),
                    'border-l-4 transition-colors hover:bg-surface-container-low',
                    theme.stripe,
                    !n.read ? 'bg-primary-container/10' : '',
                  )}
                >
                  <span
                    className={cm.cn(
                      'relative flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-container/40 text-primary flex items-center justify-center',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-2xl'}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {theme.icon}
                    </span>
                    {!n.read ? (
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'absolute top-0 right-0 w-3 h-3 rounded-full bg-accent ring-2 ring-surface',
                        )}
                      />
                    ) : null}
                  </span>
                  <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'py-0.5 uppercase tracking-widest rounded-full',
                          theme.chip,
                          theme.chipText,
                        )}
                      >
                        {t(`notifications.kind.${kind}`, {}, { defaultValue: theme.defaultLabel })}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                      >
                        {fmtRelative(n.occurred_at, t)}
                      </span>
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('extrabold'),
                        'tracking-tight',
                      )}
                      style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
                    >
                      {n.title}
                    </h3>
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
                  <div className={cm.cn('flex-shrink-0', cm.flex({ align: 'center' }))}>
                    <button
                      type="button"
                      data-testid="notifications-toggle"
                      onClick={() => void toggleRead(n.id)}
                      aria-label={
                        n.read
                          ? t('notifications.markUnread', {}, { defaultValue: 'Mark as unread' })
                          : t('common.markAsRead', {}, { defaultValue: 'Mark as read' })
                      }
                      className={cm.cn(
                        cm.sp('p', 2),
                        'rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors',
                      )}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {n.read ? 'mark_email_unread' : 'mark_email_read'}
                      </span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
