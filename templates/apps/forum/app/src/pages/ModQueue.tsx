/**
 * ModQueue — /mod moderator queue.
 *
 * Layout: KPI strip → tabs (Reports / Auto-mod / Mod log) → reported
 * items list with quick-actions, or a chronological log of resolved
 * actions.
 *
 * Backed by `/api/moderation/reports?status=...` (mod-only). The
 * Resolve action posts to `/api/moderation/reports/:id/resolve` with
 * the chosen `action` (dismiss / warn / remove / ban). The "Mod log"
 * tab fetches `?status=resolved` + `?status=dismissed` and renders the
 * combined audit trail.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatRelativeTime } from '../utils/threads.js'

const TABS = [
  { id: 'reports', icon: 'flag', labelKey: 'modQueue.tabReports', defaultLabel: 'Reports' },
  { id: 'automod', icon: 'auto_fix', labelKey: 'modQueue.tabAutomod', defaultLabel: 'Auto-mod' },
  { id: 'log', icon: 'history', labelKey: 'modQueue.tabLog', defaultLabel: 'Mod log' },
] as const

type TabId = (typeof TABS)[number]['id']

interface ApiReport {
  id: string
  target_type: 'thread' | 'reply'
  target_id: string
  reporter_id: string
  reason: string
  description: string | null
  status: 'pending' | 'resolved' | 'dismissed'
  action: string | null
  created_at: string
  resolved_at?: string | null
  moderator_id?: string | null
}

const ACTIONS = [
  { id: 'dismiss', label: 'Dismiss', icon: 'check_circle', tone: 'success' },
  { id: 'remove', label: 'Remove', icon: 'delete', tone: 'error' },
  { id: 'warn', label: 'Warn', icon: 'warning', tone: 'warning' },
  { id: 'ban', label: 'Ban', icon: 'block', tone: 'error' },
] as const

export function ModQueue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('reports')
  const [reports, setReports] = useState<ApiReport[]>([])
  const [logEntries, setLogEntries] = useState<ApiReport[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [logLoading, setLogLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  // Session KPI counters — incremented as the moderator works the queue.
  const [sessionResolved, setSessionResolved] = useState(0)
  const [sessionDismissed, setSessionDismissed] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const http = getHttpClient()
      const res = await http.get<ApiReport[] | { error: string }>(
        '/api/moderation/reports?status=pending',
      )
      if (Array.isArray(res.data)) {
        setReports(res.data)
        setForbidden(false)
      } else {
        setReports([])
      }
    } catch (e) {
      const status =
        (e as { status?: number; response?: { status?: number } } | null)?.status ??
        (e as { response?: { status?: number } } | null)?.response?.status
      if (status === 403 || status === 401) {
        setForbidden(true)
      } else {
        setError(t('modQueue.loadError', {}, { defaultValue: 'Could not load reports.' }))
      }
    } finally {
      setLoading(false)
    }
  }, [t])

  /**
   * Loads resolved + dismissed reports for the Mod log tab.
   * Uses two parallel calls because the API filters one status at a time.
   */
  const loadLog = useCallback(async () => {
    setLogLoading(true)
    setError(null)
    try {
      const http = getHttpClient()
      const [resolved, dismissed] = await Promise.all([
        http.get<ApiReport[] | { error: string }>('/api/moderation/reports?status=resolved'),
        http.get<ApiReport[] | { error: string }>('/api/moderation/reports?status=dismissed'),
      ])
      const a = Array.isArray(resolved.data) ? resolved.data : []
      const b = Array.isArray(dismissed.data) ? dismissed.data : []
      const combined = [...a, ...b].sort(
        (x, y) =>
          new Date(y.resolved_at ?? y.created_at).getTime() -
          new Date(x.resolved_at ?? x.created_at).getTime(),
      )
      setLogEntries(combined)
      setForbidden(false)
    } catch (e) {
      const status =
        (e as { status?: number; response?: { status?: number } } | null)?.status ??
        (e as { response?: { status?: number } } | null)?.response?.status
      if (status === 403 || status === 401) {
        setForbidden(true)
      } else {
        setError(t('modQueue.logLoadError', {}, { defaultValue: 'Could not load mod log.' }))
      }
    } finally {
      setLogLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (tab === 'reports') void load()
    if (tab === 'log') void loadLog()
  }, [tab, load, loadLog])

  const handleAction = useCallback(
    async (reportId: string, action: 'dismiss' | 'remove' | 'warn' | 'ban') => {
      setResolvingId(reportId)
      try {
        const http = getHttpClient()
        await http.post(`/api/moderation/reports/${reportId}/resolve`, { action })
        void track({
          name: 'moderation.resolved',
          properties: {
            report_id: reportId,
            action,
            status: action === 'dismiss' ? 'dismissed' : 'resolved',
          },
        })
        setReports((prev) => prev.filter((r) => r.id !== reportId))
        if (action === 'dismiss') {
          setSessionDismissed((n) => n + 1)
        } else {
          setSessionResolved((n) => n + 1)
        }
      } catch (error) {
        logError('modQueue.handleAction', error)
        setError(t('modQueue.resolveFailed', {}, { defaultValue: 'Resolve failed. Try again.' }))
      } finally {
        setResolvingId(null)
      }
    },
    [t],
  )

  const stats = useMemo(
    () => [
      {
        labelKey: 'modQueue.statPending',
        defaultLabel: 'Pending reports',
        value: reports.length,
        tone: 'var(--mol-color-error)',
      },
      {
        labelKey: 'modQueue.statRemoved',
        defaultLabel: 'Resolved this session',
        value: sessionResolved,
        tone: 'var(--color-moderator)',
      },
      {
        labelKey: 'modQueue.statApproved',
        defaultLabel: 'Dismissed this session',
        value: sessionDismissed,
        tone: 'var(--mol-color-success)',
      },
      {
        labelKey: 'modQueue.statAutomod',
        defaultLabel: 'Auto-mod (24h)',
        value: 0,
        tone: 'var(--color-pinned, var(--mol-color-primary))',
      },
    ],
    [reports.length, sessionResolved, sessionDismissed],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('modQueue.eyebrow', {}, { defaultValue: 'Moderation' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('modQueue.title', {}, { defaultValue: 'Mod queue' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'modQueue.subtitle',
            {},
            {
              defaultValue:
                'Reports awaiting review, auto-mod activity, and a log of every action taken.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn('grid gap-3 grid-cols-2 md:grid-cols-4')}>
        {stats.map((stat) => (
          <div
            key={stat.labelKey}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-low/40 transition-transform hover:-translate-y-0.5',
            )}
            style={{ borderLeft: `4px solid ${stat.tone}` }}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl font-extrabold tabular-nums text-on-surface',
              )}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          'border-b border-outline-variant/30 flex-wrap',
        )}
      >
        {TABS.map((current) => {
          const isActive = current.id === tab
          return (
            <button
              key={current.id}
              type="button"
              onClick={() => setTab(current.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'transition-colors',
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant border-b-2 border-transparent hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{current.icon}</span>
              {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
            </button>
          )
        })}
      </div>

      {tab === 'reports' && (
        <>
          {loading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('modQueue.loading', {}, { defaultValue: 'Loading reports…' })}
            </p>
          )}
          {forbidden && (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
                cm.sp('p', 8),
                'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant text-center',
              )}
            >
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('modQueue.notAuthorized', {}, { defaultValue: 'Moderator access required.' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'))}>
                {t(
                  'modQueue.notAuthorizedHint',
                  {},
                  { defaultValue: 'Promote your account to moderator or admin to review reports.' },
                )}
              </p>
            </div>
          )}
          {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}
          {!loading && !forbidden && reports.length === 0 && !error && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('modQueue.empty', {}, { defaultValue: 'Inbox zero. Nothing pending.' })}
            </p>
          )}
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {reports.map((r) => (
              <li
                key={r.id}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface',
                )}
                style={{
                  border: '1px solid color-mix(in srgb, var(--color-moderator) 20%, transparent)',
                  borderLeft: '4px solid var(--color-moderator)',
                }}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'flex-wrap text-on-surface-variant',
                  )}
                >
                  <span
                    className={cm.cn('rounded-full px-2.5 py-0.5')}
                    style={{
                      backgroundColor: 'var(--color-moderator-light, var(--color-moderator-light))',
                      color: 'var(--color-moderator, var(--color-moderator))',
                    }}
                  >
                    {r.target_type === 'thread'
                      ? t('modQueue.kindThread', {}, { defaultValue: 'Thread' })
                      : t('common.reply', {}, { defaultValue: 'Reply' })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeTime(r.created_at)}</span>
                </div>
                <h3
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    'text-on-surface leading-snug',
                  )}
                >
                  {r.reason}
                </h3>
                {r.description && (
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                    style={{ fontFamily: 'var(--font-family-serif)' }}
                  >
                    {r.description}
                  </p>
                )}
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('modQueue.targetIdLabel', {}, { defaultValue: 'Target ID' })}:{' '}
                  <code>{r.target_id}</code>
                </span>
                <footer
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'end', gap: 'xs' }),
                    'flex-wrap',
                  )}
                >
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={resolvingId === r.id}
                      onClick={() => void handleAction(r.id, action.id)}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        'rounded-full border border-outline-variant/40 hover:bg-surface-container-low/60 transition-colors disabled:opacity-50',
                        action.tone === 'error'
                          ? 'text-error hover:border-error/40'
                          : action.tone === 'warning'
                            ? 'text-warning hover:border-warning/40'
                            : action.tone === 'success'
                              ? 'text-success hover:border-success/40'
                              : 'text-primary hover:border-primary/40',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-sm')}>
                        {action.icon}
                      </span>
                      {t(`modQueue.action_${action.id}`, {}, { defaultValue: action.label })}
                    </button>
                  ))}
                </footer>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'automod' && (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 6),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('modQueue.automodTitle', {}, { defaultValue: 'Auto-mod activity (last 24h)' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'modQueue.automodEmpty',
              {},
              { defaultValue: 'No auto-mod rules configured for this community yet.' },
            )}
          </p>
        </div>
      )}

      {tab === 'log' && (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('modQueue.logTitle', {}, { defaultValue: 'Mod log' })}
          </h2>
          {logLoading && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('modQueue.logLoading', {}, { defaultValue: 'Loading log…' })}
            </p>
          )}
          {forbidden && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('modQueue.notAuthorized', {}, { defaultValue: 'Moderator access required.' })}
            </p>
          )}
          {!logLoading && !forbidden && logEntries.length === 0 && !error && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('modQueue.logEmpty', {}, { defaultValue: 'No moderation actions yet.' })}
            </p>
          )}
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'rounded-xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
            )}
          >
            {logEntries.map((entry) => (
              <li
                key={entry.id}
                className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('p', 4))}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-full px-2 py-0.5 uppercase tracking-widest',
                    )}
                    style={
                      entry.status === 'dismissed'
                        ? {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-resolved) 12%, transparent)',
                            color: 'var(--color-resolved)',
                          }
                        : {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-moderator) 12%, transparent)',
                            color: 'var(--color-moderator)',
                          }
                    }
                  >
                    {entry.action ?? entry.status}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {entry.target_type === 'thread'
                      ? t('modQueue.kindThread', {}, { defaultValue: 'Thread' })
                      : t('common.reply', {}, { defaultValue: 'Reply' })}{' '}
                    <code className={cm.cn('text-on-surface-variant')}>
                      {entry.target_id.slice(0, 8)}
                    </code>
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
                    {formatRelativeTime(entry.resolved_at ?? entry.created_at)}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  <span className={cm.cn(cm.fontWeight('semibold'))}>{entry.reason}</span>
                  {entry.description ? ` — ${entry.description}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ModQueue
