import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface NotificationRow {
  id: string
  kind: 'page' | 'ack' | 'resolve' | 'escalate' | 'note' | 'assignment' | 'status' | 'system'
  severity: Severity
  title: string
  detail: string
  href?: string | null
  read: boolean
  created_at: string
}

const KIND_ICON: Record<NotificationRow['kind'], string> = {
  page: 'notifications_active',
  ack: 'how_to_reg',
  resolve: 'check_circle',
  escalate: 'moving',
  note: 'sticky_note_2',
  assignment: 'assignment_ind',
  status: 'swap_horiz',
  system: 'info',
}

/** Carrier trunk rows for the health card (design: Carrier Trunk Health). */
const CARRIER_TRUNKS = [
  { key: 'voice', name: 'Voice trunks (SS7 direct)', status: '100% up' },
  { key: 'sms', name: 'SMS gateway mesh', status: '100% up' },
  { key: 'push', name: 'APNs / FCM critical push', status: 'p99 180ms' },
  { key: 'slack', name: 'Slack interactive bot', status: 'connected' },
] as const

type ClassMap = ReturnType<typeof getClassMap>
type TFunc = ReturnType<typeof useTranslation>['t']

interface FeedRowProps {
  item: NotificationRow
  cm: ClassMap
  t: TFunc
  /** Unacknowledged pages render the delivery trace disclosure. */
  trace?: boolean
}

/**
 * One pager-feed row. Carries the `activity-<id>` anchor the e2e suite
 * counts against the API list length — exactly one element per item.
 */
function FeedRow({ item, cm, t, trace = false }: FeedRowProps) {
  const body = (
    <>
      <span
        className={cm.cn('material-symbols-outlined text-base shrink-0 mt-0.5')}
        style={{ color: BRAND_COLOR }}
        aria-hidden="true"
      >
        {KIND_ICON[item.kind] ?? 'notifications'}
      </span>
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
          <SeverityPill severity={item.severity} />
          <p className={cm.cn('font-bold text-sm')} style={{ color: 'var(--color-text)' }}>
            {item.title}
          </p>
          {!item.read ? (
            <span
              className={cm.cn('ml-1 h-1.5 w-1.5 rounded-full')}
              style={{ backgroundColor: BRAND_COLOR }}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <p
          className={cm.cn('mt-1 font-mono text-xs')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {item.detail}
        </p>
        {trace ? (
          <details
            className={cm.cn('mt-2 rounded-md border font-mono text-[11px]')}
            style={{ borderColor: 'var(--color-border-subtle)' }}
            data-mol-id={`notification-trace-${item.id}`}
          >
            <summary
              className={cm.cn(
                'px-2.5 py-1.5 cursor-pointer select-none uppercase tracking-widest font-bold',
              )}
              style={{ color: BRAND_COLOR }}
            >
              {t('notifications.deliveryTrace', {}, { defaultValue: 'Delivery Trace' })}
            </summary>
            <div
              className={cm.cn('px-2.5 pb-2.5 space-y-1')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <p>
                {t('notifications.traceDispatched', {}, { defaultValue: 'dispatched' })}{' '}
                {new Date(item.created_at).toLocaleString()}
              </p>
              <p>
                {t('notifications.traceChannel', {}, { defaultValue: 'channel' })}:{' '}
                {t('notifications.traceInApp', {}, { defaultValue: 'in-app pager (this feed)' })}
              </p>
              {item.href ? (
                <Link
                  to={item.href}
                  className={cm.cn('underline hover:opacity-80')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t(
                    'notifications.traceOpenIncident',
                    {},
                    { defaultValue: 'Open the incident →' },
                  )}
                </Link>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
      <span
        className={cm.cn('font-mono text-xs whitespace-nowrap mt-0.5')}
        style={{ color: 'var(--color-severity-muted)' }}
      >
        {fmtRelative(item.created_at)}
      </span>
    </>
  )
  const rowClass = cm.cn(
    'rounded-xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5',
  )
  const rowStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    opacity: item.read ? 0.78 : 1,
  }
  return (
    <li data-mol-id={`activity-${item.id}`} className={rowClass} style={rowStyle}>
      {body}
    </li>
  )
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    return http
      .get('/api/notifications')
      .then((res) => {
        setItems(unwrapList<NotificationRow>(res))
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load notifications.'),
      )
      .finally(() => setLoading(false))
  }, [http])

  useEffect(() => {
    refetch()
  }, [refetch])

  const unread = items.filter((i) => !i.read).length

  /**
   * Design grouping: unacknowledged pages pin to the top as ACTION REQUIRED;
   * the rest split into the past-hour timeline and earlier history. The three
   * groups partition `items` — every row renders exactly once so the
   * `activity-` anchor count always equals the API list length.
   */
  const activePages = items.filter((i) => i.kind === 'page' && !i.read)
  const activeIds = new Set(activePages.map((i) => i.id))
  const HOUR_MS = 60 * 60_000
  const recent = items.filter(
    (i) => !activeIds.has(i.id) && Date.now() - new Date(i.created_at).getTime() <= HOUR_MS,
  )
  const recentIds = new Set(recent.map((i) => i.id))
  const earlier = items.filter((i) => !activeIds.has(i.id) && !recentIds.has(i.id))

  const onMarkAllRead = async () => {
    setMarking(true)
    try {
      await http.post('/api/notifications/read-all', {})
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications read.')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'notifications.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} inbox' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('notifications.feedTitle', {}, { defaultValue: 'Notifications & Pager Feed' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('notifications.subheading', { unread }, { defaultValue: '{{unread}} unread' })}
          </p>
        </div>
        <button
          onClick={() => {
            if (!marking && unread > 0) onMarkAllRead()
          }}
          type="button"
          disabled={marking || unread === 0}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:bg-surface/5 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-mol-id="notifications-mark-all-read"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            done_all
          </span>
          {marking
            ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
            : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
        </button>
      </header>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : items.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            inbox
          </span>
          <p className={cm.cn('text-sm')}>
            {t('notifications.empty', {}, { defaultValue: 'Nothing in your inbox.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-8')}>
          {/* ACTION REQUIRED — unacknowledged pages, pinned */}
          {activePages.length > 0 ? (
            <section data-mol-id="notifications-active-pages">
              <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
                <h2
                  className={cm.cn('text-lg font-bold tracking-tight')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    'notifications.activePages',
                    {},
                    { defaultValue: 'Active & Unacknowledged Pages' },
                  )}
                </h2>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest animate-pulse',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-critical-light)',
                    color: 'var(--color-severity-critical)',
                  }}
                >
                  <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                    emergency_home
                  </span>
                  {t(
                    'notifications.actionRequired',
                    { count: activePages.length },
                    { defaultValue: '{{count}} ACTION REQUIRED' },
                  )}
                </span>
              </div>
              <ul className={cm.cn('space-y-3')}>
                {activePages.map((item) => (
                  <FeedRow key={item.id} item={item} cm={cm} t={t} trace />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Past-hour dispatch timeline */}
          {recent.length > 0 ? (
            <section data-mol-id="notifications-recent">
              <h2
                className={cm.cn('text-lg font-bold tracking-tight mb-3')}
                style={{ color: 'var(--color-text)' }}
              >
                {t(
                  'notifications.recentTimeline',
                  {},
                  { defaultValue: 'Recent Timeline (Past 1 Hour)' },
                )}
              </h2>
              <ul className={cm.cn('space-y-3')}>
                {recent.map((item) => (
                  <FeedRow key={item.id} item={item} cm={cm} t={t} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Earlier history */}
          {earlier.length > 0 ? (
            <section data-mol-id="notifications-earlier">
              <h2
                className={cm.cn('text-lg font-bold tracking-tight mb-3')}
                style={{ color: 'var(--color-text)' }}
              >
                {t('notifications.earlierToday', {}, { defaultValue: 'Earlier Today' })}
              </h2>
              <ul className={cm.cn('space-y-3')}>
                {earlier.map((item) => (
                  <FeedRow key={item.id} item={item} cm={cm} t={t} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* Pager binding + carrier trunk health (design: side rail cards) */}
          <div className={cm.cn('grid gap-4 grid-cols-1 lg:grid-cols-2')}>
            <section
              className={cm.cn('rounded-xl p-5')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              data-mol-id="notifications-pager-binding"
            >
              <h2
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: BRAND_COLOR }}
                  aria-hidden="true"
                >
                  phone_iphone
                </span>
                {t('notifications.pagerBinding', {}, { defaultValue: 'Personal Pager Binding' })}
              </h2>
              <p className={cm.cn('text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                {t(
                  'notifications.pagerBound',
                  { app: APP_NAME },
                  { defaultValue: 'In-app pager bound to this account' },
                )}
              </p>
              <p
                className={cm.cn('mt-1 font-mono text-xs')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'notifications.pagerBindingNote',
                  {},
                  {
                    defaultValue:
                      'Critical pages wake the app via the hardware push channel and pierce Do-Not-Disturb — no tab needs to be open.',
                  },
                )}
              </p>
              <span
                className={cm.cn(
                  'mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                )}
                style={{
                  backgroundColor: 'var(--color-severity-resolved-light)',
                  color: 'var(--color-severity-resolved)',
                }}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full')}
                  style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                  aria-hidden="true"
                />
                {t('notifications.bindingArmed', {}, { defaultValue: 'armed' })}
              </span>
            </section>

            <section
              className={cm.cn('rounded-xl p-5')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              data-mol-id="notifications-carrier-health"
            >
              <h2
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5',
                )}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: BRAND_COLOR }}
                  aria-hidden="true"
                >
                  cell_tower
                </span>
                {t('notifications.carrierHealth', {}, { defaultValue: 'Carrier Trunk Health' })}
              </h2>
              <ul className={cm.cn('space-y-2')}>
                {CARRIER_TRUNKS.map((trunk) => (
                  <li key={trunk.key} className={cm.cn('flex items-center gap-2')}>
                    <span
                      className={cm.cn('h-2 w-2 rounded-full shrink-0')}
                      style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('text-sm flex-1 truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {t(
                        `notifications.trunk.${trunk.key}.name` as 'notifications.trunk.voice.name',
                        {},
                        { defaultValue: trunk.name },
                      )}
                    </span>
                    <span
                      className={cm.cn('font-mono text-[11px]')}
                      style={{ color: 'var(--color-severity-resolved)' }}
                    >
                      {trunk.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
