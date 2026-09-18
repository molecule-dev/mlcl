import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type PullRequest, PullRequestRow } from '../components/PullRequestRow.js'
import { ScoreCard } from '../components/ScoreCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const TAB_KEYS = ['prs', 'reviews', 'rules', 'settings'] as const
type TabKey = (typeof TAB_KEYS)[number]

const TAB_DEFAULTS: Record<TabKey, string> = {
  prs: 'Pull requests',
  reviews: 'Reviews',
  rules: 'Rules',
  settings: 'Repo settings',
}

interface RepositoryRow {
  id: string
  name?: string
  full_name?: string
  default_branch?: string
  provider?: string
  sync_status?: string
}

interface PullRequestApiRow {
  id: string
  title: string
  repository_id: string | null
  head_ref: string | null
  base_ref: string | null
  state: 'open' | 'merged' | 'closed' | 'draft'
  additions: number | null
  deletions: number | null
  opened_at: string | null
  author_login: string | null
}

interface ReviewApiRow {
  id: string
  pr_id: string
  status: string
  quality_score: number | null
  completed_at: string | null
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

export function RepositoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [repo, setRepo] = useState<RepositoryRow | null>(null)
  const [prs, setPrs] = useState<PullRequestApiRow[]>([])
  const [reviews, setReviews] = useState<ReviewApiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('prs')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/repositories/${id}`).catch(() => null),
      http.get(`/api/pull-requests?repository_id=${id}`).catch(() => null),
      http.get('/api/reviews').catch(() => null),
    ])
      .then(([repoRes, prRes, reviewRes]) => {
        if (cancelled) return
        setRepo(unwrapSingle<RepositoryRow>(repoRes))
        setPrs(unwrapList<PullRequestApiRow>(prRes))
        setReviews(unwrapList<ReviewApiRow>(reviewRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('repositoryDetail.loadError', {}, { defaultValue: 'Failed to load repository.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const repoLabel = repo?.full_name || repo?.name || id || ''
  const visiblePRs = useMemo(() => prs.map((p) => toPR(p, repoLabel)), [prs, repoLabel])
  const reviewsForRepo = useMemo(
    () => reviews.filter((r) => prs.some((p) => p.id === r.pr_id)),
    [reviews, prs],
  )

  const kpis = useMemo(() => {
    const open = prs.filter((p) => p.state === 'open').length
    const reviewed = prs.filter((p) => p.state === 'merged').length
    const critical = reviewsForRepo.filter((r) => r.status === 'failed').length
    const scored = reviewsForRepo.filter(
      (r) => r.quality_score !== null && r.quality_score !== undefined,
    )
    const avg =
      scored.length === 0
        ? 0
        : scored.reduce((acc, r) => acc + (r.quality_score ?? 0) / 10, 0) / scored.length
    return [
      { key: 'open', label: 'Open PRs', value: String(open), tint: 'border-emerald-500' },
      {
        key: 'reviewed',
        label: 'Reviewed (merged)',
        value: String(reviewed),
        tint: 'border-violet-500',
      },
      {
        key: 'critical',
        label: 'Critical issues',
        value: String(critical),
        tint: 'border-red-500',
      },
      {
        key: 'avg',
        label: 'Avg score',
        value: avg > 0 ? avg.toFixed(1) : '—',
        tint: 'border-cyan-500',
      },
    ]
  }, [prs, reviewsForRepo])

  const repoScore = useMemo(() => {
    const scored = reviewsForRepo.filter(
      (r) => r.quality_score !== null && r.quality_score !== undefined,
    )
    if (scored.length === 0) return 0
    return Number(
      (scored.reduce((acc, r) => acc + (r.quality_score ?? 0) / 10, 0) / scored.length).toFixed(1),
    )
  }, [reviewsForRepo])

  const contributors = useMemo(() => {
    const by = new Map<string, { name: string; prs: number }>()
    for (const pr of prs) {
      const author = pr.author_login || ''
      if (!author) continue
      if (!by.has(author)) by.set(author, { name: author, prs: 0 })
      const e = by.get(author)
      if (e) e.prs += 1
    }
    return [...by.values()].sort((a, b) => b.prs - a.prs).slice(0, 6)
  }, [prs])

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <div className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
        <Link to="/repos" className={cm.cn('hover:text-primary transition-colors')}>
          {t('repositoryDetail.crumbRepos', {}, { defaultValue: 'Repositories' })}
        </Link>
        <span className={cm.cn('mx-2 opacity-60')}>/</span>
        <span>{repoLabel}</span>
      </div>

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
              'repositoryDetail.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · repository' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight font-mono',
            )}
          >
            {repoLabel}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'repositoryDetail.subheading',
              {},
              { defaultValue: 'Health snapshot, recent PRs, hotspots, and contributors.' },
            )}
          </p>
        </div>
      </header>

      {error ? <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>{error}</p> : null}

      <nav
        className={cm.cn(cm.flex({ gap: 'sm' }), 'border-b border-outline-variant/40')}
        aria-label={t('repositoryDetail.tabsLabel', {}, { defaultValue: 'Repository sections' })}
      >
        {TAB_KEYS.map((tab) => {
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-pressed={active}
              disabled={active}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'border-b-2 transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t(`repositoryDetail.tab.${tab}`, {}, { defaultValue: TAB_DEFAULTS[tab] })}
            </button>
          )
        })}
      </nav>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-4 gap-6')}>
        {kpis.map((kpi) => (
          <article
            key={kpi.key}
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(2),
              'rounded-2xl bg-surface-container-lowest shadow-sm border-l-4',
              kpi.tint,
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t(`repositoryDetail.kpi.${kpi.key}`, {}, { defaultValue: kpi.label })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tabular-nums tracking-tight',
              )}
            >
              {kpi.value}
            </p>
          </article>
        ))}
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div className={cm.cn('lg:col-span-2 space-y-6')}>
          {activeTab === 'prs' ? (
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'tracking-tight',
                )}
              >
                {t('repositoryDetail.recentHeading', {}, { defaultValue: 'Recent pull requests' })}
              </h2>
              {loading ? (
                <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : visiblePRs.length === 0 ? (
                <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
                  {t(
                    'repositoryDetail.empty',
                    {},
                    { defaultValue: 'No pull requests for this repository yet.' },
                  )}
                </p>
              ) : (
                <ul
                  className={cm.cn(
                    'divide-y divide-outline-variant/40 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30',
                  )}
                >
                  {visiblePRs.map((pr) => (
                    <li key={pr.id}>
                      <PullRequestRow pr={pr} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {activeTab === 'reviews' ? (
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'tracking-tight',
                )}
              >
                {t('repositoryDetail.reviewsHeading', {}, { defaultValue: 'Recent reviews' })}
              </h2>
              {loading ? (
                <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : reviewsForRepo.length === 0 ? (
                <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
                  {t(
                    'repositoryDetail.reviewsEmpty',
                    {},
                    { defaultValue: 'No reviews recorded for this repository.' },
                  )}
                </p>
              ) : (
                <ul
                  className={cm.cn(
                    'bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 divide-y divide-outline-variant/30',
                  )}
                >
                  {reviewsForRepo.map((r) => (
                    <li
                      key={r.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'md' }),
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-[18px] text-on-surface-variant"
                        aria-hidden="true"
                      >
                        rate_review
                      </span>
                      <Link
                        to={`/prs/${r.pr_id}`}
                        className={cm.cn(
                          'flex-1 min-w-0 font-mono text-sm text-on-surface truncate hover:text-primary transition-colors',
                        )}
                      >
                        {prs.find((p) => p.id === r.pr_id)?.title ?? r.pr_id}
                      </Link>
                      <span className={cm.cn('text-xs font-mono text-on-surface-variant')}>
                        {r.status}
                      </span>
                      {r.quality_score !== null && r.quality_score !== undefined ? (
                        <span
                          className={cm.cn('text-xs font-mono tabular-nums font-bold text-success')}
                        >
                          {(r.quality_score / 10).toFixed(1)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {activeTab === 'rules' ? (
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'tracking-tight',
                )}
              >
                {t('repositoryDetail.rulesHeading', {}, { defaultValue: 'Rules' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 3))}>
                {t(
                  'repositoryDetail.rulesDescription',
                  {},
                  { defaultValue: 'Custom rules apply across all repositories.' },
                )}
              </p>
              <Link
                to="/rules"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'inline-block rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm',
                )}
              >
                {t('repositoryDetail.openRulesCta', {}, { defaultValue: 'Open rules editor' })}
              </Link>
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'tracking-tight',
                )}
              >
                {t('repositoryDetail.settingsHeading', {}, { defaultValue: 'Repository settings' })}
              </h2>
              <dl className={cm.cn(cm.stack(2), cm.textSize('sm'), 'font-mono')}>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className={cm.textMuted}>
                    {t('repositoryDetail.provider', {}, { defaultValue: 'Provider' })}
                  </dt>
                  <dd>{repo?.provider || '—'}</dd>
                </div>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className={cm.textMuted}>
                    {t('repositoryDetail.defaultBranch', {}, { defaultValue: 'Default branch' })}
                  </dt>
                  <dd>{repo?.default_branch || '—'}</dd>
                </div>
                <div className={cm.flex({ justify: 'between' })}>
                  <dt className={cm.textMuted}>
                    {t('repositoryDetail.syncStatus', {}, { defaultValue: 'Sync status' })}
                  </dt>
                  <dd>{repo?.sync_status || '—'}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className={cm.cn('space-y-6')}>
          <ScoreCard
            score={repoScore}
            label={t('repositoryDetail.repoScoreLabel', {}, { defaultValue: 'Repo health' })}
            subtitle={t(
              'repositoryDetail.repoScoreSubtitle',
              {},
              { defaultValue: 'rolling avg · all branches' },
            )}
            breakdown={[
              {
                label: t(
                  'repositoryDetail.scoreBreakdown.openPrs',
                  {},
                  { defaultValue: 'Open PRs' },
                ),
                value: prs.filter((p) => p.state === 'open').length,
              },
              {
                label: t('repositoryDetail.scoreBreakdown.merged', {}, { defaultValue: 'Merged' }),
                value: prs.filter((p) => p.state === 'merged').length,
              },
              {
                label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
                value: reviewsForRepo.length,
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
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('repositoryDetail.contributorsHeading', {}, { defaultValue: 'Top contributors' })}
            </h3>
            {contributors.length === 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'repositoryDetail.contributorsEmpty',
                  {},
                  { defaultValue: 'No contributors recorded yet.' },
                )}
              </p>
            ) : (
              <ul className={cm.stack(3)}>
                {contributors.map((c) => (
                  <li key={c.name} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                    <span
                      className={cm.cn(
                        'w-7 h-7 rounded-full bg-surface-variant inline-flex items-center justify-center text-[10px] font-bold uppercase text-on-surface',
                      )}
                      aria-hidden="true"
                    >
                      {c.name.slice(0, 2)}
                    </span>
                    <span className={cm.cn('flex-1 text-sm font-medium text-on-surface truncate')}>
                      {c.name}
                    </span>
                    <span
                      className={cm.cn('text-xs font-mono tabular-nums text-on-surface-variant')}
                    >
                      {t(
                        'repositoryDetail.prsCount',
                        { count: c.prs },
                        { defaultValue: '{{count}} PRs' },
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
