import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ReputationBadge } from '../components/ReputationBadge.js'
import { ThreadRow, type ThreadStatus } from '../components/ThreadRow.js'

interface UserProfile {
  id: string
  username: string
  display_name: string
  bio?: string
  joined_at: string
  reputation: number
  post_count: number
  thread_count: number
  solutions_count: number
  followers_count: number
  viewer_following?: boolean
  badges: Array<{ id: string; label: string; color?: string; icon?: string }>
  recent_threads: Array<{
    id: string
    slug?: string
    title: string
    excerpt?: string
    category?: { name: string; slug: string; color?: string }
    reply_count: number
    view_count: number
    last_activity_at: string
    statuses?: ThreadStatus[]
  }>
}

const formatJoined = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export function UserProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const params = useParams<{ username: string }>()
  const { user: viewer } = useAuth<{ id: string }>()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [following, setFollowing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.username) return
    let cancelled = false
    setLoading(true)
    http
      .get<{ data: UserProfile }>(`/api/users/by-username/${params.username}`)
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data
        if (data) {
          setProfile(data)
          setFollowing(!!data.viewer_following)
          setError(null)
        } else {
          setProfile(null)
          setError('User not found')
        }
      })
      .catch((e) => {
        if (cancelled) return
        setProfile(null)
        const msg = e instanceof Error ? e.message : String(e)
        if (/404/.test(msg) || /not found/i.test(msg)) {
          setError(t('userProfile.notFound', {}, { defaultValue: 'User not found.' }))
        } else {
          setError(msg || t('userProfile.failed', {}, { defaultValue: 'Failed to load profile' }))
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, params.username]) // t is stable across renders; omitted to avoid re-fetching on locale change

  if (loading) {
    return (
      <div className={cm.cn(cm.stack(4))}>
        <p className={cm.textMuted}>
          {t('nav.loadingProfile', {}, { defaultValue: 'Loading profile…' })}
        </p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={cm.cn(cm.stack(4))}>
        <p className={cm.textMuted} role="alert">
          {error ?? t('userProfile.notFound', {}, { defaultValue: 'User not found.' })}
        </p>
        <Link to="/c" className={cm.cn('text-primary hover:underline')}>
          {t('userProfile.backToCategories', {}, { defaultValue: '← Back to categories' })}
        </Link>
      </div>
    )
  }

  const p = profile
  const isOwnProfile = viewer?.id === p.id

  // Persisted follow toggle — optimistic flip, reverted if the API rejects it.
  const handleToggleFollow = async () => {
    const next = !following
    setFollowing(next)
    setProfile((prev) =>
      prev
        ? { ...prev, followers_count: Math.max(prev.followers_count + (next ? 1 : -1), 0) }
        : prev,
    )
    try {
      if (next) {
        await http.post(`/api/users/${p.id}/follow`)
      } else {
        await http.delete(`/api/users/${p.id}/follow`)
      }
    } catch (_error) {
      // Revert the optimistic toggle so the button reflects the real state.
      setFollowing(!next)
      setProfile((prev) =>
        prev
          ? { ...prev, followers_count: Math.max(prev.followers_count + (next ? -1 : 1), 0) }
          : prev,
      )
    }
  }

  const stats = [
    {
      labelKey: 'userProfile.stat.reputation',
      defaultLabel: 'Reputation',
      value: p.reputation.toLocaleString(),
    },
    {
      labelKey: 'userProfile.stat.posts',
      defaultLabel: 'Posts',
      value: p.post_count.toLocaleString(),
    },
    {
      labelKey: 'userProfile.stat.threads',
      defaultLabel: 'Threads',
      value: p.thread_count.toLocaleString(),
    },
    {
      labelKey: 'userProfile.stat.solutions',
      defaultLabel: 'Solutions',
      value: p.solutions_count.toLocaleString(),
    },
    {
      labelKey: 'userProfile.stat.followers',
      defaultLabel: 'Followers',
      value: p.followers_count.toLocaleString(),
    },
  ]

  return (
    <div className={cm.cn(cm.stack(8))}>
      <header
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ direction: 'col', gap: 'lg' }),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-[var(--color-hero-gradient-end)] text-white shadow-[0_24px_60px_-20px_var(--color-shadow-hero)]',
        )}
      >
        <div
          aria-hidden
          className={cm.cn(
            cm.roundedFull,
            cm.w(64),
            cm.h(64),
            'absolute -right-24 -top-24 bg-secondary/30 blur-3xl',
          )}
        />
        <div
          aria-hidden
          className={cm.cn(
            cm.roundedFull,
            cm.w(64),
            cm.h(64),
            'absolute -left-24 -bottom-24 bg-surface/15 blur-3xl',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap relative z-10')}>
          <div
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'bg-surface/15 backdrop-blur-md text-white text-3xl border border-surface/20',
            )}
            aria-hidden
          >
            {(p.display_name || p.username).slice(0, 2).toUpperCase()}
          </div>
          <div className={cm.cn(cm.flex1, cm.stack(2))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'self-start text-[10px] uppercase tracking-[0.3em] bg-surface/20 backdrop-blur-md',
              )}
            >
              {t(
                'userProfile.eyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} member' },
              )}
            </span>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}
            >
              {p.display_name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/80')}>
              <span className={cm.fontWeight('semibold')}>@{p.username}</span>
              <span className={cm.cn('mx-2 text-white/50')}>·</span>
              {t(
                'userProfile.joined',
                { date: formatJoined(p.joined_at) },
                { defaultValue: 'Joined {{date}}' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <ReputationBadge score={p.reputation} showScore />
            {!isOwnProfile && (
              <button
                type="button"
                onClick={handleToggleFollow}
                aria-pressed={following}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-colors',
                  following
                    ? 'bg-surface text-primary'
                    : 'bg-surface/15 backdrop-blur-md hover:bg-surface/25 text-white border border-surface/30',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                  {following ? 'check' : 'person_add'}
                </span>
                {following
                  ? t('common.following', {}, { defaultValue: 'Following' })
                  : t('common.follow', {}, { defaultValue: 'Follow' })}
              </button>
            )}
          </div>
        </div>
        {p.bio && (
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.maxW('xl'),
              'text-white/85 leading-relaxed relative z-10',
            )}
          >
            {p.bio}
          </p>
        )}
        <div className={cm.cn('flex flex-wrap gap-3 relative z-10')}>
          {stats.map((s) => (
            <div
              key={s.labelKey}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 min-w-[120px]',
              )}
            >
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-[0.25em] text-white/75',
                )}
              >
                {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </header>

      {(p.badges?.length ?? 0) > 0 && (
        <section className={cm.stack(3)}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('userProfile.badges', {}, { defaultValue: 'Badges' })}
          </h2>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {p.badges.map((badge) => (
              <span
                key={badge.id}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-2 text-xs uppercase tracking-widest border',
                )}
                style={{
                  background: `${badge.color ?? 'var(--color-author)'}15`,
                  color: badge.color ?? 'var(--color-author)',
                  borderColor: `${badge.color ?? 'var(--color-author)'}40`,
                }}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden>
                  {badge.icon ?? 'verified'}
                </span>
                {badge.label}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-2')}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('userProfile.recentThreads', {}, { defaultValue: 'Recent threads' })}
          </h2>
          <Link
            to="/c"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline',
            )}
          >
            {t('userProfile.browseAll', {}, { defaultValue: 'Browse all' })}
          </Link>
        </div>
        {(p.recent_threads?.length ?? 0) === 0 ? (
          <p className={cm.textMuted}>
            {t('userProfile.noThreads', {}, { defaultValue: 'No threads yet.' })}
          </p>
        ) : (
          <div
            className={cm.cn(
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden',
            )}
          >
            {p.recent_threads.map((thread) => (
              <ThreadRow
                key={thread.id}
                id={thread.id}
                slug={thread.slug}
                title={thread.title}
                excerpt={thread.excerpt}
                author={{ username: p.username, reputation: p.reputation }}
                category={thread.category}
                replyCount={thread.reply_count}
                viewCount={thread.view_count}
                lastActivityAt={thread.last_activity_at}
                statuses={thread.statuses}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default UserProfile
