import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GuessDistribution } from '../components/GuessDistribution.js'

interface StatsResponse {
  played: number
  wins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  distribution: Record<string, number>
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

/** One number card for the stats strip. */
function StatCard({ value, label, id }: { value: string | number; label: string; id: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.card(),
        'flex flex-col items-center justify-center px-4 py-3 text-center',
      )}
      data-mol-id={id}
    >
      <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {value}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'uppercase tracking-wider text-on-surface-variant font-semibold',
        )}
      >
        {label}
      </span>
    </div>
  )
}

/** Your ranked-daily history: played/win-rate/streaks + the distribution. */
export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/stats/me')
      .then((res) => {
        if (!cancelled) setStats(unwrap<StatsResponse>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('stats.loadError', {}, { defaultValue: 'Could not load your stats.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <section className={cm.cn(cm.container({ size: 'md' }), 'py-10')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('stats.title', {}, { defaultValue: 'Your stats' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-1 mb-6')}>
        {t(
          'stats.subhead',
          {},
          {
            defaultValue: 'Ranked daily puzzles only — archive practice never counts.',
          },
        )}
      </p>

      {loading && (
        <span
          className={cm.spinner()}
          aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
        />
      )}
      {error && <p className={cm.alert({ variant: 'error' })}>{error}</p>}

      {stats && (
        <>
          {/* 2x2 on phones, full row from lg — a 1-col ramp wastes a whole
              card per two-digit number, and 4-across cramps below sm. */}
          <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4', 'gap-3 mb-8')}>
            <StatCard
              value={stats.played}
              label={t('stats.played', {}, { defaultValue: 'Played' })}
              id="stat-played"
            />
            <StatCard
              value={`${stats.winRate}%`}
              label={t('stats.winRate', {}, { defaultValue: 'Win rate' })}
              id="stat-win-rate"
            />
            <StatCard
              value={`🔥 ${stats.currentStreak}`}
              label={t('stats.currentStreak', {}, { defaultValue: 'Current streak' })}
              id="stat-current-streak"
            />
            <StatCard
              value={stats.maxStreak}
              label={t('stats.maxStreak', {}, { defaultValue: 'Max streak' })}
              id="stat-max-streak"
            />
          </div>

          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'mb-3')}>
            {t('stats.distribution.title', {}, { defaultValue: 'Guess distribution' })}
          </h2>
          <GuessDistribution distribution={stats.distribution} />

          {/* Play-insight strip: an illustrative read of your solving pattern.
              Demo copy — the heuristic is static, like the seeded demo board. */}
          <section
            className={cm.cn(
              cm.card(),
              cm.cardPadding('md'),
              cm.flex({ align: 'center', justify: 'between', gap: 3 }),
              'flex-wrap mt-6',
            )}
            data-mol-id="stats-insight"
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[24px]')} aria-hidden="true">
                  psychology
                </span>
              </div>
              <div>
                <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t('stats.insight.title', {}, { defaultValue: 'Vowel-first deductive tendency' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'stats.insight.body',
                    {},
                    {
                      defaultValue:
                        'You eliminate an average of 3.2 vowels within your first two guesses.',
                    },
                  )}
                </p>
              </div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-lg border border-outline-variant bg-surface-container px-3 py-1 text-on-surface',
              )}
            >
              {t('stats.insight.efficiency', {}, { defaultValue: 'Efficiency: A+' })}
            </span>
          </section>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'mt-8')}>
            <Link
              to="/play"
              className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
              data-mol-id="stats-play-link"
            >
              {t('stats.playToday', {}, { defaultValue: 'Play today’s puzzle' })}
            </Link>
            <Link
              to="/leaderboard"
              className={cm.button({ variant: 'outline', color: 'secondary', size: 'md' })}
              data-mol-id="stats-leaderboard-link"
            >
              {t('nav.leaderboard', {}, { defaultValue: 'Leaderboard' })}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

export default Stats
