import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, PromptDialog } from '@molecule/app-ui-react'

import { fmtCount, fmtRelativeShort, type SamplePost, vividGradient } from '../lib/sample-feed.js'

interface PostCardProps {
  post: SamplePost
  /** Compact variant trims the action footer — used inside the right-rail. */
  compact?: boolean
  /** Optional: handle the like toggle from the parent (Feed) so the icon
   *  can animate on click. */
  onToggleLike?: (postId: string) => void
  /** Optional: handle bookmark/save toggle. */
  onToggleSave?: (postId: string) => void
}

async function copyPostLink(postId: string, openManualCopy: (url: string) => void): Promise<void> {
  const url = `${window.location.origin}/posts/${postId}`
  try {
    if (navigator.share) {
      await navigator.share({ url })
      return
    }
  } catch (_error) {
    // user cancelled the native share — fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(url)
  } catch (_error) {
    // clipboard blocked — open the shared prompt dialog so the URL stays
    // reachable (window.prompt hangs headless e2e and is awkward on touch)
    openManualCopy(url)
  }
}

/**
 * Editorial post card — gradient-tile cover (no real image yet — the
 * mock-server doesn't ship media, so we use the Vivid gradient palette
 * + a `photo` glyph instead), author row with verified badge + LIVE
 * pill, action bar (heart + comment + share + bookmark), like-count
 * line, and caption.
 *
 * Translated from photo-sharing's FeaturedPhotoHeroCard.tsx — kept the
 * full-bleed gradient aesthetic and frosted-glass action chips, but
 * collapsed into a single-column post structure following DESIGN.md
 * "Post Card" spec (rounded-xl on desktop, edge-to-edge on mobile,
 * 12px header padding, 24px action icons).
 */
export function PostCard({ post, compact = false, onToggleLike, onToggleSave }: PostCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const cover = vividGradient(post.cover_index)

  const handleShare = (): void => {
    void copyPostLink(post.id, (url) => {
      setShareError(null)
      setShareUrl(url)
    })
  }

  const submitShareCopy = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setShareError(null)
    } catch (_error) {
      const message = t(
        'postCard.copyFailed',
        {},
        { defaultValue: 'Automatic copy failed — select the link and copy it manually.' },
      )
      setShareError(message)
      throw new Error(message, { cause: _error })
    }
  }

  const closeShareDialog = (): void => {
    setShareUrl(null)
    setShareError(null)
  }

  const aspectClass =
    post.aspect === 'tall'
      ? 'aspect-[4/5]'
      : post.aspect === 'wide'
        ? 'aspect-[16/10]'
        : 'aspect-square'

  return (
    <article
      className={cm.cn(
        'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-outline-variant/40',
      )}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('p', 4))}>
        <Link
          to={`/profile/${post.author.handle}`}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'group')}
        >
          <span
            className={cm.cn(
              'inline-flex w-10 h-10 rounded-full items-center justify-center text-white font-extrabold text-base shadow-sm',
            )}
            style={{ background: vividGradient(post.author.cover_index) }}
            aria-hidden="true"
          >
            {post.author.display_name.charAt(0)}
          </span>
          <span className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface group-hover:text-primary transition-colors',
              )}
            >
              {post.author.display_name}
              {post.author.is_verified && (
                <span
                  className={cm.cn('material-symbols-outlined text-[16px] text-blue-500')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  verified
                </span>
              )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              @{post.author.handle}
              {post.location ? ` · ${post.location}` : ''}
            </span>
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {post.is_live && (
            <span
              className={cm.cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-error text-on-error animate-pulse',
              )}
            >
              <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-surface')} aria-hidden="true" />
              {t('postCard.live', {}, { defaultValue: 'LIVE' })}
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-10 w-10 rounded-full text-on-surface-variant hover:text-on-surface transition-colors',
            )}
            aria-label={t('postCard.moreAria', {}, { defaultValue: 'More options' })}
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')}>more_horiz</span>
          </button>
        </div>
      </header>

      <Link
        to={`/posts/${post.id}`}
        aria-label={t(
          'postCard.openAria',
          { handle: post.author.handle },
          { defaultValue: 'Open post by @{{handle}}' },
        )}
        className={cm.cn('block')}
      >
        <div
          className={cm.cn('relative overflow-hidden', aspectClass)}
          style={{ background: cover }}
        >
          <div
            className={cm.cn(
              'absolute inset-0 flex items-center justify-center pointer-events-none',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-white/30 text-[120px]')}>
              photo
            </span>
          </div>
          <div
            className={cm.cn(
              'absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none',
            )}
          />
          <div
            className={cm.cn(
              'absolute right-3 top-3 flex flex-wrap gap-1.5 max-w-[60%] justify-end pointer-events-none',
            )}
          >
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md text-white',
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {!compact && (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), '-mx-2')}>
            <button
              type="button"
              onClick={() => onToggleLike?.(post.id)}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'min-h-11 min-w-11 px-2 rounded-full',
                post.liked ? 'text-error' : 'text-on-surface',
                'transition-colors hover:text-error',
              )}
              aria-label={t('postCard.likeAria', {}, { defaultValue: 'Like' })}
              aria-pressed={post.liked}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[24px]')}
                style={post.liked ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
              <span className={cm.cn('tabular-nums')}>{fmtCount(post.like_count)}</span>
            </button>
            <Link
              to={`/posts/${post.id}#comments`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'min-h-11 min-w-11 px-2 rounded-full',
                'text-on-surface hover:text-primary transition-colors',
              )}
              aria-label={t('postCard.commentAria', {}, { defaultValue: 'View comments' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[24px]')}>chat_bubble</span>
              <span className={cm.cn('tabular-nums')}>{fmtCount(post.comment_count)}</span>
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'min-h-11 min-w-11 px-2 rounded-full',
                'text-on-surface hover:text-primary transition-colors',
              )}
              aria-label={t('common.share', {}, { defaultValue: 'Share' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[24px]')}>send</span>
              <span className={cm.cn('tabular-nums')}>{fmtCount(post.share_count)}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onToggleSave?.(post.id)}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'min-h-11 min-w-11 rounded-full',
              post.saved ? 'text-primary' : 'text-on-surface-variant',
              'hover:text-primary transition-colors',
            )}
            aria-label={t('common.save', {}, { defaultValue: 'Save' })}
            aria-pressed={post.saved}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[24px]')}
              style={post.saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              bookmark
            </span>
          </button>
        </div>
      )}

      {!compact && (
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('pb', 4),
            cm.flex({ direction: 'col', gap: 'xs' }),
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
            <Link
              to={`/profile/${post.author.handle}`}
              className={cm.cn(
                cm.fontWeight('semibold'),
                'mr-1 hover:text-primary transition-colors',
              )}
            >
              @{post.author.handle}
            </Link>
            {post.caption}
          </p>
          {post.comment_count > 0 && (
            <Link
              to={`/posts/${post.id}#comments`}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t(
                'postCard.viewAllComments',
                { count: post.comment_count },
                {
                  defaultValue: 'View all {{count}} comments',
                },
              )}
            </Link>
          )}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest tabular-nums',
            )}
          >
            {fmtRelativeShort(post.posted_at)}
          </span>
        </div>
      )}

      <PromptDialog
        open={shareUrl !== null}
        onClose={closeShareDialog}
        title={t('postCard.copyLinkTitle', {}, { defaultValue: 'Copy this link' })}
        description={t(
          'postCard.copyLinkDescription',
          {},
          { defaultValue: 'Copy the link below to share this post.' },
        )}
        initialValue={shareUrl ?? ''}
        confirmLabel={t('common.copy', {}, { defaultValue: 'Copy' })}
        cancelLabel={t('common.cancel', {}, { defaultValue: 'Cancel' })}
        inputMolId="post-share-link-input"
        confirmMolId="post-share-link-confirm"
        cancelMolId="post-share-link-cancel"
        onSubmit={submitShareCopy}
      >
        {shareError ? <Alert status="error">{shareError}</Alert> : null}
      </PromptDialog>
    </article>
  )
}
