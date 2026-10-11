import { useCallback, useEffect, useRef, useState } from 'react'

import { type Comment, ThreadTree } from '@molecule/app-feature-thread-tree-react'
import { unwrapList } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

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
      createdAt: r.createdAt,
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
}) {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postError, setPostError] = useState(false)
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
    // walk against a row whose parentId points back up the tree.
    const seen = new Set(rows.map((row) => row.id))
    let frontier = rows.map((row) => row.id)
    while (frontier.length > 0) {
      const children = (
        await Promise.all(
          frontier.map(
            (parentId) =>
              http
                .get(`/api/comments/${parentId}/replies`)
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
    // thread, the reply target and any post failure are cleared UP FRONT (the
    // load below refills the thread), exactly like the sibling slices (ChatPage
    // clears its room-scoped sendError on a room change, NotificationBell,
    // AttachmentsPanel). Without the reset, a load for the new resource that
    // fails left the PREVIOUS resource's comments rendered as this one's —
    // `replyTo` still held a comment id belonging to that other resource, so the
    // next reply nested under a foreign id, and a failed post on the old
    // resource kept its "could not post" banner under the new one, describing a
    // post nobody attempted there. The draft is the user's own text and is kept,
    // like the chat composer's.
    setComments([])
    setReplyTo(null)
    setPostError(false)
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
    setPosting(true)
    try {
      // parentId nests the reply; null posts a top-level comment.
      await http.post(`/api/${resourceType}/${resourceId}/comments`, {
        body: draft,
        parentId: replyTo,
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
      setPosting(false)
    }
    // The user navigated to another resource while the POST was in flight: the
    // comment landed on the resource we LEFT, whose state this render no longer
    // owns — refetching here would take the newest ticket and overwrite the
    // new resource's thread with the old one's (see mountedForRef).
    if (!stillOnResource()) return
    setDraft('')
    setReplyTo(null)
    // Refetch so the new comment lands in the right place in the tree (the
    // load above now merges the replies pages the tree nests); a failed
    // refetch must not reject out of the click handler.
    await load().catch(() => {
      setPostError(true)
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
