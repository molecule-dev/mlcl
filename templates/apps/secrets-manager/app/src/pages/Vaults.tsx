import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NewVaultModal } from '../components/NewVaultModal.js'
import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill } from '../components/SecretStatusPill.js'
import { VaultCard, type VaultCardData } from '../components/VaultCard.js'

interface VaultApi {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  environment: 'production' | 'staging' | 'development' | 'test'
  secrets_count?: number | null
  members_count?: number | null
  next_rotation?: string | null
  updated_at?: string | null
}

const toCardEnv = (env: VaultApi['environment']): VaultCardData['environment'] => {
  if (env === 'production' || env === 'staging') return env
  return 'dev'
}

// Turn the vault's computed next_rotation date (soonest secret due) into a
// friendly hint + tone: past-due surfaces as an "overdue" expired pill.
const rotationHint = (
  iso: string | null | undefined,
): { text: string; tone: 'expiring' | 'expired' } | null => {
  if (!iso) return null
  const due = new Date(iso).getTime()
  if (Number.isNaN(due)) return null
  const days = Math.round((due - Date.now()) / 86_400_000)
  if (days < 0) return { text: 'overdue', tone: 'expired' }
  if (days === 0) return { text: 'due today', tone: 'expiring' }
  if (days === 1) return { text: 'in 1 day', tone: 'expiring' }
  return { text: `in ${days} days`, tone: 'expiring' }
}

const shape = (v: VaultApi): VaultCardData => {
  const rotation = rotationHint(v.next_rotation)
  return {
    id: v.id,
    name: v.name,
    path: v.slug ?? v.name,
    environment: toCardEnv(v.environment),
    secretCount: Number(v.secrets_count ?? 0),
    memberCount: Number(v.members_count ?? 0),
    nextRotation: rotation?.text,
    rotationTone: rotation?.tone ?? 'active',
    lastEvent: v.updated_at ? `Updated ${new Date(v.updated_at).toLocaleString()}` : undefined,
  }
}

type EnvFilter = 'all' | 'production' | 'staging' | 'dev'

export function Vaults() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').toLowerCase().trim()
  const [vaults, setVaults] = useState<VaultCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all')
  const [showNew, setShowNew] = useState(false)

  const reload = async () => {
    try {
      const res = await http.get<VaultApi[]>('/api/vaults')
      const arr = Array.isArray(res.data) ? res.data : []
      setVaults(arr.map(shape))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const visible = useMemo(() => {
    let rows = envFilter === 'all' ? vaults : vaults.filter((v) => v.environment === envFilter)
    if (query) {
      rows = rows.filter(
        (v) => v.name.toLowerCase().includes(query) || (v.path ?? '').toLowerCase().includes(query),
      )
    }
    return rows
  }, [vaults, envFilter, query])
  const totalSecrets = vaults.reduce((acc, v) => acc + v.secretCount, 0)
  const expiring = vaults.filter(
    (v) => v.rotationTone === 'expiring' || v.rotationTone === 'expired',
  ).length
  const revoked = vaults.filter((v) => v.rotationTone === 'revoked').length

  return (
    <SecretsManagerLayout
      topAction={
        <button
          type="button"
          onClick={() => setShowNew(true)}
          data-mol-id="vaults-new-button"
          className={cm.cn(
            'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary',
            'transition-colors hover:bg-primary/90',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            add
          </span>
          {t('vaults.newVault', {}, { defaultValue: 'New vault' })}
        </button>
      }
    >
      <div className={cm.cn('flex flex-col gap-6 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'vaults.kicker',
              { count: vaults.length },
              { defaultValue: `${vaults.length} vaults · across environments` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold text-text tracking-tight')}>
            {t('vaults.heading', {}, { defaultValue: 'Vaults' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'vaults.subheading',
              {},
              {
                defaultValue:
                  'Encrypted namespaces for every environment, team, and tenant. Click in to manage values, members, and rotations.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn('grid gap-3 sm:grid-cols-2 md:grid-cols-4')}>
          {[
            {
              kicker: t('vaults.kpi.totalVaults', {}, { defaultValue: 'Total vaults' }),
              value: vaults.length,
              tone: 'var(--color-secret-active)',
              icon: 'lock',
            },
            {
              kicker: t('vaults.kpi.totalSecrets', {}, { defaultValue: 'Encrypted secrets' }),
              value: totalSecrets.toLocaleString(),
              tone: 'var(--color-violet)',
              icon: 'shield_lock',
            },
            {
              kicker: t('vaults.kpi.expiring', {}, { defaultValue: 'Expiring or expired' }),
              value: expiring,
              tone: 'var(--color-secret-expiring)',
              icon: 'schedule',
            },
            {
              kicker: t('vaults.kpi.revoked', {}, { defaultValue: 'Revoked / compromised' }),
              value: revoked,
              tone: 'var(--color-secret-revoked)',
              icon: 'gpp_bad',
            },
          ].map((kpi) => (
            <article
              key={kpi.kicker}
              className={cm.cn(
                'relative flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition-transform hover:-translate-y-0.5',
              )}
              style={{ borderLeftWidth: 4, borderLeftColor: kpi.tone }}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                  )}
                >
                  {kpi.kicker}
                </span>
                <span
                  aria-hidden="true"
                  className={cm.cn('inline-flex h-7 w-7 items-center justify-center rounded-md')}
                  style={{ backgroundColor: `${kpi.tone}1f`, color: kpi.tone }}
                >
                  <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                </span>
              </div>
              <span className={cm.cn('font-mono text-3xl font-extrabold tabular-nums text-text')}>
                {kpi.value}
              </span>
            </article>
          ))}
        </div>

        <div
          className={cm.cn(
            'flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4',
          )}
        >
          <div
            className={cm.cn(
              'flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest',
            )}
          >
            {(['all', 'production', 'staging', 'dev'] as const).map((key) => {
              const label =
                key === 'all'
                  ? t('status.all', {}, { defaultValue: 'All' })
                  : t(
                      `vaults.filter.${key}`,
                      {},
                      { defaultValue: key.charAt(0).toUpperCase() + key.slice(1) },
                    )
              const active = envFilter === key
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setEnvFilter(key)}
                  data-mol-id={`vaults-filter-${key}`}
                  className={cm.cn(
                    'rounded border px-3 py-1 transition-colors',
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-primary/30 hover:text-text',
                  )}
                  aria-pressed={active}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-8 text-center font-mono text-xs text-muted',
            )}
            data-mol-id="vaults-loading"
          >
            {t('vaults.loading', {}, { defaultValue: 'Loading vaults…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="vaults-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-mol-id="vaults-empty"
            className={cm.cn(
              'flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[32px] text-muted">
              lock_open
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {query
                ? t(
                    'vaults.emptyForQuery',
                    { query },
                    { defaultValue: `No vaults match "${query}".` },
                  )
                : t(
                    'vaults.empty',
                    {},
                    { defaultValue: 'No vaults yet — create your first encrypted namespace.' },
                  )}
            </p>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              data-mol-id="vaults-empty-create"
              className={cm.cn(
                'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-[12px] font-bold text-on-primary transition-colors hover:bg-primary/90',
              )}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                add
              </span>
              {t('vaults.newVault', {}, { defaultValue: 'New vault' })}
            </button>
          </div>
        ) : (
          <div
            className={cm.cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3')}
            data-mol-id="vaults-list"
          >
            {visible.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
        )}

        <div
          className={cm.cn(
            'mt-2 flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest text-muted',
              )}
            >
              {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
            </span>
            <p className={cm.cn('font-body text-sm text-text')}>
              {t(
                'vaults.recentActivity.body',
                {},
                {
                  defaultValue:
                    'Every vault read, rotate, and revoke is captured in the audit log.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <SecretStatusPill
              tone="active"
              label={t('vaults.recentActivity.healthy', {}, { defaultValue: 'Healthy' })}
            />
            <Link
              to="/audit"
              className={cm.cn(
                'inline-flex items-center gap-1 font-headline text-xs font-semibold text-primary transition-colors hover:text-primary/80',
              )}
            >
              {t('vaults.recentActivity.cta', {}, { defaultValue: 'View audit log' })}
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: '0.875rem' }}
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>

      {showNew ? (
        <NewVaultModal
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false)
            await reload()
          }}
        />
      ) : null}
    </SecretsManagerLayout>
  )
}

export default Vaults
