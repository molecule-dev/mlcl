/**
 * Multiplayer lobby hero — displays the join code in a giant tabular-nums
 * monospace pill, a QR placeholder, a stack of joined-player avatars, and
 * the "live" pulse indicator. Used on HostLobby.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient hero +
 * extrabold value + frosted-glass pill) and adapted to a game-board
 * silhouette per DESIGN.md.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type LobbyPlayer = {
  id: string
  name: string
  avatarSeed: string
}

export type JoinCodeHeroProps = {
  joinCode: string
  joinUrl: string
  players: LobbyPlayer[]
  maxPlayers: number
  startsInSeconds?: number
  onStart?: () => void
  onCopy?: () => void
}

export function JoinCodeHero({
  joinCode,
  joinUrl,
  players,
  maxPlayers,
  startsInSeconds,
  onStart,
  onCopy,
}: JoinCodeHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibleAvatars = players.slice(0, 6)
  const overflow = Math.max(players.length - visibleAvatars.length, 0)

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-[var(--quiz-gradient-to)] text-white shadow-2xl shadow-primary/30',
        cm.sp('p', 10),
      )}
    >
      <span
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-amber-400/25 blur-3xl',
        )}
        aria-hidden="true"
      />
      <span
        className={cm.cn('absolute -left-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl')}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'relative z-10',
          cm.flex({ direction: 'col', gap: 8 }),
          'lg:flex-row lg:items-stretch',
        )}
      >
        <div className={cm.cn(cm.flex1)}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-400/20 backdrop-blur-md text-emerald-100 border border-emerald-300/30',
              cm.sp('mb', 4),
            )}
          >
            <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse')} />
            {t('joinCodeHero.liveLabel', {}, { defaultValue: 'Lobby live' })}
          </span>
          <h1
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight leading-[0.95] mb-2',
            )}
          >
            {t('joinCodeHero.headline', {}, { defaultValue: 'Tell your players to jump in.' })}
          </h1>
          <p className={cm.cn('text-white/80 text-sm md:text-base max-w-md mb-6')}>
            {t(
              'joinCodeHero.subhead',
              {},
              {
                defaultValue:
                  'Share the join code or scan the QR. The game starts the moment you fire the spark.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              'inline-flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/20 shadow-inner',
              cm.sp('mb', 6),
            )}
          >
            <span className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
              {t('joinCodeHero.joinCodeLabel', {}, { defaultValue: 'Join code' })}
            </span>
            {/* Tracking must stay [0.25em] at every size — the e2e lobby spec
                locates the code via that exact class. Only the font scales. */}
            <span
              className={cm.cn(
                'text-3xl sm:text-5xl font-mono font-bold tracking-[0.25em] text-amber-300',
              )}
            >
              {joinCode}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className={cm.cn(
                'ml-2 px-3 py-1 rounded-full bg-surface/15 hover:bg-surface/25 transition-colors text-[10px] font-black uppercase tracking-widest',
              )}
              data-mol-id="btn-copy-join-code"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[14px] align-middle mr-1')}
                aria-hidden="true"
              >
                content_copy
              </span>
              {t('common.copy', {}, { defaultValue: 'Copy' })}
            </button>
          </div>
          <p className={cm.cn('text-xs text-white/70 break-all', cm.sp('mb', 6))}>
            {t('joinCodeHero.joinUrlLabel', {}, { defaultValue: 'Or visit' })}{' '}
            <span className={cm.cn('text-amber-200 font-mono')}>{joinUrl}</span>
          </p>
          <button
            type="button"
            onClick={onStart}
            disabled={players.length === 0}
            className={cm.cn(
              'px-7 py-3 rounded-2xl bg-amber-400 text-amber-950 font-extrabold text-sm uppercase tracking-widest shadow-lg shadow-amber-400/30 hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            data-mol-id="btn-start-game"
          >
            <span
              className={cm.cn('material-symbols-outlined text-[16px] align-middle mr-1')}
              aria-hidden="true"
            >
              bolt
            </span>
            {t('joinCodeHero.startGame', {}, { defaultValue: 'Start the spark' })}
          </button>
        </div>
        <div className={cm.cn('lg:w-72 flex-shrink-0', cm.flex({ direction: 'col', gap: 4 }))}>
          <div
            className={cm.cn(
              'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/20 p-5 flex flex-col items-center',
            )}
          >
            <p
              className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80 mb-3')}
            >
              {t('joinCodeHero.qrLabel', {}, { defaultValue: 'Scan to join' })}
            </p>
            <div
              className={cm.cn(
                'w-36 h-36 rounded-xl bg-surface grid grid-cols-7 grid-rows-7 gap-0.5 p-2',
              )}
            >
              {Array.from({ length: 49 }).map((_, i) => {
                const filled = (i * 17 + 3) % 5 < 3
                return (
                  <span
                    key={i}
                    className={
                      filled ? 'bg-[var(--quiz-gradient-from)] rounded-[2px]' : 'bg-surface'
                    }
                  />
                )
              })}
            </div>
            {startsInSeconds !== undefined ? (
              <p
                className={cm.cn(
                  'mt-3 text-amber-200 font-mono font-bold tabular-nums tracking-widest',
                )}
              >
                {Math.floor(startsInSeconds / 60)
                  .toString()
                  .padStart(1, '0')}
                :{(startsInSeconds % 60).toString().padStart(2, '0')}
              </p>
            ) : null}
          </div>
          <div
            className={cm.cn(
              'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/20 p-5',
            )}
          >
            <div className={cm.cn('flex items-center justify-between mb-3')}>
              <p className={cm.cn('text-[10px] uppercase tracking-widest font-black opacity-80')}>
                {t('joinCodeHero.playersLabel', {}, { defaultValue: 'Players' })}
              </p>
              <p className={cm.cn('text-sm font-extrabold tabular-nums')}>
                {players.length}/{maxPlayers}
              </p>
            </div>
            <div className={cm.cn('flex -space-x-2 mb-3')}>
              {visibleAvatars.map((p) => (
                <img
                  key={p.id}
                  src={`https://picsum.photos/seed/${p.avatarSeed}/64/64`}
                  alt={p.name}
                  className={cm.cn('w-10 h-10 rounded-full object-cover ring-2 ring-primary')}
                />
              ))}
              {overflow > 0 ? (
                <span
                  className={cm.cn(
                    'w-10 h-10 rounded-full bg-amber-400 text-amber-950 ring-2 ring-primary flex items-center justify-center text-xs font-black',
                  )}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
            <ul className={cm.cn('text-xs space-y-1 opacity-90')}>
              {players.slice(-3).map((p) => (
                <li key={`name-${p.id}`} className={cm.cn('flex items-center gap-2')}>
                  <span
                    className={cm.cn('w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse')}
                  />
                  {t(
                    'joinCodeHero.playerJoined',
                    { name: p.name },
                    { defaultValue: '{{name}} joined' },
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default JoinCodeHero
