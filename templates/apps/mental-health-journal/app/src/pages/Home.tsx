import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { JournalEntryCard } from '../components/JournalEntryCard.js'
import { MoodHeroCard, type MoodLevel } from '../components/MoodHeroCard.js'
import { WellnessRingsTriad } from '../components/WellnessRingsTriad.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface JournalEntry {
  id: string
  date: string
  title: string
  preview: string
  mood: MoodLevel
  tags: string[]
  word_count: number
}

interface TodaySummary {
  mood: MoodLevel
  streak_days: number
  entries_this_week: number
  reflection_prompt: string
  trend: { day: string; score: number }[]
  sleep_hours: number
  sleep_goal: number
  mindfulness_minutes: number
  mindfulness_goal: number
  journal_streak: number
  journal_goal: number
}

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [today, setToday] = useState<TodaySummary | null>(null)
  const [recent, setRecent] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([http.get('/api/journal/today'), http.get('/api/journal/recent')])
      .then(([todayRes, recentRes]) => {
        if (cancelled) return
        if (todayRes.status === 'fulfilled') {
          const today_ = unwrapSingle<TodaySummary>(todayRes.value)
          if (today_ && 'mood' in today_) setToday(today_)
        } else {
          setError(t('home.loadError', {}, { defaultValue: 'Failed to load journal data.' }))
        }
        if (recentRes.status === 'fulfilled') {
          setRecent(unwrapList<JournalEntry>(recentRes.value))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const greetingName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {todayStr}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {greetingName
            ? t(
                'home.greetingName',
                { name: greetingName },
                { defaultValue: 'Good to see you, {{name}}.' },
              )
            : t('home.greeting', {}, { defaultValue: 'Welcome back.' })}
        </h1>
      </header>

      {today ? (
        <>
          <MoodHeroCard
            mood={today.mood}
            streakDays={today.streak_days}
            entriesThisWeek={today.entries_this_week}
            reflectionPrompt={today.reflection_prompt}
            trend={today.trend}
          />

          <WellnessRingsTriad
            sleepHours={today.sleep_hours}
            sleepGoal={today.sleep_goal}
            mindfulnessMinutes={today.mindfulness_minutes}
            mindfulnessGoal={today.mindfulness_goal}
            journalStreak={today.journal_streak}
            journalGoal={today.journal_goal}
          />
        </>
      ) : (
        <div
          className={cm.cn(
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('p', 12),
            cm.textCenter,
            'text-on-surface-variant',
          )}
          aria-busy={loading || undefined}
        >
          {loading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t('home.loadError', {}, { defaultValue: 'Failed to load journal data.' })}
        </div>
      )}

      <section className={cm.cn('space-y-3')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('home.recentSection', {}, { defaultValue: 'Recent reflections' })}
          </h2>
          <Link
            to="/journal/new"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'inline-flex items-center gap-2 rounded-full text-white shadow-sm hover:shadow-md transition-shadow uppercase tracking-widest',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>edit</span>
            {t('home.newEntryCta', {}, { defaultValue: 'New entry' })}
          </Link>
        </div>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
        ) : recent.length === 0 ? (
          <div
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm',
              cm.sp('p', 12),
              cm.textCenter,
              'text-on-surface-variant',
            )}
          >
            {t(
              'home.empty',
              {},
              { defaultValue: 'No reflections yet. Today is a gentle place to start.' },
            )}
          </div>
        ) : (
          <ul className={cm.cn('space-y-3')}>
            {recent.map((e) => (
              <li key={e.id}>
                <JournalEntryCard
                  id={e.id}
                  date={e.date}
                  title={e.title}
                  preview={e.preview}
                  mood={e.mood}
                  tags={e.tags}
                  wordCount={e.word_count}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/journal"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('home.viewJournal', {}, { defaultValue: 'See your full journal →' })}
        </Link>
        <Link
          to="/insights"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
        >
          {t('home.viewInsights', {}, { defaultValue: 'See your insights →' })}
        </Link>
      </div>
    </div>
  )
}
