import { useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

interface ApiAuditEvent {
  id: string
  user_id: string
  action: string
  actor: string | null
  actor_type: string
  target: string | null
  ip_address: string | null
  metadata: unknown
  occurred_at: string
  created_at: string
}

const ACTION_TINT: Record<string, { fg: string; bg: string }> = {
  'endpoint.created': {
    fg: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
  },
  'endpoint.updated': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
  'endpoint.paused': {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
  },
  'endpoint.resumed': {
    fg: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
  },
  'endpoint.deleted': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
  'endpoint.tested': {
    fg: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
  },
  'endpoint.auto-paused': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
  'secret.rotated': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
  'event.subscribed': {
    fg: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
  },
  'team.role-changed': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
  'team.invited': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
  'team.removed': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
  'apikey.created': {
    fg: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
  },
  'apikey.revoked': {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
  },
  'profile.updated': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
  'session.revoked': {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
  },
  'workspace.updated': {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
  },
}

const FILTERS = [
  { key: 'all', defaultLabel: 'All actions' },
  { key: 'endpoint', defaultLabel: 'Endpoints' },
  { key: 'secret', defaultLabel: 'Secrets' },
  { key: 'team', defaultLabel: 'Team' },
  { key: 'apikey', defaultLabel: 'API keys' },
  { key: 'profile', defaultLabel: 'Profile' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const exportJson = (rows: ApiAuditEvent[]): void => {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const { data, error } = useApi<ApiAuditEvent[]>('/audit_events?limit=500')
  const events = useMemo(() => data ?? [], [data])

  const filtered = useMemo(() => {
    if (filter === 'all') return events
    return events.filter((e) => e.action.startsWith(filter))
  }, [events, filter])

  const last30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000
    return events.filter((e) => new Date(e.occurred_at).getTime() >= cutoff)
  }, [events])

  const distinctActors = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) set.add(e.actor || (e.actor_type === 'system' ? 'system' : 'user'))
    return set.size
  }, [events])

  const systemCount = useMemo(
    () => events.filter((e) => e.actor_type === 'system').length,
    [events],
  )

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="audit-log-root"
    >
      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('auditLog.eyebrow', {}, { defaultValue: 'audit · signed · immutable' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'auditLog.body',
              { app: APP_NAME },
              {
                defaultValue:
                  'Every config change {{app}} has ever recorded. Each entry is signed with the workspace audit key — verifiable from the CLI.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportJson(filtered)}
          disabled={filtered.length === 0}
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{
            border: '1px solid var(--mol-color-border)',
            color: 'var(--mol-color-text)',
          }}
          data-mol-id="audit-log-export"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            file_download
          </span>
          {t('auditLog.export', {}, { defaultValue: 'Export signed JSON' })}
        </button>
      </div>

      {error && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-3')}>
        <MetricStatCard
          eyebrow={t('auditLog.metric.entries', {}, { defaultValue: 'Entries · 30d' })}
          value={String(last30d.length)}
          tone="primary"
          icon="lock_clock"
        />
        <MetricStatCard
          eyebrow={t('auditLog.metric.actors', {}, { defaultValue: 'Distinct actors' })}
          value={String(distinctActors)}
          caption={t(
            'auditLog.metric.actorsCaption',
            { system: systemCount, human: Math.max(distinctActors - (systemCount > 0 ? 1 : 0), 0) },
            { defaultValue: '{{system}} system events' },
          )}
          tone="info"
          icon="group"
        />
        <MetricStatCard
          eyebrow={t('auditLog.metric.signed', {}, { defaultValue: 'Total entries' })}
          value={String(events.length)}
          caption={t(
            'auditLog.metric.signedCaption',
            {},
            { defaultValue: 'all-time, append-only' },
          )}
          tone="success"
          icon="verified_user"
        />
      </div>

      <div
        className={cm.cn('rounded-xl p-3 mb-5 flex items-center gap-1 flex-wrap')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="audit-log-filter-bar"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                  : 'transparent',
                color: active ? 'var(--mol-color-primary)' : 'var(--mol-color-text-secondary)',
                boxShadow: active
                  ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)'
                  : undefined,
              }}
              data-mol-id={`audit-log-filter-${f.key}`}
            >
              {t(`auditLog.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </div>

      <div
        className={cm.cn('rounded-xl overflow-hidden')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
        data-mol-id="audit-log-table"
      >
        <div
          className={cm.cn(
            'grid grid-cols-12 gap-3 px-5 py-3 font-mono text-[10px] font-black uppercase tracking-widest',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
            color: 'var(--mol-color-text-tertiary)',
            borderBottom: '1px solid var(--mol-color-border)',
          }}
        >
          <span className={cm.cn('col-span-2')}>
            {t('auditLog.columns.when', {}, { defaultValue: 'When' })}
          </span>
          <span className={cm.cn('col-span-3')}>
            {t('auditLog.columns.actor', {}, { defaultValue: 'Actor' })}
          </span>
          <span className={cm.cn('col-span-3')}>
            {t('auditLog.columns.action', {}, { defaultValue: 'Action' })}
          </span>
          <span className={cm.cn('col-span-2 hidden md:block')}>
            {t('auditLog.columns.target', {}, { defaultValue: 'Target' })}
          </span>
          <span className={cm.cn('col-span-2 hidden md:block')}>
            {t('auditLog.columns.signature', {}, { defaultValue: 'IP / source' })}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className={cm.cn('px-8 py-12 text-center')} data-mol-id="audit-log-empty">
            <p
              className={cm.cn('font-mono text-sm font-bold mb-1')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {events.length === 0
                ? t('auditLog.empty.all', {}, { defaultValue: 'No audit entries yet.' })
                : t(
                    'auditLog.empty.filtered',
                    {},
                    { defaultValue: 'No entries match that filter.' },
                  )}
            </p>
            <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
              {t(
                'auditLog.emptyHint',
                {},
                {
                  defaultValue:
                    'Mutations like creating endpoints, rotating secrets, or revoking keys will appear here.',
                },
              )}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((entry) => {
              const tint = ACTION_TINT[entry.action] ?? {
                fg: 'var(--mol-color-text-secondary)',
                bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
              }
              return (
                <li
                  key={entry.id}
                  className={cm.cn(
                    'grid grid-cols-12 gap-3 px-5 py-3 items-center transition-colors hover:bg-surface/5',
                  )}
                  style={{
                    borderBottom:
                      '1px solid color-mix(in srgb, var(--mol-color-border) 50%, transparent)',
                  }}
                  data-mol-id={`audit-log-row-${entry.id}`}
                >
                  <span
                    className={cm.cn('col-span-2 font-mono text-xs')}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {new Date(entry.occurred_at).toLocaleString()}
                  </span>
                  <span className={cm.cn('col-span-3 min-w-0')}>
                    <span
                      className={cm.cn('block text-sm font-bold truncate')}
                      style={{ color: 'var(--mol-color-text)' }}
                    >
                      {entry.actor ?? (entry.actor_type === 'system' ? 'system' : 'you')}
                    </span>
                    <span
                      className={cm.cn('block font-mono text-[11px] truncate')}
                      style={{ color: 'var(--mol-color-text-tertiary)' }}
                    >
                      {entry.actor_type}
                    </span>
                  </span>
                  <span className={cm.cn('col-span-3')}>
                    <span
                      className={cm.cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold tracking-widest',
                      )}
                      style={{ backgroundColor: tint.bg, color: tint.fg }}
                    >
                      {entry.action}
                    </span>
                  </span>
                  <span
                    className={cm.cn('col-span-2 font-mono text-xs truncate hidden md:block')}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                    title={entry.target ?? ''}
                  >
                    {entry.target ?? '—'}
                  </span>
                  <span
                    className={cm.cn('col-span-2 font-mono text-[11px] truncate hidden md:block')}
                    style={{ color: 'var(--mol-color-text-tertiary)' }}
                    title={entry.ip_address ?? ''}
                  >
                    {entry.ip_address ?? '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
