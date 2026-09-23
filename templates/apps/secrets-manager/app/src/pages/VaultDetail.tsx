import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NewSecretModal } from '../components/NewSecretModal.js'
import { SecretRow, type SecretRowData } from '../components/SecretRow.js'
import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface VaultApi {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  environment: 'production' | 'staging' | 'development' | 'test'
  members_count?: number | null
  secrets_count?: number | null
  next_rotation?: string | null
  updated_at?: string | null
}

interface SecretApi {
  id: string
  key: string
  name?: string
  path?: string
  value?: string | null
  has_value?: boolean
  status?: SecretStatusTone | string
  environment: 'production' | 'staging' | 'development' | 'test'
  rotation_days?: number | null
  last_rotated_at?: string | null
}

const toEnvTone = (env: VaultApi['environment']): 'production' | 'staging' | 'dev' => {
  if (env === 'production' || env === 'staging') return env
  return 'dev'
}

const STATUS_TONES: ReadonlyArray<SecretStatusTone> = [
  'active',
  'expiring',
  'expired',
  'revoked',
  'inherited',
]
const toStatusTone = (s: SecretApi['status']): SecretStatusTone =>
  (STATUS_TONES.includes(s as SecretStatusTone) ? s : 'active') as SecretStatusTone

const shapeRow = (s: SecretApi, vaultPath: string): SecretRowData => ({
  id: s.id,
  key: s.key,
  path: s.path ?? vaultPath,
  value: typeof s.value === 'string' ? s.value : null,
  status: toStatusTone(s.status),
  lastRotated: s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : '—',
})

type Filter = 'all' | 'expiring' | 'revoked' | 'inherited'

export function VaultDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [vault, setVault] = useState<VaultApi | null>(null)
  const [secrets, setSecrets] = useState<SecretRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [showNew, setShowNew] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const reload = async () => {
    if (!id) return
    try {
      const [vRes, sRes] = await Promise.all([
        http.get<VaultApi>(`/api/vaults/${id}`),
        http.get<SecretApi[]>(`/api/secrets?vault_id=${id}`),
      ])
      const v = (vRes.data as VaultApi) ?? null
      const arr = Array.isArray(sRes.data) ? (sRes.data as SecretApi[]) : []
      setVault(v)
      setSecrets(arr.map((row) => shapeRow(row, v?.slug ?? v?.name ?? '')))
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
  }, [http, id])

  const filtered = useMemo(() => {
    if (filter === 'all') return secrets
    return secrets.filter((s) => s.status === filter)
  }, [secrets, filter])

  const counts = useMemo(
    () => ({
      all: secrets.length,
      active: secrets.filter((s) => s.status === 'active').length,
      expiring: secrets.filter((s) => s.status === 'expiring' || s.status === 'expired').length,
      revoked: secrets.filter((s) => s.status === 'revoked').length,
      inherited: secrets.filter((s) => s.status === 'inherited').length,
    }),
    [secrets],
  )

  const onDeleteVault = async () => {
    if (!id || !vault) return
    if (
      !window.confirm(
        t(
          'vaultDetail.confirmDelete',
          {},
          { defaultValue: 'Delete this vault and all its secrets?' },
        ),
      )
    )
      return
    setDeleting(true)
    try {
      await http.delete(`/api/vaults/${id}`)
      void track({ name: 'vault.deleted', properties: { vault_id: id } })
      navigate('/vaults')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'delete failed')
      setDeleting(false)
    }
  }

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <Link
          to="/vaults"
          data-mol-id="vault-detail-back"
          className={cm.cn(
            'inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-primary',
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            arrow_back
          </span>
          {t('vaultDetail.back', {}, { defaultValue: 'All vaults' })}
        </Link>

        {loading ? (
          <div
            data-mol-id="vault-detail-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 font-mono text-xs text-muted',
            )}
          >
            {t('vaultDetail.loading', {}, { defaultValue: 'Loading vault…' })}
          </div>
        ) : error || !vault ? (
          <div
            data-mol-id="vault-detail-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error ?? t('vaultDetail.notFound', {}, { defaultValue: 'Vault not found' })}
          </div>
        ) : (
          <>
            <header
              className={cm.cn(
                'relative overflow-hidden rounded-2xl border border-border bg-surface p-6',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-70',
                )}
              />
              <div
                className={cm.cn(
                  'flex flex-col gap-3 md:flex-row md:items-start md:justify-between',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span
                    className={cm.cn('font-mono text-[10px] uppercase tracking-widest text-muted')}
                  >
                    {t('vaultDetail.kicker', {}, { defaultValue: 'Vault' })}
                  </span>
                  <h1
                    data-mol-id="vault-detail-name"
                    className={cm.cn('font-mono text-3xl font-extrabold text-text tracking-tight')}
                  >
                    {vault.name}
                  </h1>
                  <p className={cm.cn('font-mono text-xs text-muted')}>
                    {vault.slug ?? vault.name} · {counts.all} secrets · environment:{' '}
                    {vault.environment}
                  </p>
                  {vault.description ? (
                    <p className={cm.cn('mt-1 font-body text-sm text-muted')}>
                      {vault.description}
                    </p>
                  ) : null}
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <SecretStatusPill tone={toEnvTone(vault.environment)} />
                  <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    data-mol-id="vault-add-secret"
                    className={cm.cn(
                      'inline-flex h-9 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      add
                    </span>
                    {t('vaultDetail.addSecret', {}, { defaultValue: 'Add secret' })}
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteVault}
                    disabled={deleting}
                    data-mol-id="vault-delete"
                    className={cm.cn(
                      'inline-flex h-9 items-center gap-1 rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-muted transition-colors hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      delete
                    </span>
                    {t('vaultDetail.delete', {}, { defaultValue: 'Delete vault' })}
                  </button>
                </div>
              </div>
            </header>

            <div className={cm.cn('grid gap-3 sm:grid-cols-2 md:grid-cols-4')}>
              {[
                {
                  kicker: t('vaultDetail.kpi.secrets', {}, { defaultValue: 'Secrets' }),
                  value: counts.all,
                  tone: 'var(--color-secret-active)',
                  icon: 'shield_lock',
                },
                {
                  kicker: t('status.active', {}, { defaultValue: 'Active' }),
                  value: counts.active,
                  tone: 'var(--color-secret-active)',
                  icon: 'verified',
                },
                {
                  kicker: t('vaultDetail.kpi.expiring', {}, { defaultValue: 'Expiring' }),
                  value: counts.expiring,
                  tone: 'var(--color-secret-expiring)',
                  icon: 'schedule',
                },
                {
                  kicker: t('vaultDetail.kpi.revoked', {}, { defaultValue: 'Revoked' }),
                  value: counts.revoked,
                  tone: 'var(--color-secret-revoked)',
                  icon: 'gpp_bad',
                },
              ].map((kpi) => (
                <article
                  key={kpi.kicker}
                  className={cm.cn(
                    'flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition-transform hover:-translate-y-0.5',
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
                      className={cm.cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md',
                      )}
                      style={{ backgroundColor: `${kpi.tone}1f`, color: kpi.tone }}
                    >
                      <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                    </span>
                  </div>
                  <span
                    className={cm.cn('font-mono text-3xl font-extrabold tabular-nums text-text')}
                  >
                    {kpi.value}
                  </span>
                </article>
              ))}
            </div>

            <div
              className={cm.cn(
                'flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest',
              )}
            >
              {(['all', 'expiring', 'revoked', 'inherited'] as const).map((key) => {
                const label = t(
                  `vaultDetail.filter.${key}`,
                  {},
                  {
                    defaultValue: `${key.charAt(0).toUpperCase() + key.slice(1)} ${counts[key as keyof typeof counts] ?? 0}`,
                  },
                )
                const active = filter === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setFilter(key)}
                    data-mol-id={`vault-detail-filter-${key}`}
                    aria-pressed={active}
                    className={cm.cn(
                      'rounded border px-3 py-1 transition-colors',
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border text-muted hover:border-primary/30 hover:text-text',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <section
              className={cm.cn('overflow-hidden rounded-xl border border-border bg-surface')}
            >
              <header
                className={cm.cn(
                  'flex h-9 items-center gap-3 border-b border-border bg-surface-secondary px-4 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
                )}
              >
                <span className={cm.cn('w-2')} />
                <span className={cm.cn('flex-1')}>
                  {t('vaultDetail.col.key', {}, { defaultValue: 'Key' })}
                </span>
                <span className={cm.cn('w-44 text-right md:w-64')}>
                  {t('vaultDetail.col.value', {}, { defaultValue: 'Value' })}
                </span>
                <span className={cm.cn('w-20 text-right')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </span>
                <span className={cm.cn('hidden w-28 text-right md:inline')}>
                  {t('vaultDetail.col.rotated', {}, { defaultValue: 'Rotated' })}
                </span>
              </header>
              {filtered.length === 0 ? (
                <div
                  data-mol-id="vault-secrets-empty"
                  className={cm.cn('flex flex-col items-center gap-2 px-4 py-10 text-center')}
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[28px] text-muted"
                  >
                    key
                  </span>
                  <p className={cm.cn('font-body text-sm text-muted')}>
                    {t(
                      'vaultDetail.emptySecrets',
                      {},
                      { defaultValue: 'No secrets in this vault yet.' },
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNew(true)}
                    data-mol-id="vault-secrets-empty-add"
                    className={cm.cn(
                      'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
                    )}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      add
                    </span>
                    {t('vaultDetail.addSecret', {}, { defaultValue: 'Add secret' })}
                  </button>
                </div>
              ) : (
                <div
                  className={cm.cn('divide-y divide-border/60')}
                  data-mol-id="vault-secrets-list"
                >
                  {filtered.map((secret) => (
                    <SecretRow
                      key={secret.id}
                      secret={secret}
                      onOpen={() => navigate(`/secrets/${secret.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showNew && id ? (
        <NewSecretModal
          vaultId={id}
          defaultEnvironment={vault?.environment ?? 'production'}
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

export default VaultDetail
