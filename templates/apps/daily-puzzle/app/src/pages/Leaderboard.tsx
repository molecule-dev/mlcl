import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LeaderboardResponse {
  date: string
  daily: {
    date: string
    players: number
    solves: number
    solvesByAttempt: Array<{ attempts: number; players: number }>
  }
  streakLeaders: Array<{
    rank: number
    name: string
    played: number
    wins: number
    currentStreak: number
    maxStreak: number
  }>
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

const MEDALS = ['🥇', '🥈', '🥉'] as const

/**
 * Private mini-league demo standings (the design's "Sunday Brunch Club").
 * Static sample data, like the seeded demo players on the global board —
 * the real group backend is not part of this template.
 */
const BRUNCH_LEAGUE = [
  { rank: 1, name: '@claire_b', score: '3 · 01:15', you: false, solving: false },
  { rank: 2, name: '@morning_thinker', score: '4 · 01:42', you: true, solving: false },
  { rank: 3, name: '@dad_crosswords', score: '4 · 02:30', you: false, solving: false },
  { rank: 4, name: '@timmy_t', score: '5 · 03:12', you: false, solving: false },
  { rank: 5, name: '@sophie_k', score: '', you: false, solving: true },
] as const

/**
 * Global stats: today's solve distribution (how the field fared, attempt by
 * attempt) beside the all-time streak leaders. Seeded demo players keep the
 * board alive on a fresh DB; real finishes join them as they happen.
 */
export function Leaderboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nudged, setNudged] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/leaderboard')
      .then((res) => {
        if (!cancelled) setData(unwrap<LeaderboardResponse>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('leaderboard.loadError', {}, { defaultValue: 'Could not load the leaderboard.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const distribution: Record<string, number> = {}
  for (let i = 1; i <= 6; i++) {
    distribution[String(i)] =
      data?.daily.solvesByAttempt.find((bin) => bin.attempts === i)?.players ?? 0
  }
  const solveRate =
    data && data.daily.players > 0 ? Math.round((100 * data.daily.solves) / data.daily.players) : 0
  const maxBar = Math.max(1, ...Object.values(distribution))

  return (
    <section className={cm.cn(cm.container({ size: 'md' }), 'py-10')}>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('leaderboard.title', {}, { defaultValue: 'Leaderboard' })}
      </h1>
      <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant mt-1 mb-6')}>
        {t(
          'leaderboard.subhead',
          {},
          {
            defaultValue: 'How the field fared today, and who is holding the longest streaks.',
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

      {data && (
        <div className={cm.cn(cm.grid({ cols: 2 }), 'gap-6 items-start')}>
          {/* Today's solve distribution */}
          <section
            className={cm.cn(cm.card(), cm.cardPadding('md'))}
            data-mol-id="daily-distribution"
          >
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('leaderboard.daily.title', {}, { defaultValue: 'Today’s solves' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1 mb-4')}>
              {t(
                'leaderboard.daily.summary',
                { players: data.daily.players, solves: data.daily.solves, rate: solveRate },
                {
                  defaultValue: `${data.daily.players} players · ${data.daily.solves} solved · ${solveRate}% solve rate`,
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              {Array.from({ length: 6 }, (_, i) => {
                const count = distribution[String(i + 1)]
                return (
                  <div key={i} className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'w-4 text-on-surface',
                      )}
                    >
                      {i + 1}
                    </span>
                    <div
                      className={cm.cn(
                        'flex-1 h-6 bg-surface-container-high rounded overflow-hidden',
                      )}
                    >
                      <div
                        className={cm.cn(
                          'h-full rounded bg-secondary text-on-secondary flex items-center justify-end px-1.5 min-w-[1.75rem]',
                        )}
                        style={{ width: `${Math.max(10, (100 * count) / maxBar)}%` }}
                      >
                        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Streak leaders */}
          <section className={cm.cn(cm.card(), cm.cardPadding('md'))} data-mol-id="streak-leaders">
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('leaderboard.streaks.title', {}, { defaultValue: 'Streak leaders' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1 mb-4')}>
              {t(
                'leaderboard.streaks.subhead',
                {},
                {
                  defaultValue: 'All-time longest win streaks.',
                },
              )}
            </p>
            {data.streakLeaders.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'leaderboard.streaks.empty',
                  {},
                  {
                    defaultValue: 'No streaks yet — be the first.',
                  },
                )}
              </p>
            ) : (
              <ol className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                {data.streakLeaders.map((leader) => (
                  <li
                    key={leader.rank}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      'px-3 py-2 rounded-xl bg-surface-container-low',
                    )}
                    data-mol-id={`streak-leader-${leader.rank}`}
                  >
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'w-6')}>
                        {MEDALS[leader.rank - 1] ?? leader.rank}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {leader.name}
                      </span>
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      🔥{' '}
                      {t(
                        'leaderboard.maxStreak',
                        { count: leader.maxStreak },
                        { defaultValue: `${leader.maxStreak} max` },
                      )}{' '}
                      ·{' '}
                      {t(
                        'leaderboard.currentStreak',
                        { count: leader.currentStreak },
                        { defaultValue: `${leader.currentStreak} now` },
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      {/* Private mini-league: demo group standings beside the global board. */}
      <section className={cm.cn(cm.card(), cm.cardPadding('md'), 'mt-6')} data-mol-id="mini-league">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 2 }),
            'border-b border-outline-variant/40 pb-3',
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('leaderboard.group.eyebrow', {}, { defaultValue: 'Private group' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('leaderboard.group.title', {}, { defaultValue: 'Sunday Brunch Club' })}
            </h2>
          </div>
          <span className={cm.cn(cm.badge({ variant: 'info' }), 'font-semibold whitespace-nowrap')}>
            {t(
              'leaderboard.group.members',
              { count: BRUNCH_LEAGUE.length },
              { defaultValue: '5 members' },
            )}
          </span>
        </div>
        <ol className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'mt-4')}>
          {BRUNCH_LEAGUE.map((member) => (
            <li
              key={member.name}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                'rounded-xl px-3 py-2',
                member.solving
                  ? 'border border-dashed border-outline-variant bg-surface-container'
                  : 'bg-surface-container-low',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'w-4',
                    member.rank === 1 ? 'text-primary' : 'text-on-surface-variant',
                  )}
                >
                  {member.rank}.
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    member.you ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                    member.solving ? 'italic text-on-surface-variant' : 'text-on-surface',
                    cm.flex({ align: 'center', gap: 1 }),
                  )}
                >
                  {member.name}
                  {member.you && (
                    <span
                      className={cm.cn(
                        cm.badge({ variant: 'primary' }),
                        'px-1 py-0 text-[9px] font-bold uppercase',
                      )}
                    >
                      {t('leaderboard.group.you', {}, { defaultValue: 'You' })}
                    </span>
                  )}
                </span>
              </span>
              {member.solving ? (
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'text-secondary',
                  )}
                >
                  <span className={cm.cn('h-1.5 w-1.5 rounded-full bg-secondary animate-pulse')} />
                  {t('leaderboard.group.solvingNow', {}, { defaultValue: 'Solving now…' })}
                </span>
              ) : (
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'font-mono text-on-surface',
                  )}
                >
                  {member.score}
                </span>
              )}
            </li>
          ))}
        </ol>
        <div
          className={cm.cn(
            cm.grid({ cols: 2 }),
            'gap-2 border-t border-outline-variant/40 pt-3 mt-4',
          )}
        >
          <button
            type="button"
            onClick={() => setNudged(true)}
            disabled={nudged}
            className={cm.button({ variant: 'outline', color: 'secondary', size: 'sm' })}
            data-mol-id="mini-league-nudge"
          >
            {nudged
              ? t('leaderboard.group.nudged', {}, { defaultValue: 'Nudged!' })
              : t('leaderboard.group.nudge', {}, { defaultValue: 'Nudge the group' })}
          </button>
          <button
            type="button"
            onClick={() => {
              const text = [
                t('leaderboard.group.title', {}, { defaultValue: 'Sunday Brunch Club' }),
                ...BRUNCH_LEAGUE.map(
                  (m) => `${m.rank}. ${m.name}${m.score ? ` — ${m.score}` : ' — solving…'}`,
                ),
              ].join('\n')
              void navigator.clipboard.writeText(text).then(
                () => setCopied(true),
                () => setCopied(true),
              )
            }}
            className={cm.button({ variant: 'ghost', color: 'secondary', size: 'sm' })}
            data-mol-id="mini-league-copy"
          >
            {copied
              ? t('leaderboard.group.copied', {}, { defaultValue: 'Scores copied' })
              : t('leaderboard.group.copyScores', {}, { defaultValue: 'Copy scores' })}
          </button>
        </div>
      </section>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'mt-8')}>
        <Link
          to="/play"
          className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
          data-mol-id="leaderboard-play-link"
        >
          {t('stats.playToday', {}, { defaultValue: 'Play today’s puzzle' })}
        </Link>
        <Link
          to="/stats"
          className={cm.button({ variant: 'outline', color: 'secondary', size: 'md' })}
          data-mol-id="leaderboard-stats-link"
        >
          {t('nav.stats', {}, { defaultValue: 'Stats' })}
        </Link>
      </div>
    </section>
  )
}

export default Leaderboard
