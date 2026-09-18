import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ScoreCard } from '../components/ScoreCard.js'
import { SeverityBadgeRow } from '../components/SeverityBadgeRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

interface SummaryRow {
  openPrs: number
  mergedPrs: number
  criticalReviews: number
  totalReviews: number
  totalRepos: number
  avgScore: number
}

interface TopRepoRow {
  repository_id: string
  full_name: string
  prs: number
}

interface LeaderboardRow {
  author_login: string
  reviews: number
}

interface TrendRow {
  series: number[]
  days: number
}

function trendPath(
  values: ReadonlyArray<number>,
  w: number,
  h: number,
): { line: string; area: string } {
  if (values.length === 0) return { line: '', area: '' }
  const min = 0
  const max = 10
  const stepX = w / Math.max(1, values.length - 1)
  const points = values.map((v, i) => {
    const x = i * stepX
    const norm = (v - min) / (max - min)
    const y = h - norm * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M ${points.join(' L ')}`
  const area = `${line} L ${w.toFixed(1)},${h.toFixed(1)} L 0,${h.toFixed(1)} Z`
  return { line, area }
}

export function Reports() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [range, setRange] = useState<Range>(30)
  const [summary, setSummary] = useState<SummaryRow | null>(null)
  const [topRepos, setTopRepos] = useState<TopRepoRow[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [trend, setTrend] = useState<TrendRow>({ series: [], days: 0 })
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
      http.get(`/api/reports/summary?days=${range}`).catch(() => null),
      http.get('/api/reports/top-repos').catch(() => null),
      http.get('/api/reports/leaderboard').catch(() => null),
      http.get(`/api/reports/trend?days=${range}`).catch(() => null),
      http.get('/api/reports/severity-counts').catch(() => null),
    ])
      .then(([sumRes, repoRes, leaderRes, trendRes, sevRes]) => {
        if (cancelled) return
        setSummary(unwrapSingle<SummaryRow>(sumRes))
        setTopRepos(unwrapList<TopRepoRow>(repoRes))
        setLeaderboard(unwrapList<LeaderboardRow>(leaderRes))
        const trendData = unwrapSingle<TrendRow>(trendRes)
        setTrend(trendData ?? { series: [], days: 0 })
        setSevCounts(
          unwrapSingle<{
            critical: number
            changes_requested: number
            suggestion: number
            approved: number
          }>(sevRes),
        )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadReports', {}, { defaultValue: 'Failed to load reports.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, range, t])

  const trendPaths = useMemo(() => trendPath(trend.series, 600, 120), [trend])

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

  const avgScoreVal = summary?.avgScore ?? 0

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
              'reports.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · analytics' },
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
            {t('nav.reports', {}, { defaultValue: 'Reports' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'reports.subheading',
              {},
              {
                defaultValue:
                  'Quality trends, hotspots, and reviewer leaderboard — exported weekly.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(cm.flex({ gap: 'sm' }))}
          role="group"
          aria-label={t('reports.rangeLabel', {}, { defaultValue: 'Time range' })}
        >
          {RANGES.map((r) => {
            const active = r === range
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={active}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full uppercase tracking-widest font-mono transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`reports.range.${r}d`, {}, { defaultValue: `${r}d` })}
              </button>
            )
          })}
        </div>
      </header>

      {error ? <p className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-error')}>{error}</p> : null}

      <SeverityBadgeRow counts={severityCounts} />

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            cm.stack(4),
            'lg:col-span-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
          )}
        >
          <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'reports.trendHeading',
                { days: range },
                { defaultValue: 'Quality score · last {{days}} days' },
              )}
            </h2>
            <span className={cm.cn('text-xs font-mono tabular-nums text-on-surface-variant')}>
              {avgScoreVal > 0 ? avgScoreVal.toFixed(1) : '—'}
            </span>
          </header>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : trend.series.every((v) => v === 0) ? (
            <p className={cm.cn(cm.sp('py', 8), cm.textCenter, cm.textMuted)}>
              {t(
                'reports.trendEmpty',
                {},
                { defaultValue: 'No completed reviews in this range yet.' },
              )}
            </p>
          ) : (
            <svg
              viewBox="0 0 600 120"
              className={cm.cn('w-full h-32')}
              aria-label={t('reports.trendAria', {}, { defaultValue: 'Quality score trend chart' })}
            >
              <defs>
                <linearGradient id="reports-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-primary)" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="var(--color-chart-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={trendPaths.area} fill="url(#reports-area)" />
              <path
                d={trendPaths.line}
                fill="none"
                stroke="var(--color-chart-primary)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          )}
        </article>
        <ScoreCard
          score={avgScoreVal}
          label={t('reports.cumulativeScoreLabel', {}, { defaultValue: 'Cumulative score' })}
          subtitle={t(
            'reports.cumulativeScoreSubtitle',
            { days: range },
            { defaultValue: 'all repos · {{days}}d' },
          )}
          breakdown={[
            {
              label: t('reports.scoreBreakdown.openPrs', {}, { defaultValue: 'Open PRs' }),
              value: summary?.openPrs ?? 0,
            },
            {
              label: t('reports.scoreBreakdown.mergedPrs', {}, { defaultValue: 'Merged PRs' }),
              value: summary?.mergedPrs ?? 0,
            },
            {
              label: t(
                'reports.scoreBreakdown.totalReviews',
                {},
                { defaultValue: 'Total reviews' },
              ),
              value: summary?.totalReviews ?? 0,
            },
            {
              label: t('reports.scoreBreakdown.repos', {}, { defaultValue: 'Repositories' }),
              value: summary?.totalRepos ?? 0,
            },
          ]}
        />
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'tracking-tight',
            )}
          >
            {t('reports.topReposHeading', {}, { defaultValue: 'Top repositories' })}
          </h2>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 6), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : topRepos.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 6), cm.textCenter, cm.textMuted)}>
              {t('reports.topReposEmpty', {}, { defaultValue: 'No repositories connected yet.' })}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {topRepos.map((r) => (
                <li
                  key={r.repository_id}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}
                >
                  <span className={cm.cn('font-mono text-sm text-on-surface flex-1 truncate')}>
                    {r.full_name}
                  </span>
                  <span
                    className={cm.cn(
                      'text-xs font-mono tabular-nums text-on-surface-variant w-16 text-right',
                    )}
                  >
                    {t('reports.prsCount', { count: r.prs }, { defaultValue: '{{count}} PRs' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'tracking-tight',
            )}
          >
            {t('reports.reviewersHeading', {}, { defaultValue: 'Reviewer leaderboard' })}
          </h2>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 6), cm.textCenter, cm.textMuted)}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : leaderboard.length === 0 ? (
            <p className={cm.cn(cm.sp('py', 6), cm.textCenter, cm.textMuted)}>
              {t('reports.leaderboardEmpty', {}, { defaultValue: 'No reviewer activity yet.' })}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {leaderboard.map((r) => (
                <li key={r.author_login} className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                  <span
                    className={cm.cn(
                      'w-7 h-7 rounded-full bg-surface-variant inline-flex items-center justify-center text-[10px] font-bold uppercase text-on-surface',
                    )}
                    aria-hidden="true"
                  >
                    {r.author_login.slice(0, 2)}
                  </span>
                  <span className={cm.cn('text-sm font-medium text-on-surface flex-1 truncate')}>
                    {r.author_login}
                  </span>
                  <span
                    className={cm.cn(
                      'text-xs font-mono tabular-nums text-on-surface-variant w-20 text-right',
                    )}
                  >
                    {t(
                      'common.countReviews',
                      { count: r.reviews },
                      { defaultValue: '{{count}} reviews' },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  )
}
