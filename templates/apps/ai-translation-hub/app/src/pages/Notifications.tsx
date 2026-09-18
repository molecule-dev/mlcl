import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeading } from '../components/PageHeading.js'
import {
  type ActivityEvent,
  TranslationActivityTimeline,
} from '../components/TranslationActivityTimeline.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiNotificationRow {
  id?: unknown
  kind?: unknown
  title?: unknown
  body?: unknown
  link?: unknown
  read_at?: unknown
  created_at?: unknown
}

interface NotificationItem {
  id: string
  event: ActivityEvent
  isToday: boolean
  tabKey: string
  read: boolean
}

interface TabDef {
  key: string
  defaultLabel: string
}

const TABS: ReadonlyArray<TabDef> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'mentions', defaultLabel: 'Mentions' },
  { key: 'reviews', defaultLabel: 'Reviews' },
  { key: 'comments', defaultLabel: 'Comments' },
  { key: 'deadlines', defaultLabel: 'Deadlines' },
]

const PREF_KEYS: ReadonlyArray<{
  key: string
  defaultLabel: string
  defaultDescription: string
  on: boolean
}> = [
  {
    key: 'mentions',
    defaultLabel: 'Mentions in comments',
    defaultDescription: 'Email + in-app for every mention.',
    on: true,
  },
  {
    key: 'review_requests',
    defaultLabel: 'Review requests',
    defaultDescription: 'When a teammate asks for your sign-off.',
    on: true,
  },
  {
    key: 'project_updates',
    defaultLabel: 'Project updates',
    defaultDescription: 'When a project status changes.',
    on: true,
  },
  {
    key: 'mt_completion',
    defaultLabel: 'MT pass completed',
    defaultDescription: 'When the AI finishes its initial pass.',
    on: false,
  },
  {
    key: 'deadlines',
    defaultLabel: 'Deadlines approaching',
    defaultDescription: 'Email 24 hours before due.',
    on: true,
  },
  {
    key: 'glossary_drift',
    defaultLabel: 'Glossary drift detected',
    defaultDescription: 'When a translation diverges from glossary.',
    on: false,
  },
]

function adapt(row: ApiNotificationRow, idx: number): NotificationItem {
  const created =
    row.created_at instanceof Date ? row.created_at : new Date(String(row.created_at ?? Date.now()))
  const today = new Date()
  const isToday =
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth() &&
    created.getDate() === today.getDate()
  const kindRaw = String(row.kind ?? 'commented')
  const kind: ActivityEvent['kind'] = (() => {
    const allowed: ActivityEvent['kind'][] = [
      'approved',
      'uploaded',
      'mt_pass',
      'commented',
      'glossary_updated',
      'review_requested',
    ]
    return (allowed as string[]).includes(kindRaw)
      ? (kindRaw as ActivityEvent['kind'])
      : 'commented'
  })()
  let tabKey = 'all'
  if (kind === 'review_requested') tabKey = 'reviews'
  else if (kind === 'commented') tabKey = 'mentions'
  const id = String(row.id ?? `n_${idx}`)
  return {
    id,
    event: {
      id,
      actor: String(row.title ?? 'Workspace'),
      actor_initials: '',
      kind,
      text: String(row.body ?? ''),
      timestamp: created.toISOString(),
    },
    isToday,
    tabKey,
    read: row.read_at != null,
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ReadonlyArray<NotificationItem>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('all')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined')
      return Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.on]))
    try {
      const raw = window.localStorage.getItem('ai-translation-hub:notification-prefs')
      if (raw)
        return { ...Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.on])), ...JSON.parse(raw) }
    } catch (_error) {
      // Corrupted or unparseable prefs — fall through to defaults.
    }
    return Object.fromEntries(PREF_KEYS.map((p) => [p.key, p.on]))
  })
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/notifications')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiNotificationRow>(res)
        setItems(list.map(adapt))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'nav.failedToLoadNotifications',
              {},
              { defaultValue: 'Failed to load notifications.' },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    return items.filter((i) => tab === 'all' || i.tabKey === tab)
  }, [items, tab])

  const today = filtered.filter((i) => i.isToday).map((i) => i.event)
  const earlier = filtered.filter((i) => !i.isToday).map((i) => i.event)
  const counts = useMemo(() => {
    const by: Record<string, number> = { all: items.length }
    for (const i of items) by[i.tabKey] = (by[i.tabKey] ?? 0) + 1
    return by
  }, [items])
  const unread = useMemo(() => items.filter((i) => !i.read), [items])

  const handleMarkAllRead = async () => {
    if (unread.length === 0) return
    const previous = items
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    try {
      await Promise.all(
        unread.map((n) => http.post(`/notifications/${encodeURIComponent(n.id)}/read`, {})),
      )
      setActionStatus(
        t(
          'notifications.markedAllRead',
          { count: unread.length },
          { defaultValue: 'Marked {{count}} notifications as read.' },
        ),
      )
    } catch (_error) {
      // Mark-read request failed — revert optimistic update and surface the error.
      setItems(previous)
      setActionStatus(
        t('notifications.markFailed', {}, { defaultValue: 'Could not update notifications.' }),
      )
    }
  }

  const togglePref = (key: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        window.localStorage.setItem('ai-translation-hub:notification-prefs', JSON.stringify(next))
      } catch (_error) {
        // localStorage quota exceeded — pref change not persisted, safe to ignore.
      }
      return next
    })
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('nav.activity', {}, { defaultValue: 'Activity' })}
        title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        subtitle={t(
          'notifications.subtitle',
          {},
          { defaultValue: 'Mentions, review requests, and AI events from across your workspaces.' },
        )}
        actions={
          <button
            data-mol-id="notifications-mark-all-read"
            onClick={() => {
              void handleMarkAllRead()
            }}
            type="button"
            disabled={unread.length === 0}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30 disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              done_all
            </span>
            {t(
              'notifications.markAllRead',
              { count: unread.length },
              { defaultValue: 'Mark all read ({{count}})' },
            )}
          </button>
        }
      />

      {actionStatus && (
        <div
          role="status"
          data-mol-id="notifications-status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {actionStatus}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      )}

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg' }),
          'border-b border-surface-container-high pb-[1px]',
        )}
      >
        {TABS.map((tabItem) => {
          const isActive = tab === tabItem.key
          return (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              className={cm.cn(
                cm.sp('pb', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-background border-b-2 border-transparent',
              )}
            >
              {t(`notifications.tab.${tabItem.key}`, {}, { defaultValue: tabItem.defaultLabel })}
              <span className={cm.cn('font-mono text-xs ml-1 opacity-70')}>
                {counts[tabItem.key] ?? 0}
              </span>
            </button>
          )
        })}
      </nav>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <section className={cm.cn('lg:col-span-2 flex flex-col gap-6')}>
          {filtered.length === 0 && !loading ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.textCenter,
                cm.sp('py', 12),
                'text-on-surface-variant',
              )}
            >
              {t(
                'notifications.empty',
                {},
                { defaultValue: 'You’re all caught up — no notifications.' },
              )}
            </p>
          ) : (
            <>
              {today.length > 0 && (
                <article>
                  <h3
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 3),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('status.today', {}, { defaultValue: 'Today' })}
                  </h3>
                  <TranslationActivityTimeline events={today} />
                </article>
              )}
              {earlier.length > 0 && (
                <article>
                  <h3
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mb', 3),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('notifications.earlier', {}, { defaultValue: 'Earlier' })}
                  </h3>
                  <TranslationActivityTimeline events={earlier} />
                </article>
              )}
            </>
          )}
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
          </h3>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {PREF_KEYS.map((p) => (
              <li
                key={p.key}
                className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`notifications.pref.${p.key}.label`, {}, { defaultValue: p.defaultLabel })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      `notifications.pref.${p.key}.description`,
                      {},
                      { defaultValue: p.defaultDescription },
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  data-mol-id={`notifications-pref-${p.key}`}
                  aria-checked={prefs[p.key]}
                  onClick={() => togglePref(p.key)}
                  className={cm.cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                    prefs[p.key] ? 'bg-primary' : 'bg-surface-container-high',
                  )}
                >
                  <span
                    className={cm.cn(
                      'inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform',
                      prefs[p.key] ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default Notifications
export { Notifications as NotificationsPage }
