import { useEffect, useState } from 'react'

import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

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
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)
    void http
      .get<Entry[]>('/api/leaderboard')
      .then((res) => {
        if (cancelled) return
        // A 2xx proves the route ANSWERED, not that the body is the list — the
        // same gate BlogIndexPage puts on `GET /api/posts`. Coerced to `[]`, a
        // non-list body (a proxy rewrite, an endpoint with no fixture) rendered
        // the empty state: "No scores yet." over a board whose rows simply did
        // not arrive. So a body that is not the list is a FAILED load, and an
        // EMPTY list stays a legitimately empty board.
        if (!Array.isArray(res.data)) {
          setLoadFailed(true)
          return
        }
        setEntries(res.data)
      })
      .catch(() => {
        // A failed load (offline, 500) must be VISIBLE, not empty: leaving the
        // list at `[]` handed the reader the shared component's empty state —
        // "No scores yet." — a wrong answer that reads as an authoritative,
        // genuinely-empty leaderboard and is indistinguishable from one. Same
        // rule the sibling slices state at their own catches (BlogIndexPage,
        // SettingsPage, DeleteAccountPage). The rejection itself must not escape
        // the effect as an unhandled promise rejection.
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  if (loadFailed) {
    return (
      <p className={cm.textError}>
        {t('leaderboard.loadFailed', undefined, {
          defaultValue: 'Could not load the leaderboard — refresh to try again.',
        })}
      </p>
    )
  }

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
