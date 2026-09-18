import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface RotationApi {
  id: string
  secret_id: string
  scheduled_at: string
  completed_at?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  mode?: 'manual' | 'cron'
  by_actor?: string | null
}

const STATUS_TONE: Record<RotationApi['status'], SecretStatusTone> = {
  pending: 'pending',
  in_progress: 'expiring',
  completed: 'active',
  failed: 'revoked',
}

export function Rotations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rotations, setRotations] = useState<RotationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | RotationApi['status']>('all')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<RotationApi[]>('/api/rotations')
        if (!cancelled) setRotations(Array.isArray(res.data) ? (res.data as RotationApi[]) : [])
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
    if (statusFilter === 'all') return rotations
    return rotations.filter((r) => r.status === statusFilter)
  }, [rotations, statusFilter])

  const counts = useMemo(
    () => ({
      all: rotations.length,
      pending: rotations.filter((r) => r.status === 'pending').length,
      in_progress: rotations.filter((r) => r.status === 'in_progress').length,
      completed: rotations.filter((r) => r.status === 'completed').length,
      failed: rotations.filter((r) => r.status === 'failed').length,
    }),
    [rotations],
  )

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-5 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'rotations.kicker',
              { count: rotations.length },
              { defaultValue: `${rotations.length} rotations` },
            )}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('rotations.heading', {}, { defaultValue: 'Rotations' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'rotations.subheading',
              {},
              {
                defaultValue:
                  'Track scheduled, in-flight, and completed secret rotations across every vault.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn('grid gap-3 sm:grid-cols-2 md:grid-cols-4')}>
          {[
            {
              kicker: t('status.pending', {}, { defaultValue: 'Pending' }),
              value: counts.pending,
              tone: 'var(--color-secret-masked)',
              icon: 'pending',
            },
            {
              kicker: t('status.inProgress', {}, { defaultValue: 'In progress' }),
              value: counts.in_progress,
              tone: 'var(--color-secret-expiring)',
              icon: 'progress_activity',
            },
            {
              kicker: t('common.completed', {}, { defaultValue: 'Completed' }),
              value: counts.completed,
              tone: 'var(--color-secret-active)',
              icon: 'verified',
            },
            {
              kicker: t('status.failed', {}, { defaultValue: 'Failed' }),
              value: counts.failed,
              tone: 'var(--color-secret-revoked)',
              icon: 'error',
            },
          ].map((kpi) => (
            <article
              key={kpi.kicker}
              className={cm.cn(
                'flex flex-col gap-1 rounded-lg border border-border bg-surface p-4',
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
            'flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-widest',
          )}
        >
          {(['all', 'pending', 'in_progress', 'completed', 'failed'] as const).map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setStatusFilter(key)}
              data-mol-id={`rotations-filter-${key}`}
              aria-pressed={statusFilter === key}
              className={cm.cn(
                'rounded border px-3 py-1 transition-colors',
                statusFilter === key
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border text-muted hover:border-primary/30 hover:text-text',
              )}
            >
              {key === 'all' ? t('status.all', {}, { defaultValue: 'All' }) : key.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            data-mol-id="rotations-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 text-center font-mono text-xs text-muted',
            )}
          >
            {t('rotations.loading', {}, { defaultValue: 'Loading rotations…' })}
          </div>
        ) : error ? (
          <div
            data-mol-id="rotations-error"
            className={cm.cn(
              'rounded-lg border border-error/40 bg-error/10 p-4 font-mono text-xs text-error',
            )}
          >
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-mol-id="rotations-empty"
            className={cm.cn(
              'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-muted">
              autorenew
            </span>
            <p className={cm.cn('font-body text-sm text-muted')}>
              {t(
                'rotations.empty',
                {},
                {
                  defaultValue:
                    'No rotations recorded yet — rotate a secret to populate this view.',
                },
              )}
            </p>
            <Link
              to="/vaults"
              className={cm.cn('font-headline text-xs font-semibold text-primary hover:underline')}
            >
              {t('rotations.gotoVaults', {}, { defaultValue: 'Open vaults' })}
            </Link>
          </div>
        ) : (
          <section className={cm.cn('overflow-hidden rounded-xl border border-border bg-surface')}>
            <header
              className={cm.cn(
                'flex h-9 items-center gap-3 border-b border-border bg-surface-secondary px-4 font-mono text-[10px] font-black uppercase tracking-widest text-muted',
              )}
            >
              <span className={cm.cn('w-24')}>
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </span>
              <span className={cm.cn('flex-1')}>
                {t('rotations.col.secret', {}, { defaultValue: 'Secret' })}
              </span>
              <span className={cm.cn('hidden w-24 md:inline')}>
                {t('rotations.col.mode', {}, { defaultValue: 'Mode' })}
              </span>
              <span className={cm.cn('w-44 text-right')}>
                {t('rotations.col.scheduled', {}, { defaultValue: 'Scheduled' })}
              </span>
              <span className={cm.cn('hidden w-44 text-right md:inline')}>
                {t('common.completed', {}, { defaultValue: 'Completed' })}
              </span>
            </header>
            <ol data-mol-id="rotations-list">
              {visible.map((r) => (
                <li
                  key={r.id}
                  className={cm.cn(
                    'flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0',
                  )}
                >
                  <span className={cm.cn('w-24')}>
                    <SecretStatusPill tone={STATUS_TONE[r.status]} label={r.status} compact />
                  </span>
                  <span className={cm.cn('flex-1 truncate font-mono text-xs text-text')}>
                    <Link to={`/secrets/${r.secret_id}`} className={cm.cn('hover:text-primary')}>
                      {r.secret_id}
                    </Link>
                  </span>
                  <span className={cm.cn('hidden w-24 font-mono text-[11px] text-muted md:inline')}>
                    {r.mode ?? '—'}
                  </span>
                  <span className={cm.cn('w-44 text-right font-mono text-[11px] text-muted')}>
                    {new Date(r.scheduled_at).toLocaleString()}
                  </span>
                  <span
                    className={cm.cn(
                      'hidden w-44 text-right font-mono text-[11px] text-muted md:inline',
                    )}
                  >
                    {r.completed_at ? new Date(r.completed_at).toLocaleString() : '—'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default Rotations
