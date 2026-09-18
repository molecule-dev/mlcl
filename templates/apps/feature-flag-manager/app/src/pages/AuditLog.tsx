import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AuditAction, AuditEntry, type AuditEntryData } from '../components/AuditEntry.js'

/**
 * Org-wide audit log — paginated activity feed with action filters
 * and actor search. Pulls /api/audit-log live.
 */

interface AuditApi {
  id: string
  flag_id?: string | null
  actor_id?: string | null
  actor?: string | null
  actor_email?: string | null
  action: string
  target?: string | null
  message?: string | null
  diff?: string[] | null
  before?: unknown
  after?: unknown
  created_at: string
}

const ACTION_FILTERS = [
  'all',
  'created',
  'updated',
  'toggled_on',
  'toggled_off',
  'killed',
  'targeting_changed',
  'rollout_changed',
] as const
type ActionFilter = (typeof ACTION_FILTERS)[number]

const KNOWN_ACTIONS: ReadonlyArray<AuditAction> = [
  'created',
  'updated',
  'toggled_on',
  'toggled_off',
  'deleted',
  'targeting_changed',
  'rollout_changed',
  'killed',
]
const toAuditAction = (s: string): AuditAction =>
  (KNOWN_ACTIONS as readonly string[]).includes(s) ? (s as AuditAction) : 'updated'

const shapeAudit = (row: AuditApi): AuditEntryData => ({
  id: String(row.id),
  actor: row.actor_email ?? row.actor ?? row.actor_id ?? 'system',
  action: toAuditAction(row.action),
  target: row.target ?? '',
  created_at: row.created_at,
  message: row.message ?? '',
  diff: Array.isArray(row.diff) ? row.diff : undefined,
})

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<AuditEntryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActionFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await http.get<AuditApi[]>('/api/audit-log?limit=200')
        const arr = Array.isArray(res.data) ? res.data : []
        if (!cancelled) setEntries(arr.map(shapeAudit))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = entries.filter((entry) => {
    if (filter !== 'all' && entry.action !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!entry.actor.toLowerCase().includes(q) && !entry.target.toLowerCase().includes(q))
        return false
    }
    return true
  })

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-audit">
      <header>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-link)' }}
        >
          {t('audit.kicker', {}, { defaultValue: '// /audit' })}
        </p>
        <h1 className={cm.cn('mt-1 text-3xl font-extrabold tracking-tight text-on-surface')}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </h1>
        <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
          {t(
            'audit.subheading',
            { count: entries.length },
            {
              defaultValue:
                'Every flag change across the organisation. {{count}} events on screen.',
            },
          )}
        </p>
      </header>

      <div
        className={cm.cn('rounded-xl px-4 py-3')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          <div className={cm.cn('relative flex-1 min-w-[240px]')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base',
              )}
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'audit.searchPlaceholder',
                {},
                { defaultValue: 'Search by actor or flag key…' },
              )}
              className={cm.cn(
                'h-9 w-full rounded-md pl-9 pr-3 font-mono text-sm transition-colors',
              )}
              style={{
                backgroundColor: 'var(--color-code-block)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                color: 'var(--color-text-code)',
              }}
            />
          </div>
          <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('audit.actionFilter', {}, { defaultValue: 'Action' })}
            </span>
            {ACTION_FILTERS.map((f) => {
              const active = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cm.cn(
                    'rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors',
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--color-env-filter-active-bg)',
                          color: 'var(--color-env-filter-active-text)',
                        }
                      : {
                          backgroundColor: 'var(--color-surface-container-high)',
                          color: 'var(--color-text-muted)',
                        }
                  }
                >
                  {t(`audit.action.${f}`, {}, { defaultValue: f })}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <section
        className={cm.cn('rounded-xl')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        {loading ? (
          <p className={cm.cn(cm.textMuted, 'p-6')}>
            {t('audit.loading', {}, { defaultValue: 'Loading audit log…' })}
          </p>
        ) : error ? (
          <p className={cm.cn('p-6 text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
            {t(
              'audit.error',
              { message: error },
              { defaultValue: 'Could not load audit log ({{message}}).' },
            )}
          </p>
        ) : visible.length === 0 ? (
          <p className={cm.cn(cm.textMuted, 'p-6')}>
            {t('audit.empty', {}, { defaultValue: 'No matching activity.' })}
          </p>
        ) : (
          <ul>
            {visible.map((entry, i, arr) => (
              <AuditEntry key={entry.id} entry={entry} noBorder={i === arr.length - 1} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
