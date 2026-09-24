import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, PromptDialog } from '@molecule/app-ui-react'

import { fmtCount, type SampleAuthor, vividGradient } from '../lib/sample-feed.js'

interface ProfileHeaderCardProps {
  author: SampleAuthor
  /** Total posts count rendered in the stats row. */
  postCount: number
  /** Followers count rendered in the stats row. */
  followerCount: number
  /** Following count rendered in the stats row. */
  followingCount: number
  /** Whether the viewer is currently following this profile. */
  isFollowing?: boolean
  /** Optional follow / unfollow toggle handler. */
  onToggleFollow?: () => void
  /** Optional message-author handler — when set, opens or creates a DM thread. */
  onMessage?: () => void
  /** Optional eyebrow text (e.g. "Editor at La Pagina"). */
  eyebrow?: string
}

async function shareProfile(handle: string, openManualCopy: (url: string) => void): Promise<void> {
  const url = `${window.location.origin}/profile/${handle}`
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
 * Profile hero — full-bleed gradient cover, oversized circular avatar
 * overlapping the cover by 50%, follower / following / posts stats
 * row, bio paragraph, and Follow + Message + Share CTA group.
 *
 * Translated from photo-sharing's FeaturedPhotoHeroCard.tsx — kept the
 * gradient orb decoration + frosted-glass pill aesthetic but reshaped
 * to the canonical social-profile layout DESIGN.md "Profile Header"
 * spec'd (200px cover desktop, 128px avatar, 32px stat spacing).
 */
export function ProfileHeaderCard({
  author,
  postCount,
  followerCount,
  followingCount,
  isFollowing = false,
  onToggleFollow,
  onMessage,
  eyebrow,
}: ProfileHeaderCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const cover = vividGradient(author.cover_index)

  const handleShare = (): void => {
    void shareProfile(author.handle, (url) => {
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
        'profileHeaderCard.copyFailed',
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

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
      )}
    >
      <div
        className={cm.cn('relative h-[180px] md:h-[220px] w-full')}
        style={{ background: cover }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-20 h-20 rounded-full bg-foreground/10 blur-2xl',
          )}
          aria-hidden="true"
        />
        {eyebrow && (
          <span
            className={cm.cn(
              'absolute left-6 top-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface/20 backdrop-blur-md text-white',
            )}
          >
            {eyebrow}
          </span>
        )}
      </div>

      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('pb', 6),
          '-mt-16 md:-mt-20 grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-end',
        )}
      >
        <div className={cm.cn('md:col-span-3 flex justify-center md:justify-start')}>
          <span
            className={cm.cn(
              'inline-flex w-32 h-32 md:w-40 md:h-40 rounded-full items-center justify-center text-white font-extrabold text-5xl md:text-6xl shadow-xl ring-4 ring-surface-container-lowest',
            )}
            style={{ background: cover }}
            aria-hidden="true"
          >
            {author.display_name.charAt(0)}
          </span>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'md:col-span-9 md:pt-16')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl')}>
              {author.display_name}
            </h1>
            {author.is_verified && (
              <span
                className={cm.cn('material-symbols-outlined text-[24px] text-blue-500')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-label={t(
                  'profileHeaderCard.verifiedAria',
                  {},
                  { defaultValue: 'Verified account' },
                )}
              >
                verified
              </span>
            )}
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>@{author.handle}</p>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }), 'mt-1')}>
            <Stat
              label={t('profileHeaderCard.posts', {}, { defaultValue: 'Posts' })}
              value={fmtCount(postCount)}
            />
            <Stat
              label={t('profileHeaderCard.followers', {}, { defaultValue: 'Followers' })}
              value={fmtCount(followerCount)}
            />
            <Stat
              label={t('common.following', {}, { defaultValue: 'Following' })}
              value={fmtCount(followingCount)}
            />
          </div>

          {author.bio && (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed max-w-xl mt-2')}
            >
              {author.bio}
            </p>
          )}

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'mt-3')}>
            {onToggleFollow && (
              <button
                type="button"
                onClick={onToggleFollow}
                data-testid="follow-toggle"
                className={cm.cn(
                  cm.sp('px', 5),
                  'h-10 rounded-full text-sm font-bold uppercase tracking-widest transition-colors',
                  isFollowing
                    ? 'bg-surface-container border border-outline-variant text-on-surface hover:bg-error-container hover:text-on-error-container hover:border-error-container'
                    : 'bg-primary text-on-primary hover:bg-primary/90',
                )}
              >
                {isFollowing
                  ? t('common.following', {}, { defaultValue: 'Following' })
                  : t('common.follow', {}, { defaultValue: 'Follow' })}
              </button>
            )}
            {onMessage && (
              <button
                type="button"
                onClick={onMessage}
                data-testid="message-author"
                className={cm.cn(
                  cm.sp('px', 5),
                  'h-10 rounded-full text-sm font-bold uppercase tracking-widest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('profileHeaderCard.message', {}, { defaultValue: 'Message' })}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className={cm.cn(
                'h-10 w-10 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center justify-center',
              )}
              aria-label={t('profileHeaderCard.shareAria', {}, { defaultValue: 'Share profile' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>share</span>
            </button>
          </div>
        </div>
      </div>

      <PromptDialog
        open={shareUrl !== null}
        onClose={closeShareDialog}
        title={t('profileHeaderCard.copyLinkTitle', {}, { defaultValue: 'Copy this profile link' })}
        description={t(
          'profileHeaderCard.copyLinkDescription',
          {},
          { defaultValue: 'Copy the link below to share this profile.' },
        )}
        initialValue={shareUrl ?? ''}
        confirmLabel={t('common.copy', {}, { defaultValue: 'Copy' })}
        cancelLabel={t('common.cancel', {}, { defaultValue: 'Cancel' })}
        inputMolId="profile-share-link-input"
        confirmMolId="profile-share-link-confirm"
        cancelMolId="profile-share-link-cancel"
        onSubmit={submitShareCopy}
      >
        {shareError ? <Alert status="error">{shareError}</Alert> : null}
      </PromptDialog>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-[64px]')}>
      <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight tabular-nums')}>
        {value}
      </span>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
    </span>
  )
}
