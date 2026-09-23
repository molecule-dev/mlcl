import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface StandingsRow {
  team_id: string | number
  rank: number
  name: string
  abbreviation?: string
  division?: string
  games_played: number
  wins: number
  losses: number
  draws: number
  points: number
  win_pct?: number
  /** Color hex from the team's brand (rendered as a 4px left border). */
  color?: string
  /** When true, the row is highlighted as the user's favorite team. */
  isFavorite?: boolean
}

interface StandingsTableProps {
  rows: StandingsRow[]
  /** Last rank that still qualifies for the playoffs (renders the dashed line below). */
  playoffLine?: number
  /** Show the division column. */
  showDivision?: boolean
}

/**
 * Editorial standings table — navy uppercase header, JetBrains-Mono
 * tabular-num stat columns, semantic W (emerald) / L (red) / D (muted)
 * pills, current-team accent border, optional dashed playoff line
 * between qualifying and non-qualifying ranks.
 *
 * Bespoke per DESIGN.md "Standings Table" spec. The visual treatment
 * borrows from personal-finance's AccountRecentTransactions editorial
 * row pattern (uppercase 10px headers, divide-y rows, hover tint).
 */
export function StandingsTable({ rows, playoffLine, showDivision }: StandingsTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (rows.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 10),
          cm.textCenter,
          'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
        )}
      >
        {t(
          'standingsTable.empty',
          {},
          { defaultValue: 'Standings will appear once games are played.' },
        )}
      </div>
    )
  }

  return (
    <div
      className={cm.cn('overflow-x-auto rounded-2xl border border-outline-variant/40 shadow-sm')}
    >
      <table className={cm.cn(cm.w('full'), 'min-w-[640px] border-collapse')}>
        <thead
          style={{ backgroundColor: 'var(--color-secondary)' }}
          className={cm.cn('text-on-secondary')}
        >
          <tr>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-left',
              )}
            >
              {t('standings.rank', {}, { defaultValue: '#' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-left',
              )}
            >
              {t('nav.team', {}, { defaultValue: 'Team' })}
            </th>
            {showDivision ? (
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-left',
                )}
              >
                {t('standings.division', {}, { defaultValue: 'Div' })}
              </th>
            ) : null}
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.gamesPlayed', {}, { defaultValue: 'GP' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.wins', {}, { defaultValue: 'W' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.losses', {}, { defaultValue: 'L' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.draws', {}, { defaultValue: 'D' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.points', {}, { defaultValue: 'PTS' })}
            </th>
            <th
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-right tabular-nums',
              )}
            >
              {t('standings.winPct', {}, { defaultValue: 'WIN%' })}
            </th>
          </tr>
        </thead>
        <tbody className={cm.cn('divide-y divide-outline-variant/40 bg-surface')}>
          {rows.map((r, i) => {
            const isLastQualifier = playoffLine !== undefined && r.rank === playoffLine
            const winPct = r.win_pct ?? (r.games_played === 0 ? 0 : r.wins / r.games_played)
            return (
              <tr
                key={r.team_id}
                className={cm.cn(
                  'group hover:bg-surface-container-low transition-colors',
                  i % 2 === 0 ? 'bg-surface' : 'bg-surface-container-lowest',
                  r.isFavorite ? 'bg-primary-container/30' : '',
                  isLastQualifier ? 'border-b-[2px] border-dashed border-accent' : '',
                )}
                style={
                  r.isFavorite && r.color ? { boxShadow: `inset 4px 0 0 ${r.color}` } : undefined
                }
              >
                <td
                  className={cm.cn(
                    'px-4 py-3 text-sm font-extrabold tabular-nums text-on-surface-variant w-12',
                  )}
                >
                  {r.rank}
                </td>
                <td className={cm.cn('px-4 py-3')}>
                  {/* -my-3 py-3: stretch the link over the cell's vertical
                      padding so the tap target is the full row height. */}
                  <Link
                    to={`/teams/${r.team_id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      '-my-3 py-3 min-h-[44px]',
                    )}
                  >
                    {r.color ? (
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'inline-block w-6 h-6 rounded-md ring-1 ring-outline-variant/60',
                        )}
                        style={{ backgroundColor: r.color }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'material-symbols-outlined text-on-surface-variant text-base',
                        )}
                      >
                        shield
                      </span>
                    )}
                    <span
                      className={cm.cn(
                        'text-sm font-bold text-on-surface group-hover:text-primary transition-colors',
                      )}
                    >
                      {r.name}
                    </span>
                    {r.abbreviation ? (
                      <span
                        className={cm.cn(
                          'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {r.abbreviation}
                      </span>
                    ) : null}
                  </Link>
                </td>
                {showDivision ? (
                  <td
                    className={cm.cn(
                      'px-4 py-3 text-xs uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {r.division ?? '—'}
                  </td>
                ) : null}
                <td
                  className={cm.cn('px-3 py-3 text-sm tabular-nums text-on-surface text-right')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {r.games_played}
                </td>
                <td
                  className={cm.cn('px-3 py-3 text-sm font-bold tabular-nums text-right text-win')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {r.wins}
                </td>
                <td
                  className={cm.cn('px-3 py-3 text-sm font-bold tabular-nums text-right text-loss')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {r.losses}
                </td>
                <td
                  className={cm.cn(
                    'px-3 py-3 text-sm tabular-nums text-on-surface-variant text-right',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {r.draws}
                </td>
                <td
                  className={cm.cn(
                    'px-4 py-3 text-base font-extrabold tabular-nums text-right text-primary',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {r.points}
                </td>
                <td
                  className={cm.cn(
                    'px-4 py-3 text-sm tabular-nums text-on-surface-variant text-right',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {winPct.toFixed(3).replace(/^0/, '')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
