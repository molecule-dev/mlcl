import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePost } from './PostContext.js'

interface InteractionSummary {
  claps: number
  clapped: boolean
  bookmarked: boolean
  comment_count: number
}

function PostDetailSocialShare() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { post } = usePost()
  const id = post?.id

  const [summary, setSummary] = useState<InteractionSummary>({
    claps: 0,
    clapped: false,
    bookmarked: false,
    comment_count: 0,
  })
  const [shareNote, setShareNote] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get<InteractionSummary>(`/api/posts/${id}/interactions`)
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        if (payload) {
          setSummary({
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

  async function handleClap() {
    if (!id) return
    const next = !summary.clapped
    setSummary((prev) => ({
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
      setSummary((prev) => ({
        ...prev,
        clapped: !next,
        claps: !next ? prev.claps + 1 : Math.max(0, prev.claps - 1),
      }))
    }
  }

  const announceShare = (label: string) => {
    setShareNote(
      t('postDetailSocialShare.shared', { label }, { defaultValue: 'Opened share for {{label}}.' }),
    )
  }

  const copyLink = async () => {
    const href = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard?.writeText(href)
      setShareNote(t('common.copied', {}, { defaultValue: 'Link copied to clipboard.' }))
    } catch (_error) {
      // Clipboard API unavailable or denied — show the URL so the user can copy manually
      setShareNote(
        t('postDetailSocialShare.copyFallback', { href }, { defaultValue: 'Copy: {{href}}' }),
      )
    }
  }

  return (
    <div
      className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 12))}
      data-mol-id="post-social-share"
    >
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <button
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')}
          data-mol-id="button-clap-footer"
          aria-pressed={summary.clapped}
          onClick={() => void handleClap()}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined transition-colors',
              summary.clapped ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary',
            )}
          >
            pan_tool
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
            data-mol-id="post-clap-count-footer"
          >
            {t(
              'postDetailSocialShare.claps',
              { count: summary.claps },
              { defaultValue: '{{count}} claps' },
            )}
          </span>
        </button>
        <button
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')}
          data-mol-id="button-comments-footer"
          onClick={() => post?.id && navigate(`/comments?postId=${post.id}`)}
        >
          <span className={cm.fv6e6773c5}>chat_bubble</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label text-on-surface-variant',
            )}
            data-mol-id="post-comment-count-footer"
          >
            {t(
              'postDetailSocialShare.responses',
              { count: summary.comment_count },
              { defaultValue: '{{count}} responses' },
            )}
          </span>
        </button>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
          data-mol-id="button-share-twitter"
          aria-label={t(
            'postDetailSocialShare.shareOnTwitter',
            {},
            { defaultValue: 'Share on Twitter' },
          )}
          onClick={() => {
            announceShare('Twitter')
            window.open(
              'https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href),
              '_blank',
              'noopener,noreferrer',
            )
          }}
        >
          <svg className={cm.cn(cm.w(5), cm.h(5), 'fill-current')} viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"></path>
          </svg>
        </button>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
          data-mol-id="button-share-linkedin"
          aria-label={t(
            'postDetailSocialShare.shareOnLinkedIn',
            {},
            { defaultValue: 'Share on LinkedIn' },
          )}
          onClick={() => {
            announceShare('LinkedIn')
            window.open(
              'https://www.linkedin.com/sharing/share-offsite/?url=' +
                encodeURIComponent(window.location.href),
              '_blank',
              'noopener,noreferrer',
            )
          }}
        >
          <svg className={cm.cn(cm.w(5), cm.h(5), 'fill-current')} viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3V10.5H10.5v8h2.5v-4.5c0-.45.35-.8.8-.8s.8.35.8.8v4.5h2.4zM8 19h-2.5V10.5H8V19m-1.25-9.75A1.25 1.25 0 0 1 5.5 8a1.25 1.25 0 0 1 1.25-1.25A1.25 1.25 0 0 1 8 8a1.25 1.25 0 0 1-1.25 1.25z"></path>
          </svg>
        </button>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-surface-variant hover:text-primary transition-colors',
          )}
          data-mol-id="button-copy-link"
          aria-label={t('common.copyLink', {}, { defaultValue: 'Copy link' })}
          onClick={() => void copyLink()}
        >
          <span className={cm.fv9c076a56}>link</span>
        </button>
      </div>
      {shareNote ? (
        <p
          role="status"
          aria-live="polite"
          data-mol-id="post-share-note"
          className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}
        >
          {shareNote}
        </p>
      ) : null}
    </div>
  )
}

export default PostDetailSocialShare
export { PostDetailSocialShare }
