import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface AuditEntryApi {
  id: string
  actor: string
  action: string
  resource: string
  resourceId?: string | null
  timestamp: string
  ip?: string | null
  details?: Record<string, unknown> | null
  secret_id?: string | null
  vault_id?: string | null
}

const ACTION_TONE: Record<string, SecretStatusTone> = {
  'secret.created': 'inherited',
  'secret.read': 'masked',
  'secret.updated': 'expiring',
  'secret.rotated': 'active',
  'secret.deleted': 'revoked',
  'vault.created': 'inherited',
  'vault.deleted': 'revoked',
}

export function AuditLog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<AuditEntryApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<AuditEntryApi[]>('/api/audit-log?perPage=200')
        if (!cancelled) setEntries(Array.isArray(res.data) ? (res.data as AuditEntryApi[]) : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    return entries.filter((e) => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !e.action.toLowerCase().includes(q) &&
          !e.resource.toLowerCase().includes(q) &&
          !(e.actor ?? '').toLowerCase().includes(q) &&
          !JSON.stringify(e.details ?? {})
            .toLowerCase()
            .includes(q)
        )
          return false
      }
      return true
    })
  }, [entries, actionFilter, search])

  const distinctActions = useMemo(() => {
    const set = new Set<string>()
    entries.forEach((e) => set.add(e.action))
    return ['all', ...Array.from(set).sort()]
  }, [entries])

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'nav.auditLog',
              { count: entries.length },
              { defaultValue: `${entries.length} events` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('audit.heading', {}, { defaultValue: 'Audit log' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'audit.subheading',
              {},
              {
                defaultValue:
                  'Every read, write, rotate, and revoke — actor, IP, and timestamp captured.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn('flex flex-wrap items-center gap-2')}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-mol-id="audit-search"
            placeholder={t(
              'audit.searchPlaceholder',
              {},
              { defaultValue: 'Search by actor, action, or details…' },
            )}
            className={cm.cn(
              'h-9 w-72 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            )}
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            data-mol-id="audit-action-filter"
            className={cm.cn(
              'h-9 rounded-md border border-border bg-background px-3 font-mono text-xs text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            )}
          >
            {distinctActions.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? t('audit.allActions', {}, { defaultValue: 'All actions' }) : a}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div
            data-mol-id="audit-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
            )}
          >
            {t('audit.loading', {}, { defaultValue: 'Loading audit entries…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="audit-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-mol-id="audit-empty"
            className={cm.cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-muted">
              history
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {t(
                'audit.empty',
                {},
                {
                  defaultValue:
                    'No audit entries yet — interact with secrets to see them appear here.',
                },
              )}
            </p>
          </div>
        ) : (
          <section className={cm.cn('overflow-hidden rounded-xl border border-border bg-surface')}>
            <header
              className={cm.cn(
                'flex h-9 items-center gap-3 border-b border-border bg-surface-secondary px-4 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
              )}
            >
              <span className={cm.cn('w-24')}>
                {t('audit.col.action', {}, { defaultValue: 'Action' })}
              </span>
              <span className={cm.cn('flex-1')}>
                {t('audit.col.target', {}, { defaultValue: 'Target' })}
              </span>
              <span className={cm.cn('hidden w-48 md:inline')}>
                {t('audit.col.actor', {}, { defaultValue: 'Actor' })}
              </span>
              <span className={cm.cn('hidden w-32 md:inline')}>
                {t('audit.col.ip', {}, { defaultValue: 'IP' })}
              </span>
              <span className={cm.cn('w-44 text-right')}>
                {t('form.when', {}, { defaultValue: 'When' })}
              </span>
            </header>
            <ol data-mol-id="audit-list">
              {visible.map((entry) => {
                const target =
                  entry.secret_id || entry.vault_id || entry.resourceId || entry.resource
                const targetLink = entry.secret_id
                  ? `/secrets/${entry.secret_id}`
                  : entry.vault_id
                    ? `/vaults/${entry.vault_id}`
                    : null
                return (
                  <li
                    key={entry.id}
                    className={cm.cn(
                      'flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0',
                    )}
                  >
                    <span className={cm.cn('w-24')}>
                      <SecretStatusPill
                        tone={ACTION_TONE[entry.action] ?? 'masked'}
                        label={entry.action.replace(/^(secret|vault)\./, '')}
                        compact
                      />
                    </span>
                    <span className={cm.cn('flex-1 truncate font-mono text-xs text-text')}>
                      {String(
                        (entry.details as Record<string, unknown> | null)?.key ?? target ?? '',
                      )}
                      {targetLink ? (
                        <Link
                          to={targetLink}
                          className={cm.cn('ml-2 text-primary hover:underline')}
                        >
                          {t('audit.open', {}, { defaultValue: 'open ↗' })}
                        </Link>
                      ) : null}
                    </span>
                    <span
                      className={cm.cn(
                        'hidden w-48 truncate font-mono text-[11px] text-muted md:inline',
                      )}
                    >
                      {entry.actor}
                    </span>
                    <span
                      className={cm.cn(
                        'hidden w-32 truncate font-mono text-[11px] text-muted md:inline',
                      )}
                    >
                      {entry.ip ?? '—'}
                    </span>
                    <span className={cm.cn('w-44 text-right font-mono text-[11px] text-muted')}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default AuditLog
