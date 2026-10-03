import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

type NotifType =
  | 'application_received'
  | 'stage_advanced'
  | 'interview_scheduled'
  | 'mention'
  | 'urgent_followup'
  | 'system_message'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  href?: string | null
  created_at: string
  unread: boolean
}

const TYPE_ICON: Record<NotifType, string> = {
  application_received: 'inbox',
  stage_advanced: 'arrow_forward',
  interview_scheduled: 'event',
  mention: 'alternate_email',
  urgent_followup: 'warning',
  system_message: 'info',
}

/** Pinned report digests — links into the existing Reports page. */
const DIGESTS: Array<{ key: string; title: string; cadence: string }> = [
  {
    key: 'notifications.digests.weekly',
    title: 'Weekly summary',
    cadence: 'Delivered every Monday, 8:00',
  },
  {
    key: 'notifications.digests.monthly',
    title: 'Monthly report',
    cadence: 'Metrics across all open roles',
  },
]

/** Quick per-channel notification toggles (local preferences; full settings live on /settings). */
const QUICK_PREFS: Array<{ key: string; label: string; storageKey: string; defaultOn: boolean }> = [
  {
    key: 'notifications.quick.mentions',
    label: 'Mentions & replies',
    storageKey: 'mentions',
    defaultOn: true,
  },
  {
    key: 'notifications.quick.stages',
    label: 'Stage advancements',
    storageKey: 'stages',
    defaultOn: true,
  },
  {
    key: 'notifications.quick.applicants',
    label: 'New applicants',
    storageKey: 'applicants',
    defaultOn: false,
  },
]

const PREFS_STORAGE_KEY = 'at:userNotificationPrefs'

function readQuickPrefs(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch (_error) {
    return {}
  }
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quickPrefs, setQuickPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(QUICK_PREFS.map((p) => [p.storageKey, p.defaultOn])),
  )

  useEffect(() => {
    const stored = readQuickPrefs()
    if (Object.keys(stored).length > 0) {
      setQuickPrefs((cur) => ({ ...cur, ...stored }))
    }
  }, [])

  const setQuickPref = (storageKey: string, value: boolean) => {
    setQuickPrefs((prev) => {
      const next = { ...prev, [storageKey]: value }
      try {
        window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
      } catch (_error) {
        // localStorage unavailable — the toggle still works for this session
      }
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/notifications')
      .then((res) => {
        if (!cancelled) setNotifs(unwrapList<Notification>(res))
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

  const items: FeedItem[] = notifs.map((n) => ({
    id: n.id,
    icon: TYPE_ICON[n.type],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    href: n.href,
    unread: n.unread,
  }))

  return (
    <div data-mol-id="page-notifications" className={cm.cn(cm.sp('py', 8), 'px-4 md:px-8')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      </h1>
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <div className="col-span-12 lg:col-span-8">
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : items.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
              {t('nav.noNewNotifications', {}, { defaultValue: 'No new notifications.' })}
            </p>
          ) : (
            <NotificationFeed
              items={items}
              ariaLabel={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            />
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <section
            data-testid="pipeline-digests"
            aria-labelledby="pipeline-digests-title"
            className={cm.cn(cm.card(), cm.sp('p', 5))}
          >
            <h2
              id="pipeline-digests-title"
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 4),
                'flex items-center gap-2',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                aria-hidden="true"
              >
                insights
              </span>
              {t('notifications.digests.heading', {}, { defaultValue: 'Pipeline Digests' })}
            </h2>
            <ul className={cm.cn('space-y-3')}>
              {DIGESTS.map((d) => (
                <li
                  key={d.key}
                  className={cm.cn(
                    cm.sp('p', 3),
                    'flex items-center justify-between gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {t(`${d.key}.title`, {}, { defaultValue: d.title })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(`${d.key}.cadence`, {}, { defaultValue: d.cadence })}
                    </p>
                  </div>
                  <Link
                    to="/reports"
                    data-mol-id="notifications-digest-view"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded text-primary hover:bg-primary/10 transition-colors shrink-0',
                    )}
                  >
                    {t('notifications.digests.view', {}, { defaultValue: 'View' })}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section
            data-testid="quick-preferences"
            aria-labelledby="quick-preferences-title"
            className={cm.cn(cm.card(), 'overflow-hidden')}
          >
            <h2
              id="quick-preferences-title"
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                cm.sp('px', 5),
                cm.sp('py', 4),
                'flex items-center gap-2 border-b border-outline-variant/50',
              )}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                aria-hidden="true"
              >
                tune
              </span>
              {t('notifications.quick.heading', {}, { defaultValue: 'Quick Preferences' })}
            </h2>
            <ul className="divide-y divide-outline-variant/50">
              {QUICK_PREFS.map((p) => (
                <li
                  key={p.storageKey}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(p.key, {}, { defaultValue: p.label })}
                  </span>
                  <Switch
                    checked={quickPrefs[p.storageKey]}
                    size="sm"
                    aria-label={t(p.key, {}, { defaultValue: p.label })}
                    testId={`quick-pref-${p.storageKey}`}
                    data-mol-id="notifications-quick-pref"
                    onChange={(e) =>
                      setQuickPref(p.storageKey, (e.target as HTMLInputElement).checked)
                    }
                  />
                </li>
              ))}
            </ul>
            <div
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                'bg-surface-container-low border-t border-outline-variant/50 text-center',
              )}
            >
              <Link
                to="/settings"
                data-mol-id="notifications-manage-settings"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-primary hover:underline',
                )}
              >
                {t('notifications.quick.manageAll', {}, { defaultValue: 'Manage all settings →' })}
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
