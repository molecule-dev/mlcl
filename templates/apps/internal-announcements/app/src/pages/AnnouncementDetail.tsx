/**
 * AnnouncementDetail — /announcement/:id signature feature page.
 *
 * Reads the live announcement from /api/announcements/:id, the live
 * comment thread from /api/comments/:announcementId, and the live
 * acknowledgment roster from /api/announcements/:id/acknowledgments.
 * Posting a comment hits POST /api/comments/:announcementId; clicking
 * Acknowledge hits POST /api/announcements/:id/acknowledge — both
 * trigger an immediate refetch so the UI reflects what the next GET
 * sees, not what we optimistically guessed.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getProvider as getMarkdownProvider } from '@molecule/app-markdown'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AcknowledgmentBar } from '../components/AcknowledgmentBar.js'
import { PRIORITY_BORDER_COLOR, PriorityPill } from '../components/PriorityPill.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  type ApiComment,
  type ApiUser,
  buildCardData,
  categoryColor,
  categorySlug,
  formatRelative,
  toCardPriority,
} from '../lib/announcements.js'

function authorInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface CommentRowProps {
  comment: ApiComment
  byId: Record<string, ApiUser>
  meId: string | null
  onDelete: (id: string) => void
  busy: boolean
}

function CommentRow({ comment, byId, meId, onDelete, busy }: CommentRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const author = byId[comment.author_id]
  const name =
    author?.name?.trim() ||
    author?.email?.split('@')[0] ||
    t('common.teammate', {}, { defaultValue: 'Teammate' })
  const isMine = meId != null && comment.author_id === meId
  return (
    <li
      data-testid={`comment-row-${comment.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 4),
        'rounded-xl border border-outline-variant/40 bg-surface',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'shrink-0 ring-2 ring-surface',
          )}
          style={{
            backgroundColor:
              'var(--color-priority-normal-light, var(--color-priority-normal-light))',
            color: 'var(--color-priority-normal, var(--color-priority-normal))',
          }}
          aria-hidden="true"
        >
          {authorInitials(name)}
        </span>
        <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}>
          {name}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'ml-auto text-on-surface-variant')}>
          {formatRelative(comment.created_at)}
        </span>
      </div>
      <p
        className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface whitespace-pre-wrap')}
      >
        {comment.body}
      </p>
      {isMine && (
        <button
          type="button"
          data-testid={`comment-delete-${comment.id}`}
          onClick={() => onDelete(comment.id)}
          disabled={busy}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'self-start text-on-surface-variant hover:text-error transition-colors',
          )}
        >
          {t('common.delete', {}, { defaultValue: 'Delete' })}
        </button>
      )}
    </li>
  )
}

export function AnnouncementDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const http = useHttpClient()
  const { user } = useAuth<ApiUser>()
  const meId = (user as ApiUser | null)?.id ?? null

  const [announcement, setAnnouncement] = useState<ApiAnnouncement | null>(null)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [comments, setComments] = useState<ApiComment[]>([])
  const [acks, setAcks] = useState<ApiAcknowledgment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [acking, setAcking] = useState(false)

  const refresh = useCallback(async () => {
    if (!params.id) return
    setError(null)
    try {
      const [annR, catsR, teamR, comR, ackR] = await Promise.all([
        http.get<ApiAnnouncement>(`/announcements/${params.id}`),
        http.get<ApiCategory[]>('/categories'),
        http.get<ApiUser[]>('/team'),
        http.get<ApiComment[]>(`/comments/${params.id}`),
        http.get<ApiAcknowledgment[]>(`/announcements/${params.id}/acknowledgments`),
      ])
      setAnnouncement(annR.data)
      setCategories(catsR.data)
      setUsers(teamR.data)
      setComments(comR.data)
      setAcks(ackR.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [http, params.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const usersIndex = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  // Rich body rendering — the Composer promises "Markdown supported", so
  // render the body through the bonded markdown provider (sanitizes by
  // default). Falls back to the plain-text whitespace-preserving render
  // when no provider is bonded or rendering throws.
  const bodyHtml = useMemo(() => {
    if (!announcement?.body) return null
    try {
      const provider = getMarkdownProvider()
      if (!provider) return null
      // breaks:true so plain multi-line bodies (the common composer output)
      // keep their line breaks instead of collapsing into one paragraph.
      return provider.render(announcement.body, { breaks: true }).html
    } catch (_error) {
      return null
    }
  }, [announcement?.body])

  const accent = announcement
    ? PRIORITY_BORDER_COLOR[toCardPriority(announcement)]
    : 'var(--color-priority-normal)'
  const author = announcement ? usersIndex[announcement.author_id] : null
  const authorName =
    author?.name?.trim() ||
    author?.email?.split('@')[0] ||
    t('announcements.unknownAuthor', {}, { defaultValue: 'Unknown author' })
  const category = announcement
    ? (categories.find((c) => c.id === announcement.category_id) ?? null)
    : null
  const channelColor = categoryColor(category)
  const channelSlug = categorySlug(category)
  const hasAcked = meId != null && acks.some((a) => a.user_id === meId)
  const ackTotal = announcement?.requires_acknowledgment ? Math.max(users.length, 1) : 0

  const handleAcknowledge = async () => {
    if (!announcement || acking || hasAcked) return
    setAcking(true)
    try {
      await http.post(`/announcements/${announcement.id}/acknowledge`, {})
      // Domain event: the acknowledgment flow's success point.
      track({
        name: 'announcement.acknowledged',
        properties: { announcement_id: announcement.id },
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAcking(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcement || !reply.trim() || submitting) return
    setSubmitting(true)
    try {
      const created = await http.post<ApiComment>(`/comments/${announcement.id}`, {
        content: reply.trim(),
      })
      setReply('')
      // Domain event: discussion participation.
      track({
        name: 'comment.created',
        properties: { announcement_id: announcement.id, comment_id: created?.data?.id },
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!announcement) return
    setSubmitting(true)
    try {
      await http.delete(`/comments/${announcement.id}/${commentId}`)
      track({
        name: 'comment.deleted',
        properties: { announcement_id: announcement.id, comment_id: commentId },
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.textCenter)}>
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('detail.loading', {}, { defaultValue: 'Loading announcement…' })}
        </span>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div data-testid="announcement-not-found" className={cm.cn(cm.sp('p', 8), cm.textCenter)}>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-2xl text-on-surface')}>
          {t('detail.notFoundTitle', {}, { defaultValue: 'Announcement not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
          {error ??
            t(
              'detail.notFoundBody',
              {},
              { defaultValue: 'It may have been deleted or you do not have access.' },
            )}
        </p>
        <Link
          to="/feed"
          className={cm.cn(cm.sp('mt', 4), 'inline-block text-primary hover:underline')}
        >
          {t('detail.back', {}, { defaultValue: 'Back to feed' })}
        </Link>
      </div>
    )
  }

  // helper for tests/coverage — memoized card data is unused render-wise but
  // provides a stable place for tests to assert the mapping is correct.
  void buildCardData

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <nav className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <Link
          to="/feed"
          data-testid="detail-back-link"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('detail.back', {}, { defaultValue: 'Back to feed' })}
        </Link>
        {category && (
          <>
            <span className="text-outline-variant/60">·</span>
            <Link
              to={`/feed?channel=${channelSlug}`}
              className={cm.cn(cm.fontWeight('semibold'), 'hover:text-primary transition-colors')}
              style={{ color: channelColor }}
            >
              #{category.name}
            </Link>
          </>
        )}
      </nav>

      <article
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/40 bg-gradient-to-br from-surface via-surface to-primary/5',
        )}
        style={{ borderLeftWidth: '6px', borderLeftColor: accent }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <PriorityPill priority={toCardPriority(announcement)} />
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {formatRelative(announcement.published_at ?? announcement.created_at)}
          </span>
        </div>

        <h1
          data-testid="detail-title"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-3xl leading-tight tracking-tight text-on-surface',
          )}
        >
          {announcement.title}
        </h1>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'shrink-0 ring-2 ring-surface',
            )}
            style={{
              backgroundColor:
                'var(--color-priority-normal-light, var(--color-priority-normal-light))',
              color: 'var(--color-priority-normal, var(--color-priority-normal))',
            }}
            aria-hidden="true"
          >
            {authorInitials(authorName)}
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
            >
              {authorName}
            </span>
            {author?.email && (
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {author.email}
              </span>
            )}
          </div>
        </div>

        {bodyHtml ? (
          <div
            data-testid="detail-body"
            className={cm.cn(
              cm.textSize('base'),
              'leading-relaxed text-on-surface [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-surface-container [&_code]:px-1 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-outline-variant/40 [&_blockquote]:pl-3 [&_blockquote]:text-on-surface-variant [&_ul]:list-disc',
            )}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p
            data-testid="detail-body"
            className={cm.cn(
              cm.textSize('base'),
              'leading-relaxed text-on-surface whitespace-pre-wrap',
            )}
          >
            {announcement.body}
          </p>
        )}

        {announcement.requires_acknowledgment && (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 4),
              'rounded-xl bg-surface-container-low/40',
            )}
          >
            <AcknowledgmentBar acknowledged={acks.length} total={ackTotal} />
            <button
              type="button"
              data-testid="detail-ack"
              onClick={handleAcknowledge}
              disabled={hasAcked || acking}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'self-start rounded-full transition-colors',
                hasAcked ? 'cursor-default' : 'bg-primary text-on-primary hover:bg-primary/90',
              )}
              style={
                hasAcked
                  ? {
                      backgroundColor: 'var(--color-acknowledged-light, #d1fae5)',
                      color: 'var(--color-acknowledged, #059669)',
                    }
                  : undefined
              }
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>
                {hasAcked ? 'check_circle' : 'how_to_reg'}
              </span>
              {hasAcked
                ? t(
                    'detail.acknowledged',
                    {},
                    { defaultValue: 'Acknowledged · thanks for reading' },
                  )
                : acking
                  ? t('detail.acknowledging', {}, { defaultValue: 'Acknowledging…' })
                  : t('detail.acknowledge', {}, { defaultValue: 'Acknowledge — I read it' })}
            </button>
          </div>
        )}
      </article>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      <section
        data-testid="comments-section"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight text-on-surface')}>
          {t(
            'detail.commentsHeading',
            { count: comments.length },
            { defaultValue: '{{count}} comments' },
          )}
        </h2>
        {comments.length === 0 ? (
          <p
            data-testid="comments-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'detail.commentsEmpty',
              {},
              { defaultValue: 'No replies yet. Be the first to weigh in.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                byId={usersIndex}
                meId={meId}
                onDelete={handleDeleteComment}
                busy={submitting}
              />
            ))}
          </ul>
        )}
      </section>

      <form
        data-testid="reply-form"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('p', 4),
          'rounded-2xl border border-outline-variant/40 bg-surface',
        )}
        onSubmit={handleReply}
      >
        <label
          htmlFor="detail-reply"
          className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
        >
          {t('detail.replyLabel', {}, { defaultValue: 'Add a reply' })}
        </label>
        <textarea
          id="detail-reply"
          data-testid="reply-textarea"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder={t(
            'detail.replyPlaceholder',
            {},
            { defaultValue: 'Ask a question, suggest a follow-up, or just say thanks…' },
          )}
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('p', 3),
            'rounded-xl border border-outline-variant/40 bg-surface-container-low/30 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'detail.replyHint',
              {},
              { defaultValue: 'Replies notify the author and the thread participants.' },
            )}
          </span>
          <button
            type="submit"
            data-testid="reply-submit"
            disabled={!reply.trim() || submitting}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors',
            )}
          >
            {submitting
              ? t('common.postingEllipsis', {}, { defaultValue: 'Posting…' })
              : t('common.reply', {}, { defaultValue: 'Reply' })}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AnnouncementDetail
