import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface ApiNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'alerts', label: 'Alerts' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function tintFor(type: string): { icon: string; bg: string; text: string } {
  switch (type) {
    case 'mention':
      return { icon: 'alternate_email', bg: 'bg-primary-fixed', text: 'text-primary' }
    case 'comment':
      return {
        icon: 'forum',
        bg: 'bg-violet-100 dark:bg-violet-500/15',
        text: 'text-violet-600 dark:text-violet-300',
      }
    case 'share':
      return {
        icon: 'share',
        bg: 'bg-success-light',
        text: 'text-success',
      }
    case 'automation':
      return {
        icon: 'bolt',
        bg: 'bg-success-light',
        text: 'text-success',
      }
    case 'alert':
      return {
        icon: 'error',
        bg: 'bg-rose-100',
        text: 'text-error',
      }
    default:
      return {
        icon: 'notifications',
        bg: 'bg-surface-container-high',
        text: 'text-on-surface-variant',
      }
  }
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'now'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [filter, setFilter] = useState<FilterId>('all')
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<ApiNotification[]>('/notifications')
        if (cancelled) return
        setItems(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  async function markAllRead() {
    try {
      await http.post('/notifications/mark-all-read', {})
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function markRead(id: string) {
    try {
      await http.patch(`/notifications/${id}/read`, {})
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const visible = useMemo(
    () =>
      items.filter((n) => {
        if (filter === 'unread') return !n.read_at
        if (filter === 'mentions') return n.type === 'mention'
        if (filter === 'alerts') return n.type === 'alert'
        return true
      }),
    [items, filter],
  )

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'notifications.subhead',
              {},
              {
                defaultValue:
                  'Mentions, share invites, automation alerts. Your inbox for everything that touches your workbooks.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={items.every((n) => n.read_at)}
          className={
            'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant'
          }
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            done_all
          </span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }))}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-xs font-bold uppercase tracking-widest rounded-full transition-colors',
              filter === f.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(`notifications.filter.${f.id}`, {}, { defaultValue: f.label })}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'text-error bg-error-container/40 rounded-2xl',
          )}
        >
          {error}
        </div>
      )}

      <ul
        className={cm.cn(
          cm.stack(2),
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
        )}
      >
        {loading ? (
          <li className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('notifications.loading', {}, { defaultValue: 'Loading notifications…' })}
          </li>
        ) : visible.length === 0 ? (
          <li className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {items.length === 0
              ? t('notifications.empty', {}, { defaultValue: 'You’re all caught up.' })
              : t(
                  'notifications.emptyFilter',
                  {},
                  { defaultValue: 'Nothing matches this filter.' },
                )}
          </li>
        ) : (
          visible.map((n) => {
            const tint = tintFor(n.type)
            const unread = !n.read_at
            return (
              <li
                key={n.id}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'md' }),
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  'group hover:bg-surface-container-low transition-colors border-b last:border-b-0 border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    'rounded-full border-2 border-surface-container-lowest text-[11px] font-extrabold shrink-0',
                    tint.bg,
                    tint.text,
                  )}
                  aria-hidden="true"
                >
                  <span className={'material-symbols-outlined text-base'}>{tint.icon}</span>
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-full text-[10px] font-black uppercase tracking-widest',
                        tint.bg,
                        tint.text,
                      )}
                    >
                      {t(`notifications.type.${n.type}`, {}, { defaultValue: n.type })}
                    </span>
                    {unread && (
                      <span
                        className={'w-2 h-2 rounded-full bg-primary'}
                        aria-label={t('notifications.unread', {}, { defaultValue: 'Unread' })}
                      />
                    )}
                  </div>
                  <p className={cm.cn(cm.sp('mt', 1), 'font-bold text-on-surface')}>{n.title}</p>
                  {n.body && (
                    <p
                      className={cm.cn(
                        cm.sp('mt', 1),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      {n.body}
                    </p>
                  )}
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('mt', 2),
                      'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    <span>{formatRelative(n.created_at)}</span>
                    {unread && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className={cm.cn(
                          'px-2 py-2 -my-2 text-[11px] uppercase tracking-widest font-bold text-primary hover:underline',
                        )}
                      >
                        {t('common.markRead', {}, { defaultValue: 'Mark read' })}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })
        )}
      </ul>
    </WorkbenchLayout>
  )
}

export default Notifications
