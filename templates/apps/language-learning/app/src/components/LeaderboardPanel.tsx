import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  avatar: string
  xp: number
  isCurrentUser?: boolean
  /** Optional small flag emoji or short tag rendered next to the name. */
  flag?: string
}

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[]
  /** Eyebrow above the panel title (e.g. "This week"). */
  period?: string
}

const RANK_COLOR: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-amber-400/40',
  2: 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md shadow-slate-300/40',
  3: 'bg-gradient-to-br from-orange-400 to-amber-700 text-white shadow-md shadow-amber-700/30',
}

/**
 * Friends leaderboard list — top 5 with podium-tinted rank chips for 1-3,
 * highlighted current-user row (border-l accent + primary tint), tabular
 * XP values right-aligned.
 *
 * Translated from lms's LeaderboardCard.tsx with rank chips upgraded to
 * podium-style gradient pills.
 */
export function LeaderboardPanel({ entries, period }: LeaderboardPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const eyebrow = period ?? t('status.thisWeek', {}, { defaultValue: 'This week' })

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <div>
          <p
            className={cm.cn(
              'font-black uppercase tracking-widest text-[10px] text-on-surface-variant',
            )}
          >
            {eyebrow}
          </p>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
            {t('leaderboardPanel.title', {}, { defaultValue: 'Friends leaderboard' })}
          </h3>
        </div>
        <span className={cm.cn('material-symbols-outlined', cm.textPrimary)} aria-hidden="true">
          emoji_events
        </span>
      </div>

      <ul className={cm.cn(cm.stack(2))}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('py', 2),
              cm.sp('px', 3),
              'rounded-xl transition-colors',
              entry.isCurrentUser
                ? 'bg-primary-container/30 border-l-4 border-primary'
                : 'hover:bg-surface-container-low',
            )}
          >
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'shrink-0 tabular-nums',
                RANK_COLOR[entry.rank] ?? 'bg-surface-container text-on-surface-variant',
              )}
            >
              {entry.rank}
            </div>
            <img
              alt={entry.name}
              src={entry.avatar}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'object-cover ring-2 ring-surface-container',
              )}
            />
            <div className={cm.cn(cm.flex1, 'min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'truncate',
                  entry.isCurrentUser ? cm.textPrimary : '',
                )}
              >
                {entry.flag ? (
                  <span className={cm.cn('mr-1')} aria-hidden="true">
                    {entry.flag}
                  </span>
                ) : null}
                {entry.name}
                {entry.isCurrentUser ? (
                  <span
                    className={cm.cn(
                      cm.sp('ml', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.textPrimary,
                    )}
                  >
                    {t('leaderboardPanel.you', {}, { defaultValue: '(You)' })}
                  </span>
                ) : null}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'leaderboardPanel.rankSuffix',
                  { rank: entry.rank },
                  { defaultValue: 'Rank #{{rank}}' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'tabular-nums',
                entry.isCurrentUser ? cm.textPrimary : 'text-on-surface',
              )}
            >
              {t(
                'leaderboardPanel.xp',
                { xp: entry.xp.toLocaleString() },
                { defaultValue: '{{xp}} XP' },
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default LeaderboardPanel
