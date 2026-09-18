import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DeckProgressCard } from '../components/DeckProgressCard.js'
import { StudyKpiCard } from '../components/StudyKpiCard.js'
import { TodayHeroCard } from '../components/TodayHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Deck {
  id: string
  name: string
  description: string
  category: string
  card_count: number
  due_count: number
  new_count: number
  retention_rate: number
  last_studied: string | null
}

interface Today {
  date: string
  total_due: number
  reviewed_today: number
  daily_goal: number
  current_streak: number
  motivational_message: string
}

interface Overview {
  retention_rate: number
  current_streak: number
  reviews_change_percent: number
  total_reviews: number
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [decks, setDecks] = useState<Deck[]>([])
  const [today, setToday] = useState<Today | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/decks'),
      http.get('/api/reports/today'),
      http.get('/api/reports/overview'),
    ])
      .then(([d, s, o]) => {
        if (cancelled) return
        setDecks(unwrapList<Deck>(d))
        setToday(unwrapSingle<Today>(s))
        setOverview(unwrapSingle<Overview>(o))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const dueDecks = useMemo(
    () => decks.filter((d) => d.due_count > 0).sort((a, b) => b.due_count - a.due_count),
    [decks],
  )
  const otherDecks = useMemo(() => decks.filter((d) => d.due_count === 0), [decks])
  const primaryDeckId = dueDecks[0]?.id ?? null

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div
      className={cm.cn(
        cm.sp('px', 8),
        cm.sp('py', 8),
        cm.maxW('6xl'),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      {today && (
        <TodayHeroCard
          date={today.date}
          totalDue={today.total_due}
          reviewedToday={today.reviewed_today}
          dailyGoal={today.daily_goal}
          currentStreak={today.current_streak}
          motivationalMessage={today.motivational_message}
          primaryDeckId={primaryDeckId}
        />
      )}

      <section className={cm.cn(cm.grid({ cols: 3, gap: 'md' }))}>
        <StudyKpiCard
          icon="local_fire_department"
          labelKey="dashboard.kpi.streak"
          labelDefault="Current streak"
          value={overview?.current_streak ?? today?.current_streak ?? 0}
          unit={t('dashboard.kpi.days', {}, { defaultValue: 'days' })}
          accent="streak"
        />
        <StudyKpiCard
          icon="bolt"
          labelKey="dashboard.kpi.retention"
          labelDefault="Retention"
          value={`${Math.round((overview?.retention_rate ?? 0) * 100)}%`}
          accent="success"
        />
        <StudyKpiCard
          icon="trending_up"
          labelKey="dashboard.kpi.reviews"
          labelDefault="Reviews (30d)"
          value={overview?.total_reviews ?? 0}
          delta={overview?.reviews_change_percent}
          accent="primary"
        />
      </section>

      <section>
        <SectionHeading
          eyebrow={t('dashboard.dueEyebrow', {}, { defaultValue: 'Cards due now' })}
          title={t(
            'dashboard.dueTitle',
            { count: dueDecks.length },
            { defaultValue: 'Decks waiting on you ({{count}})' },
          )}
        />
        {dueDecks.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest',
            )}
          >
            <span className="material-symbols-outlined text-3xl text-success" aria-hidden="true">
              check_circle
            </span>
            <p className={cm.cn(cm.sp('mt', 2), cm.fontWeight('semibold'))}>
              {t('dashboard.dueEmpty', {}, { defaultValue: 'Nothing due. Great consistency.' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'dashboard.dueEmptySub',
                {},
                { defaultValue: 'Pick any deck below to learn ahead.' },
              )}
            </p>
          </div>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {dueDecks.map((d) => (
              <li key={d.id}>
                <DeckProgressCard
                  id={d.id}
                  name={d.name}
                  description={d.description}
                  category={d.category}
                  cardCount={d.card_count}
                  dueCount={d.due_count}
                  newCount={d.new_count}
                  retentionRate={d.retention_rate}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {otherDecks.length > 0 && (
        <section>
          <SectionHeading
            eyebrow={t('dashboard.caughtUpEyebrow', {}, { defaultValue: 'Caught up' })}
            title={t(
              'dashboard.caughtUpTitle',
              { count: otherDecks.length },
              { defaultValue: 'Already mastered for today ({{count}})' },
            )}
          />
          <ul className={cm.cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3')}>
            {otherDecks.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/decks/${d.id}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    'block rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:shadow-md transition-shadow',
                  )}
                  data-mol-id={`caught-up-${d.id}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant">
                    {t(`dashboard.category.${d.category}`, {}, { defaultValue: d.category })}
                  </p>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('mt', 2),
                      'text-base font-extrabold truncate',
                    )}
                  >
                    {d.name}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(
                      'dashboard.cardCount',
                      { count: d.card_count, retention: Math.round(d.retention_rate * 100) },
                      { defaultValue: '{{count}} cards · {{retention}}% retention' },
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('mb', 4))}>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h2
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          'text-xl font-extrabold tracking-tight',
        )}
      >
        {title}
      </h2>
    </div>
  )
}
