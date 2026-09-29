import { useEffect, useMemo, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ScoreCard } from '../components/ScoreCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface SummaryRow {
  openPrs: number
  mergedPrs: number
  criticalReviews: number
  totalReviews: number
  totalRepos: number
  avgScore: number
}

interface ReviewRow {
  id: string
  pr_id: string
  status: string
  quality_score: number | null
  completed_at: string | null
  started_at: string | null
}

interface ApiCredentialRow {
  id: string
  provider: 'github' | 'gitlab'
}

const LINKABLE_PROVIDERS = ['github', 'gitlab'] as const

const DAY_MS = 24 * 60 * 60 * 1000
const HEATMAP_DAYS = 28

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [summary, setSummary] = useState<SummaryRow | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [credentials, setCredentials] = useState<ApiCredentialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiCopied, setApiCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/reports/summary').catch(() => null),
      http.get('/api/reviews?limit=200').catch(() => null),
      http.get('/api/api-credentials').catch(() => null),
    ])
      .then(([sumRes, reviewRes, credRes]) => {
        if (cancelled) return
        setSummary(unwrapSingle<SummaryRow>(sumRes))
        setReviews(unwrapList<ReviewRow>(reviewRes))
        setCredentials(unwrapList<ApiCredentialRow>(credRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('profile.loadError', {}, { defaultValue: 'Failed to load profile data.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const name =
    user?.name || user?.email || t('profile.anonymous', {}, { defaultValue: 'Anonymous' })
  const initials = String(name).slice(0, 2)

  const heatmap = useMemo(() => {
    const today = Date.now()
    const days: { date: string; intensity: 0 | 1 | 2 | 3 | 4 }[] = []
    const counts = new Array(HEATMAP_DAYS).fill(0)
    for (const r of reviews) {
      const ts = r.completed_at ? new Date(r.completed_at).getTime() : 0
      if (!ts) continue
      const dayIdx = Math.floor((today - ts) / DAY_MS)
      if (dayIdx >= 0 && dayIdx < HEATMAP_DAYS) counts[dayIdx] += 1
    }
    const max = Math.max(1, ...counts)
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today - i * DAY_MS)
      const c = counts[i]!
      const intensity: 0 | 1 | 2 | 3 | 4 =
        c === 0 ? 0 : c >= max * 0.75 ? 4 : c >= max * 0.5 ? 3 : c >= max * 0.25 ? 2 : 1
      days.push({ date: d.toISOString().slice(0, 10), intensity })
    }
    return days
  }, [reviews])

  const recent = useMemo(() => {
    return [...reviews]
      .filter((r) => r.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5)
  }, [reviews])

  const streak = useMemo(() => {
    let count = 0
    const dates = new Set(
      reviews
        .filter((r) => r.completed_at)
        .map((r) => new Date(r.completed_at!).toISOString().slice(0, 10)),
    )
    let day = new Date()
    while (dates.has(day.toISOString().slice(0, 10))) {
      count += 1
      day = new Date(day.getTime() - DAY_MS)
    }
    return count
  }, [reviews])

  const avgScore = summary?.avgScore ?? 0
  const reviewCount = summary?.totalReviews ?? reviews.length

  const apiBase = `${window.location.origin}/api`

  const copyApiBase = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/api`)
      setApiCopied(true)
      window.setTimeout(() => setApiCopied(false), 2000)
    } catch (err) {
      console.error('[profile] clipboard copy failed', err)
    }
  }

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' })}>
        <span
          className={cm.cn(
            'w-20 h-20 rounded-full inline-flex items-center justify-center text-2xl font-extrabold uppercase text-white shrink-0',
          )}
          // chart-primary (violet in both modes) keeps the white initials readable —
          // primary-container flips to a pale tint in light mode (white-on-#dcfce7).
          style={{
            background:
              'linear-gradient(135deg, var(--color-chart-primary), var(--color-brand-accent))',
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className={cm.cn('flex-1 min-w-0')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {t('profile.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · profile' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {name}
          </h1>
          {user?.email ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant font-mono',
                cm.sp('mt', 1),
              )}
            >
              {user.email}
            </p>
          ) : null}
        </div>
      </header>

      {error ? <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>{error}</p> : null}

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-4 gap-6')}>
        {[
          {
            key: 'reviews',
            label: 'Reviews',
            value: String(reviewCount),
            accent: 'var(--color-violet-500)',
          },
          {
            key: 'streak',
            label: 'Day streak',
            value: String(streak),
            accent: 'var(--color-emerald-500)',
          },
          {
            key: 'avgScore',
            label: 'Avg score',
            value: avgScore > 0 ? avgScore.toFixed(1) : '—',
            accent: 'var(--color-cyan-500)',
          },
          {
            key: 'critical',
            label: 'Critical',
            value: String(summary?.criticalReviews ?? 0),
            accent: 'var(--color-amber-500)',
          },
        ].map((kpi) => (
          <article
            key={kpi.key}
            className={cm.cn(
              cm.sp('p', 5),
              cm.stack(2),
              cm.accentCard({ tone: 'custom' }),
              'rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
            style={{ ['--mol-accent' as string]: kpi.accent }}
          >
            <p className={cm.cn(cm.accentCardLabel({ tone: 'custom' }), 'font-mono')}>
              {t(`profile.kpi.${kpi.key}`, {}, { defaultValue: kpi.label })}
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
        <article
          className={cm.cn(
            cm.sp('p', 5),
            'lg:col-span-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
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
            {t(
              'profile.activityHeading',
              { days: HEATMAP_DAYS },
              { defaultValue: 'Review activity · last {{days}} days' },
            )}
          </h2>
          <div className={cm.cn('grid grid-cols-7 gap-1', cm.gridRows(4))}>
            {heatmap.map((d) => {
              const bg =
                d.intensity === 0
                  ? 'bg-surface-variant'
                  : d.intensity === 1
                    ? 'bg-violet-500/30'
                    : d.intensity === 2
                      ? 'bg-violet-500/55'
                      : d.intensity === 3
                        ? 'bg-violet-500/80'
                        : 'bg-violet-500'
              return (
                <span
                  key={d.date}
                  title={t(
                    'profile.heatmapDay',
                    { date: d.date, level: d.intensity },
                    { defaultValue: '{{date}} · level {{level}}' },
                  )}
                  className={cm.cn('w-6 h-6 rounded-md', bg)}
                  aria-hidden="true"
                />
              )
            })}
          </div>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mt', 6),
              cm.sp('mb', 3),
              'uppercase tracking-widest text-on-surface-variant font-mono',
            )}
          >
            {t('profile.timelineHeading', {}, { defaultValue: 'Recent activity' })}
          </h3>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : recent.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('profile.timelineEmpty', {}, { defaultValue: 'No reviews recorded yet.' })}
            </p>
          ) : (
            <ul className={cm.stack(3)}>
              {recent.map((r) => (
                <li
                  key={r.id}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-sm')}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-on-surface-variant text-[16px]',
                    )}
                    aria-hidden="true"
                  >
                    rate_review
                  </span>
                  <span className={cm.cn('text-on-surface flex-1')}>
                    {t(
                      'profile.reviewedPr',
                      { pr: r.pr_id },
                      { defaultValue: 'Reviewed PR {{pr}}' },
                    )}
                  </span>
                  <span className={cm.cn('text-xs font-mono text-on-surface-variant')}>
                    {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <div className={cm.stack(6)}>
          <ScoreCard
            score={avgScore}
            label={t('profile.scoreLabel', {}, { defaultValue: 'Reviewer score' })}
            subtitle={t(
              'common.countReviews',
              { count: reviewCount },
              { defaultValue: '{{count}} reviews' },
            )}
            breakdown={[
              {
                label: t('profile.scoreBreakdown.openPrs', {}, { defaultValue: 'Open PRs' }),
                value: summary?.openPrs ?? 0,
              },
              {
                label: t('profile.scoreBreakdown.mergedPrs', {}, { defaultValue: 'Merged PRs' }),
                value: summary?.mergedPrs ?? 0,
              },
              {
                label: t('profile.scoreBreakdown.repos', {}, { defaultValue: 'Repositories' }),
                value: summary?.totalRepos ?? 0,
              },
            ]}
          />

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
            )}
            data-mol-id="profile-about"
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('profile.aboutHeading', {}, { defaultValue: 'About' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'profile.aboutBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} workspace member. This profile aggregates the reviews, quality scores, and review streak recorded for this account across every connected repository.',
                },
              )}
            </p>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
            )}
            data-mol-id="profile-linked-accounts"
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('profile.linkedHeading', {}, { defaultValue: 'Linked accounts' })}
            </h3>
            <ul className={cm.stack(3)}>
              {LINKABLE_PROVIDERS.map((provider) => {
                const linked = credentials.some((c) => c.provider === provider)
                return (
                  <li key={provider} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        'w-7 h-7 rounded-md bg-surface-variant inline-flex items-center justify-center shrink-0',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                        {provider === 'github' ? 'hub' : 'merge_type'}
                      </span>
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t(
                        `profile.provider.${provider}`,
                        {},
                        { defaultValue: provider === 'github' ? 'GitHub' : 'GitLab' },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        'ml-auto inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest font-mono',
                        linked
                          ? 'bg-emerald-500/15 text-success'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {linked
                        ? t('profile.providerConnected', {}, { defaultValue: 'Connected' })
                        : t('profile.providerNotLinked', {}, { defaultValue: 'Not linked' })}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/settings'
              }}
              data-mol-id="profile-manage-accounts"
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary hover:underline',
              )}
            >
              {t('profile.manageAccountsCta', {}, { defaultValue: 'Manage in settings' })}
            </button>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
            )}
            data-mol-id="profile-api-access"
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('profile.apiHeading', {}, { defaultValue: 'API access' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 3))}>
              {t(
                'profile.apiBody',
                {},
                {
                  defaultValue:
                    'Point CLI and API clients at this workspace base URL. Provider tokens are managed in Settings → API keys.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <code
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  'flex-1 min-w-0 rounded bg-surface-container-low text-[10px] font-mono text-on-surface truncate',
                )}
                data-mol-id="profile-api-base"
              >
                {apiBase}
              </code>
              <button
                type="button"
                onClick={copyApiBase}
                aria-label={t('profile.apiCopyAria', {}, { defaultValue: 'Copy API base URL' })}
                data-mol-id="profile-api-copy"
                className={cm.cn(
                  'w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-md border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {apiCopied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
