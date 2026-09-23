import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'

interface PlayerEntry {
  id: string | number
  name: string
  team_abbr?: string
  team_color?: string
  position?: string
  jersey?: number
  goals?: number
  assists?: number
  points?: number
}

const POSITIONS = ['ALL', 'F', 'M', 'D', 'GK'] as const
type Position = (typeof POSITIONS)[number]

const FALLBACK: PlayerEntry[] = [
  {
    id: 'p1',
    name: 'D. Marquez',
    team_abbr: 'ATL',
    team_color: '#0e7490',
    position: 'F',
    jersey: 9,
    goals: 24,
    assists: 8,
    points: 32,
  },
  {
    id: 'p2',
    name: 'J. Reeves',
    team_abbr: 'ATL',
    team_color: '#0e7490',
    position: 'F',
    jersey: 11,
    goals: 18,
    assists: 12,
    points: 30,
  },
  {
    id: 'p3',
    name: 'A. Petrov',
    team_abbr: 'BOS',
    team_color: '#dc2626',
    position: 'M',
    jersey: 8,
    goals: 6,
    assists: 14,
    points: 20,
  },
  {
    id: 'p4',
    name: 'K. Larsen',
    team_abbr: 'CHI',
    team_color: '#16a34a',
    position: 'M',
    jersey: 6,
    goals: 4,
    assists: 11,
    points: 15,
  },
  {
    id: 'p5',
    name: 'R. Kovacs',
    team_abbr: 'PHX',
    team_color: '#f59e0b',
    position: 'D',
    jersey: 4,
    goals: 2,
    assists: 3,
    points: 5,
  },
  {
    id: 'p6',
    name: 'M. Diaz',
    team_abbr: 'DAL',
    team_color: '#7c3aed',
    position: 'D',
    jersey: 3,
    goals: 1,
    assists: 2,
    points: 3,
  },
  {
    id: 'p7',
    name: 'C. Garcia',
    team_abbr: 'BOS',
    team_color: '#dc2626',
    position: 'GK',
    jersey: 1,
    goals: 0,
    assists: 0,
    points: 0,
  },
  {
    id: 'p8',
    name: 'T. Nakamura',
    team_abbr: 'SEA',
    team_color: '#0c4a6e',
    position: 'F',
    jersey: 7,
    goals: 14,
    assists: 6,
    points: 20,
  },
  {
    id: 'p9',
    name: 'S. Wahid',
    team_abbr: 'MIA',
    team_color: '#22d3ee',
    position: 'M',
    jersey: 10,
    goals: 9,
    assists: 9,
    points: 18,
  },
  {
    id: 'p10',
    name: 'L. Olsen',
    team_abbr: 'TOR',
    team_color: '#10b981',
    position: 'F',
    jersey: 14,
    goals: 7,
    assists: 5,
    points: 12,
  },
]

export function Players() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [players, setPlayers] = useState<PlayerEntry[]>(FALLBACK)
  const [position, setPosition] = useState<Position>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/players?limit=200')
      .then((rows) => {
        if (!cancelled) {
          const list = unwrapList<PlayerEntry>(rows)
          setPlayers(list.length ? list : FALLBACK)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    return players
      .filter((p) => position === 'ALL' || p.position === position)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  }, [players, position, search])

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('players.eyebrow', {}, { defaultValue: 'Roster directory' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('players.title', {}, { defaultValue: 'Players' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'players.subtitle',
            {},
            { defaultValue: 'Filter by position. Click any player to dig into their season.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'rounded-full bg-surface-container-lowest border border-outline-variant/40 w-fit',
          )}
        >
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPosition(p)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full transition-colors',
                position === p
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full bg-surface-container-lowest border border-outline-variant/40 max-w-md flex-1',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('players.searchPlaceholder', {}, { defaultValue: 'Search by name…' })}
            className={cm.cn(
              cm.w('full'),
              'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline',
            )}
          />
        </div>
      </div>

      <div
        className={cm.cn('overflow-x-auto rounded-2xl border border-outline-variant/40 bg-surface')}
      >
        <table className={cm.cn(cm.w('full'), 'min-w-[560px]')}>
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
                {t('players.colName', {}, { defaultValue: 'Player' })}
              </th>
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-left',
                )}
              >
                {t('nav.team', {}, { defaultValue: 'Team' })}
              </th>
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-left',
                )}
              >
                {t('players.colPos', {}, { defaultValue: 'Pos' })}
              </th>
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right',
                )}
              >
                {t('players.colGoals', {}, { defaultValue: 'G' })}
              </th>
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-3 py-3 text-right',
                )}
              >
                {t('players.colAssists', {}, { defaultValue: 'A' })}
              </th>
              <th
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest px-4 py-3 text-right',
                )}
              >
                {t('players.colPoints', {}, { defaultValue: 'PTS' })}
              </th>
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
            {visible.map((p) => (
              <tr
                key={p.id}
                className={cm.cn('hover:bg-surface-container-lowest transition-colors')}
              >
                <td className={cm.cn('px-4 py-3')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      aria-hidden="true"
                      className={cm.cn('inline-block w-2 h-8 rounded-full')}
                      style={{ backgroundColor: p.team_color ?? 'var(--color-primary)' }}
                    />
                    <Link
                      to={`/players/${p.id}`}
                      className={cm.cn('text-sm font-bold text-on-surface hover:text-primary')}
                    >
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td
                  className={cm.cn(
                    'px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {p.team_abbr ?? '—'}
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
                <td
                  className={cm.cn(
                    'px-4 py-3 text-base font-extrabold tabular-nums text-right text-primary',
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {p.points ?? 0}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={cm.cn(
                    cm.sp('py', 12),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t('players.empty', {}, { defaultValue: 'No players match those filters.' })}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
