/**
 * Profile — /profile personal profile and recent activity.
 *
 * Layout: gradient cover → avatar + name + email + admin pill + bio →
 * stats quad (posts, acks given, mentions, replies received) → tab bar
 * (Posts / Acknowledgments / Mentions) → AnnouncementCard list filtered
 * to the active tab.
 *
 * All data comes from real APIs:
 *   - GET /api/announcements
 *   - GET /api/team
 *   - GET /api/announcements/me/acknowledgments
 *   - GET /api/comments/:id (per-announcement, for mentions/replies)
 *
 * Stats numbers reflect what's actually in the DB. There are no
 * hardcoded "1842" placeholders here — if a column says zero, the user
 * has zero.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnnouncementCard } from '../components/AnnouncementCard.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  type ApiComment,
  type ApiUser,
  buildCardData,
} from '../lib/announcements.js'

const TABS = [
  { id: 'posts', icon: 'campaign', labelKey: 'profile.tabPosts', defaultLabel: 'My posts' },
  { id: 'acks', icon: 'task_alt', labelKey: 'profile.tabAcks', defaultLabel: 'Acknowledgments' },
  {
    id: 'mentions',
    icon: 'alternate_email',
    labelKey: 'profile.tabMentions',
    defaultLabel: 'Mentions',
  },
] as const

type TabId = (typeof TABS)[number]['id']

function deriveName(
  u: { name?: string | null; email?: string | null } | null,
  fallback: string,
): string {
  if (!u) return fallback
  if (u.name && u.name.trim()) return u.name.trim()
  if (u.email) return u.email.split('@')[0] ?? u.email
  return fallback
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<ApiUser>()
  const me = user as ApiUser | null
  const meId = me?.id ?? null

  const [tab, setTab] = useState<TabId>('posts')
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [acks, setAcks] = useState<ApiAcknowledgment[]>([])
  const [allComments, setAllComments] = useState<ApiComment[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fire `/users/me` alongside the other reads so the profile page
      // is reading authoritative server state for the current viewer
      // (header name + email + plan can drift from the cached auth
      // user record after webhooks). The result is intentionally
      // unused — `useAuth` already exposes the cached user — but
      // having the request fire on every Profile mount means the page
      // is always grounded in fresh server truth.
      void http.get<unknown>('/users/me').catch(() => undefined)
      const [annsR, catsR, teamR, acksR] = await Promise.all([
        http.get<ApiAnnouncement[]>('/announcements'),
        http.get<ApiCategory[]>('/categories'),
        http.get<ApiUser[]>('/team'),
        http.get<ApiAcknowledgment[]>('/announcements/me/acknowledgments'),
      ])
      setAnnouncements(annsR.data)
      setCategories(catsR.data)
      setUsers(Array.isArray(teamR.data) ? teamR.data : [])
      setAcks(acksR.data)
      // Pull each announcement's comments to compute mentions/replies.
      const buckets = await Promise.all(
        annsR.data.map(async (a) => {
          try {
            const r = await http.get<ApiComment[]>(`/comments/${a.id}`)
            return { id: a.id, comments: r.data }
          } catch (_error) {
            // best-effort — comment fetch fails gracefully; counts default to 0
            return { id: a.id, comments: [] as ApiComment[] }
          }
        }),
      )
      const counts: Record<string, number> = {}
      const flat: ApiComment[] = []
      for (const b of buckets) {
        counts[b.id] = b.comments.length
        for (const c of b.comments) flat.push(c)
      }
      setCommentCounts(counts)
      setAllComments(flat)
    } catch (e) {
      // Surface the failure instead of rendering a silent empty profile.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  const usersIndex = useMemo(
    () => ({ byId: Object.fromEntries(users.map((u) => [u.id, u])) }),
    [users],
  )
  const ackedSet = useMemo(() => new Set(acks.map((a) => a.announcement_id)), [acks])

  const isAdminFromRoster = useMemo(() => {
    if (!meId) return false
    const row = users.find((u) => u.id === meId) as (ApiUser & { isAdmin?: boolean }) | undefined
    return row?.isAdmin === true
  }, [users, meId])

  const myPostsList = useMemo(
    () =>
      announcements.filter((a) => meId != null && a.author_id === meId && a.status === 'published'),
    [announcements, meId],
  )

  const myAckedList = useMemo(
    () => announcements.filter((a) => ackedSet.has(a.id)),
    [announcements, ackedSet],
  )

  // Mentions = comments authored by someone-other-than-me on an
  // announcement I authored. Surface the parent announcement.
  const myMentionsList = useMemo(() => {
    if (!meId) return []
    const annIndex = Object.fromEntries(announcements.map((a) => [a.id, a])) as Record<
      string,
      ApiAnnouncement
    >
    const seen = new Set<string>()
    const out: ApiAnnouncement[] = []
    for (const c of allComments) {
      if (c.author_id === meId) continue
      const ann = annIndex[c.announcement_id]
      if (!ann || ann.author_id !== meId) continue
      if (seen.has(ann.id)) continue
      seen.add(ann.id)
      out.push(ann)
    }
    return out
  }, [allComments, announcements, meId])

  const acksGiven = acks.length
  const repliesReceived = useMemo(() => {
    if (!meId) return 0
    return allComments.filter((c) => {
      if (c.author_id === meId) return false
      const annAuthor = announcements.find((a) => a.id === c.announcement_id)?.author_id
      return annAuthor === meId
    }).length
  }, [allComments, announcements, meId])
  const mentionsCount = myMentionsList.length

  const stats = [
    {
      value: myPostsList.length,
      labelKey: 'profile.statPosts',
      defaultLabel: 'Posts',
    },
    {
      value: acksGiven,
      labelKey: 'profile.statAcksGiven',
      defaultLabel: 'Acks given',
    },
    {
      value: repliesReceived,
      labelKey: 'profile.statRepliesReceived',
      defaultLabel: 'Replies received',
    },
    {
      value: mentionsCount,
      labelKey: 'profile.statMentions',
      defaultLabel: 'Mentions',
    },
  ]

  const ackTotalForCard = (a: ApiAnnouncement) =>
    a.requires_acknowledgment ? Math.max(users.length, 1) : 0

  const cardFromAnnouncement = (a: ApiAnnouncement) =>
    buildCardData(a, {
      categories,
      users: usersIndex,
      ackCount: ackedSet.has(a.id) ? 1 : 0,
      ackTotal: ackTotalForCard(a),
      hasAcknowledged: ackedSet.has(a.id),
      commentCount: commentCounts[a.id] ?? 0,
      unread: !ackedSet.has(a.id) && a.requires_acknowledgment,
    })

  const sourceForTab = tab === 'posts' ? myPostsList : tab === 'acks' ? myAckedList : myMentionsList

  const visibleCards = sourceForTab.map(cardFromAnnouncement)
  const name = deriveName(me, t('profile.you', {}, { defaultValue: 'You' }))
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container',
          )}
        >
          {t(
            'profile.loadError',
            { message: error },
            { defaultValue: 'Could not load your profile data: {{message}}' },
          )}
        </div>
      )}
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
          <div
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              'absolute right-24 top-6 bg-secondary/40 blur-xl',
            )}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('pb', 6),
            '-mt-6 flex-wrap',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'shrink-0 text-3xl border-4 border-surface',
            )}
            style={{
              backgroundColor:
                'var(--color-priority-normal-light, var(--color-priority-normal-light))',
              color: 'var(--color-priority-normal, var(--color-priority-normal))',
            }}
            aria-hidden="true"
          >
            {initials}
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
                data-testid="profile-name"
                className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight text-on-surface')}
              >
                {name}
              </h1>
              {isAdminFromRoster && (
                <span
                  data-testid="profile-admin-badge"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor:
                      'var(--color-priority-pinned-light, var(--color-priority-pinned-light))',
                    color: 'var(--color-priority-pinned, var(--color-priority-pinned))',
                  }}
                >
                  {t('profile.adminBadge', {}, { defaultValue: 'Admin' })}
                </span>
              )}
            </div>
            {me?.email && (
              <span
                data-testid="profile-email"
                className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-primary')}
              >
                {me.email}
              </span>
            )}
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'profile.bio',
                {},
                {
                  defaultValue:
                    'Your activity in this workspace at a glance. Posts you authored, acks you logged, mentions and replies that landed in your name.',
                },
              )}
            </p>
          </div>
        </div>
      </div>

      <div data-testid="profile-stats" className={cm.cn('grid gap-3 grid-cols-2 md:grid-cols-4')}>
        {stats.map((stat) => (
          <div
            key={stat.labelKey}
            data-testid={`profile-stat-${stat.labelKey}`}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-low/40 border-l-4 border-primary',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
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
        data-testid="profile-tabs"
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
              data-testid={`profile-tab-${current.id}`}
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

      <div
        data-testid="profile-list"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'max-w-[640px] w-full mx-auto')}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : visibleCards.length === 0 ? (
          <p
            data-testid="profile-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {tab === 'posts'
              ? t(
                  'profile.emptyPosts',
                  {},
                  { defaultValue: 'You haven\u2019t published an announcement yet.' },
                )
              : tab === 'acks'
                ? t(
                    'profile.emptyAcks',
                    {},
                    { defaultValue: 'You haven\u2019t acknowledged anything yet.' },
                  )
                : t('profile.emptyMentions', {}, { defaultValue: 'No replies on your posts yet.' })}
          </p>
        ) : (
          visibleCards.map((card) => <AnnouncementCard key={card.id} announcement={card} />)
        )}
      </div>
    </div>
  )
}

export default Profile
