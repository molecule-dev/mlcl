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
 * This is the step to get right — the API returns a flat list; `<ThreadTree>`
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

  const load = useCallback(async () => {
    const ticket = ++loadSeq.current
    // The list endpoint returns a RICH pagination envelope { data, total, limit, offset }.
    // Pass the whole HttpResponse to unwrapList — it normalizes a bare array, a { data }
    // envelope, AND this pagination shape → the flat CommentRow[]. (total/limit/offset are
    // there for wiring "load more" later; read res.data.total if you need them.)
    const res = await http.get(`/api/${resourceType}/${resourceId}/comments`)
    if (ticket !== loadSeq.current) return // superseded by a newer request
    setComments(buildTree(unwrapList<CommentRow>(res)))
  }, [http, resourceType, resourceId])

  useEffect(() => {
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
    setDraft('')
    setReplyTo(null)
    // Refetch so the new comment lands in the right place in the tree; a
    // failed refetch must not reject out of the click handler.
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
