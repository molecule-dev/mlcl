import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface LeaderboardEntry {
  userId: string
  name: string | null
  completedLessons: number
}

export default function LeaderboardCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const { user: authUser } = useAuth<{ id?: string; name?: string; email?: string }>()
  const meId: string | undefined = authUser?.id
  const meName: string =
    authUser?.name ||
    (authUser?.email ? authUser.email.split('@')[0] : '') ||
    t('nav.you', {}, { defaultValue: 'You' })
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setEntries([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res: unknown = await http.get<LeaderboardEntry[]>('/api/leaderboard?limit=5')
        if (cancelled) return
        const list: LeaderboardEntry[] = Array.isArray(res)
          ? (res as LeaderboardEntry[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: LeaderboardEntry[] }).data
            : []
        setEntries(list)
      } catch (_error) {
        // Leaderboard fetch failed — show empty state
        if (!cancelled) setEntries([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated])

  const initialsAvatar = (seed: string) =>
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed || 'student')}`
  const rankAccent = (rank: number) =>
    rank === 1
      ? 'text-warning'
      : rank === 2
        ? 'text-foreground-tertiary'
        : rank === 3
          ? 'text-warning'
          : 'text-on-surface-variant'

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
      )}
      data-mol-id="leaderboard-card"
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'font-headline')}>
          {t('leaderboardCard.title', {}, { defaultValue: 'Leaderboard' })}
        </h3>
        <span className={cm.cn('material-symbols-outlined text-outline')} data-icon="leaderboard">
          leaderboard
        </span>
      </div>
      {entries === null ? (
        <div
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="leaderboard-loading"
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : entries.length === 0 ? (
        <div
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-mol-id="leaderboard-empty"
        >
          {t(
            'leaderboardCard.empty',
            {},
            {
              defaultValue:
                'Complete a lesson to climb the board. Your progress will appear here once classmates start learning.',
            },
          )}
        </div>
      ) : (
        <div className={cm.stack(4)} data-mol-id="leaderboard-list">
          {entries.map((entry, i) => {
            const rank = i + 1
            const isMe = entry.userId === meId
            const display =
              entry.name || t('leaderboardCard.anonymous', {}, { defaultValue: 'Student' })
            return (
              <div
                key={entry.userId}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 4 }),
                  isMe ? 'bg-primary-container/10 -mx-6 px-6 py-3 border-l-4 border-primary' : '',
                )}
                data-mol-id={isMe ? 'leaderboard-me' : 'leaderboard-row'}
              >
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.w(4),
                    rankAccent(rank),
                  )}
                >
                  {rank}
                </div>
                <img
                  alt={display}
                  className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                  src={initialsAvatar(entry.userId || display)}
                />
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.textSize('sm'),
                    isMe ? cm.fontWeight('bold') : cm.fontWeight('semibold'),
                    isMe ? cm.textPrimary : '',
                  )}
                >
                  {isMe ? meName : display}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    isMe ? cm.textPrimary : 'text-on-surface-variant',
                  )}
                >
                  {t(
                    'leaderboardCard.lessonsCount',
                    { count: entry.completedLessons },
                    { defaultValue: '{{count}} lessons' },
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export { LeaderboardCard }
