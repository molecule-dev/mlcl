import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react'

import { type Comment, ThreadTree } from '@molecule/app-feature-thread-tree-react'
import { unwrapList } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * The most `GET /comments/:id/replies` requests ONE thread load may issue.
 *
 * The replies endpoint answers a node's DIRECT children — ONE page, for one
 * parent — so reaching the whole thread costs a request per NODE, not one per
 * page: the walk below has to ask every row it found for its own children. That
 * walk was unbounded, and so was the burst: a thread with N comments issued N
 * requests on mount, with a whole level fired at once, so a busy thread hammered
 * the API from every open tab (and re-did it on every refetch). The walk now
 * spends a fixed budget — the same order of magnitude the sibling slices put on
 * their live lists (the chat room's `MAX_RENDERED_MESSAGES` is 200) — and stops
 * when it runs out. A thread larger than the budget renders the rows it could
 * reach instead of hanging on the tail.
 *
 * The page the walk asks for is the resource's MAXIMUM (see REPLIES_PAGE_SIZE),
 * not the endpoint's default of 20: one request per node still returns ONE
 * page, so a node with more direct replies than that page holds has its tail
 * unrendered — the budget bounds the burst, and the page size is what keeps
 * that truncation off any thread a reader would notice.
 *
 * Exported so the regression suite pins the SAME number this walk spends
 * instead of a hand-copied mirror — a mirror cannot tell a deliberate budget
 * from one raised past the burst it exists to cap.
 */
export const MAX_REPLY_REQUESTS = 200

/**
 * How many direct replies ONE `GET /comments/:id/replies` request asks for.
 *
 * The endpoint's own default page is 20 and its cap is 500
 * (`MAX_LIST_LIMIT` in the comment resource's `handlers/replies.ts`). Asking
 * for the default is what made the walk treat a node's first twenty replies as
 * its COMPLETE children — the rest were never requested, so they never rendered
 * at ANY budget. The cap is the resource's, so the example asks for exactly it.
 */
const REPLIES_PAGE_SIZE = 500

/**
 * The FLAT comment row `@molecule/api-resource-comment` returns. Replies are
 * linked by `parentId` (null = top-level) — the API does NOT nest them.
 */
type CommentRow = {
  id: string
  userId: string
  parentId: string | null
  body: string
  createdAt: string
}

/**
 * Format the API's ISO `createdAt` for a reader.
 *
 * `ThreadTree` renders `createdAt` VERBATIM in a `<time>` element — its own type
 * doc states it ("an ISO string will be shown raw to users") — so passing the
 * raw column value put `2026-10-11T08:34:00.000Z` in every comment header. The
 * formatter is `Intl` (locale-aware, no dependency, no per-language keys); a
 * value the runtime cannot parse is passed through unchanged rather than
 * rendered as "Invalid Date".
 *
 * @param value - The raw `createdAt` string from the API.
 * @returns A display string for the comment header.
 */
function formatCommentTime(value: string): string {
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(at)
}

/**
 * Nest the flat rows (linked by `parentId`) into ThreadTree's `children` tree.
 * This is the step to get right — the API returns flat rows; `<ThreadTree>`
 * wants a tree. One pass to index by id, one pass to attach each node to its
 * parent (or the roots).
 */
function buildTree(rows: CommentRow[]): Comment[] {
  const nodes = new Map<string, Comment>()
  for (const r of rows) {
    // author is the raw userId here — resolve it to a display name/avatar in a real app.
    nodes.set(r.id, {
      id: r.id,
      author: r.userId,
      body: r.body,
      createdAt: formatCommentTime(r.createdAt),
      children: [],
    })
  }
  const roots: Comment[] = []
  for (const r of rows) {
    const node = nodes.get(r.id)!
    const parent = r.parentId ? nodes.get(r.parentId) : undefined
    if (parent) parent.children!.push(node)
    else roots.push(node)
  }
  return roots
}

/**
 * A threaded comment section for any resource (a post, project, page…), built on
 * the shared `<ThreadTree>` from `@molecule/app-feature-thread-tree-react` and
 * the `@molecule/api-resource-comment` backend — do NOT rebuild either.
 */
export function CommentThread({
  resourceType,
  resourceId,
}: {
  resourceType: string
  resourceId: string
}): ReactElement {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postError, setPostError] = useState(false)
  /**
   * The refetch that follows a SUCCESSFUL post failed.
   *
   * Distinct from `postError` on purpose: the comment IS stored server-side, and
   * telling the reader the post failed sent them back to retype it (a duplicate —
   * the resource has no idempotency key). This says what actually happened: the
   * comment was posted, the thread could not be re-read.
   */
  const [refreshFailed, setRefreshFailed] = useState(false)
  // A comment write in flight — see `post`. One flag for the whole composer:
  // there is a single Post/Reply button, so only one write can be pending.
  const [posting, setPosting] = useState(false)

  // Every in-flight list request takes a ticket; only the newest may write
  // state. Two overlap whenever `resourceId`/`resourceType` changes while the
  // component stays mounted (navigate post A → post B) or a post-triggered
  // refetch runs alongside the effect's load — and the LATE response would
  // otherwise win, rendering post A's comments under post B (and letting the
  // reader reply to a comment id that belongs to A).
  const loadSeq = useRef(0)
  // The resource the CURRENT render belongs to. A post/toggle flow that started
  // on resource A must not refetch into the state of resource B when the user
  // navigates while the POST is in flight: the ticket below only serializes
  // against EARLIER requests, so A's trailing refetch would take the NEWEST
  // ticket and overwrite B's thread with A's.
  const mountedForRef = useRef({ resourceType, resourceId })
  mountedForRef.current = { resourceType, resourceId }
  // The composer's write ticket. `posting` is ONE flag for the whole composer,
  // but this component outlives a resource change: a POST parked on resource A
  // must not hold B's composer disabled, and when it finally settles it must not
  // release a write B started meanwhile. The reset below bumps the ticket and
  // clears the flag; a settling write only clears the flag while its own ticket
  // is still the newest (the same monotonic-release `ChatPage`'s `sendTicket`
  // uses for its composer).
  const postTicket = useRef(0)

  /**
   * Whether the CURRENT render still belongs to the resource a write started
   * on — the guard every state update a post-write flow makes goes through.
   */
  const stillOnResource = (): boolean =>
    mountedForRef.current.resourceType === resourceType &&
    mountedForRef.current.resourceId === resourceId

  const load = useCallback(async () => {
    const ticket = ++loadSeq.current
    // The list endpoint returns a RICH pagination envelope { data, total, limit, offset }.
    // Pass the whole HttpResponse to unwrapList — it normalizes a bare array, a { data }
    // envelope, AND this pagination shape → the flat CommentRow[]. (total/limit/offset are
    // there for wiring "load more" later; read res.data.total if you need them.)
    const res = await http.get(`/api/${resourceType}/${resourceId}/comments`)
    if (ticket !== loadSeq.current) return // superseded by a newer request
    // The list endpoint returns TOP-LEVEL comments ONLY (the resource filters
    // `parentId IS NULL`; replies live behind
    // `GET /comments/:commentId/replies`). Without fetching them, the nesting
    // pass below had nothing to nest — the tree always rendered flat, and a
    // reply posted here vanished on the refetch that should have shown it.
    const rows: CommentRow[] = [...unwrapList<CommentRow>(res)]
    // …and the replies are fetched per PARENT, so the walk has to continue into
    // what it finds: `GET /comments/:id/replies` answers a node's DIRECT
    // children only (the resource filters `parentId = :id`, one page), and the
    // UI lets the reader reply to ANY row (`ThreadTree`'s onReply). A pass that
    // asked only the roots never requested a reply's own replies, so a reply to
    // a reply stayed missing from the tree until a reload — the same "it
    // vanished on the refetch" symptom the roots' pages were added for.
    //
    // Breadth-first, one parallel round per LEVEL: the roots' children first
    // (in root order, the request order this loader has always issued), then
    // their children, until a level brings back nothing new. `seen` bounds the
    // walk against a row whose parentId points back up the tree; `budget` bounds
    // it against the thread itself — every node in a level is one request, so
    // without a budget the mount-time load fanned out to the whole thread (see
    // MAX_REPLY_REQUESTS). A level larger than what is left is asked for only in
    // part; the walk then stops and the tree renders the rows it reached.
    const seen = new Set(rows.map((row) => row.id))
    let frontier = rows.map((row) => row.id)
    let budget = MAX_REPLY_REQUESTS
    while (frontier.length > 0 && budget > 0) {
      const batch = frontier.slice(0, budget)
      budget -= batch.length
      const children = (
        await Promise.all(
          batch.map(
            (parentId) =>
              http
                .get(`/api/comments/${parentId}/replies?limit=${REPLIES_PAGE_SIZE}`)
                .then((r) => unwrapList<CommentRow>(r))
                .catch(() => [] as CommentRow[]), // one dead replies page → a flat thread, not a failed load
          ),
        )
      )
        .flat()
        .filter((child) => !seen.has(child.id))
      if (ticket !== loadSeq.current) return // superseded while the replies loaded
      if (children.length === 0) break
      for (const child of children) seen.add(child.id)
      rows.push(...children)
      frontier = children.map((child) => child.id)
    }
    setComments(buildTree(rows))
  }, [http, resourceType, resourceId])

  useEffect(() => {
    // A different resource's thread must never stand in for this one's: the
    // thread, the reply target, any post failure AND the composer's in-flight
    // flag are cleared UP FRONT (the load below refills the thread), exactly
    // like the sibling slices (ChatPage clears its room-scoped sendError and its
    // send flag on a room change, NotificationBell, AttachmentsPanel). Without
    // the reset, a load for the new resource that fails left the PREVIOUS
    // resource's comments rendered as this one's —
    // `replyTo` still held a comment id belonging to that other resource, so the
    // next reply nested under a foreign id, and a failed post on the old
    // resource kept its "could not post" banner under the new one, describing a
    // post nobody attempted there. The draft is the user's own text and is kept,
    // like the chat composer's.
    setComments([])
    setReplyTo(null)
    setPostError(false)
    setRefreshFailed(false)
    // …and the composer's in-flight flag, which is the one piece of state a
    // parked POST from the resource we left still owns: left set, it froze the
    // NEW resource's composer (the button is `disabled={… || posting}` and
    // `post` returns early) for as long as A's request stayed outstanding, with
    // nothing on screen explaining why. Bumping the ticket makes that write's
    // `finally` a no-op, so it cannot release a post started here.
    postTicket.current += 1
    setPosting(false)
    void load().catch(() => {
      // A failed load (offline, 401, 500) keeps the empty thread; the composer
      // still works. The rejection must not escape the effect unhandled.
    })
    return () => {
      // Invalidate whatever this resource still has in flight.
      loadSeq.current++
    }
  }, [load])

  const post = async (): Promise<void> => {
    // `posting` is what makes a repeated click idempotent. The draft is only
    // cleared AFTER the server accepts it (on a failed post the text is KEPT —
    // clearing it first would silently discard the user's words), so without
    // this flag a second click while the first POST was parked fired the same
    // request again and created two identical comments; the comments resource
    // has no idempotency key to collapse them. Every sibling slice that writes
    // carries the same guard (ChatPage's composer, AttachmentsPanel's uploader,
    // ImportPage's commit). The `finally` releases it on EVERY path — including
    // the abandoned-post returns below — so it can never stick.
    if (!draft.trim() || posting) {
      return
    }
    setPostError(false)
    setRefreshFailed(false)
    setPosting(true)
    // This write's ticket — the reset above invalidates it on a resource
    // change, so its `finally` cannot clear a newer resource's flag.
    const ticket = ++postTicket.current
    try {
      // parentId nests the reply; a TOP-LEVEL comment must OMIT the key
      // entirely, not send `parentId: null`.
      //
      // The resource's `createCommentSchema` declares it
      // `z.string().uuid().optional()` (molecule's
      // packages/api/resources/comment/src/validation.ts), and `.optional()`
      // accepts a MISSING key but not a JSON `null` — zod answers "expected
      // string, received null", the create handler 400s, and NO top-level
      // comment could ever be posted (only replies, whose uuid passes). A
      // conditional spread is what removes the key: `JSON.stringify` drops
      // `undefined`, so the body is `{ body }` unless the user is replying.
      await http.post(`/api/${resourceType}/${resourceId}/comments`, {
        body: draft,
        ...(replyTo ? { parentId: replyTo } : {}),
      })
    } catch (_error) {
      // The failure belongs to the resource the post was sent to. The user can
      // navigate while the POST is in flight, and this render then owns a thread
      // whose state was just reset: recording the old resource's failure here
      // painted "could not post" under a resource where nothing was posted (the
      // same ownership rule the success path below applies).
      if (stillOnResource()) setPostError(true)
      return
    } finally {
      if (postTicket.current === ticket) setPosting(false)
    }
    // The user navigated to another resource while the POST was in flight: the
    // comment landed on the resource we LEFT, whose state this render no longer
    // owns — refetching here would take the newest ticket and overwrite the
    // new resource's thread with the old one's (see mountedForRef).
    if (!stillOnResource()) return
    // Clear only what was SENT. `stillOnResource` compares NAMES, so a reader
    // who went p1 → p2 → p1 while the POST was parked passes it — and may have
    // typed a new draft (kept across the resource change) or picked a new reply
    // target since. Wiping those discarded work the successful post had no claim
    // on (the same rule ChatPage's composer applies to its own draft); the
    // refetch below is still correct — it reads the thread this render owns.
    setDraft((current) => (current === draft ? '' : current))
    setReplyTo((current) => (current === replyTo ? null : current))
    // Refetch so the new comment lands in the right place in the tree (the
    // load above now merges the replies pages the tree nests); a failed
    // refetch must not reject out of the click handler.
    //
    // The refetch belongs to the SAME post-write flow, so its failure obeys the
    // same ownership rule as every other state update here (see mountedForRef):
    // the reader can navigate while it is in flight, and this render then owns
    // another resource's thread — the old resource's failure banner there
    // describes a post nobody attempted on it.
    //
    // It does NOT reuse `postError`: the write this follows ALREADY LANDED, and
    // reporting it as "Could not post the comment — try again." told the reader
    // their comment was lost (it is not in the rendered tree, because a failed
    // load never calls setComments) — so they retype it and post again, and the
    // resource has no idempotency key to collapse the duplicate. A refresh
    // failure says exactly that instead.
    await load().catch(() => {
      if (stillOnResource()) setRefreshFailed(true)
    })
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
      <ThreadTree comments={comments} onReply={(id) => setReplyTo(id)} />
      <textarea
        data-mol-id="comment-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={
          replyTo
            ? t('comments.replyPlaceholder', undefined, { defaultValue: 'Write a reply…' })
            : t('comments.placeholder', undefined, { defaultValue: 'Add a comment…' })
        }
        className={cm.textarea({})}
      />
      {postError ? (
        <p className={cm.textError}>
          {t('comments.postFailed', undefined, {
            defaultValue: 'Could not post the comment — try again.',
          })}
        </p>
      ) : null}
      {refreshFailed ? (
        <p className={cm.textError}>
          {t('comments.refreshFailed', undefined, {
            defaultValue:
              'Your comment was posted, but the thread could not be re-read — reload to see it.',
          })}
        </p>
      ) : null}
      <button
        type="button"
        data-mol-id="post-comment"
        disabled={!draft.trim() || posting}
        onClick={post}
        className={cm.button({ variant: 'solid' })}
      >
        {replyTo
          ? t('comments.reply', undefined, { defaultValue: 'Reply' })
          : t('comments.post', undefined, { defaultValue: 'Post' })}
      </button>
    </div>
  )
}
