import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/api.js'

interface FavoriteTeamRow {
  id: string
  team_id: string
  team: {
    id: string
    name: string
    abbreviation?: string | null
    primary_color?: string | null
    wins?: number | string | null
    losses?: number | string | null
    draws?: number | string | null
  } | null
}

interface StandingRow {
  team_id: string
  rank: number
  wins: number
  losses: number
  draws: number
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const displayName = user?.name || user?.email || `${APP_NAME} Fan`
  const [favorites, setFavorites] = useState<FavoriteTeamRow[]>([])
  const [standings, setStandings] = useState<Record<string, StandingRow>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/favorite-teams').catch(() => null),
      http.get('/api/standings').catch(() => null),
    ]).then(([favs, standingsData]) => {
      if (cancelled) return
      setFavorites(unwrapList<FavoriteTeamRow>(favs))
      const standingsList = unwrapList<StandingRow>(standingsData)
      const byTeamId: Record<string, StandingRow> = {}
      for (const s of standingsList) byTeamId[s.team_id] = s
      setStandings(byTeamId)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <section
        className={cm.cn(
          'rounded-[2rem] text-white relative overflow-hidden shadow-xl p-5 sm:p-8 md:p-10',
        )}
        style={{
          // scoreboard (not secondary): the hero carries white text and must
          // end near-black in BOTH modes — secondary flips light in dark.
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 60%, var(--color-scoreboard) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn(
              'inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-extrabold shadow-lg shadow-black/20 ring-2 ring-outline-variant/40',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
              color:
                'var(--color-on-accent)' /* dark navy — 7.04:1 on emerald accent in both modes */,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className={cm.flex1}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.28em] text-white/70 mb-2',
              )}
            >
              {t('profile.eyebrow', {}, { defaultValue: 'Fan profile' })}
            </p>
            <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter')}>
              {displayName}
            </h1>
            <p className={cm.cn('mt-1 text-sm uppercase tracking-widest font-bold text-white/70')}>
              {user?.email ?? '—'}
            </p>
          </div>
          <div className={cm.cn('text-center md:text-right')}>
            <span
              className={cm.cn('text-4xl font-extrabold tabular-nums')}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {favorites.length}
            </span>
            <p
              className={cm.cn('text-[10px] font-black uppercase tracking-[0.28em] text-white/70')}
            >
              {t('profile.favoritesCount', {}, { defaultValue: 'Teams followed' })}
            </p>
          </div>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('profile.favoritesHeading', {}, { defaultValue: 'Favorite teams' })}
          </h2>
          <Link
            to="/settings"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t('common.manage', {}, { defaultValue: 'Manage' })}
          </Link>
        </div>
        {!loading && favorites.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
            {t(
              'profile.noFavorites',
              {},
              { defaultValue: 'No favorites yet — pick teams from the Teams page.' },
            )}
          </p>
        ) : null}
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
          {favorites.map((fav) => {
            const team = fav.team
            if (!team) return null
            const standing = standings[team.id]
            const wins = Number(team.wins ?? standing?.wins ?? 0)
            const losses = Number(team.losses ?? standing?.losses ?? 0)
            const draws = Number(team.draws ?? standing?.draws ?? 0)
            const record = `${wins}-${losses}-${draws}`
            const color = team.primary_color ?? '#0e7490'
            const rank = standing?.rank
            return (
              <Link
                key={fav.id}
                to={`/teams/${team.id}`}
                data-testid={`profile-favorite-${team.abbreviation ?? team.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl bg-surface border border-outline-variant/40 shadow-sm border-l-4 hover:bg-surface-container-low transition-colors',
                )}
                style={{ borderLeftColor: color }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex items-center justify-center w-12 h-12 rounded-lg text-white text-base font-extrabold tracking-tight',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {team.abbreviation ?? '?'}
                </span>
                <div className={cm.flex1}>
                  <p className={cm.cn('text-base font-bold text-on-surface tracking-tight')}>
                    {team.name}
                  </p>
                  <p
                    className={cm.cn(
                      'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {rank
                      ? t(
                          'profile.rankRecord',
                          { rank, record },
                          { defaultValue: 'Rank #{{rank}} · {{record}}' },
                        )
                      : t('profile.recordOnly', { record }, { defaultValue: 'Record {{record}}' })}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-2xl text-loss')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
