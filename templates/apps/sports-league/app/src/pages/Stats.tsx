import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type StatLeader, StatLeaderRow } from '../components/StatLeaderRow.js'
import { unwrapList } from '../lib/api.js'
import { toStatLeaders } from '../lib/stats.js'

interface LeaderboardSet {
  scoring: StatLeader[]
  assists: StatLeader[]
  saves: StatLeader[]
  shots: StatLeader[]
}

const FALLBACK: LeaderboardSet = {
  scoring: [
    {
      player_id: 'p1',
      rank: 1,
      name: 'D. Marquez',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '24',
      unit: 'GOALS',
      delta: 'up',
    },
    {
      player_id: 'p2',
      rank: 2,
      name: 'J. Reeves',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '18',
      unit: 'GOALS',
      delta: 'flat',
    },
    {
      player_id: 'p8',
      rank: 3,
      name: 'T. Nakamura',
      team_abbr: 'SEA',
      team_color: '#0c4a6e',
      value: '14',
      unit: 'GOALS',
      delta: 'up',
    },
    {
      player_id: 'p9',
      rank: 4,
      name: 'S. Wahid',
      team_abbr: 'MIA',
      team_color: '#22d3ee',
      value: '9',
      unit: 'GOALS',
      delta: 'down',
    },
    {
      player_id: 'p10',
      rank: 5,
      name: 'L. Olsen',
      team_abbr: 'TOR',
      team_color: '#10b981',
      value: '7',
      unit: 'GOALS',
      delta: 'up',
    },
  ],
  assists: [
    {
      player_id: 'p3',
      rank: 1,
      name: 'A. Petrov',
      team_abbr: 'BOS',
      team_color: '#dc2626',
      value: '14',
      unit: 'AST',
      delta: 'up',
    },
    {
      player_id: 'p2',
      rank: 2,
      name: 'J. Reeves',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '12',
      unit: 'AST',
      delta: 'flat',
    },
    {
      player_id: 'p4',
      rank: 3,
      name: 'K. Larsen',
      team_abbr: 'CHI',
      team_color: '#16a34a',
      value: '11',
      unit: 'AST',
      delta: 'up',
    },
    {
      player_id: 'p9',
      rank: 4,
      name: 'S. Wahid',
      team_abbr: 'MIA',
      team_color: '#22d3ee',
      value: '9',
      unit: 'AST',
      delta: 'flat',
    },
    {
      player_id: 'p1',
      rank: 5,
      name: 'D. Marquez',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '8',
      unit: 'AST',
      delta: 'down',
    },
  ],
  saves: [
    {
      player_id: 'p7',
      rank: 1,
      name: 'C. Garcia',
      team_abbr: 'BOS',
      team_color: '#dc2626',
      value: '142',
      unit: 'SAVES',
      delta: 'up',
    },
    {
      player_id: 'gk2',
      rank: 2,
      name: 'B. Kowalski',
      team_abbr: 'CHI',
      team_color: '#16a34a',
      value: '128',
      unit: 'SAVES',
      delta: 'flat',
    },
    {
      player_id: 'gk3',
      rank: 3,
      name: 'F. Olsen',
      team_abbr: 'PHX',
      team_color: '#f59e0b',
      value: '119',
      unit: 'SAVES',
      delta: 'down',
    },
    {
      player_id: 'gk4',
      rank: 4,
      name: 'O. Hassan',
      team_abbr: 'DAL',
      team_color: '#7c3aed',
      value: '105',
      unit: 'SAVES',
      delta: 'up',
    },
    {
      player_id: 'gk5',
      rank: 5,
      name: 'W. Park',
      team_abbr: 'SEA',
      team_color: '#0c4a6e',
      value: '98',
      unit: 'SAVES',
      delta: 'flat',
    },
  ],
  shots: [
    {
      player_id: 'p1',
      rank: 1,
      name: 'D. Marquez',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '96',
      unit: 'SHOTS',
      delta: 'up',
    },
    {
      player_id: 'p2',
      rank: 2,
      name: 'J. Reeves',
      team_abbr: 'ATL',
      team_color: '#0e7490',
      value: '78',
      unit: 'SHOTS',
      delta: 'flat',
    },
    {
      player_id: 'p8',
      rank: 3,
      name: 'T. Nakamura',
      team_abbr: 'SEA',
      team_color: '#0c4a6e',
      value: '72',
      unit: 'SHOTS',
      delta: 'up',
    },
    {
      player_id: 'p3',
      rank: 4,
      name: 'A. Petrov',
      team_abbr: 'BOS',
      team_color: '#dc2626',
      value: '54',
      unit: 'SHOTS',
      delta: 'down',
    },
    {
      player_id: 'p9',
      rank: 5,
      name: 'S. Wahid',
      team_abbr: 'MIA',
      team_color: '#22d3ee',
      value: '49',
      unit: 'SHOTS',
      delta: 'flat',
    },
  ],
}

export function Stats() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<LeaderboardSet>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/stats/leaders/scoring?limit=10').catch(() => null),
      http.get('/api/stats/leaders/assists?limit=10').catch(() => null),
      http.get('/api/stats/leaders/saves?limit=10').catch(() => null),
      http.get('/api/stats/leaders/shots?limit=10').catch(() => null),
    ]).then(([s, a, sv, sh]) => {
      if (cancelled) return
      const scoring = toStatLeaders(unwrapList(s))
      const assists = toStatLeaders(unwrapList(a))
      const saves = toStatLeaders(unwrapList(sv))
      const shots = toStatLeaders(unwrapList(sh))
      setData({
        scoring: scoring.length ? scoring : FALLBACK.scoring,
        assists: assists.length ? assists : FALLBACK.assists,
        saves: saves.length ? saves : FALLBACK.saves,
        shots: shots.length ? shots : FALLBACK.shots,
      })
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const sections: { key: keyof LeaderboardSet; title: string; icon: string }[] = [
    {
      key: 'scoring',
      title: t('stats.scoring', {}, { defaultValue: 'Scoring leaders' }),
      icon: 'sports_soccer',
    },
    {
      key: 'assists',
      title: t('stats.assists', {}, { defaultValue: 'Assist leaders' }),
      icon: 'handshake',
    },
    {
      key: 'saves',
      title: t('stats.saves', {}, { defaultValue: 'Save leaders' }),
      icon: 'sports_handball',
    },
    {
      key: 'shots',
      title: t('stats.shots', {}, { defaultValue: 'Shot leaders' }),
      icon: 'sports_score',
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('stats.eyebrow', {}, { defaultValue: 'Statistical leaders' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('stats.title', {}, { defaultValue: 'Stats' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'stats.subtitle',
            {},
            { defaultValue: 'Top of the league across every category — refreshed every game.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
        {sections.map((sec) => (
          <section
            key={sec.key}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
            )}
          >
            <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 2))}>
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-2xl text-primary')}
              >
                {sec.icon}
              </span>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{sec.title}</h2>
            </header>
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {data[sec.key].map((l) => (
                <StatLeaderRow key={l.player_id} leader={l} podium={l.rank <= 3} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
