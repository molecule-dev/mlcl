import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'

/** One row from `GET /api/leaderboard` (see api/handlers/leaderboard.ts). */
type Entry = { userId: string; rank: number; score: number; name: string }

/**
 * A ranked leaderboard built on the shared `<LeaderboardList>` + `<LeaderboardRow>`
 * from `@molecule/app-leaderboard-*-react` — do NOT rebuild the ranking UI.
 *
 * `<LeaderboardList>` is a container: it owns the chrome (title/empty state) and you
 * compose the rows as children. Pass `currentUserId` so the viewer's own row is
 * highlighted via `isMe`.
 */
export function Leaderboard({ currentUserId }: { currentUserId?: string }) {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    let cancelled = false
    void http.get<Entry[]>('/api/leaderboard').then((res) => {
      if (!cancelled) {
        setEntries(Array.isArray(res.data) ? res.data : [])
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <LeaderboardList
      title={t('leaderboard.title', undefined, { defaultValue: 'Leaderboard' })}
      emptyState={t('leaderboard.empty', undefined, { defaultValue: 'No scores yet.' })}
    >
      {entries.map((e) => (
        <LeaderboardRow
          key={e.userId}
          rank={e.rank}
          name={e.name}
          score={e.score}
          isMe={e.userId === currentUserId}
        />
      ))}
    </LeaderboardList>
  )
}
