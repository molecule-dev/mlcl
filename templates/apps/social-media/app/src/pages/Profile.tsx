import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { warn as logWarn } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProfileHeaderCard } from '../components/ProfileHeaderCard.js'
import { useUserPosts, useUserProfile } from '../lib/api.js'
import { fmtCount, vividGradient } from '../lib/sample-feed.js'

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const params = useParams<{ handle?: string }>()
  const handle = (params.handle ?? 'me').toLowerCase()
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile(handle)
  const { data: posts, loading: postsLoading } = useUserPosts(handle)
  const [followBusy, setFollowBusy] = useState(false)
  const [messageBusy, setMessageBusy] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)

  const onToggleFollow = useCallback(async () => {
    if (!profile || profile.is_self || followBusy) return
    setFollowBusy(true)
    setFollowError(null)
    try {
      if (profile.is_following) {
        await http.delete(`/follows/users/${profile.id}`)
      } else {
        await http.post(`/follows/users/${profile.id}`)
      }
      await refetchProfile()
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : 'Could not update follow')
    } finally {
      setFollowBusy(false)
    }
  }, [profile, followBusy, http, refetchProfile])

  const startConversation = useCallback(async () => {
    if (!profile || profile.is_self || messageBusy) return
    setMessageBusy(true)
    try {
      const res = await http.post<{ id: string }>('/messages/threads', { user_id: profile.id })
      const threadId = res.data?.id
      navigate(`/messages${threadId ? `?thread=${threadId}` : ''}`)
    } catch (err) {
      logWarn('profile.startConversation', err)
      navigate('/messages')
    } finally {
      setMessageBusy(false)
    }
  }, [profile, messageBusy, http, navigate])

  if (profileError) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 6),
          cm.sp('py', 8),
          'lg:px-10 mx-auto w-full max-w-3xl text-center',
        )}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold')}>
          {t('profile.notFoundTitle', {}, { defaultValue: 'Profile not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
          {profileError.message}
        </p>
        <Link to="/explore" className={cm.cn('inline-block mt-6 underline')}>
          {t('profile.exploreCta', {}, { defaultValue: 'Browse Explore' })}
        </Link>
      </div>
    )
  }

  if (profileLoading || !profile) {
    return (
      <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-6xl')}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-6xl')}>
      <ProfileHeaderCard
        author={{
          id: profile.id,
          display_name: profile.display_name,
          handle: profile.handle,
          cover_index: profile.cover_index,
          is_verified: profile.is_verified,
          bio: profile.bio,
        }}
        postCount={profile.post_count}
        followerCount={profile.follower_count}
        followingCount={profile.following_count}
        isFollowing={profile.is_following ?? false}
        onToggleFollow={profile.is_self ? undefined : onToggleFollow}
        onMessage={profile.is_self ? undefined : startConversation}
        eyebrow={
          profile.is_self ? t('profile.youEyebrow', {}, { defaultValue: 'This is you' }) : undefined
        }
      />

      {followError && (
        <p className={cm.cn(cm.textSize('xs'), 'text-error mt-2')} role="alert">
          {followError}
        </p>
      )}

      {(posts ?? []).length === 0 ? (
        <div
          className={cm.cn(cm.textCenter, cm.sp('py', 16), 'text-on-surface-variant')}
          data-testid="profile-empty"
        >
          <p className={cm.cn('text-sm italic')}>
            {postsLoading
              ? t('profile.loadingPosts', {}, { defaultValue: 'Loading posts…' })
              : profile.is_self
                ? t(
                    'profile.emptySelf',
                    {},
                    {
                      defaultValue: "You haven't posted yet — head to New Post to share something.",
                    },
                  )
                : t(
                    'profile.empty',
                    {},
                    { defaultValue: "No posts yet — when there are some, they'll show up here." },
                  )}
          </p>
          {profile.is_self && (
            <Link
              to="/compose"
              className={cm.cn(
                'inline-block mt-4 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-bold',
              )}
            >
              {t('profile.composeCta', {}, { defaultValue: 'New post' })}
            </Link>
          )}
        </div>
      ) : (
        <ul
          className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-3 mt-8')}
          data-testid="profile-posts-grid"
        >
          {(posts ?? []).map((post) => {
            const cover = vividGradient(post.cover_index)
            return (
              <li key={post.id}>
                <Link
                  to={`/posts/${post.id}`}
                  className={cm.cn('relative block aspect-square overflow-hidden rounded-md group')}
                  style={{ background: cover }}
                >
                  <span
                    className={cm.cn(
                      'absolute inset-0 flex items-center justify-center pointer-events-none',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-white/30 text-[64px] group-hover:scale-110 transition-transform duration-300',
                      )}
                    >
                      photo
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      'absolute inset-0 bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white text-sm font-semibold',
                    )}
                  >
                    <span className={cm.cn('inline-flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('material-symbols-outlined text-[20px]')}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        favorite
                      </span>
                      {fmtCount(post.like_count)}
                    </span>
                    <span className={cm.cn('inline-flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('material-symbols-outlined text-[20px]')}
                        aria-hidden="true"
                      >
                        chat_bubble
                      </span>
                      {fmtCount(post.comment_count)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
