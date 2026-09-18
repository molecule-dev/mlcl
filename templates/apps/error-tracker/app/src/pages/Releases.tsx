import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { SeverityPill } from '../components/SeverityPill.js'

interface ReleaseRow {
  id: string
  version: string
  environment: string
  author: string | null
  deployed_at: string
  commits: Array<{ sha?: string; message?: string; author?: string }> | null
  files: number | null
  health: 'healthy' | 'attention' | 'regressed' | 'mixed' | string | null
  new_issues: number | null
  regression_count: number | null
  resolved_issues: number | null
  issue_count: number | null
  adoption: number[] | null
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function healthMeta(r: ReleaseRow): {
  accent: string
  label: string
  severity: 'resolved' | 'critical' | 'warning' | 'info'
} {
  const regressions = Number(r.regression_count ?? 0)
  const newIssues = Number(r.new_issues ?? 0)
  if (r.health === 'regressed' || regressions > 0) {
    return { accent: 'var(--color-severity-critical)', label: 'Regressed', severity: 'critical' }
  }
  if (r.health === 'attention' || newIssues > 0) {
    return { accent: 'var(--color-severity-warning)', label: 'Attention', severity: 'warning' }
  }
  return { accent: 'var(--color-severity-resolved)', label: 'Healthy', severity: 'resolved' }
}

export function Releases() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [releases, setReleases] = useState<ReleaseRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ReleaseRow[]>('/api/releases')
      .then((res) => {
        if (cancelled) return
        setReleases(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (!cancelled)
          setError(t('releases.loadError', {}, { defaultValue: "Couldn't load releases." }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'releases.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} releases --since=30d' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('releases.heading', {}, { defaultValue: 'Releases' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'releases.subheading',
              { count: releases.length },
              { defaultValue: '{{count}} releases · last 30 days' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      {releases.length === 0 ? (
        <p
          data-testid="releases-empty"
          className={cm.cn('font-mono text-sm py-12 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'releases.empty',
            {},
            { defaultValue: 'No releases yet — deploy something to see regression health here.' },
          )}
        </p>
      ) : (
        <ul data-testid="releases-list" className={cm.cn('space-y-3')}>
          {releases.map((r) => {
            const h = healthMeta(r)
            const adoption = Array.isArray(r.adoption)
              ? r.adoption
              : [0, 10, 30, 50, 70, 80, 90, 95]
            const commitCount = Array.isArray(r.commits) ? r.commits.length : 0
            return (
              <li key={r.id} data-testid="release-row" data-version={r.version}>
                <Link
                  to={`/releases/${encodeURIComponent(r.version)}`}
                  className={cm.cn(
                    'block rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${h.accent}`,
                  }}
                >
                  <div className={cm.cn('flex items-center gap-4 flex-wrap')}>
                    <div className={cm.cn('flex items-center gap-3 min-w-0')}>
                      <span
                        className={cm.cn(
                          'inline-flex items-center gap-1.5 font-mono px-2.5 py-1 rounded-md text-sm font-bold',
                        )}
                        style={{
                          backgroundColor: 'var(--color-surface-overlay)',
                          color: 'var(--color-text)',
                          border: `1px solid var(--color-border)`,
                        }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[12px]')}
                          aria-hidden="true"
                        >
                          tag
                        </span>
                        v{r.version}
                      </span>
                      <SeverityPill severity={h.severity} label={h.label} />
                    </div>

                    <div className={cm.cn('hidden md:flex flex-col items-end ml-auto')}>
                      <span
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('releases.regressions', {}, { defaultValue: 'Regressions' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-sm font-extrabold tabular-nums')}
                        style={{
                          color:
                            (r.regression_count ?? 0) > 0
                              ? 'var(--color-severity-critical)'
                              : 'var(--color-text)',
                        }}
                      >
                        {r.regression_count ?? 0}
                      </span>
                    </div>
                    <div className={cm.cn('hidden md:flex flex-col items-end')}>
                      <span
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('status.new', {}, { defaultValue: 'New' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-sm font-extrabold tabular-nums')}
                        style={{
                          color:
                            (r.new_issues ?? 0) > 0
                              ? 'var(--color-severity-new)'
                              : 'var(--color-text)',
                        }}
                      >
                        {r.new_issues ?? 0}
                      </span>
                    </div>
                    <div className={cm.cn('hidden lg:flex flex-col items-end')}>
                      <span
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('releases.commits', {}, { defaultValue: 'Commits' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-sm tabular-nums')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {commitCount}
                      </span>
                    </div>

                    <div className={cm.cn('hidden md:block')}>
                      <FrequencySparkline
                        values={adoption}
                        width={120}
                        height={28}
                        color={BRAND_COLOR}
                        spikeColor={BRAND_COLOR}
                        mode="line"
                        ariaLabel={`${r.version} adoption`}
                      />
                    </div>

                    <div className={cm.cn('hidden xl:flex flex-col items-end w-24 truncate')}>
                      <span
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('releases.deployedBy', {}, { defaultValue: 'By' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-xs truncate w-full text-right')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {r.author ?? '—'}
                      </span>
                    </div>

                    <div className={cm.cn('flex flex-col items-end')}>
                      <span
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('releases.deployed', {}, { defaultValue: 'Deployed' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-xs')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {fmtRelative(r.deployed_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
