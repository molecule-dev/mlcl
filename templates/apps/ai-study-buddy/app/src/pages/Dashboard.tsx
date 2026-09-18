import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MasteryHeroCard } from '../components/MasteryHeroCard.js'
import { MasteryRing } from '../components/MasteryRing.js'
import { ReviewQueueCard } from '../components/ReviewQueueCard.js'
import { StatCard } from '../components/StatCard.js'
import { StreakBadge } from '../components/StreakBadge.js'
import { SubjectCard } from '../components/SubjectCard.js'

interface Stats {
  streak_days: number
  hours_this_week: number
  cards_mastered: number
  avg_quiz_score: number
}

interface MasterySegments {
  mastered: number
  reviewing: number
  learning: number
  not_started: number
}

interface MasterySummary {
  cards_mastered: number
  cards_total: number
  history: Array<{ date: string; hours: number }>
  segments: MasterySegments
}

interface Recommended {
  id: string
  title: string
  subtitle: string
  mastery_pct: number
  material_count: number
  subject: string
  color: string
  to: string
}

interface ReviewQueueItem {
  id: string
  title: string
  card_count: number
  due_count: number
  last_reviewed_at: string | null
}

interface TimelineEntry {
  id: string
  created_at: string
  topic_title: string
  cards_reviewed: number
  ai_messages_count: number
  session_type: string
}

interface DashboardPayload {
  stats: Stats
  mastery: MasterySummary
  recommended: Recommended[]
  review_queue: ReviewQueueItem[]
  timeline: TimelineEntry[]
}

const ICON_BY_SUBJECT: Record<string, string> = {
  sciences: 'science',
  science: 'science',
  biology: 'biotech',
  math: 'functions',
  mathematics: 'functions',
  humanities: 'history_edu',
  languages: 'language',
  cs: 'memory',
  general: 'auto_stories',
}

const iconForSubject = (subject?: string): string => {
  if (!subject) return ICON_BY_SUBJECT.general
  return ICON_BY_SUBJECT[subject.toLowerCase()] ?? ICON_BY_SUBJECT.general
}

const difficultyForMastery = (pct: number): 'easy' | 'medium' | 'hard' => {
  if (pct >= 75) return 'easy'
  if (pct >= 40) return 'medium'
  return 'hard'
}

const relativeDayKind = (iso: string): 'today' | 'yesterday' | 'other' => {
  const d = new Date(iso)
  const today = new Date()
  const isSameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  if (isSameDay) return 'today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return 'yesterday'
  return 'other'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<DashboardPayload>('/api/dashboard')
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('dashboard.error', {}, { defaultValue: 'Could not load dashboard.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    http
      .get<{ profile?: { name?: string } }>('/api/profile')
      .then((res) => {
        if (cancelled) return
        setProfileName(res.data?.profile?.name ?? '')
      })
      .catch(() => {
        /* ignore — header greeting falls back to a generic label */
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const stats = data?.stats
  const mastery = data?.mastery
  const recommended = data?.recommended ?? []
  const reviewQueue = data?.review_queue ?? []
  const timeline = data?.timeline ?? []
  const segments = mastery?.segments

  return (
    <div
      data-mol-id="page-dashboard"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-outline-variant/10',
        )}
      >
        <div>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {profileName
              ? t(
                  'dashboard.greeting',
                  { name: profileName },
                  { defaultValue: 'Good morning, {{name}}' },
                )
              : t('dashboard.greetingGeneric', {}, { defaultValue: 'Good morning' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-1 serif-text italic text-on-surface-variant')}>
            {t('dashboard.subgreeting', {}, { defaultValue: 'Ready for another session?' })}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {stats ? <StreakBadge days={stats.streak_days} active={stats.streak_days > 0} /> : null}
          <Link
            to="/notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'relative rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications
            </span>
          </Link>
        </div>
      </header>

      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 8),
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.w('full'),
          cm.flex({ direction: 'col', gap: 'lg' }),
        )}
      >
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
        {loading && !data ? (
          <p
            role="status"
            aria-live="polite"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('dashboard.loading', {}, { defaultValue: 'Loading your dashboard…' })}
          </p>
        ) : null}
        <>
          {/* KPI grid */}
          <section className={'grid grid-cols-2 gap-4 md:grid-cols-4'}>
            <StatCard
              tone="secondary"
              icon="local_fire_department"
              label={t('dashboard.kpi.streak', {}, { defaultValue: 'Current streak' })}
              value={stats?.streak_days ?? 0}
              suffix={t('dashboard.kpi.streakSuffix', {}, { defaultValue: 'days' })}
            />
            <StatCard
              tone="primary"
              icon="schedule"
              label={t('dashboard.kpi.hours', {}, { defaultValue: 'Hours studied' })}
              value={(stats?.hours_this_week ?? 0).toFixed(1)}
              suffix={t('dashboard.kpi.hoursSuffix', {}, { defaultValue: 'hrs' })}
            />
            <StatCard
              tone="success"
              icon="task_alt"
              label={t('dashboard.kpi.cards', {}, { defaultValue: 'Cards mastered' })}
              value={stats?.cards_mastered ?? 0}
            />
            <StatCard
              tone="info"
              icon="donut_large"
              label={t('dashboard.kpi.quiz', {}, { defaultValue: 'Avg quiz score' })}
              value={stats?.avg_quiz_score ?? 0}
              suffix="%"
            />
          </section>

          {/* Hero row */}
          <section className={'grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12'}>
            <div className={'lg:col-span-8'}>
              <MasteryHeroCard
                cardsMastered={mastery?.cards_mastered ?? 0}
                cardsTotal={mastery?.cards_total ?? 0}
                hoursThisWeek={stats?.hours_this_week ?? 0}
                history={mastery?.history ?? []}
              />
            </div>
            <aside
              className={cm.cn(
                cm.sp('p', 8),
                'relative overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-ambient lg:col-span-4 flex flex-col gap-6',
              )}
            >
              <div
                className={
                  'pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary-container/10 blur-3xl'
                }
                aria-hidden="true"
              />
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('dashboard.masteryPanel.title', {}, { defaultValue: 'Overall Mastery' })}
              </h3>
              <MasteryRing
                segments={
                  segments
                    ? {
                        mastered: segments.mastered,
                        reviewing: segments.reviewing,
                        learning: segments.learning,
                        notStarted: segments.not_started,
                      }
                    : { mastered: 0, reviewing: 0, learning: 0, notStarted: 0 }
                }
                size={208}
                showLegend
              />
            </aside>
          </section>

          {/* Recommended subjects */}
          <section className={cm.flex({ direction: 'col', gap: 'md' })}>
            <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('dashboard.recommended.title', {}, { defaultValue: 'Recommended study' })}
              </h2>
              <Link
                to="/courses"
                data-mol-id="dashboard-view-all-courses"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 32,
                  padding: '4px 12px',
                  flexShrink: 0,
                }}
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold text-primary rounded-lg hover:bg-surface-container-low',
                )}
              >
                {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
              </Link>
            </div>
            {recommended.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
                {t(
                  'dashboard.recommended.empty',
                  {},
                  { defaultValue: 'Add a course to get personalized recommendations.' },
                )}
              </p>
            ) : (
              <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'}>
                {recommended.map((s) => (
                  <SubjectCard
                    key={s.id}
                    subject={{
                      id: s.id,
                      title: s.title,
                      subtitle: s.subtitle,
                      icon: iconForSubject(s.subject),
                      masteryPct: s.mastery_pct,
                      difficulty: difficultyForMastery(s.mastery_pct),
                      cardCount: s.material_count,
                      to: s.to,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Review queue + timeline */}
          <section className={'grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_360px]'}>
            <div className={cm.flex({ direction: 'col', gap: 'md' })}>
              <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
                <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('dashboard.reviewQueue.title', {}, { defaultValue: 'Review queue' })}
                </h2>
                <Link
                  to="/flashcards"
                  data-mol-id="dashboard-open-decks"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 32,
                    padding: '4px 12px',
                    flexShrink: 0,
                  }}
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-bold text-primary rounded-lg hover:bg-surface-container-low',
                  )}
                >
                  {t('dashboard.openDecks', {}, { defaultValue: 'Open decks →' })}
                </Link>
              </div>
              {reviewQueue.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    'dashboard.reviewQueue.empty',
                    {},
                    { defaultValue: 'No decks due — create one to start reviewing.' },
                  )}
                </p>
              ) : (
                <div className={'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
                  {reviewQueue.map((item) => (
                    <ReviewQueueCard
                      key={item.id}
                      item={{
                        id: item.id,
                        title: item.title,
                        icon: 'auto_stories',
                        dueLabel:
                          item.due_count > 0
                            ? t(
                                'dashboard.dueLabel',
                                { count: item.due_count },
                                { defaultValue: '{{count}} due' },
                              )
                            : t('dashboard.upToDate', {}, { defaultValue: 'Up to date' }),
                        cardCount: item.card_count,
                        featured: false,
                        to: `/flashcards/${item.id}`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-[2rem] bg-surface-container-lowest shadow-ambient',
              )}
            >
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 6),
                  'text-on-surface',
                )}
              >
                {t('dashboard.timeline.title', {}, { defaultValue: 'Study timeline' })}
              </h3>
              {timeline.length === 0 ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    'dashboard.timeline.empty',
                    {},
                    { defaultValue: 'Sessions you complete will show up here.' },
                  )}
                </p>
              ) : (
                <ol className={'relative space-y-6 pl-6'}>
                  <span
                    className={
                      'absolute left-[7px] top-2 bottom-2 w-0.5 rounded-full bg-surface-container-high'
                    }
                    aria-hidden="true"
                  />
                  {timeline.map((entry, i) => (
                    <li key={entry.id} className="relative">
                      <span
                        className={cm.cn(
                          'absolute -left-[24px] top-1 h-4 w-4 rounded-full border-4 border-surface-container-lowest',
                          i === 0 ? 'bg-primary' : 'bg-surface-container-high',
                        )}
                        aria-hidden="true"
                      />
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'baseline', justify: 'between' }),
                          cm.sp('mb', 1),
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            'font-bold',
                            i === 0 ? 'text-primary' : 'text-on-surface-variant',
                          )}
                        >
                          {relativeDayKind(entry.created_at) === 'today'
                            ? t('common.today', {}, { defaultValue: 'Today' })
                            : relativeDayKind(entry.created_at) === 'yesterday'
                              ? t('common.yesterday', {}, { defaultValue: 'Yesterday' })
                              : new Date(entry.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'tabular-nums font-mono text-on-surface-variant',
                          )}
                        >
                          {entry.cards_reviewed}{' '}
                          {t('dashboard.timeline.cards', {}, { defaultValue: 'cards' })}
                        </span>
                      </div>
                      <div className={cm.cn(cm.sp('p', 3), 'rounded-xl bg-surface-container-low')}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {entry.topic_title}
                        </span>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'mt-1 serif-text text-on-surface-variant',
                          )}
                        >
                          {entry.session_type === 'qa'
                            ? t(
                                'dashboard.timeline.qaDetail',
                                { ai: entry.ai_messages_count },
                                { defaultValue: '{{ai}} AI exchanges' },
                              )
                            : t(
                                'dashboard.timeline.reviewDetail',
                                { cards: entry.cards_reviewed },
                                { defaultValue: '{{cards}} cards reviewed' },
                              )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          </section>
        </>
      </div>
    </div>
  )
}
