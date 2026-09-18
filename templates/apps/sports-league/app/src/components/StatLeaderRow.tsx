import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

export interface StatLeader {
  player_id: string | number
  rank: number
  name: string
  team_abbr: string
  team_color?: string
  /** Headline stat value (already formatted upstream — e.g. "27.4" or "1,284"). */
  value: string
  /** Sub-label below the value (e.g. "PPG"). */
  unit: string
  /** Optional rank-change indicator vs prior week. */
  delta?: 'up' | 'down' | 'flat'
}

interface StatLeaderRowProps {
  leader: StatLeader
  /** Highlights the row as a top-3 leader (subtle accent tint). */
  podium?: boolean
}

/**
 * Editorial leaderboard row — rank chip + colored team accent + player
 * name + tabular-mono headline stat + optional rank-delta arrow. Top-3
 * podium ranks get a subtle emerald accent background.
 *
 * Translated from crm/blog ActivityFeed editorial-row pattern with the
 * podium accent riff lifted from polished podcast/leaderboard treatments.
 */
export function StatLeaderRow({ leader, podium }: StatLeaderRowProps) {
  const cm = getClassMap()
  const deltaIcon =
    leader.delta === 'down'
      ? 'trending_down'
      : leader.delta === 'flat'
        ? 'trending_flat'
        : 'trending_up'
  const deltaColor =
    leader.delta === 'down' ? 'text-loss' : leader.delta === 'flat' ? 'text-draw' : 'text-win'

  return (
    <Link
      to={`/players/${leader.player_id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors group',
        podium ? 'bg-accent/5 border-l-4 border-l-accent' : 'bg-surface',
      )}
    >
      <span
        className={cm.cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-extrabold tabular-nums',
          podium ? 'bg-accent' : 'bg-surface-container-low text-on-surface-variant',
        )}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          ...(podium ? { color: 'var(--color-on-accent)' } : {}),
        }}
      >
        {leader.rank}
      </span>
      <span
        aria-hidden="true"
        className={cm.cn('inline-block w-2 h-10 rounded-full')}
        style={{ backgroundColor: leader.team_color ?? 'var(--color-primary)' }}
      />
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)}>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-on-surface group-hover:text-primary transition-colors',
          )}
        >
          {leader.name}
        </span>
        <span
          className={cm.cn(
            'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
          )}
        >
          {leader.team_abbr}
        </span>
      </div>
      {leader.delta ? (
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-base', deltaColor)}
        >
          {deltaIcon}
        </span>
      ) : null}
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }))}>
        <span
          className={cm.cn('text-xl font-extrabold tabular-nums text-on-surface')}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {leader.value}
        </span>
        <span
          className={cm.cn(
            'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {leader.unit}
        </span>
      </div>
    </Link>
  )
}
