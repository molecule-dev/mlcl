import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/api.js'

interface TeamCard {
  id: string | number
  name: string
  abbreviation?: string
  city?: string
  division?: string
  color?: string
  wins?: number
  losses?: number
  draws?: number
  rank?: number
  logo_url?: string | null
}

const FALLBACK: TeamCard[] = [
  {
    id: 't1',
    name: 'Atlas United',
    abbreviation: 'ATL',
    city: 'Atlanta',
    division: 'East',
    color: '#0e7490',
    wins: 18,
    losses: 4,
    draws: 2,
    rank: 1,
  },
  {
    id: 't2',
    name: 'Boston Reign',
    abbreviation: 'BOS',
    city: 'Boston',
    division: 'East',
    color: '#dc2626',
    wins: 16,
    losses: 6,
    draws: 2,
    rank: 2,
  },
  {
    id: 't3',
    name: 'Chicago Surge',
    abbreviation: 'CHI',
    city: 'Chicago',
    division: 'Central',
    color: '#16a34a',
    wins: 14,
    losses: 7,
    draws: 3,
    rank: 3,
  },
  {
    id: 't4',
    name: 'Dallas Roar',
    abbreviation: 'DAL',
    city: 'Dallas',
    division: 'South',
    color: '#7c3aed',
    wins: 12,
    losses: 9,
    draws: 3,
    rank: 4,
  },
  {
    id: 't5',
    name: 'Phoenix Heat',
    abbreviation: 'PHX',
    city: 'Phoenix',
    division: 'West',
    color: '#f59e0b',
    wins: 10,
    losses: 11,
    draws: 3,
    rank: 5,
  },
  {
    id: 't6',
    name: 'Seattle Wave',
    abbreviation: 'SEA',
    city: 'Seattle',
    division: 'West',
    color: '#0c4a6e',
    wins: 9,
    losses: 12,
    draws: 3,
    rank: 6,
  },
  {
    id: 't7',
    name: 'Miami Tide',
    abbreviation: 'MIA',
    city: 'Miami',
    division: 'South',
    color: '#22d3ee',
    wins: 7,
    losses: 14,
    draws: 3,
    rank: 7,
  },
  {
    id: 't8',
    name: 'Toronto Echo',
    abbreviation: 'TOR',
    city: 'Toronto',
    division: 'North',
    color: '#10b981',
    wins: 5,
    losses: 17,
    draws: 2,
    rank: 8,
  },
]

export function Teams() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [teams, setTeams] = useState<TeamCard[]>(FALLBACK)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/teams?limit=100')
      .then((rows) => {
        if (!cancelled) {
          const list = unwrapList<TeamCard>(rows)
          setTeams(list.length ? list : FALLBACK)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = search
    ? teams.filter(
        (team) =>
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          (team.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (team.abbreviation ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : teams

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('teams.eyebrow', {}, { defaultValue: 'The badge wearers' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('teams.title', {}, { defaultValue: 'Teams' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {loading
            ? t('teams.loading', {}, { defaultValue: 'Loading the league…' })
            : t(
                'teams.subtitle',
                { count: teams.length },
                { defaultValue: '{{count}} teams across the league.' },
              )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-full bg-surface-container-lowest border border-outline-variant/40 max-w-md',
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
          placeholder={t(
            'teams.searchPlaceholder',
            {},
            { defaultValue: 'Search team, city, abbreviation…' },
          )}
          className={cm.cn(
            cm.w('full'),
            'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline',
          )}
        />
      </div>

      <div
        className={cm.cn(
          cm.grid({ gap: 'md' }),
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {visible.map((team) => {
          const totalGames = (team.wins ?? 0) + (team.losses ?? 0) + (team.draws ?? 0)
          const winRatio = totalGames > 0 ? (team.wins ?? 0) / totalGames : 0
          return (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex items-center justify-center w-14 h-14 rounded-xl text-white text-xl font-extrabold tracking-tight ring-1 ring-outline-variant/40',
                  )}
                  style={{ backgroundColor: team.color ?? 'var(--color-primary)' }}
                >
                  {team.abbreviation ?? team.name.slice(0, 3).toUpperCase()}
                </span>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'teams.rankLabel',
                    { rank: team.rank ?? '—' },
                    { defaultValue: 'Rank #{{rank}}' },
                  )}
                </span>
              </div>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight',
                )}
              >
                {team.name}
              </h3>
              <p
                className={cm.cn(
                  'text-[11px] uppercase tracking-widest font-bold text-on-surface-variant',
                )}
              >
                {team.city ?? '—'} · {team.division ?? '—'}
              </p>
              <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.sp('mt', 2))}>
                <span
                  className={cm.cn('text-2xl font-extrabold tabular-nums text-on-surface')}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {team.wins ?? 0}-{team.losses ?? 0}-{team.draws ?? 0}
                </span>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('teams.recordLabel', {}, { defaultValue: 'W-L-D' })}
                </span>
              </div>
              <div
                className={cm.cn(
                  'mt-2 h-1.5 w-full rounded-full bg-surface-container overflow-hidden',
                )}
                aria-hidden="true"
              >
                <div
                  className={cm.cn('h-full bg-win rounded-full')}
                  style={{ width: `${Math.round(winRatio * 100)}%` }}
                />
              </div>
            </Link>
          )
        })}
        {visible.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'col-span-full text-on-surface-variant',
            )}
          >
            {t('teams.empty', {}, { defaultValue: 'No teams match your search.' })}
          </p>
        ) : null}
      </div>
    </div>
  )
}
