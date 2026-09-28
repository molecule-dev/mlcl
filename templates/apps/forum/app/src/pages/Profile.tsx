/**
 * Profile — /u/:username public user profile.
 *
 * Layout: cover banner → avatar+name+reputation → stats row → tab bar
 * (Posts / Comments / Saved) → content list.
 *
 * Loaded from `GET /api/profiles/:identifier` which accepts username,
 * full UUID, or short id-prefix.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReputationBadge } from '../components/ReputationBadge.js'
import { ThreadRow } from '../components/ThreadRow.js'
import { type ApiThread, decorateApiThreadToRow, formatRelativeTime } from '../utils/threads.js'

interface ApiReply {
  id: string
  thread_id: string
  body: string
  body_markdown?: string | null
  created_at: string
  vote_score?: number | null
  thread?: { id: string; slug?: string | null; title?: string | null } | null
}

const TABS = [
  { id: 'posts', icon: 'forum', labelKey: 'profile.tabPosts', defaultLabel: 'Posts' },
  {
    id: 'comments',
    icon: 'chat_bubble',
    labelKey: 'profile.tabComments',
    defaultLabel: 'Comments',
  },
  { id: 'saved', icon: 'bookmark', labelKey: 'profile.tabSaved', defaultLabel: 'Saved' },
] as const

interface ProfileResponse {
  user: {
    id: string
    username: string | null
    name: string | null
    bio: string | null
    avatar_url: string | null
    reputation: number
    role: string
    joined: string | null
  }
  stats: {
    postCount: number
    commentCount: number
    karma: number
  }
  recentThreads: ApiThread[]
  recentReplies?: ApiReply[]
  savedThreads?: ApiThread[]
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ username: string }>()
  const username = params.username ?? ''
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('posts')
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    let mounted = true
    void (async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const http = getHttpClient()
        const res = await http.get<ProfileResponse>(`/api/profiles/${encodeURIComponent(username)}`)
        if (!mounted) return
        setData(res.data)
      } catch (error) {
        logError('profile.load', error)
        if (!mounted) return
        setNotFound(true)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [username])

  const displayName = data?.user.name ?? data?.user.username ?? username
  const handle = data?.user.username ?? data?.user.id?.slice(0, 8) ?? username
  const joinedLabel = useMemo(() => {
    if (!data?.user.joined) return ''
    const d = new Date(data.user.joined)
    return t(
      'profile.joined',
      { date: d.toLocaleString(undefined, { month: 'short', year: 'numeric' }) },
      { defaultValue: 'Joined {{date}}' },
    )
  }, [data?.user.joined, t])

  const rows = useMemo(
    () => (data?.recentThreads ?? []).map((th) => decorateApiThreadToRow(th, null)),
    [data?.recentThreads],
  )
  const savedRows = useMemo(
    () => (data?.savedThreads ?? []).map((th) => decorateApiThreadToRow(th, null)),
    [data?.savedThreads],
  )
  const replyRows = data?.recentReplies ?? []

  if (loading) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
      </p>
    )
  }
  if (notFound || !data) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
          cm.sp('p', 8),
          'rounded-lg border border-dashed border-outline-variant/60 text-on-surface-variant text-center',
        )}
      >
        <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('profile.notFound', {}, { defaultValue: 'No such user.' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <div
        className={cm.cn('rounded-2xl overflow-hidden border border-outline-variant/40 bg-surface')}
      >
        <div
          className={cm.cn(
            'h-32 relative bg-gradient-to-br from-primary to-primary-container overflow-hidden',
          )}
          aria-hidden="true"
        >
          <div
            className={cm.cn(
              cm.w(60),
              cm.h(60),
              cm.roundedFull,
              'absolute -right-10 -top-10 bg-surface/10 blur-3xl',
            )}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('pb', 6),
            '-mt-6',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'shrink-0 text-3xl border-4 border-surface bg-surface-container-low',
            )}
            style={{ color: 'var(--color-primary, var(--color-pinned))' }}
            aria-hidden="true"
          >
            {(displayName || '?').slice(0, 1).toUpperCase()}
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              'flex-1 min-w-0',
              cm.sp('mt', 8),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <h1
                className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}
              >
                {displayName}
              </h1>
              <ReputationBadge karma={data.stats.karma} showTier />
              {data.user.role !== 'member' && (
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    cm.sp('px', 2),
                    cm.sp('py', 0),
                    'rounded-full uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: 'var(--color-moderator-light, var(--color-moderator-light))',
                    color: 'var(--color-moderator, var(--color-moderator))',
                  }}
                >
                  {data.user.role}
                </span>
              )}
            </div>
            <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-primary')}>
              {t('profile.usernamePrefix', {}, { defaultValue: 'u/' })}
              {handle}
            </span>
            {joinedLabel && (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {joinedLabel}
              </span>
            )}
            {data.user.bio && (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant max-w-2xl leading-relaxed',
                )}
              >
                {data.user.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={cm.cn('grid gap-3 grid-cols-2 md:grid-cols-4')}>
        {[
          { value: data.stats.karma, labelKey: 'profile.statKarma', defaultLabel: 'Karma' },
          { value: data.stats.postCount, labelKey: 'profile.statPosts', defaultLabel: 'Posts' },
          {
            value: data.stats.commentCount,
            labelKey: 'profile.statComments',
            defaultLabel: 'Comments',
          },
          {
            value: data.user.reputation,
            labelKey: 'profile.statReputation',
            defaultLabel: 'Reputation',
          },
        ].map((stat) => (
          <div
            key={stat.labelKey}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-low/40',
              cm.accentCard({ tone: 'primary' }),
            )}
          >
            <span className={cm.accentCardLabel({ tone: 'primary' })}>
              {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-2xl font-extrabold tabular-nums text-on-surface',
              )}
            >
              {stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'flex-wrap border-b border-outline-variant/30',
        )}
      >
        {TABS.map((current) => {
          const isActive = current.id === tab
          return (
            <button
              key={current.id}
              type="button"
              onClick={() => setTab(current.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'transition-colors',
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant border-b-2 border-transparent hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{current.icon}</span>
              {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
            </button>
          )
        })}
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        {tab === 'posts' && rows.length === 0 && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noPosts', {}, { defaultValue: 'No posts yet.' })}
          </p>
        )}
        {tab === 'posts' && rows.map((p) => <ThreadRow key={p.id} thread={p} />)}
        {tab === 'comments' && replyRows.length === 0 && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noComments', {}, { defaultValue: 'No comments yet.' })}
          </p>
        )}
        {tab === 'comments' && replyRows.length > 0 && (
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'rounded-xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/30',
            )}
          >
            {replyRows.map((r) => {
              const threadId = r.thread?.id ?? r.thread_id
              const threadTitle =
                r.thread?.title ?? t('profile.unknownThread', {}, { defaultValue: '(thread)' })
              return (
                <li key={r.id} className={cm.cn(cm.sp('p', 4))}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      'flex-wrap',
                    )}
                  >
                    <Link
                      to={`/thread/${threadId}`}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface hover:text-primary',
                      )}
                    >
                      {threadTitle}
                    </Link>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {formatRelativeTime(r.created_at)}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant whitespace-pre-line line-clamp-3',
                    )}
                  >
                    {r.body_markdown || r.body}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {tab === 'saved' && savedRows.length === 0 && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noSaved', {}, { defaultValue: 'No saved posts yet.' })}
          </p>
        )}
        {tab === 'saved' && savedRows.map((p) => <ThreadRow key={p.id} thread={p} />)}
      </div>
    </div>
  )
}

export default Profile
