import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NightHistoryRow } from '../components/NightHistoryRow.js'
import { RecoveryRingsTriad } from '../components/RecoveryRingsTriad.js'
import type { SleepQuality } from '../components/SleepScoreHeroCard.js'
import { SleepScoreHeroCard } from '../components/SleepScoreHeroCard.js'
import type { SleepStage } from '../components/SleepStagesTimeline.js'
import { SleepStagesTimeline } from '../components/SleepStagesTimeline.js'
import { sleepGoalMinutes } from '../lib/goal.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface SleepLog {
  id: string
  sleep_date: string
  bedtime: string
  wake_time: string
  duration_minutes: number
  quality_score: number | null
  interruptions: number
  sleep_stages?: { deep?: number; light?: number; rem?: number; awake?: number }
}

interface SleepStats {
  average_duration: number | null
  average_quality: number | null
  total_logs: number
  best_night: number | null
  worst_night: number | null
}

function buildStageSegments(stages?: {
  deep?: number
  light?: number
  rem?: number
  awake?: number
}): { stage: SleepStage; startMinutes: number; durationMinutes: number }[] {
  if (!stages) return []
  const order: SleepStage[] = ['awake', 'light', 'deep', 'rem']
  let cursor = 0
  const segs: { stage: SleepStage; startMinutes: number; durationMinutes: number }[] = []
  for (const s of order) {
    const dur = Number(stages[s as 'deep' | 'light' | 'rem' | 'awake'] ?? 0)
    if (dur > 0) {
      segs.push({ stage: s, startMinutes: cursor, durationMinutes: dur })
      cursor += dur
    }
  }
  return segs
}

function qualityFromScore(score: number | null): SleepQuality {
  if (score == null) return 'fair'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<SleepStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<SleepLog[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [overviewRes, logsRes] = await Promise.all([
          http.get('/api/stats/overview?user_id=me&days=7').catch(() => null),
          http.get('/api/sleep?user_id=me&limit=4').catch(() => null),
        ])
        if (cancelled) return
        setStats(unwrapSingle<SleepStats>(overviewRes))
        setRecentLogs(unwrapList<SleepLog>(logsRes))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const recent = recentLogs ?? []
  const hasData = recent.length > 0
  const lastNight = recent[0]
  const quality = qualityFromScore(lastNight?.quality_score ?? null)
  const lastDuration = lastNight?.duration_minutes ?? 0
  const lastBed = lastNight?.bedtime ?? ''
  const lastWake = lastNight?.wake_time ?? ''
  const lastScore = lastNight?.quality_score ?? 0
  const trend = recent
    .slice()
    .reverse()
    .map((log) => ({
      date: new Date(log.sleep_date).toLocaleDateString(undefined, { weekday: 'short' }),
      score: log.quality_score ?? 0,
    }))

  const avgDurationMin =
    stats?.average_duration ??
    (hasData ? Math.round(recent.reduce((s, l) => s + l.duration_minutes, 0) / recent.length) : 0)
  const deepShare = hasData
    ? (recent.reduce((s, l) => s + (l.sleep_stages?.deep ?? 0), 0) /
        Math.max(
          1,
          recent.reduce((s, l) => s + l.duration_minutes, 0),
        )) *
      100
    : 0
  const lastStageSegments = buildStageSegments(lastNight?.sleep_stages)

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Tonight' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t(
              'dashboard.heading',
              {
                date: new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }),
              },
              { defaultValue: 'Good morning — {{date}}' },
            )}
          </h1>
        </div>
        <Link
          to="/history"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>history</span>
          {t('dashboard.viewAll', {}, { defaultValue: 'All nights' })}
        </Link>
      </header>

      {hasData ? (
        <>
          <SleepScoreHeroCard
            score={lastScore}
            quality={quality}
            durationMinutes={lastDuration}
            bedtime={lastBed}
            wakeTime={lastWake}
            insight={t(
              'dashboard.heroInsight',
              {},
              { defaultValue: 'Track another night to spot deep-sleep trends.' },
            )}
            trend={trend}
          />

          <RecoveryRingsTriad
            durationMinutes={avgDurationMin}
            durationGoalMinutes={sleepGoalMinutes()}
            deepSleepPct={deepShare}
            deepSleepGoalPct={22}
            restingHeartRate={54}
            restingHeartRateBaseline={58}
          />

          {lastStageSegments.length > 0 && lastBed && lastWake && (
            <SleepStagesTimeline
              bedtime={lastBed}
              wakeTime={lastWake}
              segments={lastStageSegments}
              totalMinutes={lastDuration}
            />
          )}
        </>
      ) : !loading ? (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest text-center space-y-3',
          )}
          data-testid="dashboard-empty"
        >
          <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
            {t('dashboard.empty.title', {}, { defaultValue: 'No nights tracked yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'max-w-md mx-auto')}>
            {t(
              'dashboard.empty.body',
              {},
              {
                defaultValue:
                  'Log a night or connect a wearable to start seeing your sleep patterns.',
              },
            )}
          </p>
          <Link
            to="/devices"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
            )}
          >
            {t('dashboard.empty.cta', {}, { defaultValue: 'Connect a wearable' })}
          </Link>
        </section>
      ) : null}

      <section className={cm.cn('space-y-3')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.recentNights', {}, { defaultValue: 'Recent nights' })}
          </h2>
          <Link
            to="/history"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        {loading && !recentLogs ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('dashboard.loading', {}, { defaultValue: 'Loading recent nights…' })}
          </p>
        ) : !hasData ? (
          <p
            className={cm.cn(cm.textSize('sm'), cm.textMuted)}
            data-testid="dashboard-recent-empty"
          >
            {t(
              'dashboard.recentEmpty',
              {},
              { defaultValue: 'Your tracked nights will appear here.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('space-y-3')}>
            {recent.map((log) => {
              const stages = log.sleep_stages ?? { deep: 0, light: 0, rem: 0, awake: 0 }
              return (
                <NightHistoryRow
                  key={log.id}
                  id={log.id}
                  date={log.sleep_date}
                  bedtime={log.bedtime}
                  wakeTime={log.wake_time}
                  durationMinutes={log.duration_minutes}
                  score={log.quality_score ?? 0}
                  quality={qualityFromScore(log.quality_score)}
                  stageShares={{
                    deep: stages.deep ?? 0,
                    light: stages.light ?? 0,
                    rem: stages.rem ?? 0,
                    awake: stages.awake ?? 0,
                  }}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
