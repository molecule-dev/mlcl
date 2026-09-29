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

interface PredictionRow {
  id: string
  status: 'won' | 'lost' | 'pending'
  matchup: string
  predicted: string
  result: string
}

// Sample prediction history — the design's "Recent Predictions" feed. Static
// sample data (the signed-in fan's slip), filtered client-side by status.
const SAMPLE_PREDICTIONS: PredictionRow[] = [
  { id: 'prd-1', status: 'won', matchup: 'BOS @ NYR', predicted: 'BOS 4-2', result: 'BOS 5-3' },
  { id: 'prd-2', status: 'lost', matchup: 'TOR @ MTL', predicted: 'TOR 3-1', result: 'MTL 4-2' },
  { id: 'prd-3', status: 'pending', matchup: 'SEA @ CHI', predicted: 'SEA 2-1', result: '2h 15m' },
  { id: 'prd-4', status: 'won', matchup: 'ATL @ MIA', predicted: 'ATL 3-0', result: 'ATL 2-0' },
]

type PredictionFilter = 'all' | 'won' | 'lost' | 'pending'

const PREDICTION_FILTERS: { key: PredictionFilter; labelKey: string; fallback: string }[] = [
  { key: 'all', labelKey: 'profile.predictions.filterAll', fallback: 'All' },
  { key: 'won', labelKey: 'profile.predictions.filterWon', fallback: 'Won' },
  { key: 'lost', labelKey: 'profile.predictions.filterLost', fallback: 'Lost' },
  { key: 'pending', labelKey: 'profile.predictions.filterPending', fallback: 'Pending' },
]

// Season badges from the design's "Badges Earned" rack — icon tile, name,
// and the milestone that earned it.
const BADGES: {
  icon: string
  nameKey: string
  nameFallback: string
  detailKey: string
  detailFallback: string
  tone: 'primary' | 'secondary'
}[] = [
  {
    icon: 'local_fire_department',
    nameKey: 'profile.badges.hotStreak',
    nameFallback: 'Hot Streak',
    detailKey: 'profile.badges.hotStreakDetail',
    detailFallback: '10 wins in a row',
    tone: 'primary',
  },
  {
    icon: 'verified_user',
    nameKey: 'profile.badges.expert',
    nameFallback: 'Expert',
    detailKey: 'profile.badges.expertDetail',
    detailFallback: '65%+ call accuracy',
    tone: 'secondary',
  },
  {
    icon: 'military_tech',
    nameKey: 'profile.badges.veteran',
    nameFallback: 'Veteran',
    detailKey: 'profile.badges.veteranDetail',
    detailFallback: 'Five seasons of picks',
    tone: 'primary',
  },
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const displayName = user?.name || user?.email || `${APP_NAME} Fan`
  const [favorites, setFavorites] = useState<FavoriteTeamRow[]>([])
  const [standings, setStandings] = useState<Record<string, StandingRow>>({})
  const [loading, setLoading] = useState(true)
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>('all')

  const visiblePredictions =
    predictionFilter === 'all'
      ? SAMPLE_PREDICTIONS
      : SAMPLE_PREDICTIONS.filter((p) => p.status === predictionFilter)

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
                  cm.accentCard({ tone: 'custom' }),
                  'rounded-xl bg-surface border border-outline-variant/40 shadow-sm hover:bg-surface-container-low transition-colors',
                )}
                style={{ ['--mol-accent' as string]: color }}
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
                  <p className={cm.accentCardLabel({ tone: 'custom' })}>
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

      {/* Recent Predictions — the fan's latest calls with a status filter */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('profile.predictions.heading', {}, { defaultValue: 'Recent Predictions' })}
          </h2>
          <Link
            to="/schedule"
            data-mol-id="profile-view-predictions"
            className={cm.cn(cm.textSize('sm'), 'font-bold text-primary hover:underline')}
          >
            {t(
              'profile.predictions.viewAll',
              { count: SAMPLE_PREDICTIONS.length },
              { defaultValue: 'View all {{count}} predictions' },
            )}
          </Link>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'rounded-full bg-surface-container-lowest border border-outline-variant/40 w-fit',
          )}
        >
          {PREDICTION_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setPredictionFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'rounded-full transition-colors',
                predictionFilter === f.key
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {t(f.labelKey, {}, { defaultValue: f.fallback })}
            </button>
          ))}
        </div>

        {visiblePredictions.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
            {t(
              'profile.predictions.none',
              {},
              { defaultValue: 'No predictions in this view yet.' },
            )}
          </p>
        ) : (
          <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
            {visiblePredictions.map((p) => {
              const won = p.status === 'won'
              const pending = p.status === 'pending'
              return (
                <div
                  key={p.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface border border-outline-variant/40 shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'uppercase tracking-widest',
                      won
                        ? 'bg-primary-container text-on-primary-container'
                        : pending
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container-high text-on-surface-variant',
                    )}
                  >
                    {t(
                      `profile.predictions.status.${p.status}`,
                      {},
                      {
                        defaultValue: { won: 'Won', lost: 'Lost', pending: 'Pending' }[p.status],
                      },
                    )}
                  </span>
                  <div className={cm.flex1}>
                    <p className={cm.cn('text-sm font-bold text-on-surface tracking-tight')}>
                      {p.matchup}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'profile.predictions.predicted',
                        { score: p.predicted },
                        { defaultValue: 'Predicted {{score}}' },
                      )}
                      {' · '}
                      {pending
                        ? t(
                            'profile.predictions.startsIn',
                            { eta: p.result },
                            { defaultValue: 'Starts in {{eta}}' },
                          )
                        : t(
                            'profile.predictions.final',
                            { score: p.result },
                            { defaultValue: 'Final {{score}}' },
                          )}
                    </p>
                  </div>
                  {!pending && (
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        'material-symbols-outlined text-xl',
                        won ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {won ? 'check_circle' : 'cancel'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Badges Earned — season milestone rack */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-primary-container text-primary',
            )}
          >
            <span className="material-symbols-outlined text-xl">workspace_premium</span>
          </span>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('profile.badges.heading', {}, { defaultValue: 'Badges Earned' })}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-3')}>
          {BADGES.map((b) => (
            <div
              key={b.icon}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 5),
                'rounded-xl bg-surface border border-outline-variant/40 shadow-sm',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  'rounded-full',
                  b.tone === 'primary'
                    ? 'bg-primary-container text-primary'
                    : 'bg-secondary-container text-secondary',
                )}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {b.icon}
                </span>
              </span>
              <div className={cm.flex1}>
                <p className={cm.cn('text-sm font-bold text-on-surface tracking-tight')}>
                  {t(b.nameKey, {}, { defaultValue: b.nameFallback })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(b.detailKey, {}, { defaultValue: b.detailFallback })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
