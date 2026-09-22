import { useCallback, useEffect, useMemo, useState } from 'react'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: unknown
  read_at: string | null
  created_at: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function relative(iso: string, t: TranslateFunction) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''
  const diff = Date.now() - parsed
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('time.justNow', {}, { defaultValue: 'just now' })
  if (m < 60) return t('time.minutesShort', { minutes: m }, { defaultValue: '{{minutes}}m' })
  const h = Math.floor(m / 60)
  if (h < 24) return t('time.hoursShort', { hours: h }, { defaultValue: '{{hours}}h' })
  return t('time.daysShort', { days: Math.floor(h / 24) }, { defaultValue: '{{days}}d' })
}

const FILTERS = ['All', 'Unread'] as const
type Filter = (typeof FILTERS)[number]

const TYPE_ICON: Record<string, string> = {
  mention: 'alternate_email',
  assignment: 'person_add',
  due_soon: 'event',
  comment: 'chat_bubble',
  board_invite: 'group_add',
  card_moved: 'swap_horiz',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<NotificationRow[]>([])
  const [filter, setFilter] = useState<Filter>('All')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/notifications')
      .then((res) => {
        const list = unwrap<NotificationRow[]>(res) ?? []
        setItems(Array.isArray(list) ? list : [])
        setLoadError(false)
      })
      .catch(() => {
        // A failed fetch must surface — without this the inbox silently
        // renders its empty state and the user believes they have no activity.
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleMarkAllRead = async () => {
    setBusy(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      await refresh()
    } catch (_error) {
      // safe to ignore: mark-read is best-effort; notification stays unread on next refresh
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'Unread') return items.filter((i) => !i.read_at)
    return items
  }, [items, filter])

  const unreadCount = items.filter((i) => !i.read_at).length

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(8))}>
      <header className={cm.flex({ justify: 'between', align: 'start', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
            {t(
              'notifications.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} \u00b7 Inbox' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('notifications.heading', {}, { defaultValue: 'Activity inbox' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'notifications.subline',
              { count: unreadCount },
              { defaultValue: '{{count}} unread updates.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={busy || unreadCount === 0}
          data-testid="notifications-mark-all-read"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'px-4 py-2 rounded-xl font-bold text-on-surface text-sm border border-outline-variant hover:bg-surface-container-low transition-colors disabled:opacity-50',
          )}
        >
          <span className="material-symbols-outlined text-[16px]">done_all</span>
          {t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      <div className={cm.cn('flex flex-wrap gap-2')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            data-testid={`notifications-filter-${f.toLowerCase()}`}
            className={cm.cn(
              'px-4 py-1.5 rounded-full text-sm font-bold transition-colors',
              filter === f
                ? 'bg-primary text-on-primary shadow-md'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
            )}
          >
            {t(`notifications.filters.${f.toLowerCase()}`, {}, { defaultValue: f })}
          </button>
        ))}
      </div>

      {loadError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'flex flex-wrap items-center gap-3 rounded-xl border border-error/40 bg-error/5',
          )}
        >
          <p className="text-error font-semibold flex-1">
            {t('notifications.loadError', {}, { defaultValue: 'Could not load your inbox.' })}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className={cm.cn(
              'px-4 py-2 rounded-xl text-sm font-bold text-white',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        {loading && items.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
            {t('notifications.loading', {}, { defaultValue: 'Loading inbox\u2026' })}
          </p>
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, cm.textMuted)}>
            {t('notifications.empty', {}, { defaultValue: 'Nothing here. Inbox zero feels good.' })}
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant/20">
            {filtered.map((item) => {
              const icon = TYPE_ICON[item.type] ?? 'notifications'
              return (
                <li key={item.id} data-testid={`notification-${item.id}`}>
                  {/* Whole-row mark-as-read target; a real <button> cannot wrap this
                      flow content, so the row is a keyboard-operable button widget. */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-disabled={Boolean(item.read_at)}
                    onClick={() => !item.read_at && void handleMarkRead(item.id)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !item.read_at) {
                        e.preventDefault()
                        void handleMarkRead(item.id)
                      }
                    }}
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      'flex items-start gap-4 transition-colors hover:bg-surface-container-low cursor-pointer',
                      !item.read_at ? 'bg-primary/5' : '',
                    )}
                  >
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface">{item.title}</p>
                      {item.body ? (
                        <p className="text-[13px] text-on-surface-variant font-semibold mt-1">
                          {item.body}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-on-surface-variant">
                      {relative(item.created_at, t)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Notifications
