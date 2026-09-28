/**
 * Leaderboard row — medal-coloured rank chip for the top 3, neutral for
 * the rest. Current-user rows lift on a primary tint background with a
 * left border. Streak/delta indicator on the right.
 *
 * Translated from lms/LeaderboardCard.tsx (rank + avatar + name + xp +
 * highlighted-current-user variant).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type LeaderboardEntry = {
  rank: number
  username: string
  displayName: string
  avatarSeed: string
  score: number
  streakDays?: number
  delta?: number
  isCurrentUser?: boolean
}

export type LeaderboardRowProps = LeaderboardEntry

const RANK_COLOR: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-border-secondary text-foreground',
  3: 'bg-amber-700 text-amber-50',
}

export function LeaderboardRow({
  rank,
  username,
  displayName,
  avatarSeed,
  score,
  streakDays,
  delta,
  isCurrentUser,
}: LeaderboardRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const rankBadgeClass =
    rank <= 3 ? RANK_COLOR[rank] : 'bg-surface-container-low text-on-surface-variant'
  const deltaSign = delta && delta > 0 ? '+' : ''
  const deltaTone =
    delta && delta > 0
      ? 'text-success'
      : delta && delta < 0
        ? 'text-error'
        : 'text-on-surface-variant'

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 4 }),
        cm.sp('pr', 4),
        cm.sp('py', 3),
        // Every row keeps the accent recipe's left padding so the current
        // user's row (which carries the bar) lines up with the others.
        'rounded-xl transition-colors pl-[30px]',
        isCurrentUser
          ? cm.cn(cm.accentCard({ tone: 'primary' }), 'bg-primary-container/30 shadow-sm')
          : 'hover:bg-surface-container-low',
      )}
    >
      <span
        className={cm.cn(
          'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm tracking-tight shadow-sm',
          rankBadgeClass,
        )}
      >
        {rank <= 3 ? (
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            {rank === 1 ? 'trophy' : rank === 2 ? 'workspace_premium' : 'military_tech'}
          </span>
        ) : (
          rank
        )}
      </span>
      <img
        src={`https://picsum.photos/seed/${avatarSeed}/64/64`}
        alt=""
        className={cm.cn(
          'w-10 h-10 rounded-full object-cover ring-2 ring-surface-container-lowest',
        )}
      />
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <p
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            isCurrentUser ? 'text-primary' : '',
            'truncate',
          )}
        >
          {displayName}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>@{username}</p>
      </div>
      {streakDays !== undefined ? (
        <span
          className={cm.cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
            'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            local_fire_department
          </span>
          {t('leaderboardRow.streak', { days: streakDays }, { defaultValue: '{{days}}d' })}
        </span>
      ) : null}
      <div className={cm.cn(cm.textRight)}>
        <p
          className={cm.cn(
            'font-extrabold text-base tracking-tight tabular-nums',
            isCurrentUser ? 'text-primary' : '',
          )}
        >
          {score.toLocaleString()}
        </p>
        {delta !== undefined ? (
          <p className={cm.cn(cm.textSize('xs'), 'font-semibold tabular-nums', deltaTone)}>
            {deltaSign}
            {delta}
          </p>
        ) : (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('leaderboardRow.points', {}, { defaultValue: 'pts' })}
          </p>
        )}
      </div>
    </div>
  )
}

export default LeaderboardRow
