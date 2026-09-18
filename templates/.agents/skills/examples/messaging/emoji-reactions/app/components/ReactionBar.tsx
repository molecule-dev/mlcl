import { useCallback, useEffect, useState } from 'react'

import { EmojiReactions, type EmojiReaction } from '@molecule/app-emoji-reactions-react'
import { useHttpClient } from '@molecule/app-react'

/**
 * The SUMMARY `@molecule/api-resource-reaction` returns — NOT the chip list the
 * component wants. `counts` is per-emoji totals; `userReactions` are the emoji the
 * current viewer reacted with.
 */
type ReactionSummary = { total: number; counts: Record<string, number>; userReactions: string[] }

const QUICK_PICKS = ['👍', '❤️', '😂', '🎉', '😮', '😢']

/**
 * Emoji reactions on any resource, built on `<EmojiReactions>` from
 * `@molecule/app-emoji-reactions-react` + the `@molecule/api-resource-reaction`
 * backend — do NOT rebuild either.
 *
 * The API returns a SUMMARY; `<EmojiReactions>` wants a `reactions` chip list —
 * map `counts` → `EmojiReaction[]` and derive `reactedByMe` from `userReactions`.
 * The reaction "type" is the emoji string here.
 */
export function ReactionBar({
  resourceType,
  resourceId,
}: {
  resourceType: string
  resourceId: string
}) {
  const http = useHttpClient()
  const [reactions, setReactions] = useState<EmojiReaction[]>([])

  const load = useCallback(async () => {
    const res = await http.get<ReactionSummary>(`/api/${resourceType}/${resourceId}/reactions`)
    const { counts, userReactions } = res.data
    setReactions(
      Object.entries(counts).map(([emoji, count]) => ({
        emoji,
        count,
        reactedByMe: userReactions.includes(emoji),
      })),
    )
  }, [http, resourceType, resourceId])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (emoji: string): Promise<void> => {
    const mine = reactions.find((r) => r.emoji === emoji)?.reactedByMe
    const base = `/api/${resourceType}/${resourceId}/reactions`
    // The server derives the reacting user from the SESSION. POST adds; DELETE with
    // `?type=` removes only that emoji (a body-less DELETE, so the type goes in the query).
    if (mine) {
      await http.delete(`${base}?type=${encodeURIComponent(emoji)}`)
    } else {
      await http.post(base, { type: emoji })
    }
    await load()
  }

  return (
    <EmojiReactions
      reactions={reactions}
      quickPicks={QUICK_PICKS}
      onToggle={toggle}
      onAdd={toggle}
    />
  )
}
