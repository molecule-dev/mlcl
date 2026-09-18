import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'

interface ProfileSummary {
  id: string
  username: string
  karma: number
  post_count: number
  comment_count: number
  saved_count: number
  member_since: string
  bio?: string
}

const EMPTY_PROFILE: ProfileSummary = {
  id: '',
  username: '',
  karma: 0,
  post_count: 0,
  comment_count: 0,
  saved_count: 0,
  member_since: new Date().toISOString(),
}

const TABS: Array<{ key: 'posts' | 'comments' | 'saved'; label: string; default: string }> = [
  { key: 'posts', label: 'tabs.posts', default: 'Posts' },
  { key: 'comments', label: 'tabs.comments', default: 'Comments' },
  { key: 'saved', label: 'tabs.saved', default: 'Saved' },
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id = 'me' } = useParams<{ id: string }>()

  const [profile, setProfile] = useState<ProfileSummary>(EMPTY_PROFILE)
  const [tab, setTab] = useState<'posts' | 'comments' | 'saved'>('posts')
  const [items, setItems] = useState<LinkPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<{ data?: unknown }>(`/api/users/${id}/profile`).catch(() => null),
      http.get<{ data?: unknown }>(`/api/users/${id}/${tab}`).catch(() => null),
    ]).then(([profileRes, listRes]) => {
      if (!active) return
      const profileData = unwrap(profileRes) as Partial<ProfileSummary> | null
      if (profileData && typeof profileData === 'object') {
        setProfile({ ...EMPTY_PROFILE, ...profileData })
      } else {
        setError(t('profile.notFound', {}, { defaultValue: 'Profile not found.' }))
      }
      const listData = unwrap(listRes)
      setItems(normalizePosts(listData))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [http, id, tab, t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('profile.eyebrow', {}, { defaultValue: 'profile' })}
        headlineKey="headline"
        headlineDefault={`u/${profile.username}`}
        bodyKey="body"
        bodyDefault={
          profile.bio ??
          t(
            'profile.bioFallback',
            { appName: APP_NAME },
            { defaultValue: 'A reader on {{appName}}.' },
          )
        }
        pillIcon="local_fire_department"
        pillKey="pill"
        pillDefault={t(
          'profile.pillKarma',
          { karma: profile.karma },
          { defaultValue: '{{karma}} karma' },
        )}
      />

      <section className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'sm:grid-cols-4')}>
        {[
          { value: profile.post_count, label: 'Posts' },
          { value: profile.comment_count, label: 'Comments' },
          { value: profile.saved_count, label: 'Saved' },
          { value: profile.karma, label: 'Karma' },
        ].map((stat) => (
          <article
            key={stat.label}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 4),
              'rounded-2xl bg-surface-container-lowest border-l-4 border-primary',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`profile.${stat.label.toLowerCase()}`, {}, { defaultValue: stat.label })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tabular-nums tracking-tight text-on-surface',
              )}
            >
              {stat.value.toLocaleString()}
            </span>
          </article>
        ))}
      </section>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          'border-b border-outline-variant/30',
        )}
      >
        {TABS.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => setTab(it.key)}
            className={cm.cn(
              cm.sp('px', 1),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'transition-colors',
              tab === it.key
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-on-surface-variant hover:text-primary',
            )}
            aria-pressed={tab === it.key}
          >
            {t(`profile.${it.label}`, {}, { defaultValue: it.default })}
          </button>
        ))}
      </nav>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        {loading ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t('profile.loading', {}, { defaultValue: 'Loading\u2026' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-error')} role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t('profile.empty', {}, { defaultValue: 'Nothing here yet.' })}
          </p>
        ) : (
          items.map((p) => <LinkPostCard key={p.id} post={p} />)
        )}
      </section>

      <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'profile.memberSince',
          { date: new Date(profile.member_since).toLocaleDateString() },
          { defaultValue: 'Member since {{date}}' },
        )}
      </p>
    </div>
  )
}

function unwrap(res: { data?: unknown } | null): unknown {
  if (!res) return null
  const top = res.data
  if (top && typeof top === 'object' && 'data' in top) {
    return (top as { data: unknown }).data
  }
  return top ?? null
}

function normalizePosts(payload: unknown): LinkPost[] {
  const list = Array.isArray(payload) ? payload : []
  return list.map((row) => {
    const r = row as Record<string, unknown>
    // The Comments tab returns comment rows ({ body, link_id, … }) rather
    // than link rows — surface the comment text as the card title and point
    // the card at the parent link so "comments" links resolve to the thread.
    if (typeof r.title !== 'string' && typeof r.body === 'string') {
      return {
        id: String(r.link_id ?? r.id ?? ''),
        title: r.body.length > 140 ? `${r.body.slice(0, 140)}…` : r.body,
        url: null,
        domain: null,
        text: null,
        submitter_id: String(r.author_id ?? ''),
        submitter_name: typeof r.author_name === 'string' ? r.author_name : undefined,
        sub_slug: undefined,
        sub_name: undefined,
        points: Number(r.points ?? 0),
        comment_count: 0,
        tags: [],
        saved: false,
        user_vote: null,
        created_at: String(r.created_at ?? new Date().toISOString()),
      }
    }
    return {
      id: String(r.id ?? ''),
      title: String(r.title ?? ''),
      url: typeof r.url === 'string' ? r.url : null,
      domain: typeof r.domain === 'string' ? r.domain : null,
      text: typeof r.text === 'string' ? r.text : null,
      submitter_id: String(r.submitter_id ?? ''),
      submitter_name: typeof r.submitter_name === 'string' ? r.submitter_name : undefined,
      sub_slug: typeof r.sub_slug === 'string' ? r.sub_slug : undefined,
      sub_name: typeof r.sub_name === 'string' ? r.sub_name : undefined,
      points: Number(r.points ?? 0),
      comment_count: Number(r.comment_count ?? 0),
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      saved: Boolean(r.saved),
      user_vote: r.user_vote === 'up' || r.user_vote === 'down' ? r.user_vote : null,
      created_at: String(r.created_at ?? new Date().toISOString()),
    }
  })
}

export default Profile
