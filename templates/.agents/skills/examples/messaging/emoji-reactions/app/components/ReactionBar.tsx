import { useCallback, useEffect, useRef, useState } from 'react'

import { type EmojiReaction, EmojiReactions } from '@molecule/app-emoji-reactions-react'
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

  // Only the newest summary request may write state: a `resourceId` change (or
  // a toggle's own resync) starts a new request while the previous one may
  // still be in flight, and the LATE response would otherwise win — showing
  // another resource's reaction summary under this one.
  const loadSeq = useRef(0)
  // The resource the CURRENT render belongs to. A toggle that started on
  // resource A must not resync into B's state when the user navigates while
  // the POST is in flight: the ticket only serializes against EARLIER
  // requests, so A's trailing resync would take the NEWEST ticket and
  // overwrite B's summary with A's.
  const mountedForRef = useRef({ resourceType, resourceId })
  mountedForRef.current = { resourceType, resourceId }

  const load = useCallback(async () => {
    const ticket = ++loadSeq.current
    const res = await http.get<ReactionSummary>(`/api/${resourceType}/${resourceId}/reactions`)
    if (ticket !== loadSeq.current) return // superseded by a newer request
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
    // A different resource's chips must never stand in for this one's: the list
    // is cleared UP FRONT (the load below refills it), exactly like the sibling
    // slices (CommentThread, ChatPage, RatingWidget). Without the reset, a load
    // for the new resource that fails left the PREVIOUS resource's counts — and
    // its "you reacted" chips — on screen as if they belonged to this one.
    setReactions([])
    void load().catch(() => {
      // A failed initial load keeps the empty chip list. The rejection must
      // not escape the effect as an unhandled promise rejection.
    })
    return () => {
      // Invalidate whatever this resource still has in flight.
      loadSeq.current++
    }
  }, [load])

  const toggle = async (emoji: string): Promise<void> => {
    const mine = reactions.find((r) => r.emoji === emoji)?.reactedByMe
    const base = `/api/${resourceType}/${resourceId}/reactions`
    try {
      // The server derives the reacting user from the SESSION. POST adds; DELETE with
      // `?type=` removes only that emoji (a body-less DELETE, so the type goes in the query).
      if (mine) {
        await http.delete(`${base}?type=${encodeURIComponent(emoji)}`)
      } else {
        await http.post(base, { type: emoji })
      }
    } catch (_error) {
      // A failed toggle (offline, 401) must not reject into the shared
      // component — its `onToggle` prop discards the returned promise, so an
      // escaping rejection is unhandled. Fall through to the reload below.
    }
    // The user navigated to another resource while the toggle was in flight:
    // the write landed on the resource we LEFT, and resyncing here would take
    // the newest ticket and overwrite the new resource's chips with the old
    // one's summary (see mountedForRef).
    if (mountedForRef.current.resourceType !== resourceType) return
    if (mountedForRef.current.resourceId !== resourceId) return
    // Resync from the server either way: chips reflect what actually landed
    // (a toggle that did land is not double-counted by a retry).
    await load().catch(() => {
      // The summary is unreachable too — chips keep their last synced state.
    })
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
