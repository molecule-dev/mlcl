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
    const roots = unwrapList<CommentRow>(res)
    const replyPages = await Promise.all(
      roots.map(
        (root) =>
          http
            .get(`/api/comments/${root.id}/replies`)
            .then((r) => unwrapList<CommentRow>(r))
            .catch(() => [] as CommentRow[]), // one dead replies page → a flat thread, not a failed load
      ),
    )
    if (ticket !== loadSeq.current) return // superseded while the replies loaded
    setComments(buildTree([...roots, ...replyPages.flat()]))
  }, [http, resourceType, resourceId])

  useEffect(() => {
    // A different resource's thread must never stand in for this one's: the
    // thread and the reply target are cleared UP FRONT (the load below refills
    // them), exactly like the sibling slices (ChatPage, NotificationBell,
    // AttachmentsPanel). Without the reset, a load for the new resource that
    // fails left the PREVIOUS resource's comments rendered as this one's — and
    // `replyTo` still held a comment id belonging to that other resource, so the
    // next reply nested under a foreign id. The draft is the user's own text and
    // is kept, like the chat composer's.
    setComments([])
    setReplyTo(null)
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
    if (!draft.trim()) {
      return
    }
    setPostError(false)
    // On a failed post the draft is KEPT — clearing it before the server
    // accepted the comment would silently discard the user's text.
    try {
      // parentId nests the reply; null posts a top-level comment.
      await http.post(`/api/${resourceType}/${resourceId}/comments`, {
        body: draft,
        parentId: replyTo,
      })
    } catch (_error) {
      setPostError(true)
      return
    }
    // The user navigated to another resource while the POST was in flight: the
    // comment landed on the resource we LEFT, whose state this render no longer
    // owns — refetching here would take the newest ticket and overwrite the
    // new resource's thread with the old one's (see mountedForRef).
    if (mountedForRef.current.resourceType !== resourceType) return
    if (mountedForRef.current.resourceId !== resourceId) return
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
        disabled={!draft.trim()}
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
