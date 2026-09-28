import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { IssueRow, type IssueRowData } from '../components/IssueRow.js'
import { StatsCounterCard } from '../components/StatsCounterCard.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface CommitInfo {
  sha?: string
  message?: string
  author?: string
}

interface ReleaseEvent {
  id: string
  issue_id: string
  message: string | null
  level: string
  created_at: string | Date
  user_agent: string | null
  tags?: { user_email?: string } | null
}

interface ReleaseDetailData {
  id: string
  version: string
  environment: string
  author: string | null
  deployed_at: string
  commits: CommitInfo[] | null
  files: number | null
  health: string | null
  new_issues: number | null
  regression_count: number | null
  resolved_issues: number | null
  issue_count: number | null
  adoption: number[] | null
  recent_errors: ReleaseEvent[]
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${Math.max(0, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ReleaseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { version = '' } = useParams<{ version: string }>()
  const [release, setRelease] = useState<ReleaseDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueRowData[]>([])

  useEffect(() => {
    if (!version) return
    let cancelled = false
    http
      .get<ReleaseDetailData>(`/api/releases/${encodeURIComponent(version)}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<ReleaseDetailData>(res.data ?? res)
        setRelease(data)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('releaseDetail.loadError', {}, { defaultValue: "Couldn't load release." }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t, version])

  useEffect(() => {
    if (!release?.version) return
    let cancelled = false
    http
      .get<IssueRowData[]>(`/api/issues?limit=50`)
      .then((res) => {
        if (cancelled) return
        const all = Array.isArray(res.data) ? res.data : []
        setIssues(all.filter((i) => i.release === release.version))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, release?.version])

  if (!release) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        {error ? (
          <p
            role="alert"
            className={cm.cn('font-mono text-xs')}
            style={{ color: 'var(--color-severity-critical)' }}
          >
            {error}
          </p>
        ) : (
          <p
            className={cm.cn('font-mono text-sm')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('releaseDetail.loading', {}, { defaultValue: 'Loading release…' })}
          </p>
        )}
      </div>
    )
  }

  const commits = Array.isArray(release.commits) ? release.commits : []
  const adoption = Array.isArray(release.adoption)
    ? release.adoption
    : [0, 10, 30, 50, 70, 80, 90, 95]
  const adoptionLast = adoption[adoption.length - 1] ?? 0
  const isRegressed = (release.regression_count ?? 0) > 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/releases"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('releaseDetail.back', {}, { defaultValue: 'Back to releases' })}
      </Link>

      <header
        className={cm.cn(
          'relative overflow-hidden rounded-2xl mb-6 p-6',
          cm.accentCard({ tone: 'custom' }),
        )}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-severity-new-light), var(--color-severity-resolved-light))',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          ['--mol-accent' as string]: isRegressed
            ? 'var(--color-severity-critical)'
            : 'var(--color-severity-new)',
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 font-mono px-3 py-1 rounded-md text-sm font-bold',
            )}
            style={{
              backgroundColor: 'var(--color-surface-overlay)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-severity-new)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              tag
            </span>
            v{release.version}
          </span>
          {isRegressed ? (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'var(--color-severity-critical-light)',
                color: 'var(--color-severity-critical)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                trending_up
              </span>
              {t('releaseDetail.regressed', {}, { defaultValue: 'Regressed' })}
            </span>
          ) : null}
        </div>
        <h1
          className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {t(
            'releaseDetail.heading',
            { version: release.version },
            { defaultValue: 'Release {{version}}' },
          )}
        </h1>
        <p
          className={cm.cn('mt-2 font-mono text-sm')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'releaseDetail.deployed',
            {
              relative: fmtRelative(release.deployed_at),
              author:
                release.author ?? t('releaseDetail.unknownAuthor', {}, { defaultValue: 'unknown' }),
              commits: commits.length,
              files: release.files ?? 0,
            },
            {
              defaultValue:
                'Deployed {{relative}} by {{author}} · {{commits}} commits · {{files}} files',
            },
          )}
        </p>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <StatsCounterCard
          eyebrow={t('releaseDetail.metric.regressions', {}, { defaultValue: 'Regressions' })}
          value={String(release.regression_count ?? 0)}
          tone="critical"
          icon="trending_up"
        />
        <StatsCounterCard
          eyebrow={t('releaseDetail.metric.newIssues', {}, { defaultValue: 'New issues' })}
          value={String(release.new_issues ?? 0)}
          tone="new"
          icon="bug_report"
        />
        <StatsCounterCard
          eyebrow={t('status.resolved', {}, { defaultValue: 'Resolved' })}
          value={String(release.resolved_issues ?? 0)}
          tone="primary"
          icon="check_circle"
        />
        <StatsCounterCard
          eyebrow={t('releaseDetail.metric.adoption', {}, { defaultValue: 'Adoption' })}
          value={String(adoptionLast)}
          unit="%"
          tone="info"
          icon="group"
          sparkline={adoption}
        />
      </section>

      <section className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-12 mb-8')}>
        <div
          className={cm.cn('lg:col-span-7 rounded-2xl p-6')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'releaseDetail.regressionsHeading',
              {},
              { defaultValue: '// issues touched by this release' },
            )}
          </p>
          {issues.length === 0 ? (
            <p
              data-testid="release-no-issues"
              className={cm.cn('font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'releaseDetail.noIssues',
                {},
                { defaultValue: 'No issues match this release version.' },
              )}
            </p>
          ) : (
            <ul data-testid="release-issues" className={cm.cn('space-y-3')}>
              {issues.map((i) => (
                <li key={i.id}>
                  <IssueRow issue={i} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside
          className={cm.cn('lg:col-span-5 rounded-2xl p-6')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('releaseDetail.commitsHeading', {}, { defaultValue: '// shipped commits' })}
          </p>
          {commits.length === 0 ? (
            <p
              data-testid="release-no-commits"
              className={cm.cn('font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'releaseDetail.noCommits',
                {},
                { defaultValue: 'No commits recorded for this release.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {commits.map((c, i) => (
                <li key={c.sha ?? i} className={cm.cn('flex items-start gap-3 text-sm')}>
                  <span
                    className={cm.cn(
                      'font-mono text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5',
                    )}
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                      color: 'var(--color-text-code)',
                    }}
                  >
                    {(c.sha ?? '').slice(0, 7) || '—'}
                  </span>
                  <div className={cm.cn('flex-1 min-w-0')}>
                    <p
                      className={cm.cn('font-mono truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {c.message ?? '—'}
                    </p>
                    <p
                      className={cm.cn('font-mono text-xs mt-0.5')}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {c.author ?? '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section
        className={cm.cn('rounded-2xl p-6')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('releaseDetail.adoptionHeading', {}, { defaultValue: '// adoption · last 24h' })}
        </p>
        <FrequencySparkline
          values={adoption}
          width={620}
          height={64}
          color={BRAND_COLOR}
          spikeColor={BRAND_COLOR}
          mode="line"
          className={cm.cn('w-full h-auto')}
          ariaLabel={t('releaseDetail.adoptionAria', {}, { defaultValue: 'Adoption curve' })}
        />
      </section>
    </div>
  )
}
