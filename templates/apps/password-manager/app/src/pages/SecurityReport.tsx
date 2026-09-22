import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useSecurityFindings, useVaultItems } from '../lib/api.js'

const SEVERITY_STYLES = {
  high: { bg: 'bg-error-light', text: 'text-error', dot: 'bg-red-500' },
  medium: { bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-amber-500' },
  low: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  critical: { bg: 'bg-error-light', text: 'text-error', dot: 'bg-red-600' },
}

const KIND_LABEL: Record<string, { key: string; def: string }> = {
  weak: { key: 'security.issue.weak', def: 'Weak password' },
  reused: { key: 'security.issue.reused', def: 'Reused across multiple items' },
  breached: { key: 'security.issue.breached', def: 'Found in a known breach' },
  old: { key: 'security.issue.old', def: 'Last rotated more than a year ago' },
}

export function SecurityReport() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findings = useSecurityFindings(refreshKey)
  const items = useVaultItems({ is_trashed: false }, refreshKey)

  const itemsById = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>()
    for (const it of items.data) {
      map.set(it.id, { name: it.name, type: it.type })
    }
    return map
  }, [items.data])

  const active = useMemo(() => findings.data.filter((f) => !f.dismissed), [findings.data])

  const counts = useMemo(() => {
    const c = { weak: 0, reused: 0, breached: 0, old: 0 }
    for (const f of active) {
      if (f.kind === 'weak') c.weak++
      else if (f.kind === 'reused') c.reused++
      else if (f.kind === 'breached') c.breached++
      else if (f.kind === 'old') c.old++
    }
    return c
  }, [active])

  const score = useMemo(() => {
    const total = items.data.length
    if (total === 0) return 100
    const flagged = new Set(active.map((f) => f.item_id).filter(Boolean) as string[]).size
    return Math.max(0, Math.min(100, Math.round(100 - (flagged / total) * 100)))
  }, [active, items.data])

  const refresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await http.post('/api/security/refresh')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }

  const dismiss = async (id: string) => {
    try {
      await http.put(`/api/security/findings/${id}`, { dismissed: true })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss')
    }
  }

  const ringPct = `${score}, 100`

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('5xl'),
        'mx-auto',
      )}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('security.eyebrow', {}, { defaultValue: 'Vault · Security' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('security.heading', {}, { defaultValue: 'Security report' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          data-testid="security-refresh"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {refreshing ? 'progress_activity' : 'refresh'}
          </span>
          {refreshing
            ? t('security.scanning', {}, { defaultValue: 'Scanning…' })
            : t('security.scan', {}, { defaultValue: 'Re-scan vault' })}
        </button>
      </header>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="security-error">
          {error}
        </p>
      )}

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <article
          className={cm.cn(
            'p-4 md:p-8',
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            'lg:col-span-4 bg-gradient-to-br from-primary to-indigo-900 text-white rounded-2xl relative overflow-hidden',
          )}
        >
          <div className={cm.cn('relative z-10 flex flex-col items-center gap-3')}>
            <div className={cm.cn('relative w-32 h-32')}>
              <svg className={cm.cn('w-32 h-32 -rotate-90')} viewBox="0 0 36 36" aria-hidden="true">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--color-security-strong, #34d399)"
                  strokeWidth="3"
                  strokeDasharray={ringPct}
                  strokeLinecap="round"
                />
              </svg>
              <div className={cm.cn('absolute inset-0 flex flex-col items-center justify-center')}>
                <span
                  className={cm.cn('text-4xl font-extrabold tracking-tighter')}
                  data-testid="security-score"
                >
                  {score}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-emerald-300 uppercase tracking-widest',
                  )}
                >
                  {t('security.scoreLabel', {}, { defaultValue: 'Score' })}
                </span>
              </div>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/80 text-center max-w-xs')}>
              {active.length === 0
                ? t(
                    'security.scoreCleanNarrative',
                    {},
                    { defaultValue: 'Your vault is currently clean. Re-scan periodically.' },
                  )
                : t(
                    'security.scoreNarrative',
                    { count: active.length },
                    { defaultValue: '{{count}} items need attention.' },
                  )}
            </p>
          </div>
          <div
            className={cm.cn(
              'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl',
            )}
            aria-hidden="true"
          />
        </article>

        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'lg:col-span-8 grid-cols-2 md:grid-cols-4')}>
          {[
            {
              value: counts.weak,
              key: 'security.metric.weak',
              def: 'Weak',
              icon: 'priority_high',
              color: 'text-error',
              testId: 'metric-weak',
            },
            {
              value: counts.reused,
              key: 'security.metric.reused',
              def: 'Reused',
              icon: 'content_copy',
              color: 'text-warning',
              testId: 'metric-reused',
            },
            {
              value: counts.breached,
              key: 'security.metric.breached',
              def: 'Breached',
              icon: 'gpp_bad',
              color: 'text-error',
              testId: 'metric-breached',
            },
            {
              value: counts.old,
              key: 'security.metric.old',
              def: 'Stale',
              icon: 'history',
              color: 'text-cyan-600',
              testId: 'metric-old',
            },
          ].map((m) => (
            <article
              key={m.key}
              data-testid={`security-${m.testId}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 6),
                'bg-surface rounded-2xl border-l-4 border-primary shadow-sm hover:-translate-y-0.5 transition-transform',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), m.color)}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {m.icon}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(m.key, {}, { defaultValue: m.def })}
                </span>
              </span>
              <span
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {m.value}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('security.metricFooter', {}, { defaultValue: 'Items needing attention' })}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('security.issuesHeading', {}, { defaultValue: 'Items needing attention' })}
          </h2>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full py-1 bg-error-light text-error uppercase tracking-widest',
            )}
            data-testid="security-issue-count"
          >
            {t(
              'security.issuesCount',
              { count: active.length },
              { defaultValue: '{{count}} actionable' },
            )}
          </span>
        </header>
        {findings.loading && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 4),
              cm.textCenter,
              'text-on-surface-variant',
            )}
            data-testid="security-loading"
          >
            {t('security.loading', {}, { defaultValue: 'Loading findings…' })}
          </p>
        )}
        {!findings.loading && active.length === 0 && (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 4),
              cm.textCenter,
              'text-on-surface-variant',
            )}
            data-testid="security-empty"
          >
            {t('security.empty', {}, { defaultValue: 'No active findings. Try Re-scan vault.' })}
          </p>
        )}
        {!findings.loading && active.length > 0 && (
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              'divide-y divide-surface-container',
            )}
            data-testid="security-issue-list"
          >
            {active.map((f) => {
              const sev = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.medium
              const meta = f.item_id ? itemsById.get(f.item_id) : undefined
              const kindMeta = KIND_LABEL[f.kind] ?? {
                key: `security.issue.${f.kind}`,
                def: f.kind,
              }
              return (
                <li
                  key={f.id}
                  data-testid={`security-issue-${f.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 4),
                    'gap-4',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                    <span
                      className={cm.cn('w-2 h-2 rounded-full flex-shrink-0', sev.dot)}
                      aria-hidden="true"
                    />
                    <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-on-surface truncate',
                        )}
                      >
                        {meta?.name ??
                          t('security.unknownItem', {}, { defaultValue: 'Vault item' })}
                      </span>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}
                      >
                        {t(kindMeta.key, {}, { defaultValue: kindMeta.def })}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'rounded-md py-0.5',
                      sev.bg,
                      sev.text,
                    )}
                  >
                    {t(
                      `security.severity.${f.severity}`,
                      {},
                      {
                        defaultValue: f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
                      },
                    )}
                  </span>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    {f.item_id && (
                      <Link
                        to={`/vault/${f.item_id}`}
                        data-testid={`security-fix-${f.id}`}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.fontWeight('semibold'),
                          cm.textSize('xs'),
                          'rounded-md py-1.5 bg-primary text-white hover:bg-primary-hover transition-colors',
                        )}
                      >
                        {t('security.fix', {}, { defaultValue: 'Fix now' })}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => dismiss(f.id)}
                      data-testid={`security-dismiss-${f.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'rounded-md py-1.5 bg-surface border border-primary-light/40 text-on-surface-variant hover:text-primary transition-colors',
                      )}
                    >
                      {t('security.dismiss', {}, { defaultValue: 'Dismiss' })}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default SecurityReport
