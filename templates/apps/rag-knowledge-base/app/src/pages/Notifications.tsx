import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

type NotificationKind = 'sync' | 'mention' | 'shared-answer' | 'index' | 'sync-error' | 'invite'

interface NotificationRecord {
  id: string
  kind: string
  title: string
  body: string | null
  link?: string | null
  read_at: string | null
  created_at: string
}

const KIND_HEX: Record<NotificationKind, string> = {
  sync: 'var(--color-success)',
  mention: 'var(--color-primary)',
  'shared-answer': 'var(--color-cited)',
  index: 'var(--color-info)',
  'sync-error': 'var(--color-error)',
  invite: 'var(--color-accent)',
}

const KIND_ICON: Record<NotificationKind, string> = {
  sync: 'autorenew',
  mention: 'alternate_email',
  'shared-answer': 'share',
  index: 'cloud_done',
  'sync-error': 'error',
  invite: 'person_add',
}

const KIND_DEFAULT: Record<NotificationKind, string> = {
  sync: 'Source synced',
  mention: 'You were mentioned',
  'shared-answer': 'Answer shared',
  index: 'Indexing complete',
  'sync-error': 'Sync error',
  invite: 'Invite update',
}

const KNOWN_KINDS: NotificationKind[] = [
  'sync',
  'mention',
  'shared-answer',
  'index',
  'sync-error',
  'invite',
]

function asKnownKind(raw: string): NotificationKind {
  if ((KNOWN_KINDS as string[]).includes(raw)) return raw as NotificationKind
  return 'index'
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = () =>
    http
      .get('/api/notifications')
      .then((res) => {
        setItems(unwrapList<NotificationRecord>(res))
      })
      .catch(() => {
        setItems([])
        setError(
          t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
        )
      })

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/notifications')
      .then((res) => {
        if (cancelled) return
        setItems(unwrapList<NotificationRecord>(res))
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          setError(
            t(
              'nav.couldNotLoadNotifications',
              {},
              { defaultValue: 'Could not load notifications.' },
            ),
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function markRead(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const res = await http.put(`/api/notifications/${id}`, { read: true })
      const updated = unwrapSingle<NotificationRecord>(res)
      setItems((prev) =>
        (prev ?? []).map((n) =>
          n.id === id ? { ...n, read_at: updated?.read_at ?? new Date().toISOString() } : n,
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'notifications.error.update',
              {},
              {
                defaultValue: 'Could not mark notification as read.',
              },
            ),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function dismiss(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await http.delete(`/api/notifications/${id}`)
      // Re-fetch so the list reflects the canonical server state
      // (covers cases where another client added or modified entries).
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'notifications.error.delete',
              {},
              { defaultValue: 'Could not dismiss notification.' },
            ),
      )
    } finally {
      setBusyId(null)
    }
  }

  const list = items ?? []
  const unread = list.filter((i) => !i.read_at).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p
          data-testid="notifications-summary"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'notifications.subheading',
            { count: unread },
            {
              defaultValue: `${unread} unread \u00b7 sync events, mentions, and shared answers from your team.`,
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="notifications-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      {items === null ? (
        <p
          data-testid="notifications-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('notifications.loading', {}, { defaultValue: 'Loading notifications\u2026' })}
        </p>
      ) : list.length === 0 ? (
        <div
          data-testid="notifications-empty"
          className={cm.cn(
            cm.sp('py', 16),
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            style={{ fontSize: 36 }}
            aria-hidden="true"
          >
            inbox
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('notifications.empty', {}, { defaultValue: 'No notifications right now.' })}
          </p>
        </div>
      ) : (
        <ul
          data-testid="notifications-list"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          {list.map((n) => {
            const kind = asKnownKind(n.kind)
            const color = KIND_HEX[kind]
            const unreadFlag = !n.read_at
            return (
              <li
                key={n.id}
                data-testid={`notifications-row-${n.id}`}
                data-unread={unreadFlag ? '1' : '0'}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.accentCard({ tone: 'custom' }),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow',
                )}
                style={{ ['--mol-accent' as string]: color }}
              >
                {unreadFlag ? (
                  <span
                    className={'absolute right-3 top-3 w-2 h-2 rounded-full bg-primary'}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    'rounded-lg shrink-0',
                  )}
                  style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: 22 }}
                    aria-hidden="true"
                  >
                    {KIND_ICON[kind]}
                  </span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
                  <div className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
                    <span className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                      {n.title}
                    </span>
                    <span className={cm.accentCardLabel({ tone: 'custom' })}>
                      {t(`notifications.kind.${kind}`, {}, { defaultValue: KIND_DEFAULT[kind] })}
                    </span>
                  </div>
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
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                    {fmtRelative(n.created_at)}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'shrink-0')}>
                  {unreadFlag ? (
                    <button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => markRead(n.id)}
                      data-testid={`notifications-mark-read-${n.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded-full font-semibold border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50',
                      )}
                    >
                      {t('notifications.markRead', {}, { defaultValue: 'Mark read' })}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => dismiss(n.id)}
                    data-testid={`notifications-dismiss-${n.id}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded-full font-semibold border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50',
                    )}
                  >
                    {t('notifications.dismiss', {}, { defaultValue: 'Dismiss' })}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
