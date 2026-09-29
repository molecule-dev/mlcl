import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PullRequestHero } from '../components/PullRequestHero.js'
import { type PullRequest, PullRequestRow } from '../components/PullRequestRow.js'
import { ScoreCard } from '../components/ScoreCard.js'
import { SeverityBadgeRow } from '../components/SeverityBadgeRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PullRequestApiRow {
  id: string
  title: string
  repository_id: string | null
  head_ref: string | null
  state: 'open' | 'merged' | 'closed' | 'draft'
  additions: number | null
  deletions: number | null
  opened_at: string | null
  author_login: string | null
}

interface RepositoryRow {
  id: string
  full_name: string
}

interface SummaryRow {
  openPrs: number
  mergedPrs: number
  criticalReviews: number
  totalReviews: number
  totalRepos: number
  avgScore: number
}

interface ReviewCommentRow {
  id: string
  body_md: string | null
  severity: string | null
  file_path: string | null
  line_start: number | null
  category: string | null
  createdAt: string | null
}

function toPR(row: PullRequestApiRow, repoName: string): PullRequest {
  return {
    id: row.id,
    title: row.title,
    repo: repoName,
    branch: row.head_ref ?? undefined,
    status: row.state,
    score: null,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0,
    files: 0,
    createdAt: row.opened_at ?? new Date().toISOString(),
    authorName: row.author_login ?? undefined,
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [prs, setPrs] = useState<PullRequestApiRow[]>([])
  const [repos, setRepos] = useState<RepositoryRow[]>([])
  const [summary, setSummary] = useState<SummaryRow | null>(null)
  const [insights, setInsights] = useState<ReviewCommentRow[]>([])
  const [sevCounts, setSevCounts] = useState<{
    critical: number
    changes_requested: number
    suggestion: number
    approved: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/pull-requests').catch(() => null),
      http.get('/api/repositories').catch(() => null),
      http.get('/api/reports/summary').catch(() => null),
      http.get('/api/reviews?limit=10').catch(() => null),
      http.get('/api/reports/severity-counts').catch(() => null),
    ])
      .then(async ([prRes, repoRes, sumRes, reviewRes, sevRes]) => {
        if (cancelled) return
        setPrs(unwrapList<PullRequestApiRow>(prRes))
        setRepos(unwrapList<RepositoryRow>(repoRes))
        setSummary(unwrapSingle<SummaryRow>(sumRes))
        setSevCounts(
          unwrapSingle<{
            critical: number
            changes_requested: number
            suggestion: number
            approved: number
          }>(sevRes),
        )
        const reviewList = unwrapList<{ id: string }>(reviewRes)
        if (reviewList.length > 0) {
          const allComments: ReviewCommentRow[] = []
          for (const r of reviewList.slice(0, 5)) {
            const cRes = await http.get(`/api/reviews/${r.id}/comments`).catch(() => null)
            if (cancelled) return
            allComments.push(...unwrapList<ReviewCommentRow>(cRes))
          }
          if (!cancelled) setInsights(allComments.slice(0, 5))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('nav.failedToLoadDashboard', {}, { defaultValue: 'Failed to load dashboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const repoNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of repos) map.set(r.id, r.full_name)
    return map
  }, [repos])

  const visiblePrs = useMemo(
    () => prs.map((p) => toPR(p, p.repository_id ? (repoNameById.get(p.repository_id) ?? '') : '')),
    [prs, repoNameById],
  )

  const avgScore = summary?.avgScore ?? 0
  const repoCount = summary?.totalRepos ?? repos.length

  const severityCounts = useMemo(() => {
    return [
      {
        severity: 'critical' as const,
        count: sevCounts?.critical ?? summary?.criticalReviews ?? 0,
      },
      { severity: 'changes_requested' as const, count: sevCounts?.changes_requested ?? 0 },
      { severity: 'suggestion' as const, count: sevCounts?.suggestion ?? 0 },
      { severity: 'approved' as const, count: sevCounts?.approved ?? summary?.mergedPrs ?? 0 },
    ]
  }, [sevCounts, summary])

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {t(
              'dashboard.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · review queue' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
        </div>
        <Link
          to="/repos"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add_link
          </span>
          {t('dashboard.connectRepoCta', {}, { defaultValue: 'Connect repository' })}
        </Link>
      </header>

      <PullRequestHero
        prCount={visiblePrs.length}
        reposConnected={repoCount}
        avgScore={avgScore}
        uptimePct={99.97}
      />

      <SeverityBadgeRow counts={severityCounts} />

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-8')}>
        <div className={cm.cn('lg:col-span-2')}>
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight',
              )}
            >
              {t('dashboard.recentHeading', {}, { defaultValue: 'Recent pull requests' })}
            </h2>
            <Link
              to="/history"
              className={cm.cn(
                // Negative margins grow the tap target to 44px without
                // shifting the baseline-aligned header row.
                'inline-flex items-center px-1 -mx-1 py-3 -my-3 text-sm font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.viewAllPrs', {}, { defaultValue: 'Review history →' })}
            </Link>
          </div>
          {error ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
          ) : loading ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visiblePrs.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
              {t(
                'dashboard.empty',
                {},
                { defaultValue: 'No pull requests yet — connect a repository to get started.' },
              )}
            </p>
          ) : (
            <ul
              className={cm.cn(
                'divide-y divide-outline-variant/40 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30',
              )}
            >
              {visiblePrs.slice(0, 6).map((pr) => (
                <li key={pr.id}>
                  <PullRequestRow pr={pr} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cm.stack(6)}>
          <ScoreCard
            score={avgScore}
            label={t('dashboard.scoreLabel', {}, { defaultValue: 'Team avg quality' })}
            subtitle={t(
              'dashboard.scoreSubtitle',
              { count: visiblePrs.length },
              { defaultValue: 'across {{count}} PRs' },
            )}
            breakdown={[
              {
                label: t('dashboard.scoreBreakdown.openPrs', {}, { defaultValue: 'Open PRs' }),
                value: summary?.openPrs ?? 0,
              },
              {
                label: t('dashboard.scoreBreakdown.mergedPrs', {}, { defaultValue: 'Merged PRs' }),
                value: summary?.mergedPrs ?? 0,
              },
              {
                label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
                value: summary?.totalReviews ?? 0,
              },
              {
                label: t('dashboard.scoreBreakdown.repos', {}, { defaultValue: 'Repositories' }),
                value: summary?.totalRepos ?? 0,
              },
            ]}
          />

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('dashboard.insightsHeading', {}, { defaultValue: 'AI insights' })}
            </h3>
            {loading ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : insights.length === 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t('dashboard.insightsEmpty', {}, { defaultValue: 'No AI insights yet.' })}
              </p>
            ) : (
              <ul className={cm.stack(4)}>
                {insights.map((ins) => {
                  const sev = ins.severity ?? 'info'
                  const tint =
                    sev === 'high' || sev === 'critical'
                      ? { dot: 'bg-red-500', fg: 'text-error' }
                      : sev === 'med' || sev === 'warning' || sev === 'changes_requested'
                        ? { dot: 'bg-amber-500', fg: 'text-warning' }
                        : { dot: 'bg-violet-500', fg: 'text-violet-600' }
                  return (
                    <li key={ins.id} className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span
                          className={cm.cn('w-2 h-2 rounded-full', tint.dot)}
                          aria-hidden="true"
                        />
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'uppercase tracking-widest font-mono',
                            tint.fg,
                          )}
                        >
                          {t(`dashboard.severity.${sev}`, {}, { defaultValue: sev })}
                        </span>
                        {ins.file_path ? (
                          <span
                            className={cm.cn(
                              'ml-auto text-[10px] font-mono text-on-surface-variant truncate',
                            )}
                          >
                            {ins.file_path}
                            {ins.line_start ? `:${ins.line_start}` : ''}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant leading-relaxed',
                        )}
                        data-mol-id="ai-insight-body"
                      >
                        {ins.body_md}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
