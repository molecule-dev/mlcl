import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DocumentCard, type DocumentCardData } from '../components/DocumentCard.js'
import { WritingStatCard } from '../components/WritingStatCard.js'
import { WritingStreakHeroCard } from '../components/WritingStreakHeroCard.js'

interface DashboardSummary {
  kpis: {
    totalDocuments: number
    publishedThisMonth: number
    avgSeoScore: number
    aiWordsUsed: number
    aiWordsLimit: number
  }
  streak: {
    dayStreak: number
    wordsThisWeek: number
    heatmap: Array<{ date: string; intensity: number }>
  }
  recentDocuments: Array<{
    id: string
    title: string
    excerpt: string
    status: string
    wordCount: number
    readingMinutes: number
    seoScore: number | null
    updatedAt: string
  }>
}

const STATUS_MAP: Record<string, DocumentCardData['status']> = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
  'ai-assisted': 'ai-assisted',
}

function toRelative(updatedAt: string): string {
  const then = new Date(updatedAt).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${Math.max(1, diffMin)}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const writerName =
    user?.name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    t('dashboard.defaultWriterName', {}, { defaultValue: 'Writer' })

  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<DashboardSummary>('/dashboard')
      .then((res) => {
        if (cancelled) return
        setData(res.data ?? null)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('dashboard.loadError', {}, { defaultValue: 'Could not load your dashboard.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const kpis = data?.kpis
  const streak = data?.streak
  const recentDocuments: DocumentCardData[] =
    data?.recentDocuments?.map((d) => ({
      id: d.id,
      title: d.title,
      excerpt: d.excerpt,
      status: STATUS_MAP[d.status] ?? 'draft',
      wordCount: d.wordCount,
      updatedRelative: toRelative(d.updatedAt),
      seoScore: d.seoScore ?? undefined,
    })) ?? []

  return (
    <div className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}>
      <div className={cm.cn('max-w-7xl', cm.mxAuto, cm.stack(8))}>
        <div
          className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
        >
          <div>
            <h1
              className={cm.cn(
                'text-3xl font-extrabold tracking-tight font-serif text-on-background',
              )}
            >
              {t(
                'dashboard.greeting',
                { name: writerName },
                { defaultValue: 'Good morning, {{name}}' },
              )}
            </h1>
            <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
              {kpis
                ? t(
                    'dashboard.subgreeting',
                    { count: kpis.totalDocuments },
                    {
                      defaultValue:
                        '{{count}} documents in your library — keep the momentum going.',
                    },
                  )
                : t('dashboard.loading', {}, { defaultValue: 'Loading your studio…' })}
            </p>
          </div>
          <Link
            to="/documents/new"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'bg-secondary text-white rounded-full hover:bg-secondary-dark transition-colors shadow-sm',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              edit_document
            </span>
            {t('dashboard.startWriting', {}, { defaultValue: 'Start a new document' })}
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-lg bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <WritingStreakHeroCard
          writerName={writerName}
          wordsThisWeek={streak?.wordsThisWeek ?? 0}
          dayStreak={streak?.dayStreak ?? 0}
          wordsChange={0}
        />

        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
        >
          <WritingStatCard
            labelKey="dashboard.kpi.totalDocs"
            labelDefault="Total documents"
            value={String(kpis?.totalDocuments ?? 0)}
            icon="description"
            tone="primary"
          />
          <WritingStatCard
            labelKey="dashboard.kpi.publishedThisMonth"
            labelDefault="Published"
            value={String(kpis?.publishedThisMonth ?? 0)}
            icon="check_circle"
            tone="success"
          />
          <WritingStatCard
            labelKey="dashboard.kpi.avgSeo"
            labelDefault="Avg SEO score"
            value={String(kpis?.avgSeoScore ?? 0)}
            suffix="/100"
            icon="travel_explore"
            tone="secondary"
          />
          <WritingStatCard
            labelKey="dashboard.kpi.aiWords"
            labelDefault="AI words used"
            value={String(kpis?.aiWordsUsed ?? 0)}
            suffix={`/${kpis?.aiWordsLimit ?? 100_000}`}
            icon="auto_awesome"
            tone="info"
          />
        </section>

        <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-3')}>
          <section className={cm.cn('lg:col-span-2', cm.stack(4))}>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'text-xl font-extrabold tracking-tight font-serif',
                )}
              >
                <span className="material-symbols-outlined text-primary" aria-hidden="true">
                  history_edu
                </span>
                {t('dashboard.continueWriting', {}, { defaultValue: 'Continue writing' })}
              </h2>
              <Link
                to="/documents"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:text-primary-dark',
                )}
              >
                {t('common.viewAll', {}, { defaultValue: 'View all' })}
              </Link>
            </div>
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t('dashboard.loadingDocs', {}, { defaultValue: 'Loading recent documents…' })}
              </p>
            ) : recentDocuments.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  'rounded-xl border border-outline-variant bg-surface text-center',
                )}
              >
                <span
                  className="material-symbols-outlined text-on-surface-variant"
                  aria-hidden="true"
                >
                  edit_note
                </span>
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'font-serif italic')}>
                  {t(
                    'dashboard.noDocuments',
                    {},
                    { defaultValue: 'No documents yet — start your first one.' },
                  )}
                </p>
                <Link
                  to="/documents/new"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-primary text-white hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('dashboard.createFirst', {}, { defaultValue: 'Create document' })}
                </Link>
              </div>
            ) : (
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
                {recentDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </section>

          <aside className={cm.cn(cm.stack(6))}>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm',
              )}
            >
              <h3
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-on-surface',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-secondary text-lg')}
                  aria-hidden="true"
                >
                  local_fire_department
                </span>
                {t(
                  'dashboard.streakTitle',
                  { count: streak?.dayStreak ?? 0 },
                  { defaultValue: '{{count}}-day streak' },
                )}
              </h3>
              <p className={cm.cn(cm.sp('mb', 4), cm.textSize('xs'), cm.textMuted)}>
                {t(
                  'dashboard.streakBody',
                  { words: (streak?.wordsThisWeek ?? 0).toLocaleString() },
                  { defaultValue: 'You have written {{words}} words this week.' },
                )}
              </p>
              <div className={cm.cn('grid grid-cols-7 gap-1.5 mb-2')}>
                {(streak?.heatmap ?? Array.from({ length: 14 }, () => ({ intensity: 0 }))).map(
                  (cell, i) => (
                    <div
                      key={i}
                      className={cm.cn('aspect-square rounded-[4px]')}
                      style={{
                        backgroundColor:
                          cell.intensity === 0
                            ? 'var(--color-surface-container)'
                            : `color-mix(in srgb, var(--color-primary) ${cell.intensity}%, transparent)`,
                      }}
                    />
                  ),
                )}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                <span>{t('dashboard.days.sun', {}, { defaultValue: 'Sun' })}</span>
                <span>{t('dashboard.days.sat', {}, { defaultValue: 'Sat' })}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
