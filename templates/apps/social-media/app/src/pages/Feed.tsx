import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PostCard } from '../components/PostCard.js'
import { SuggestionsRail } from '../components/SuggestionsRail.js'
import { useFeedPosts, useSuggestions, useTrendingHashtags } from '../lib/api.js'
import type { SamplePost } from '../lib/sample-feed.js'

/**
 * Authenticated landing — Feed.
 *
 * Two-column shell: a centred feed stream (PostCard stack) and a 320px
 * right rail with SuggestionsRail (suggestions + trending hashtags).
 */
export function Feed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { data: rawPosts, loading, error } = useFeedPosts()
  const { data: rawSuggestions } = useSuggestions()
  const { data: rawHashtags } = useTrendingHashtags()
  const [overrides, setOverrides] = useState<
    Record<string, { liked: boolean; like_count: number }>
  >({})
  const [followedIds, setFollowedIds] = useState<Set<string>>(() => new Set())

  const followSuggestion = useCallback(
    async (userId: string) => {
      setFollowedIds((prev) => {
        const next = new Set(prev)
        next.add(userId)
        return next
      })
      try {
        await http.post(`/follows/users/${userId}`)
        track({ name: 'follow.toggled', properties: { target_id: userId, following: true } })
      } catch (err) {
        logError('feed.followSuggestion', err)
        setFollowedIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    },
    [http],
  )

  const toggleLike = useCallback(
    async (postId: string) => {
      const current = (rawPosts ?? []).find((p) => p.id === postId)
      const present =
        overrides[postId] ??
        (current ? { liked: current.liked, like_count: current.like_count } : null)
      if (!present) return
      const optimistic = {
        liked: !present.liked,
        like_count: present.liked ? Math.max(0, present.like_count - 1) : present.like_count + 1,
      }
      setOverrides((prev) => ({ ...prev, [postId]: optimistic }))
      try {
        const res = await http.post<{ liked: boolean; like_count: number }>(`/posts/${postId}/like`)
        if (res.data) {
          setOverrides((prev) => ({
            ...prev,
            [postId]: { liked: res.data.liked, like_count: res.data.like_count },
          }))
          track({
            name: 'post.liked',
            properties: { post_id: postId, liked: res.data.liked },
          })
        }
      } catch (err) {
        logError('feed.toggleLike', err)
        setOverrides((prev) => ({ ...prev, [postId]: present }))
      }
    },
    [http, overrides, rawPosts],
  )

  const posts: SamplePost[] = (rawPosts ?? []).map((p) => {
    const o = overrides[p.id]
    return o ? { ...p, liked: o.liked, like_count: o.like_count } : p
  })

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-7xl')}>
      <header
        className={cm.cn(cm.sp('mb', 6), cm.flex({ align: 'center', justify: 'between' }), 'gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('feed.eyebrow', { appName: APP_NAME }, { defaultValue: 'Today, on {{appName}}' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}
          >
            {t('feed.heading', {}, { defaultValue: 'Your feed' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t(
                  'feed.subheading',
                  { count: posts.length },
                  {
                    defaultValue: '{{count}} fresh posts from the people you follow.',
                  },
                )}
          </p>
        </div>
        <Link
          to="/compose"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'shrink-0 self-start whitespace-nowrap rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
          )}
          data-testid="compose-link"
        >
          <span className={cm.cn('material-symbols-outlined text-[20px]')}>add</span>
          {t('feed.compose', {}, { defaultValue: 'New post' })}
        </Link>
      </header>

      {error && (
        <div
          className={cm.cn(
            'rounded-2xl border border-red-300 bg-error-light text-error px-4 py-3 mb-4 text-sm',
            '',
          )}
        >
          {t('feed.error', {}, { defaultValue: 'Could not load your feed.' })} {error.message}
        </div>
      )}

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8')}>
        <div className={cm.cn('lg:col-span-8 xl:col-span-8')}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}>
            {loading && (
              <div
                className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
                aria-hidden="true"
                data-testid="feed-loading"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-outline-variant/40 overflow-hidden bg-surface-container-lowest"
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('p', 4))}>
                      <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 rounded bg-surface-container animate-pulse" />
                        <div className="h-2.5 w-24 rounded bg-surface-container animate-pulse" />
                      </div>
                    </div>
                    <div className="aspect-square bg-surface-container animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div
                className={cm.cn(
                  'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
                )}
                data-testid="feed-empty-state"
              >
                <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'))}>
                  {t('feed.emptyTitle', {}, { defaultValue: 'Your feed is quiet for now.' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2 mb-4')}>
                  {t(
                    'feed.emptyBody',
                    {},
                    {
                      defaultValue:
                        'Share your first post or follow creators on Explore to fill your feed.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
                  <Link
                    to="/compose"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-full text-sm font-bold bg-primary text-on-primary',
                    )}
                  >
                    {t('feed.compose', {}, { defaultValue: 'New post' })}
                  </Link>
                  <Link
                    to="/explore"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      'rounded-full text-sm font-bold border border-outline-variant',
                    )}
                  >
                    {t('feed.exploreCta', {}, { defaultValue: 'Open Explore' })}
                  </Link>
                </div>
              </div>
            )}

            {!loading &&
              posts.map((post) => <PostCard key={post.id} post={post} onToggleLike={toggleLike} />)}
          </div>
        </div>

        <div className={cm.cn('lg:col-span-4 xl:col-span-4')}>
          <SuggestionsRail
            suggestions={(rawSuggestions ?? []).map((s) => ({
              author: {
                id: s.id,
                display_name: s.display_name,
                handle: s.handle,
                cover_index: s.cover_index,
                is_verified: s.is_verified,
                bio: s.bio,
              },
              reason: s.reason,
              mutual_count: s.mutual_count,
            }))}
            hashtags={rawHashtags ?? []}
            className={cm.cn('lg:sticky lg:top-8')}
            onFollow={followSuggestion}
            followingIds={followedIds}
          />
        </div>
      </div>
    </div>
  )
}
