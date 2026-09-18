import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePost } from './PostContext.js'

function formatPublishedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface InteractionSummary {
  claps: number
  clapped: boolean
  bookmarked: boolean
  comment_count: number
}

function PostDetailHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { post } = usePost()
  const id = post?.id

  const [interactions, setInteractions] = useState<InteractionSummary>({
    claps: 0,
    clapped: false,
    bookmarked: false,
    comment_count: 0,
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<InteractionSummary>(`/api/posts/${id}/interactions`)
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        if (payload) {
          setInteractions({
            claps: Number(payload.claps ?? 0) || 0,
            clapped: Boolean(payload.clapped),
            bookmarked: Boolean(payload.bookmarked),
            comment_count: Number(payload.comment_count ?? 0) || 0,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!post) return null
  const authorName = post.author_name ?? null
  const subtitle = post.excerpt ?? null
  const publishedDate = formatPublishedDate(post.published_at)

  async function toggleClap() {
    if (!id) return
    const next = !interactions.clapped
    setInteractions((prev) => ({
      ...prev,
      clapped: next,
      claps: next ? prev.claps + 1 : Math.max(0, prev.claps - 1),
    }))
    try {
      if (next) {
        await http.post(`/api/posts/${id}/clap`, {})
      } else {
        await http.delete(`/api/posts/${id}/clap`)
      }
    } catch (_error) {
      // Optimistic update failed — roll back the local clap state
      setInteractions((prev) => ({
        ...prev,
        clapped: !next,
        claps: !next ? prev.claps + 1 : Math.max(0, prev.claps - 1),
      }))
    }
  }

  async function toggleBookmark() {
    if (!id) return
    const next = !interactions.bookmarked
    setInteractions((prev) => ({ ...prev, bookmarked: next }))
    try {
      if (next) {
        await http.post(`/api/posts/${id}/bookmark`, {})
      } else {
        await http.delete(`/api/posts/${id}/bookmark`)
      }
    } catch (_error) {
      // Optimistic update failed — roll back the local bookmark state
      setInteractions((prev) => ({ ...prev, bookmarked: !next }))
    }
  }

  return (
    <header
      className={cm.cn('max-w-[680px]', cm.mxAuto, cm.sp('mb', 16), 'text-left md:text-center')}
      data-mol-id="post-header"
    >
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'font-headline md:text-5xl leading-tight tracking-tight text-on-background',
        )}
        data-mol-id="post-title"
      >
        {post.title}
      </h1>
      {subtitle ? (
        <p
          className={cm.cn(
            cm.textSize('xl'),
            cm.sp('mb', 10),
            'font-headline md:text-2xl text-on-surface-variant leading-relaxed italic',
          )}
        >
          {subtitle}
        </p>
      ) : null}
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'lg' }),
          cm.sp('py', 8),
          'md:flex-row border-y border-outline-variant/20',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {authorName ? (
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'font-label')}
              data-mol-id="post-author-name"
            >
              {authorName}
            </span>
          ) : null}
          {publishedDate ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-label')}
              data-mol-id="post-published-date"
            >
              {publishedDate}
            </span>
          ) : null}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'text-on-surface-variant')}>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'gap-1.5 hover:text-on-background transition-colors group',
            )}
            data-mol-id="button-clap"
            aria-pressed={interactions.clapped}
            onClick={() => void toggleClap()}
          >
            <span className={cm.fv8bd884bd}>pan_tool</span>
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'font-label')}
              data-mol-id="post-clap-count"
            >
              {interactions.claps.toLocaleString()}
            </span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'gap-1.5 hover:text-on-background transition-colors group',
            )}
            data-mol-id="button-comment"
            onClick={() => navigate(`/comments?postId=${post.id}`)}
          >
            <span className={cm.fv8bd884bd}>chat_bubble</span>
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'font-label')}
              data-mol-id="post-comment-count"
            >
              {interactions.comment_count.toLocaleString()}
            </span>
          </button>
          <div className={cm.cn(cm.h(4), 'w-[px]', 'bg-outline-variant/30')}></div>
          <button
            type="button"
            className={cm.fv81e5aa82}
            data-mol-id="button-bookmark"
            aria-pressed={interactions.bookmarked}
            aria-label={
              interactions.bookmarked
                ? t('postDetailHeader.removeBookmark', {}, { defaultValue: 'Remove bookmark' })
                : t('postDetailHeader.bookmark', {}, { defaultValue: 'Bookmark' })
            }
            onClick={() => void toggleBookmark()}
          >
            <span className={cm.fv9c076a56}>
              {interactions.bookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
          <div ref={menuRef} className={cm.cn('relative')}>
            <button
              type="button"
              className={cm.fv81e5aa82}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label={t('postDetailHeader.moreOptions', {}, { defaultValue: 'More options' })}
              onClick={() => setIsMenuOpen((o) => !o)}
            >
              <span className={cm.fv9c076a56}>more_horiz</span>
            </button>
            {isMenuOpen ? (
              <div
                role="menu"
                data-mol-id="post-more-menu"
                className={cm.cn(
                  cm.sp('p', 2),
                  'absolute right-0 top-10 z-50 min-w-[160px] rounded-lg bg-surface-container shadow-lg border border-outline-variant/20',
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void toggleBookmark()
                    setIsMenuOpen(false)
                  }}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'text-left rounded hover:bg-surface-container-high',
                  )}
                >
                  {interactions.bookmarked
                    ? t('postDetailHeader.removeBookmark', {}, { defaultValue: 'Remove bookmark' })
                    : t('postDetailHeader.bookmark', {}, { defaultValue: 'Bookmark' })}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false)
                    navigate(`/comments?postId=${post.id}`)
                  }}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'text-left rounded hover:bg-surface-container-high',
                  )}
                >
                  {t('postDetailHeader.openComments', {}, { defaultValue: 'Open comments' })}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default PostDetailHeader
export { PostDetailHeader }
