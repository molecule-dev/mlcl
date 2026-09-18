import { useCallback, useEffect, useState } from 'react'

import { ThreadTree, type Comment } from '@molecule/app-feature-thread-tree-react'
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

  const load = useCallback(async () => {
    // The list endpoint returns a RICH pagination envelope { data, total, limit, offset }.
    // Pass the whole HttpResponse to unwrapList — it normalizes a bare array, a { data }
    // envelope, AND this pagination shape → the flat CommentRow[]. (total/limit/offset are
    // there for wiring "load more" later; read res.data.total if you need them.)
    const res = await http.get(`/api/${resourceType}/${resourceId}/comments`)
    setComments(buildTree(unwrapList<CommentRow>(res)))
  }, [http, resourceType, resourceId])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (): Promise<void> => {
    if (!draft.trim()) {
      return
    }
    // parentId nests the reply; null posts a top-level comment.
    await http.post(`/api/${resourceType}/${resourceId}/comments`, {
      body: draft,
      parentId: replyTo,
    })
    setDraft('')
    setReplyTo(null)
    await load() // refetch so the new comment lands in the right place in the tree
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
