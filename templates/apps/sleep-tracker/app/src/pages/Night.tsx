import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LogNightForm } from '../components/LogNightForm.js'
import { RecoveryRingsTriad } from '../components/RecoveryRingsTriad.js'
import type { SleepQuality } from '../components/SleepScoreHeroCard.js'
import { SleepScoreHeroCard } from '../components/SleepScoreHeroCard.js'
import type { SleepStage } from '../components/SleepStagesTimeline.js'
import { SleepStagesTimeline } from '../components/SleepStagesTimeline.js'
import { sleepGoalMinutes } from '../lib/goal.js'
import { unwrapList } from '../lib/unwrap.js'

interface SleepLog {
  id: string
  sleep_date: string
  bedtime: string
  wake_time: string
  duration_minutes: number
  quality_score: number | null
  interruptions: number
  notes?: string | null
  factors?: string[] | null
  sleep_stages?: { deep?: number; light?: number; rem?: number; awake?: number }
}

function qualityFromScore(score: number | null): SleepQuality {
  if (score == null) return 'fair'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
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

const FACTOR_PALETTE: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
  caffeine: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'local_cafe',
    label: 'Caffeine',
  },
  alcohol: {
    bg: 'var(--color-badge-amber-bg)',
    fg: 'var(--color-badge-amber-fg)',
    icon: 'local_bar',
    label: 'Alcohol',
  },
  screen: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'no_photography',
    label: 'Screen-free hour',
  },
  exercise: {
    bg: 'var(--color-badge-green-bg)',
    fg: 'var(--color-badge-green-fg)',
    icon: 'directions_walk',
    label: 'Exercise',
  },
  meal_late: {
    bg: 'var(--color-badge-amber-bg)',
    fg: 'var(--color-badge-amber-fg)',
    icon: 'restaurant',
    label: 'Late dinner',
  },
  temperature: {
    bg: 'var(--color-badge-green-bg)',
    fg: 'var(--color-badge-green-fg)',
    icon: 'thermostat',
    label: 'Cool room',
  },
  stress: {
    bg: 'var(--color-badge-red-bg)',
    fg: 'var(--color-badge-red-fg)',
    icon: 'self_improvement',
    label: 'Stress',
  },
  default: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'tune',
    label: 'Factor',
  },
}

function paletteFor(key: string) {
  return FACTOR_PALETTE[key] ?? FACTOR_PALETTE['default']!
}

export function Night() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { date } = useParams<{ date: string }>()
  const [log, setLog] = useState<SleepLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!date) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/sleep?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}&limit=1`)
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<SleepLog>(res)
        const found = list.find((l) => l.sleep_date === date) ?? list[0]
        if (!found) {
          setNotFound(true)
          return
        }
        setLog(found)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, date, reloadKey])

  const stageSegments = useMemo(() => buildStageSegments(log?.sleep_stages), [log])
  const score = log?.quality_score ?? 0
  const quality = qualityFromScore(log?.quality_score ?? null)
  const totalMinutes = log?.duration_minutes ?? 0
  const bedtime = log?.bedtime ?? ''
  const wakeTime = log?.wake_time ?? ''
  const displayDate = useMemo(() => {
    try {
      return new Date(date ?? bedtime).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    } catch (_error) {
      // invalid date string — return raw value as fallback
      return date ?? '—'
    }
  }, [date, bedtime])

  const stages = log?.sleep_stages ?? {}
  const deepShare = totalMinutes > 0 ? ((stages.deep ?? 0) / totalMinutes) * 100 : 0

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <Link
            to="/history"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('mb', 2),
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
            {t('night.backLink', {}, { defaultValue: 'Back to history' })}
          </Link>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('night.eyebrow', {}, { defaultValue: 'Single night' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {displayDate}
          </h1>
        </div>
        {log && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-widest text-xs',
            )}
            style={{ backgroundColor: 'rgba(108, 92, 231, 0.14)', color: 'var(--color-primary)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              auto_awesome
            </span>
            {t('night.scorePill', { score }, { defaultValue: '{{score}} score' })}
          </span>
        )}
      </header>

      {showLogForm && (notFound || !log) ? (
        <LogNightForm
          defaultDate={date}
          onCreated={() => {
            setShowLogForm(false)
            setNotFound(false)
            setReloadKey((k) => k + 1)
          }}
          onCancel={() => setShowLogForm(false)}
        />
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t('night.loading', {}, { defaultValue: 'Loading night details…' })}
        </p>
      ) : notFound || !log ? (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest text-center space-y-3',
          )}
          data-testid="night-not-found"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('night.notFound.title', {}, { defaultValue: 'Night not found' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'night.notFound.body',
              {},
              { defaultValue: 'We don’t have a sleep record for this date.' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap justify-center')}>
            <button
              type="button"
              onClick={() => setShowLogForm(true)}
              data-mol-id="night-log-this"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow min-h-10',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                bedtime
              </span>
              {t('night.notFound.logCta', {}, { defaultValue: 'Log this night' })}
            </button>
            <Link
              to="/history"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex items-center gap-2 rounded-full border-2 border-outline-variant min-h-10',
              )}
            >
              {t('night.notFound.cta', {}, { defaultValue: 'Back to history' })}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <SleepScoreHeroCard
            score={score}
            quality={quality}
            durationMinutes={totalMinutes}
            bedtime={bedtime}
            wakeTime={wakeTime}
            insight={
              log.notes ??
              t(
                'night.heroInsight',
                {},
                { defaultValue: 'Tap a stage on the timeline to dive in.' },
              )
            }
          />

          <RecoveryRingsTriad
            durationMinutes={totalMinutes}
            durationGoalMinutes={sleepGoalMinutes()}
            deepSleepPct={deepShare}
            deepSleepGoalPct={22}
            restingHeartRate={52}
            restingHeartRateBaseline={58}
          />

          {stageSegments.length > 0 && (
            <SleepStagesTimeline
              bedtime={bedtime}
              wakeTime={wakeTime}
              segments={stageSegments}
              totalMinutes={totalMinutes}
            />
          )}

          {log.factors && log.factors.length > 0 && (
            <section
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
              data-testid="night-factors"
            >
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('night.factorsTitle', {}, { defaultValue: 'Factors logged' })}
              </h3>
              <ul className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
                {log.factors.map((f) => {
                  const palette = paletteFor(f)
                  return (
                    <li key={f} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'h-9 w-9 rounded-xl shrink-0',
                        )}
                        style={{ backgroundColor: palette.bg, color: palette.fg }}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          {palette.icon}
                        </span>
                      </span>
                      <span
                        className={cm.cn(cm.flex1, cm.textSize('sm'), cm.fontWeight('semibold'))}
                      >
                        {t(`night.factor.${f}`, {}, { defaultValue: palette.label })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
