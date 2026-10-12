import { useCallback, useEffect, useRef, useState } from 'react'

import { type EmojiReaction, EmojiReactions } from '@molecule/app-emoji-reactions-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * The SUMMARY `@molecule/api-resource-reaction` returns — NOT the chip list the
 * component wants. `counts` is per-emoji totals; `userReactions` are the emoji the
 * current viewer reacted with.
 */
type ReactionSummary = { total: number; counts: Record<string, number>; userReactions: string[] }

/**
 * Whether a 2xx body is the summary the component reads. Destructuring an
 * unvalidated body threw `Object.entries(undefined)` inside the load — and both
 * call sites swallow that rejection, so a proxy rewrite (or the mock server's
 * unmatched-fixture `{}`) rendered ZERO chips plus the picker: "nobody reacted"
 * over a summary that never arrived. The two fields the chip mapping reads are
 * what the gate covers.
 */
const isReactionSummary = (body: unknown): body is ReactionSummary =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as ReactionSummary).counts === 'object' &&
  (body as ReactionSummary).counts !== null &&
  Array.isArray((body as ReactionSummary).userReactions)

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
  const { t } = useTranslation()
  const http = useHttpClient()
  const [reactions, setReactions] = useState<EmojiReaction[]>([])
  /**
   * Whether the newest load FAILED or answered a body that is not the summary.
   * Without it the failure kept the empty chip list — indistinguishable from
   * "nobody reacted" — and the catch below never said so. Only shown when
   * there is no synced summary to keep: a failed REFRESH must not erase the
   * chips that are on screen (the rule the sibling slices' failure flags
   * follow).
   */
  const [loadFailed, setLoadFailed] = useState(false)

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
  // The emoji whose toggle is in flight. The add-vs-remove decision is read
  // from the last SYNCED summary, which only updates after this toggle's own
  // resync (below) — so a second click on the same chip before then reads the
  // same `reactedByMe` and fires the SAME write again: two adds for one click
  // (a chip reading "👍2" from a single user gesture), or two removes. The
  // shared `<EmojiReactions>` types `onToggle` as returning void and calls it
  // from a bare onClick, so it cannot know a write is pending — this is the
  // only place the guard can live. A Set (not one flag) so a different emoji
  // stays independently clickable.
  const togglingRef = useRef<Set<string>>(new Set())
  // The slot key for a write THIS render would start: the resource it belongs to
  // plus the emoji. A bare emoji key was resource-blind — this component
  // outlives a `resourceId` change (navigate post A → post B), so A's parked
  // toggle kept the slot for the same emoji on B, swallowing the click there
  // with no POST and no feedback until A's request settled; and when it settled
  // its `finally` released whatever slot that emoji held at the time, including
  // one B had taken meanwhile. Scoping the key to the resource makes the guard
  // exactly as wide as the write it guards: B's chips are live immediately, and
  // A's `finally` can only ever delete A's own slot.
  const writeKey = (emoji: string): string => `${resourceType}/${resourceId}::${emoji}`

  const load = useCallback(async () => {
    const ticket = ++loadSeq.current
    try {
      const res = await http.get<ReactionSummary>(`/api/${resourceType}/${resourceId}/reactions`)
      if (ticket !== loadSeq.current) return // superseded by a newer request
      // A 2xx proves the route ANSWERED, not that the body is the summary. The
      // gate above is what makes "not the summary" a FAILED load rather than a
      // TypeError the old catch swallowed.
      if (!isReactionSummary(res.data)) {
        setLoadFailed(true)
        return
      }
      setLoadFailed(false)
      setReactions(
        Object.entries(res.data.counts).map(([emoji, count]) => ({
          emoji,
          count,
          reactedByMe: res.data.userReactions.includes(emoji),
        })),
      )
    } catch (_error) {
      // A failed load is DISCLOSED, not an empty chip list: the flag is what
      // the reader sees instead of "nobody reacted". Only a request that is
      // still the newest may report it — a superseded failure must not clobber
      // the newer request's answer — and it never erases chips that are on
      // screen (a failed refresh keeps the last synced summary).
      if (ticket === loadSeq.current) setLoadFailed(true)
    }
  }, [http, resourceType, resourceId])

  useEffect(() => {
    // A different resource's chips must never stand in for this one's: the list
    // is cleared UP FRONT (the load below refills it), exactly like the sibling
    // slices (CommentThread, ChatPage, RatingWidget). Without the reset, a load
    // for the new resource that fails left the PREVIOUS resource's counts — and
    // its "you reacted" chips — on screen as if they belonged to this one.
    setReactions([])
    setLoadFailed(false)
    // `load` never rejects (its own catch reports the failure), so the
    // fire-and-forget call has no rejection to escape the effect.
    void load()
    return () => {
      // Invalidate whatever this resource still has in flight.
      loadSeq.current++
    }
  }, [load])

  const toggle = async (emoji: string): Promise<void> => {
    // One toggle per emoji at a time — see togglingRef. The `finally` releases
    // the slot on EVERY path (a failed write, an abandoned toggle), so a chip
    // can never be left permanently unclickable.
    if (togglingRef.current.has(writeKey(emoji))) return
    togglingRef.current.add(writeKey(emoji))
    try {
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
      // (a toggle that did land is not double-counted by a retry). `load`
      // handles its own failure disclosure; a failed resync keeps the chips.
      await load()
    } finally {
      togglingRef.current.delete(writeKey(emoji))
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
      <EmojiReactions
        reactions={reactions}
        quickPicks={QUICK_PICKS}
        onToggle={toggle}
        onAdd={toggle}
      />
      {loadFailed && reactions.length === 0 ? (
        <span className={cm.textError} data-mol-id="reactions-load-failed">
          {t('reactions.loadFailed', undefined, {
            defaultValue: 'Could not load the reactions — refresh to try again.',
          })}
        </span>
      ) : null}
    </div>
  )
}
