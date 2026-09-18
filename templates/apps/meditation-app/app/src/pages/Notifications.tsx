import { useEffect, useMemo, useState } from 'react'

import type { I18nProvider } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiNotification } from '../lib/api.js'

type Kind = 'reminder' | 'achievement' | 'course' | 'release' | string

const KIND_PALETTE: Record<string, { icon: string; tone: string; defaultLabel: string }> = {
  reminder: {
    icon: 'self_improvement',
    tone: 'bg-primary-container text-on-primary-container',
    defaultLabel: 'Reminder',
  },
  achievement: {
    icon: 'workspace_premium',
    tone: 'bg-accent-container text-on-accent-container',
    defaultLabel: 'Achievement',
  },
  course: {
    icon: 'school',
    tone: 'bg-secondary-container text-on-secondary-container',
    defaultLabel: 'Course',
  },
  release: {
    icon: 'star',
    tone: 'bg-tertiary-container text-on-tertiary-container',
    defaultLabel: 'New release',
  },
}

function paletteFor(kind: Kind) {
  return (
    KIND_PALETTE[kind] ?? {
      icon: 'notifications',
      tone: 'bg-surface-container-low text-on-surface-variant',
      defaultLabel: kind,
    }
  )
}

function formatRelative(iso: string, t: I18nProvider['t']): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return t('common.relative.now', {}, { defaultValue: 'now' })
  if (diff < 3600)
    return t(
      'common.relative.minutesShort',
      { count: Math.floor(diff / 60) },
      { defaultValue: '{{count}}m' },
    )
  if (diff < 86400)
    return t(
      'common.relative.hoursShort',
      { count: Math.floor(diff / 3600) },
      { defaultValue: '{{count}}h' },
    )
  if (diff < 86400 * 7)
    return t(
      'common.relative.daysShort',
      { count: Math.floor(diff / 86400) },
      { defaultValue: '{{count}}d' },
    )
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function payloadString(payload: Record<string, unknown> | undefined, key: string): string | null {
  if (!payload) return null
  const v = payload[key]
  return typeof v === 'string' ? v : null
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await http.get<ApiNotification[]>('/notifications')
      setNotifications(Array.isArray(res.data) ? res.data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handleMarkAllRead = async () => {
    if (busy) return
    setBusy(true)
    try {
      const unread = notifications.filter((n) => !n.read_at)
      await Promise.all(
        unread.map((n) =>
          http.patch(`/notifications/${n.id}`, { read_at: new Date().toISOString() }),
        ),
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = async (id: string) => {
    if (busy) return
    setBusy(true)
    try {
      await http.delete(`/notifications/${id}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [notifications],
  )

  const unreadCount = sorted.filter((n) => !n.read_at).length

  return (
    <>
      <StillpointTopBar
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        eyebrow={
          <span data-testid="notifications-eyebrow">
            {t(
              'stillpoint.notifications.eyebrow',
              { count: unreadCount },
              { defaultValue: '{{count}} new — gently' },
            )}
          </span>
        }
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              data-testid="notifications-mark-all"
              onClick={() => void handleMarkAllRead()}
              disabled={busy}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50',
              )}
            >
              {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
            </button>
          ) : null
        }
      />

      {error ? (
        <div
          data-testid="notifications-error"
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl border border-error text-error')}
        >
          {t(
            'stillpoint.notifications.loadError',
            {},
            { defaultValue: "We couldn't load notifications." },
          )}
        </div>
      ) : loading ? (
        <div
          data-testid="notifications-loading"
          className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : sorted.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t(
            'stillpoint.notifications.empty',
            {},
            { defaultValue: 'All caught up. A quiet inbox is a kind of practice.' },
          )}
        </div>
      ) : (
        <ul
          data-testid="notifications-list"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}
        >
          {sorted.map((n) => {
            const palette = paletteFor(n.kind)
            const title =
              payloadString(n.payload, 'title') ??
              t(
                `stillpoint.notifications.kind.${n.kind}`,
                {},
                { defaultValue: palette.defaultLabel },
              )
            const body = payloadString(n.payload, 'body') ?? ''
            const unread = !n.read_at
            return (
              <li
                key={n.id}
                data-testid={`notification-${n.id}`}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/20',
                  unread ? 'border-l-4 border-l-accent' : '',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl shrink-0 shadow-sm',
                    palette.tone,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {palette.icon}
                  </span>
                </span>
                <div className={cm.cn('flex-1 min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{title}</p>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-widest',
                      )}
                    >
                      {formatRelative(n.created_at, t)}
                    </span>
                  </div>
                  {body ? (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant mt-1 leading-relaxed',
                      )}
                    >
                      {body}
                    </p>
                  ) : null}
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
                    <button
                      type="button"
                      data-testid={`notification-dismiss-${n.id}`}
                      onClick={() => void handleDismiss(n.id)}
                      disabled={busy}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant hover:text-error transition-colors disabled:opacity-50',
                      )}
                    >
                      {t('stillpoint.notifications.dismiss', {}, { defaultValue: 'Dismiss' })}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
