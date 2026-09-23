import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface PlayerProfile {
  id: string
  name: string
  team_id?: string
  team_name?: string
  team_abbr?: string
  team_color?: string
  position?: string
  jersey?: number
  height?: string
  weight?: string
  age?: number
  goals?: number
  assists?: number
  points?: number
  games_played?: number
  shots?: number
  shooting_pct?: number
}

const FALLBACK: PlayerProfile = {
  id: 'p1',
  name: 'Diego Marquez',
  team_id: 't1',
  team_name: 'Atlas United',
  team_abbr: 'ATL',
  team_color: '#0e7490',
  position: 'F',
  jersey: 9,
  height: '6\'1"',
  weight: '178 lb',
  age: 27,
  games_played: 24,
  goals: 24,
  assists: 8,
  points: 32,
  shots: 96,
  shooting_pct: 0.25,
}

function unwrapSingle<T>(v: unknown): T | null {
  if (!v) return null
  if (typeof v === 'object' && 'data' in v) return (v as { data: T }).data
  return v as T
}

export function PlayerDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = 'p1' } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerProfile>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    http
      .get(`/api/players/${id}`)
      .then((p) => {
        if (!cancelled) {
          const detail = unwrapSingle<PlayerProfile>(p)
          if (detail) setPlayer(detail)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, id])

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/players"
        className={cm.cn(
          cm.textSize('sm'),
          'font-bold text-primary hover:underline inline-flex items-center gap-1 w-fit',
        )}
      >
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
          arrow_back
        </span>
        {t('playerDetail.back', {}, { defaultValue: 'Back to players' })}
      </Link>

      <section
        className={cm.cn(
          'rounded-[2rem] text-white relative overflow-hidden shadow-xl p-5 sm:p-8 md:p-10',
        )}
        style={{
          background: `linear-gradient(135deg, ${player.team_color ?? 'var(--color-primary)'} 0%, #0c4a6e 60%, #0f172a 100%)`,
        }}
      >
        <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-start')}>
          <div className={cm.cn('md:col-span-2')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.28em] text-white/70 mb-3',
              )}
            >
              {player.team_abbr ?? '—'} · #{player.jersey ?? '—'} · {player.position ?? '—'}
            </p>
            <h1 className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter')}>
              {player.name}
            </h1>
            {player.team_id ? (
              <Link
                to={`/teams/${player.team_id}`}
                className={cm.cn(
                  'mt-3 inline-block text-sm uppercase tracking-widest font-bold text-white/80 hover:text-white',
                )}
              >
                {player.team_name ?? player.team_abbr ?? '—'} →
              </Link>
            ) : null}
          </div>
          <div className={cm.cn('md:text-right')}>
            <span
              className={cm.cn(
                'text-6xl md:text-7xl font-extrabold tabular-nums leading-none block',
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {player.points ?? 0}
            </span>
            <span
              className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-white/70')}
            >
              {t('playerDetail.pointsLabel', {}, { defaultValue: 'Season Points' })}
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
            k: 'gp',
            label: t('playerDetail.statGP', {}, { defaultValue: 'Games' }),
            value: String(player.games_played ?? 0),
            tone: 'border-l-primary',
          },
          {
            k: 'g',
            label: t('playerDetail.statG', {}, { defaultValue: 'Goals' }),
            value: String(player.goals ?? 0),
            tone: 'border-l-win',
          },
          {
            k: 'a',
            label: t('playerDetail.statA', {}, { defaultValue: 'Assists' }),
            value: String(player.assists ?? 0),
            tone: 'border-l-accent',
          },
          {
            k: 'pct',
            label: t('playerDetail.statPct', {}, { defaultValue: 'Shoot %' }),
            value: ((player.shooting_pct ?? 0) * 100).toFixed(1) + '%',
            tone: 'border-l-live',
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
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h2>
        <dl
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 grid grid-cols-2 md:grid-cols-4 gap-6',
          )}
        >
          {[
            {
              label: t('playerDetail.height', {}, { defaultValue: 'Height' }),
              value: player.height ?? '—',
            },
            {
              label: t('playerDetail.weight', {}, { defaultValue: 'Weight' }),
              value: player.weight ?? '—',
            },
            {
              label: t('playerDetail.age', {}, { defaultValue: 'Age' }),
              value: player.age != null ? String(player.age) : '—',
            },
            {
              label: t('playerDetail.shots', {}, { defaultValue: 'Shots' }),
              value: String(player.shots ?? 0),
            },
          ].map((item) => (
            <div key={item.label}>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {item.label}
              </dt>
              <dd
                className={cm.cn('mt-1 text-lg font-bold tabular-nums')}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
