import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'

interface TeamProfile {
  id: string
  name: string
  abbreviation?: string
  city?: string
  division?: string
  color?: string
  wins?: number
  losses?: number
  draws?: number
  points?: number
  rank?: number
  goals_for?: number
  goals_against?: number
  founded?: number
  arena?: string
}

interface RosterEntry {
  id: string
  name: string
  position?: string
  jersey?: number
  goals?: number
  assists?: number
}

const FALLBACK_TEAM: TeamProfile = {
  id: 't1',
  name: 'Atlas United',
  abbreviation: 'ATL',
  city: 'Atlanta',
  division: 'East',
  color: '#0e7490',
  wins: 18,
  losses: 4,
  draws: 2,
  points: 56,
  rank: 1,
  goals_for: 67,
  goals_against: 28,
  founded: 1996,
  arena: 'Mercedes-Benz Stadium',
}

const FALLBACK_ROSTER: RosterEntry[] = [
  { id: 'p1', name: 'D. Marquez', position: 'F', jersey: 9, goals: 24, assists: 8 },
  { id: 'p2', name: 'J. Reeves', position: 'F', jersey: 11, goals: 18, assists: 12 },
  { id: 'p3', name: 'A. Petrov', position: 'M', jersey: 8, goals: 6, assists: 14 },
  { id: 'p4', name: 'K. Larsen', position: 'M', jersey: 6, goals: 4, assists: 11 },
  { id: 'p5', name: 'R. Kovacs', position: 'D', jersey: 4, goals: 2, assists: 3 },
  { id: 'p6', name: 'M. Diaz', position: 'D', jersey: 3, goals: 1, assists: 2 },
  { id: 'p7', name: 'C. Garcia', position: 'GK', jersey: 1, goals: 0, assists: 0 },
]

function unwrapSingle<T>(v: unknown): T | null {
  if (!v) return null
  if (typeof v === 'object' && 'data' in v) return (v as { data: T }).data
  return v as T
}

export function TeamDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = 't1' } = useParams<{ id: string }>()
  const [team, setTeam] = useState<TeamProfile>(FALLBACK_TEAM)
  const [roster, setRoster] = useState<RosterEntry[]>(FALLBACK_ROSTER)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get(`/api/teams/${id}`).catch(() => null),
      http.get(`/api/teams/${id}/roster`).catch(() => null),
    ]).then(([tm, rs]) => {
      if (cancelled) return
      const detail = unwrapSingle<TeamProfile>(tm)
      if (detail) setTeam(detail)
      const list = unwrapList<RosterEntry>(rs)
      if (list.length) setRoster(list)
    })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const totalGames = (team.wins ?? 0) + (team.losses ?? 0) + (team.draws ?? 0)
  const winPct = totalGames > 0 ? (team.wins ?? 0) / totalGames : 0
  const goalDiff = (team.goals_for ?? 0) - (team.goals_against ?? 0)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/teams"
        className={cm.cn(
          cm.textSize('sm'),
          'font-bold text-primary hover:underline inline-flex items-center gap-1 w-fit',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
          arrow_back
        </span>
        {t('teamDetail.back', {}, { defaultValue: 'Back to teams' })}
      </Link>

      <section
        className={cm.cn('rounded-[2rem] text-white relative overflow-hidden shadow-xl p-10')}
        style={{
          background: `linear-gradient(135deg, ${team.color ?? 'var(--color-primary)'} 0%, #0c4a6e 75%, #0f172a 100%)`,
        }}
      >
        <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-start')}>
          <div className={cm.cn('md:col-span-2')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.28em] text-white/70 mb-3',
              )}
            >
              {team.division ?? '—'} ·{' '}
              {t(
                'teamDetail.rankLabel',
                { rank: team.rank ?? '—' },
                { defaultValue: 'Rank #{{rank}}' },
              )}
            </p>
            <h1
              className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter')}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {team.name}
            </h1>
            <p className={cm.cn('mt-3 text-sm uppercase tracking-widest font-bold text-white/80')}>
              {team.city ? `${team.city} · ` : ''}
              {team.arena ?? ''}
            </p>
          </div>
          <div className={cm.cn('md:text-right')}>
            <span
              className={cm.cn(
                'text-5xl md:text-6xl font-extrabold tabular-nums leading-none block',
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {team.points ?? 0}
            </span>
            <span
              className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-white/70')}
            >
              {t('teamDetail.pointsLabel', {}, { defaultValue: 'Points' })}
            </span>
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
      </section>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        {[
          {
            k: 'record',
            label: t('teamDetail.statRecord', {}, { defaultValue: 'Record' }),
            value: `${team.wins ?? 0}-${team.losses ?? 0}-${team.draws ?? 0}`,
            tone: 'border-l-primary',
          },
          {
            k: 'winPct',
            label: t('teamDetail.statWinPct', {}, { defaultValue: 'Win %' }),
            value: winPct.toFixed(3).replace(/^0/, ''),
            tone: 'border-l-win',
          },
          {
            k: 'gf',
            label: t('teamDetail.statGF', {}, { defaultValue: 'Goals For' }),
            value: String(team.goals_for ?? 0),
            tone: 'border-l-accent',
          },
          {
            k: 'gd',
            label: t('teamDetail.statGD', {}, { defaultValue: 'Goal Diff' }),
            value: `${goalDiff >= 0 ? '+' : ''}${goalDiff}`,
            tone: goalDiff >= 0 ? 'border-l-win' : 'border-l-loss',
          },
        ].map((s) => (
          <div
            key={s.k}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-xl bg-surface shadow-sm border border-outline/40 border-l-4',
              s.tone,
            )}
          >
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant',
              )}
            >
              {s.label}
            </span>
            <span
              className={cm.cn('text-3xl font-extrabold tabular-nums')}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('teamDetail.rosterHeading', {}, { defaultValue: 'Roster' })}
        </h2>
        <div
          className={cm.cn(
            'overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface',
          )}
        >
          <table className={cm.cn(cm.w('full'))}>
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
                  #
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-left',
                  )}
                >
                  {t('teamDetail.colName', {}, { defaultValue: 'Player' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-left',
                  )}
                >
                  {t('teamDetail.colPos', {}, { defaultValue: 'Pos' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right',
                  )}
                >
                  {t('teamDetail.colGoals', {}, { defaultValue: 'G' })}
                </th>
                <th
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right',
                  )}
                >
                  {t('teamDetail.colAssists', {}, { defaultValue: 'A' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {roster.map((p) => (
                <tr
                  key={p.id}
                  className={cm.cn('hover:bg-surface-container-lowest transition-colors')}
                >
                  <td
                    className={cm.cn(
                      'px-4 py-3 text-sm font-bold tabular-nums text-on-surface-variant w-12',
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {p.jersey ?? '—'}
                  </td>
                  <td className={cm.cn('px-4 py-3')}>
                    <Link
                      to={`/players/${p.id}`}
                      className={cm.cn('text-sm font-bold text-on-surface hover:text-primary')}
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td
                    className={cm.cn(
                      'px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {p.position ?? '—'}
                  </td>
                  <td
                    className={cm.cn('px-3 py-3 text-sm tabular-nums text-right text-on-surface')}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {p.goals ?? 0}
                  </td>
                  <td
                    className={cm.cn('px-3 py-3 text-sm tabular-nums text-right text-on-surface')}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {p.assists ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
