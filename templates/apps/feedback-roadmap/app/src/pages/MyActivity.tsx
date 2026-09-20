/**
 * MyActivity — the signed-in user's own footprint (auth).
 *
 * Two tabs: My votes (everything the user upvoted, with the live status —
 * this is where voters see "shipped") and My posts (requests they
 * submitted, with edit/decompose affordances kept minimal: delete only).
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PostCard } from '../components/PostCard.js'
import type { ApiPost } from '../utils/posts.js'

type Tab = 'votes' | 'posts'

export function MyActivity() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string }>()
  const [tab, setTab] = useState<Tab>('votes')
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [votingId, setVotingId] = useState<string | null>(null)

  const userId = user?.id ?? ''

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setPosts(null)
    const http = getHttpClient()
    // My votes: fetch the voted set by asking the posts endpoint for the
    // user's own vote rows, then hydrate the posts.
    void (async () => {
      try {
        if (tab === 'posts') {
          const res = await http.get<{ data?: ApiPost[] }>(
            `/api/posts?author=${encodeURIComponent(userId)}&sort=latest&include_merged=1&limit=50`,
          )
          if (!cancelled) setPosts(Array.isArray(res?.data?.data) ? res.data.data : [])
        } else {
          const votes = await http.get<{ data?: Array<{ post_id: string }> }>('/api/votes/mine')
          const ids = (votes?.data?.data ?? []).map((v) => v.post_id)
          if (ids.length === 0) {
            if (!cancelled) setPosts([])
            return
          }
          const res = await http.get<{ data?: ApiPost[] }>(
            `/api/posts?include_merged=1&sort=latest&limit=100`,
          )
          const all = Array.isArray(res?.data?.data) ? res.data.data : []
          if (!cancelled) setPosts(all.filter((p) => ids.includes(p.id)))
        }
      } catch (e) {
        logError('myActivity.load', e)
        if (!cancelled) setPosts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab, userId])

  const toggleVote = useCallback(
    async (post: ApiPost) => {
      if (votingId) return
      setVotingId(post.id)
      try {
        const http = getHttpClient()
        const res = await http.post<{ voted?: boolean; vote_count?: number }>('/api/votes', {
          post_id: post.id,
        })
        const voted = res?.data?.voted ?? !post.viewer_voted
        if (!voted && tab === 'votes') {
          // Un-voting removes it from the "My votes" tab.
          setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id))
          return
        }
        setPosts((prev) =>
          (prev ?? []).map((p) =>
            p.id === post.id
              ? { ...p, viewer_voted: voted, vote_count: res?.data?.vote_count ?? p.vote_count }
              : p,
          ),
        )
      } catch (e) {
        logError('myActivity.vote', e)
      } finally {
        setVotingId(null)
      }
    },
    [tab, votingId],
  )

  const shippedCount = (posts ?? []).filter((p) => p.status === 'shipped').length

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('myActivity.eyebrow', {}, { defaultValue: 'Your activity' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {tab === 'votes'
              ? t('myActivity.votesTitle', {}, { defaultValue: 'Requests you voted for' })
              : t('myActivity.postsTitle', {}, { defaultValue: 'Requests you submitted' })}
          </h1>
          {tab === 'votes' && posts !== null && (
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'myActivity.shippedNote',
                { count: shippedCount },
                {
                  defaultValue: '{{count}} of them shipped — thanks for the nudge.',
                },
              )}
            </p>
          )}
        </div>
        <div role="group" aria-label={t('myActivity.tabLabel', {}, { defaultValue: 'View' })}>
          {(['votes', 'posts'] as Tab[]).map((mode) => {
            const selected = mode === tab
            return (
              <button
                key={mode}
                type="button"
                data-mol-id={`my-activity-tab-${mode}`}
                aria-pressed={selected}
                onClick={() => setTab(mode)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full border transition-colors',
                  selected
                    ? 'border-primary bg-primary-container/30 text-primary'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low/50',
                )}
              >
                {mode === 'votes'
                  ? t('myActivity.tabVotes', {}, { defaultValue: 'My votes' })
                  : t('myActivity.tabPosts', {}, { defaultValue: 'My posts' })}
              </button>
            )
          })}
        </div>
      </header>

      {posts === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : posts.length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 10),
            'rounded-xl border border-dashed border-outline-variant/50 text-center',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined',
              cm.textSize('3xl'),
              'text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            how_to_vote
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {tab === 'votes'
              ? t(
                  'myActivity.emptyVotes',
                  {},
                  {
                    defaultValue: 'Nothing yet — browse the boards and back an idea.',
                  },
                )
              : t(
                  'myActivity.emptyPosts',
                  {},
                  {
                    defaultValue: 'You have not posted a request yet.',
                  },
                )}
          </p>
          <Link
            to={tab === 'votes' ? '/boards' : '/submit'}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
            )}
          >
            {tab === 'votes'
              ? t('myActivity.browseCta', {}, { defaultValue: 'Browse boards' })
              : t('myActivity.submitCta', {}, { defaultValue: 'Post a request' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onVote={toggleVote}
              votingDisabled={votingId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyActivity
