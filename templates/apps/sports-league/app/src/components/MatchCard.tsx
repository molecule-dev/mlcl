import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface MatchTeam {
  id?: string | number
  name: string
  abbreviation?: string
  color?: string
  logo_url?: string | null
  score?: number | null
}

export interface Match {
  id: string | number
  date?: string
  time?: string
  venue?: string | null
  status: 'scheduled' | 'in_progress' | 'live' | 'final' | 'postponed'
  period?: string | number
  game_clock?: string
  home: MatchTeam
  away: MatchTeam
}

interface MatchCardProps {
  match: Match
  compact?: boolean
}

const STATUS_TINT: Record<
  Match['status'],
  { strip: string; pill: string; pillBg: string; pillLabel: string; labelKey: string }
> = {
  live: {
    strip: 'var(--color-live)',
    pill: 'text-live',
    pillBg: 'bg-live-light',
    pillLabel: 'LIVE',
    labelKey: 'status.live',
  },
  in_progress: {
    strip: 'var(--color-live)',
    pill: 'text-live',
    pillBg: 'bg-live-light',
    pillLabel: 'LIVE',
    labelKey: 'status.live',
  },
  scheduled: {
    strip: 'var(--color-upcoming)',
    pill: 'text-upcoming',
    pillBg: 'bg-upcoming-light',
    pillLabel: 'UPCOMING',
    labelKey: 'status.upcoming',
  },
  final: {
    strip: 'var(--color-final)',
    pill: 'text-final',
    pillBg: 'bg-draw-light',
    pillLabel: 'FINAL',
    labelKey: 'status.final',
  },
  postponed: {
    strip: 'var(--color-draw)',
    pill: 'text-draw',
    pillBg: 'bg-draw-light',
    pillLabel: 'POSTPONED',
    labelKey: 'status.postponed',
  },
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Match card — surface card with a 4px tonal status strip on the left,
 * two team rows (home + away) showing logo, name, abbreviation, and a
 * tabular-mono score. The winning team gets text-on-surface; the losing
 * team gets text-on-surface-variant. Live matches show a pulsing dot.
 *
 * Bespoke per DESIGN.md "Match Card" spec. Layout pattern lifted from
 * banking-dashboard's AccountsTriad surface-container-low card +
 * editorial-row hover treatment.
 */
export function MatchCard({ match, compact = false }: MatchCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = STATUS_TINT[match.status]
  const isLive = match.status === 'live' || match.status === 'in_progress'
  const isFinal = match.status === 'final'
  const homeWon = isFinal && (match.home.score ?? 0) > (match.away.score ?? 0)
  const awayWon = isFinal && (match.away.score ?? 0) > (match.home.score ?? 0)
  const dateStr = fmtDate(match.date)

  return (
    <Link
      to={`/matches/${match.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        'rounded-xl bg-surface border border-outline-variant/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: tint.strip }}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest tabular-nums',
            tint.pill,
            tint.pillBg,
          )}
        >
          {isLive ? (
            <span
              aria-hidden="true"
              className={cm.cn('inline-block w-2 h-2 rounded-full bg-live animate-pulse')}
            />
          ) : null}
          {t(tint.labelKey, {}, { defaultValue: tint.pillLabel })}
          {isLive && match.period ? (
            <span className={cm.cn('text-[10px] text-live/80 font-bold tabular-nums')}>
              {t(
                'matchCard.period',
                { period: String(match.period) },
                { defaultValue: 'Q{{period}}' },
              )}
              {match.game_clock ? ` ${match.game_clock}` : ''}
            </span>
          ) : null}
        </span>
        {dateStr ? (
          <span
            className={cm.cn(
              'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant tabular-nums',
            )}
          >
            {dateStr}
            {match.time ? ` · ${match.time}` : ''}
          </span>
        ) : null}
      </header>

      <TeamRow team={match.home} dimmed={awayWon} compact={compact} />
      <TeamRow team={match.away} dimmed={homeWon} compact={compact} />

      {match.venue ? (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-sm align-text-bottom mr-1')}
          >
            place
          </span>
          {match.venue}
        </p>
      ) : null}
    </Link>
  )
}

function TeamRow({
  team,
  dimmed,
  compact,
}: {
  team: MatchTeam
  dimmed: boolean
  compact: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        <span
          aria-hidden="true"
          className={cm.cn('inline-block w-7 h-7 rounded-md ring-1 ring-outline-variant/60')}
          style={{ backgroundColor: team.color ?? 'var(--color-text-muted)' }}
        />
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.textSize(compact ? 'sm' : 'base'),
              cm.fontWeight('semibold'),
              dimmed ? 'text-on-surface-variant' : 'text-on-surface',
            )}
          >
            {team.name}
          </span>
          {team.abbreviation && !compact ? (
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {team.abbreviation}
            </span>
          ) : null}
        </div>
      </div>
      <span
        className={cm.cn(
          'text-2xl font-extrabold tabular-nums',
          dimmed ? 'text-on-surface-variant/60' : 'text-on-surface',
        )}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {team.score ?? '–'}
      </span>
    </div>
  )
}
