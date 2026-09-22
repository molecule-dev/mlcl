/**
 * ThreadView — /thread/:id single thread with nested comments.
 *
 * Layout: page heading row → main thread card (vote rail + body) → reply
 * composer → comment tree with depth-cycling left border colors.
 *
 * Reads `GET /api/threads/:id` (returns thread + replies) on mount.
 * Reply submit → `POST /api/threads/:id/replies`. Vote click →
 * `POST /api/votes` (target_type=thread|reply). After every write the
 * thread is re-fetched so the UI shows the post-write state, never the
 * optimistic-only score.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CommunitySidebar } from '../components/CommunitySidebar.js'
import { ReputationBadge } from '../components/ReputationBadge.js'
import { VoteColumn, type VoteState } from '../components/VoteColumn.js'

interface ApiAuthorRef {
  id: string
  username: string | null
  name: string | null
  role?: string
  reputation?: number
  avatar_url?: string | null
}

interface ApiReply {
  id: string
  thread_id: string
  parent_reply_id: string | null
  body: string
  body_markdown?: string | null
  author_id: string
  author?: ApiAuthorRef | null
  vote_score: number
  created_at: string
}

interface ApiThread {
  id: string
  slug: string | null
  title: string
  body: string | null
  body_markdown: string | null
  category_id: string
  author_id: string
  author?: ApiAuthorRef | null
  vote_score: number
  reply_count: number
  view_count: number
  is_pinned: boolean
  is_locked: boolean
  status: string
  created_at: string
  replies?: ApiReply[]
}

interface ApiCategory {
  id: string
  slug: string
  name: string
  description?: string
  color?: string | null
  icon?: string | null
  subscriber_count?: number | null
}

const NESTING_COLORS = [
  'var(--color-pinned)',
  'var(--color-upvote)',
  'var(--color-downvote)',
  'var(--color-karma)',
  'var(--color-hot)',
]

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - d) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86_400)}d`
}

interface CommentTreeNode {
  reply: ApiReply
  children: CommentTreeNode[]
}

function buildTree(replies: ApiReply[]): CommentTreeNode[] {
  const map = new Map<string, CommentTreeNode>()
  const roots: CommentTreeNode[] = []
  for (const r of replies) map.set(r.id, { reply: r, children: [] })
  for (const r of replies) {
    const node = map.get(r.id)!
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function ReplyItem({
  node,
  depth,
  onVote,
  onReply,
}: {
  node: CommentTreeNode
  depth: number
  onVote: (replyId: string, next: VoteState) => Promise<void>
  onReply: (parentReplyId: string, body: string) => Promise<void>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const accent = NESTING_COLORS[depth % NESTING_COLORS.length]
  const childCount = node.children.length
  const reply = node.reply

  if (collapsed) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('py', 2),
          cm.sp('pl', 3),
          cm.textSize('xs'),
          'border-l-2 text-on-surface-variant',
        )}
        style={{ borderColor: accent }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={t('threadView.expand', {}, { defaultValue: 'Expand thread' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'min-w-[28px] min-h-[28px] rounded-full border border-outline-variant/40 font-bold text-[10px] text-on-surface-variant',
          )}
        >
          {t('threadView.expandToggle', {}, { defaultValue: '+' })}
        </button>
        <span aria-hidden="true">·</span>
        <span>
          {t(
            'threadView.collapsedSummary',
            { score: reply.vote_score, replies: childCount },
            { defaultValue: '{{score}} pts · {{replies}} replies' },
          )}
        </span>
      </div>
    )
  }

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      await onReply(reply.id, replyText.trim())
      setReplyText('')
      setShowReplyForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('py', 3),
        cm.sp('pl', 3),
        'border-l-2',
      )}
      style={{ borderColor: accent }}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'flex-wrap text-on-surface-variant',
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t('threadView.collapse', {}, { defaultValue: 'Collapse' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'min-w-[28px] min-h-[28px] rounded text-[10px] text-on-surface-variant hover:bg-surface-container-low/60',
          )}
        >
          {t('threadView.collapseToggle', {}, { defaultValue: '[–]' })}
        </button>
        <Link
          to={`/u/${reply.author?.username ?? reply.author_id}`}
          className={cm.cn(cm.fontWeight('semibold'), 'inline-block py-1.5 -my-1.5 text-primary')}
        >
          {t('threadView.userPrefix', {}, { defaultValue: 'u/' })}
          {reply.author?.username ?? reply.author?.name ?? reply.author_id.slice(0, 8)}
        </Link>
        <VoteColumn
          score={reply.vote_score}
          state={null}
          compact
          onVote={(next) => {
            void onVote(reply.id, next)
          }}
        />
        <span aria-hidden="true">·</span>
        <span>{timeAgo(reply.created_at)}</span>
      </header>
      <p
        className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface whitespace-pre-line')}
        style={{ fontFamily: 'var(--font-family-serif)' }}
      >
        {reply.body}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            'rounded transition-colors hover:text-primary items-center gap-1',
          )}
          onClick={() => setShowReplyForm((s) => !s)}
          aria-expanded={showReplyForm}
        >
          <span className={cm.cn('material-symbols-outlined text-sm')}>reply</span>
          {t('common.reply', {}, { defaultValue: 'Reply' })}
        </button>
      </div>
      {showReplyForm && (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 2))}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t(
              'threadView.replyToCommentPlaceholder',
              {},
              { defaultValue: 'Reply to this comment…' },
            )}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'w-full min-h-[80px] rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
          />
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => {
                setShowReplyForm(false)
                setReplyText('')
              }}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                cm.sp('px', 3),
                cm.sp('py', 1),
                'text-on-surface-variant',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              disabled={!replyText.trim() || submitting}
              onClick={() => {
                void handleSubmitReply()
              }}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                cm.sp('px', 4),
                cm.sp('py', 1),
                'rounded-full bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {t('threadView.replySubmitNested', {}, { defaultValue: 'Post reply' })}
            </button>
          </div>
        </div>
      )}
      {node.children.length > 0 && (
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mt', 2), 'pl-2')}>
          {node.children.map((child) => (
            <ReplyItem
              key={child.reply.id}
              node={child}
              depth={depth + 1}
              onVote={onVote}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </article>
  )
}

export function ThreadView() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const threadId = params.id ?? ''
  const { user: authUser } = useAuth<{ id?: string; role?: string }>()
  const isMod = authUser?.role === 'moderator' || authUser?.role === 'admin'

  const [thread, setThread] = useState<ApiThread | null>(null)
  const [category, setCategory] = useState<ApiCategory | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [voteState, setVoteState] = useState<VoteState>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Moderation actions (pin/lock) — moderator/admin only.
  const [modBusy, setModBusy] = useState<'pin' | 'lock' | null>(null)
  const [modError, setModError] = useState<string | null>(null)

  // Member report flow — inline panel on the thread card.
  const REPORT_REASONS = ['spam', 'harassment', 'off-topic', 'misinformation', 'other'] as const
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportState, setReportState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [reportError, setReportError] = useState<string | null>(null)

  const fetchThread = useCallback(async () => {
    if (!threadId) return
    const http = getHttpClient()
    try {
      const resp = await http.get<ApiThread>(`/api/threads/${threadId}`)
      const loaded = resp?.data ?? null
      setThread(loaded)
      if (loaded?.category_id) {
        try {
          const cat = await http.get<ApiCategory>(`/api/categories/${loaded.category_id}`)
          setCategory(cat?.data ?? null)
        } catch (_error) {
          // category sidebar is optional; thread renders fine without it
        }
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('threadView.loadFailed', {}, { defaultValue: 'Failed to load thread.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [threadId, t])

  useEffect(() => {
    void fetchThread()
  }, [fetchThread])

  const handleVote = async (next: VoteState) => {
    if (!thread) return
    if (next === null) {
      // toggle off — call API with current direction if known
      if (!voteState) return
      const http = getHttpClient()
      await http.post('/api/votes', {
        target_type: 'thread',
        target_id: thread.id,
        direction: voteState,
      })
      setVoteState(null)
      await fetchThread()
      return
    }
    const http = getHttpClient()
    await http.post('/api/votes', { target_type: 'thread', target_id: thread.id, direction: next })
    setVoteState(next)
    await fetchThread()
  }

  const handleReplyVote = async (replyId: string, next: VoteState) => {
    if (next === null) return
    const http = getHttpClient()
    await http.post('/api/votes', { target_type: 'reply', target_id: replyId, direction: next })
    await fetchThread()
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!thread || !replyBody.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const http = getHttpClient()
      await http.post(`/api/threads/${thread.id}/replies`, {
        body: replyBody.trim(),
        parent_reply_id: null,
      })
      void track({
        name: 'post.reply',
        properties: { thread_id: thread.id, parent_reply_id: null },
      })
      setReplyBody('')
      await fetchThread()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('threadView.replyFailed', {}, { defaultValue: 'Failed to post reply.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleNestedReply = async (parentReplyId: string, body: string) => {
    if (!thread) return
    const http = getHttpClient()
    await http.post(`/api/threads/${thread.id}/replies`, {
      body,
      parent_reply_id: parentReplyId,
    })
    void track({
      name: 'post.reply',
      properties: { thread_id: thread.id, parent_reply_id: parentReplyId },
    })
    await fetchThread()
  }

  /** Moderator toggle for is_pinned / is_locked. */
  const handleModAction = async (action: 'pin' | 'lock') => {
    if (!thread || modBusy) return
    setModBusy(action)
    setModError(null)
    try {
      const http = getHttpClient()
      const res = await http.post<ApiThread>(`/api/moderation/threads/${thread.id}/${action}`, {})
      if (res?.data?.id) {
        setThread((prev) =>
          prev
            ? {
                ...prev,
                is_pinned: res.data.is_pinned ?? prev.is_pinned,
                is_locked: res.data.is_locked ?? prev.is_locked,
              }
            : prev,
        )
        void track({
          name: action === 'pin' ? 'topic.pinned' : 'topic.locked',
          properties: {
            thread_id: thread.id,
            status: (action === 'pin' ? res.data.is_pinned : res.data.is_locked) ?? false,
          },
        })
      } else {
        setModError(
          t('threadView.modActionFailed', {}, { defaultValue: 'Moderator action failed.' }),
        )
      }
    } catch (_error) {
      // 403 for non-mods or network failure — same user-facing message.
      setModError(t('threadView.modActionFailed', {}, { defaultValue: 'Moderator action failed.' }))
    } finally {
      setModBusy(null)
    }
  }

  /** Member-facing report submission against this thread. */
  const handleReport = async () => {
    if (!thread || reportState === 'submitting') return
    setReportState('submitting')
    setReportError(null)
    try {
      const http = getHttpClient()
      const res = await http.post<{ id?: string; error?: string }>('/api/moderation/reports', {
        target_type: 'thread',
        target_id: thread.id,
        reason: reportReason,
        description: reportDetails.trim(),
      })
      if (res?.data?.error) {
        setReportError(res.data.error)
        setReportState('error')
        return
      }
      void track({
        name: 'report.created',
        properties: { thread_id: thread.id, reason: reportReason },
      })
      setReportState('sent')
      setReportOpen(false)
      setReportDetails('')
    } catch (e) {
      setReportError(
        e instanceof Error
          ? e.message
          : t('threadView.reportFailed', {}, { defaultValue: 'Could not send the report.' }),
      )
      setReportState('error')
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
        {t('threadView.loading', {}, { defaultValue: 'Loading thread…' })}
      </div>
    )
  }

  if (!thread) {
    return (
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('p', 8), cm.textCenter)}
      >
        <p className={cm.cn('text-on-surface-variant')}>
          {error || t('threadView.notFound', {}, { defaultValue: 'Thread not found.' })}
        </p>
        <Link
          to="/feed"
          className={cm.cn(
            'inline-block px-3 py-2 rounded-lg bg-primary-container/20 text-primary font-semibold',
          )}
        >
          {t('threadView.backToFeed', {}, { defaultValue: 'Back to feed' })}
        </Link>
      </div>
    )
  }

  const replies = thread.replies ?? []
  const tree = buildTree(replies)
  const categoryName = category?.name ?? category?.slug ?? thread.category_id.slice(0, 8)
  const categorySlug = category?.slug ?? thread.category_id
  const categoryColor = category?.color || 'var(--color-pinned, var(--mol-color-primary))'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <span
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.textSize('xs'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {t('threadView.crumb', { id: threadId }, { defaultValue: 'thread / {{id}}' })}
      </span>

      <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-[1fr_300px]')}>
        <article className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'min-w-0')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'stretch' }),
              'rounded-xl border border-outline-variant/40 bg-surface overflow-hidden',
            )}
          >
            <VoteColumn
              score={thread.vote_score}
              state={voteState}
              onVote={(next) => {
                void handleVote(next)
              }}
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 5),
                'flex-1 min-w-0',
              )}
            >
              <header
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'flex-wrap text-on-surface-variant',
                )}
              >
                <Link
                  to={`/c/${categorySlug}`}
                  className={cm.cn(cm.fontWeight('bold'), 'rounded-full px-2.5 py-1.5')}
                  style={{
                    backgroundColor: category?.color
                      ? `${category.color}1f`
                      : 'color-mix(in srgb, var(--color-pinned, var(--mol-color-primary)) 10%, transparent)',
                    color: categoryColor,
                  }}
                >
                  {t('threadView.categoryPrefix', {}, { defaultValue: 'c/' })}
                  {categoryName}
                </Link>
                <Link
                  to={`/u/${thread.author?.username ?? thread.author_id}`}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    'inline-block py-1.5 -my-1.5 text-primary',
                  )}
                >
                  {t('threadView.userPrefix', {}, { defaultValue: 'u/' })}
                  {thread.author?.username ?? thread.author?.name ?? thread.author_id.slice(0, 8)}
                </Link>
                <ReputationBadge karma={thread.author?.reputation ?? 0} size="sm" />
                <span aria-hidden="true">·</span>
                <span>{timeAgo(thread.created_at)}</span>
                {thread.is_locked && (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'rounded-full px-2 py-0.5 bg-error-container/30 text-error',
                    )}
                  >
                    {t('threadView.locked', {}, { defaultValue: 'Locked' })}
                  </span>
                )}
                {thread.is_pinned && (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'rounded-full px-2 py-0.5 bg-primary-container/30 text-primary',
                    )}
                  >
                    {t('threadView.pinned', {}, { defaultValue: 'Pinned' })}
                  </span>
                )}
              </header>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-2xl md:text-3xl tracking-tight text-on-surface leading-snug',
                )}
              >
                {thread.title}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'text-on-surface leading-relaxed whitespace-pre-line',
                )}
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {thread.body_markdown || thread.body || ''}
              </p>
              <footer
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('mt', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant flex-wrap',
                )}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span className={cm.cn('material-symbols-outlined text-sm')}>chat_bubble</span>
                  {t(
                    'threadView.commentCount',
                    { count: thread.reply_count ?? replies.length },
                    { defaultValue: '{{count}} comments' },
                  )}
                </span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span className={cm.cn('material-symbols-outlined text-sm')}>visibility</span>
                  {t(
                    'common.countViews',
                    { count: thread.view_count ?? 0 },
                    { defaultValue: '{{count}} views' },
                  )}
                </span>
                <button
                  type="button"
                  data-mol-id="report-thread-toggle"
                  onClick={() => {
                    setReportOpen((s) => !s)
                    setReportState('idle')
                    setReportError(null)
                  }}
                  aria-expanded={reportOpen}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    'ml-auto rounded transition-colors hover:text-error',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    flag
                  </span>
                  {t('threadView.report', {}, { defaultValue: 'Report' })}
                </button>
              </footer>

              {/* Moderator quick actions — pin/lock via the moderation bond. */}
              {isMod && (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 3),
                    'flex-wrap rounded-lg border border-outline-variant/40 bg-surface-container-low/40',
                  )}
                  data-mol-id="mod-actions"
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('threadView.modTools', {}, { defaultValue: 'Mod tools' })}
                  </span>
                  <button
                    type="button"
                    data-mol-id="mod-toggle-pin"
                    disabled={modBusy !== null}
                    onClick={() => void handleModAction('pin')}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-full border border-outline-variant/40 transition-colors hover:bg-surface-container-low/60 disabled:opacity-50',
                      thread.is_pinned
                        ? 'text-primary border-primary/40'
                        : 'text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      push_pin
                    </span>
                    {thread.is_pinned
                      ? t('threadView.unpin', {}, { defaultValue: 'Unpin' })
                      : t('threadView.pin', {}, { defaultValue: 'Pin' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id="mod-toggle-lock"
                    disabled={modBusy !== null}
                    onClick={() => void handleModAction('lock')}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-full border border-outline-variant/40 transition-colors hover:bg-surface-container-low/60 disabled:opacity-50',
                      thread.is_locked ? 'text-error border-error/40' : 'text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      lock
                    </span>
                    {thread.is_locked
                      ? t('threadView.unlock', {}, { defaultValue: 'Unlock' })
                      : t('threadView.lock', {}, { defaultValue: 'Lock' })}
                  </button>
                  {modError && (
                    <span role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
                      {modError}
                    </span>
                  )}
                </div>
              )}

              {/* Member report panel. */}
              {reportState === 'sent' && (
                <p
                  role="status"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('p', 3),
                    'rounded-lg bg-primary-container/20 text-primary',
                  )}
                >
                  {t(
                    'threadView.reportSent',
                    {},
                    { defaultValue: 'Thanks — this has been sent to the moderators.' },
                  )}
                </p>
              )}
              {reportOpen && reportState !== 'sent' && (
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-lg border border-outline-variant/40 bg-surface-container-low/30',
                  )}
                  data-mol-id="report-panel"
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      'threadView.reportTitle',
                      {},
                      { defaultValue: 'Why are you reporting this thread?' },
                    )}
                  </span>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
                    {REPORT_REASONS.map((reason) => {
                      const selected = reportReason === reason
                      return (
                        <button
                          key={reason}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setReportReason(reason)}
                          className={cm.cn(
                            cm.fontWeight('medium'),
                            cm.textSize('xs'),
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'rounded-full border transition-colors',
                            selected
                              ? 'border-error bg-error-container/30 text-error'
                              : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/60',
                          )}
                        >
                          {reason}
                        </button>
                      )
                    })}
                  </div>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t(
                      'threadView.reportDetailsPlaceholder',
                      {},
                      { defaultValue: 'Anything the moderators should know? (optional)' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-full min-h-[64px] rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
                    )}
                  />
                  {reportError && (
                    <span role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
                      {reportError}
                    </span>
                  )}
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
                    <button
                      type="button"
                      onClick={() => {
                        setReportOpen(false)
                        setReportError(null)
                      }}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'text-on-surface-variant',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id="report-thread-submit"
                      disabled={reportState === 'submitting'}
                      onClick={() => void handleReport()}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        'rounded-full bg-error text-on-error disabled:opacity-50',
                      )}
                    >
                      {reportState === 'submitting'
                        ? t('threadView.reportSending', {}, { defaultValue: 'Sending…' })
                        : t('threadView.reportSubmit', {}, { defaultValue: 'Send report' })}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!thread.is_locked ? (
            <form
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 4),
                'rounded-xl border border-outline-variant/40 bg-surface',
              )}
              onSubmit={(e) => {
                void handleSubmitReply(e)
              }}
            >
              <label
                htmlFor="thread-reply"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[11px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('threadView.replyLabel', {}, { defaultValue: 'Add to the conversation' })}
              </label>
              <textarea
                id="thread-reply"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={t(
                  'threadView.replyPlaceholder',
                  {},
                  { defaultValue: 'What does this make you think?' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'w-full min-h-[120px] rounded-lg border border-outline-variant/60 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30',
                )}
                style={{ fontFamily: 'var(--font-family-serif)' }}
              />
              {error && (
                <div role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                  {error}
                </div>
              )}
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('threadView.replyHint', {}, { defaultValue: 'Markdown supported. Be civil.' })}
                </span>
                <button
                  type="submit"
                  disabled={replyBody.trim().length === 0 || submitting}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    'rounded-full bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed transition-opacity',
                  )}
                >
                  {submitting
                    ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
                    : t('common.reply', {}, { defaultValue: 'Reply' })}
                </button>
              </div>
            </form>
          ) : (
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-xl border border-outline-variant/40 bg-surface text-on-surface-variant text-sm',
              )}
            >
              {t(
                'threadView.lockedNotice',
                {},
                { defaultValue: 'This thread is locked. New replies are disabled.' },
              )}
            </div>
          )}

          <section className={cm.cn(cm.flex({ direction: 'col' }))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'threadView.commentsTitle',
                { count: thread.reply_count ?? replies.length },
                { defaultValue: '{{count}} comments' },
              )}
            </h2>
            {tree.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('py', 4))}>
                {t('threadView.noComments', {}, { defaultValue: 'No comments yet. Be the first.' })}
              </p>
            ) : (
              <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                {tree.map((node) => (
                  <ReplyItem
                    key={node.reply.id}
                    node={node}
                    depth={0}
                    onVote={handleReplyVote}
                    onReply={handleNestedReply}
                  />
                ))}
              </div>
            )}
          </section>
        </article>

        <CommunitySidebar
          name={categorySlug}
          description={category?.description ?? ''}
          subscribers={category?.subscriber_count ?? 0}
          activeNow={undefined}
          accentColor={categoryColor}
          rules={[]}
          moderators={[]}
          trending={[]}
        />
      </div>
    </div>
  )
}

export default ThreadView
