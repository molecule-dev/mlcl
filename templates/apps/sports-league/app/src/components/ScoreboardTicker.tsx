import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface TickerGame {
  id: string | number
  status: 'live' | 'scheduled' | 'final' | 'postponed' | 'in_progress'
  home_abbr: string
  away_abbr: string
  home_score?: number
  away_score?: number
  /** Period or scheduled time string ("Q3 4:21" / "7:30 PM" / "FINAL"). */
  clock?: string
}

interface ScoreboardTickerProps {
  games: TickerGame[]
}

const STATUS_STYLE: Record<TickerGame['status'], { dot: string; label: string }> = {
  live: { dot: 'bg-live animate-pulse', label: 'text-live' },
  in_progress: { dot: 'bg-live animate-pulse', label: 'text-live' },
  // The bar is scoreboard-navy in BOTH themes, so the raw upcoming token
  // (light teal in light mode) fails contrast here — use the dedicated
  // on-scoreboard token (bright cyan, 9.8:1 on navy).
  scheduled: { dot: 'bg-upcoming', label: 'text-on-scoreboard' },
  final: { dot: 'bg-final', label: 'text-white/60' },
  postponed: { dot: 'bg-draw', label: 'text-white/60' },
}

const STATUS_LABEL: Record<TickerGame['status'], { key: string; def: string }> = {
  live: { key: 'status.live', def: 'LIVE' },
  in_progress: { key: 'status.live', def: 'LIVE' },
  scheduled: { key: 'status.upcoming', def: 'UPCOMING' },
  final: { key: 'status.final', def: 'FINAL' },
  postponed: { key: 'status.ppd', def: 'PPD' },
}

/**
 * Navy scoreboard ticker — 64px-tall horizontal-scroll bar with
 * 220px-wide game cards, JetBrains-Mono tabular-num scores, pulsing
 * live dot + uppercase status badge. Decorative gradient fade on the
 * right edge.
 *
 * Bespoke to sports-league per DESIGN.md "Scoreboard Ticker" component
 * spec. Domain-driven (no polished sibling renders a navy ticker).
 */
export function ScoreboardTicker({ games }: ScoreboardTickerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (games.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.textSize('sm'),
          'h-16 bg-scoreboard text-white/70 rounded-2xl',
        )}
      >
        {t(
          'scoreboardTicker.empty',
          {},
          { defaultValue: 'No live games right now — check back at puck drop.' },
        )}
      </div>
    )
  }

  return (
    <div
      className={cm.cn('relative overflow-hidden rounded-2xl bg-scoreboard text-white shadow-lg')}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {games.map((g) => {
          const style = STATUS_STYLE[g.status]
          const isFinal = g.status === 'final'
          const isLive = g.status === 'live' || g.status === 'in_progress'
          const homeWon = isFinal && (g.home_score ?? 0) > (g.away_score ?? 0)
          const awayWon = isFinal && (g.away_score ?? 0) > (g.home_score ?? 0)
          return (
            <Link
              key={g.id}
              to={`/matches/${g.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'shrink-0 w-[220px] rounded-lg bg-surface/5 border border-surface/10 hover:bg-surface/10 transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('xs'),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'font-bold uppercase tracking-widest',
                    style.label,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'block', style.dot)}
                  />
                  {t(STATUS_LABEL[g.status].key, {}, { defaultValue: STATUS_LABEL[g.status].def })}
                </span>
                <span className={cm.cn('text-white/60 tabular-nums')}>{g.clock ?? ''}</span>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    homeWon ? 'text-white' : awayWon ? 'text-white/60' : 'text-white',
                  )}
                >
                  {g.home_abbr}
                </span>
                <span
                  className={cm.cn(
                    'text-2xl font-extrabold tabular-nums',
                    isLive ? 'text-primary' : homeWon ? 'text-white' : 'text-white/70',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {g.home_score ?? '–'}
                </span>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    awayWon ? 'text-white' : homeWon ? 'text-white/60' : 'text-white',
                  )}
                >
                  {g.away_abbr}
                </span>
                <span
                  className={cm.cn(
                    'text-2xl font-extrabold tabular-nums',
                    isLive ? 'text-primary' : awayWon ? 'text-white' : 'text-white/70',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {g.away_score ?? '–'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <div
        className={cm.cn('pointer-events-none absolute inset-y-0 right-0 w-12')}
        style={{
          background:
            'linear-gradient(to right, color-mix(in srgb, var(--color-scoreboard) 0%, transparent), var(--color-scoreboard))',
        }}
        aria-hidden="true"
      />
    </div>
  )
}
