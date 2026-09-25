import { useCallback, useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { type LeaderboardEntry, LeaderboardRow } from '../components/LeaderboardRow.js'

interface AuthUser {
  id: string
  username?: string
  name?: string
  email?: string
}

interface GlobalRow {
  user_id: string
  nickname?: string
  username?: string
  total_score?: number
  best_score?: number
  score?: number
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function rowToEntry(row: GlobalRow, rank: number, currentUserId?: string): LeaderboardEntry {
  const display = row.nickname ?? row.username ?? `Player ${rank}`
  return {
    rank,
    username: row.user_id,
    displayName: display,
    avatarSeed: row.user_id,
    score: Number(row.total_score ?? row.best_score ?? row.score ?? 0),
    streakDays: 0,
    isCurrentUser: row.user_id === currentUserId,
  }
}

export function Leaderboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await http.get('/api/leaderboard/global')
      const list = unwrap<GlobalRow[]>(res) ?? []
      const mapped = (Array.isArray(list) ? list : []).map((row, i) =>
        rowToEntry(row, i + 1, user?.id),
      )
      setEntries(mapped)
    } catch (_error) {
      // Failed fetch must not render as an empty board — surface a banner.
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [http, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))} data-testid="leaderboard">
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <span className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}>
            {t('leaderboard.eyebrow', {}, { defaultValue: 'Leaderboard' })}
          </span>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}>
            {t('leaderboard.title', {}, { defaultValue: 'Top quizmasters' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant mt-2 max-w-md')}>
            {t(
              'leaderboard.subhead',
              {},
              {
                defaultValue:
                  'Aggregate score across every quiz session you have played. Climb by playing more.',
              },
            )}
          </p>
        </div>
      </header>

      {loading ? (
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <LoadErrorBanner
          onRetry={refresh}
          message={t(
            'common.loadError',
            {},
            { defaultValue: 'Something went wrong loading this content.' },
          )}
        />
      ) : entries.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl border border-dashed border-outline-variant/40 text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-primary mb-3 inline-block')}
          >
            leaderboard
          </span>
          <p className={cm.cn('font-bold text-base mb-1')}>
            {t(
              'leaderboard.empty.title',
              {},
              { defaultValue: 'No plays on the board yet — be the first.' },
            )}
          </p>
          <p className={cm.cn('text-sm')}>
            {t(
              'leaderboard.empty.body',
              {},
              { defaultValue: 'Play a quiz to put your score on the global leaderboard.' },
            )}
          </p>
        </div>
      ) : (
        <>
          {podium.length > 0 ? (
            <section
              className={cm.cn(
                'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-tertiary text-white shadow-2xl shadow-primary/30',
                cm.sp('p', 10),
              )}
            >
              <span
                className={cm.cn(
                  'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-amber-400/30 blur-3xl',
                )}
                aria-hidden="true"
              />
              <span
                className={cm.cn(
                  'absolute -left-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
                )}
                aria-hidden="true"
              />
              <div
                className={cm.cn(
                  'relative z-10',
                  cm.flex({ align: 'end', justify: 'center', gap: 6 }),
                  'flex-wrap',
                )}
              >
                {podium.map((p, i) => {
                  const heightCls = i === 0 ? 'h-44' : i === 1 ? 'h-36' : 'h-32'
                  const order = i === 0 ? 'order-2' : i === 1 ? 'order-1' : 'order-3'
                  const medal =
                    i === 0
                      ? 'bg-amber-400 text-amber-950'
                      : i === 1
                        ? 'bg-border text-foreground'
                        : 'bg-amber-700 text-amber-50'
                  return (
                    <div key={p.username} className={cm.cn(order, 'flex flex-col items-center')}>
                      <div
                        className={cm.cn(
                          'w-16 h-16 rounded-full ring-4 ring-white/30 bg-amber-400 text-amber-950 flex items-center justify-center text-2xl font-extrabold mb-3',
                        )}
                        aria-hidden="true"
                      >
                        {p.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <p className={cm.cn('text-sm font-extrabold text-center mb-1')}>
                        {p.displayName}
                      </p>
                      <div
                        className={cm.cn(
                          'w-32 rounded-t-2xl flex flex-col items-center justify-end p-3 backdrop-blur-md bg-surface/10 border border-surface/20',
                          heightCls,
                        )}
                      >
                        <span
                          className={cm.cn(
                            'w-9 h-9 rounded-full flex items-center justify-center font-black mb-2',
                            medal,
                          )}
                        >
                          {p.rank}
                        </span>
                        <p className={cm.cn('font-extrabold text-2xl tabular-nums')}>
                          {p.score.toLocaleString()}
                        </p>
                        <p className={cm.cn('text-[10px] uppercase tracking-widest opacity-80')}>
                          {t('leaderboard.points', {}, { defaultValue: 'Points' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section
              className={cm.cn(
                'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
                cm.sp('p', 6),
              )}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
              >
                <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                  {t('leaderboard.fullRanking', {}, { defaultValue: 'Full ranking' })}
                </h2>
                <span className={cm.cn('text-xs text-on-surface-variant font-semibold')}>
                  {t(
                    'leaderboard.totalPlayers',
                    { count: entries.length },
                    { defaultValue: '{{count}} ranked players' },
                  )}
                </span>
              </div>
              <div className={cm.stack(2)}>
                {rest.map((entry) => (
                  <LeaderboardRow key={`${entry.username}-${entry.rank}`} {...entry} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

export default Leaderboard
