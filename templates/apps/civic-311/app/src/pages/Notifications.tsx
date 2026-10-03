import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader } from '../components/StatusBadge.js'
import { timeAgo } from '../lib/issues.js'

interface NotificationRow {
  id: string
  kind: 'watch_area_issue' | 'status_change' | 'confirmation' | 'note' | 'comment' | string
  issue_id: string | null
  message: string
  read_at: string | null
  created_at: string
}

interface WatchAreaRow {
  id: string
  name: string
  radius: number
  derived_address: string
}

const KIND_ICONS: Record<string, string> = {
  watch_area_issue: 'notifications_active',
  status_change: 'swap_horiz',
  confirmation: 'thumb_up',
  note: 'campaign',
  comment: 'chat_bubble',
}

/** Notifications — the in-app feed driven by watch areas + report activity. */
export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zones, setZones] = useState<WatchAreaRow[]>([])

  useEffect(() => {
    document.title = t(
      'notifications.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Notifications — {{appName}}' },
    )
  }, [t])

  // Watched geofences strip (design: the subscription summary under the feed).
  useEffect(() => {
    let cancelled = false
    async function loadZones() {
      try {
        const res = await http.get('/api/watch-areas')
        const raw: WatchAreaRow[] = Array.isArray(res)
          ? (res as WatchAreaRow[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: WatchAreaRow[] }).data
            : []
        if (!cancelled) setZones(raw)
      } catch (_error) {
        // Summary is a nice-to-have — the feed works without it.
      }
    }
    void loadZones()
    return () => {
      cancelled = true
    }
  }, [http])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/notifications')
      // useHttpClient resolves an HttpResponse envelope — the JSON body lives
      // under `data` (same unwrap every other page here does). Reading
      // `res.items` directly always saw `undefined` and rendered the empty
      // state even when the feed held rows.
      const o = ((res as { data?: unknown })?.data ?? res) as
        { items?: NotificationRow[]; unread?: number } | NotificationRow[]
      const rows = Array.isArray(o)
        ? o
        : Array.isArray((o as { items?: NotificationRow[] })?.items)
          ? (o as { items: NotificationRow[] }).items
          : []
      setItems(rows)
      if (!Array.isArray(o) && typeof (o as { unread?: number }).unread === 'number') {
        setUnread((o as { unread: number }).unread)
      } else {
        setUnread(rows.filter((r) => !r.read_at).length)
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(
        t(
          'notifications.loadError',
          {},
          { defaultValue: "Couldn't load notifications. Try again in a moment." },
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  async function markAllRead() {
    try {
      await http.post('/api/notifications/read-all', {})
      await load()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async function markRead(id: string) {
    try {
      await http.post(`/api/notifications/${id}/read`, {})
      await load()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar>
        <main data-mol-id="page-notifications" className={cm.cn(cm.minH('screen'))}>
          <div
            className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('py', 8), cm.stack(6))}
          >
            <PageHeader
              molId="notifications-title"
              title={t(
                'notifications.title',
                {},
                { defaultValue: 'Civic Notifications & Dispatch Telemetry' },
              )}
              subtitle={t(
                'notifications.subtitle',
                {},
                {
                  defaultValue:
                    'New reports inside your watch areas, status changes on your reports, confirmations and city responses.',
                },
              )}
              action={
                unread > 0 ? (
                  <button
                    type="button"
                    data-mol-id="notifications-mark-all"
                    onClick={() => void markAllRead()}
                    className={cm.cn(
                      cm.sp('px', 4),
                      'rounded-lg py-2 text-sm font-semibold shrink-0',
                      'border border-outline-variant text-on-surface hover:bg-surface-container-low',
                    )}
                  >
                    {t(
                      'notifications.markAllRead',
                      { count: unread },
                      { defaultValue: 'Mark all read ({{count}})' },
                    )}
                  </button>
                ) : null
              }
            />

            <section
              className={cm.stack(3)}
              data-mol-id="notifications-list"
              data-loaded={!loading}
            >
              {loading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : error ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                  data-mol-id="notifications-error"
                >
                  {error}
                </p>
              ) : items.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-mol-id="notifications-empty"
                >
                  {t(
                    'notifications.empty',
                    {},
                    {
                      defaultValue:
                        "Nothing yet. Save a watch area and you'll hear about nearby reports here.",
                    },
                  )}
                </p>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div
                      className={cm.cn(cm.flex({ align: 'start', gap: 4 }), cm.flex1, cm.stack(1))}
                    >
                      <div className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight(n.read_at ? 'normal' : 'semibold'),
                          )}
                        >
                          {n.message}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {timeAgo(n.created_at, t)}
                        </span>
                      </div>
                    </div>
                  )
                  return (
                    <div
                      key={n.id}
                      data-mol-id="notification-item"
                      data-kind={n.kind}
                      data-read={Boolean(n.read_at)}
                      data-issue-id={n.issue_id}
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 4 }),
                        cm.sp('p', 4),
                        'rounded-lg border transition-colors',
                        n.read_at
                          ? 'border-outline-variant/40 bg-surface-container-low/30'
                          : 'border-outline-variant bg-surface-container-low/70',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.w(2),
                          cm.h(2),
                          cm.roundedFull,
                          cm.sp('mt', 2),
                          n.read_at ? 'bg-surface-variant' : 'bg-primary',
                        )}
                        aria-hidden
                      />
                      <span
                        className="material-symbols-outlined text-on-surface-variant text-lg"
                        aria-hidden
                      >
                        {KIND_ICONS[n.kind] ?? 'notifications'}
                      </span>
                      {n.issue_id ? (
                        <Link
                          to={`/reports/${n.issue_id}`}
                          data-mol-id="notification-open"
                          className={cm.cn(cm.flex1, 'min-w-0')}
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                      {!n.read_at && (
                        <button
                          type="button"
                          data-mol-id="notification-mark-read"
                          onClick={() => void markRead(n.id)}
                          className="text-xs underline text-on-surface-variant hover:text-primary"
                        >
                          {t('notifications.markRead', {}, { defaultValue: 'Mark read' })}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </section>

            {/* Side rails of the design: delivery channels + watched geofences */}
            <div className={cnRails(cm)}>
              {/* Delivery Channels (design h3) */}
              <section
                data-mol-id="notifications-channels"
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 4),
                  'rounded-lg border border-outline-variant/40 bg-surface-container-lowest',
                )}
              >
                <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t('notifications.channels', {}, { defaultValue: 'Delivery Channels' })}
                </h3>
                <ul className={cm.stack(2)}>
                  {(
                    [
                      ['inapp', 'notifications', true, 'In-app feed'],
                      ['email', 'mail', true, 'Email digests'],
                      [
                        'sms',
                        'sms',
                        false,
                        'SMS dispatch alerts (verify a phone number in Settings)',
                      ],
                    ] as const
                  ).map(([id, icon, on, label]) => (
                    <li
                      key={id}
                      className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}
                    >
                      <span
                        className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('sm'))}
                      >
                        <span
                          className="material-symbols-outlined text-[18px] text-primary"
                          aria-hidden
                        >
                          {icon}
                        </span>
                        {t(`notifications.channel.${id}`, {}, { defaultValue: label })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full',
                          on
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-variant text-on-surface-variant',
                        )}
                      >
                        {on
                          ? t('notifications.channelOn', {}, { defaultValue: 'On' })
                          : t('notifications.channelOff', {}, { defaultValue: 'Setup' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              {/* Watched Geofences (design h3) */}
              <section
                data-mol-id="notifications-geofences"
                className={cm.cn(
                  cm.stack(2),
                  cm.sp('p', 4),
                  'rounded-lg border border-outline-variant/40 bg-surface-container-lowest',
                )}
              >
                <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t('notifications.geofences', {}, { defaultValue: 'Watched Geofences' })}
                </h3>
                {zones.length === 0 ? (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'notifications.noGeofences',
                      {},
                      {
                        defaultValue:
                          'No geofences yet — save a watch area to scope this feed to your zones.',
                      },
                    )}
                  </p>
                ) : (
                  <ul className={cm.stack(2)}>
                    {zones.map((zone) => (
                      <li
                        key={zone.id}
                        className={cm.flex({ align: 'center', justify: 'between', gap: 2 })}
                      >
                        <span className={cm.cn(cm.textSize('sm'), 'min-w-0 truncate')}>
                          {zone.name}
                        </span>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}
                        >
                          {t(
                            'notifications.zoneRadius',
                            { radius: zone.radius },
                            { defaultValue: '{{radius}} blocks' },
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </main>
      </SideNavBar>
    </div>
  )
}

export default Notifications

/** The two design side rails, side-by-side on wide screens. */
const cnRails = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(cm.grid({ cols: 2, gap: 'md' }))
