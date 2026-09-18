import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { CairnKpiCard } from '../components/CairnKpiCard.js'
import { extractExcerpt } from '../lib/markdown.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MeProps {
  id: string
  name: string | null
  email: string
}

interface MeResponse {
  props: MeProps
}

interface ApiSpace {
  id: string
  key: string
  name: string
  color: string | null
}

interface ApiArticle {
  id: string
  space_id: string
  author_user_id: string
  title: string
  body_md?: string
  status: CairnArticleStatus
  updated_at: string
}

interface ApiBookmark {
  id: string
  resourceType: string
  resourceId: string
}

const SPACE_COLORS = ['#0f766e', '#d97706', '#7c3aed', '#b91c1c', '#16a34a', '#0d9488']

function deriveInitials(name: string | null | undefined, email: string): string {
  const source = (name?.trim() || email.split('@')[0] || '').replace(/[^a-zA-Z\s.]/g, ' ')
  const parts = source.split(/\s+|\./).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<MeProps | null>(null)
  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [articles, setArticles] = useState<ApiArticle[]>([])
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/users/me').catch(() => null),
      http.get('/spaces').catch(() => null),
      http.get('/articles').catch(() => null),
      http.get('/bookmarks').catch(() => null),
    ])
      .then(([meRes, spacesRes, articlesRes, bookmarksRes]) => {
        if (cancelled) return
        const u = unwrapSingle<MeResponse>(meRes)
        if (u?.props) setMe(u.props)
        setSpaces(unwrapList<ApiSpace>(spacesRes))
        setArticles(unwrapList<ApiArticle>(articlesRes))
        setBookmarkCount(unwrapList<ApiBookmark>(bookmarksRes).length)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const userName = me?.name?.trim() || me?.email?.split('@')[0] || ''
  const userEmail = me?.email ?? ''
  const initials = deriveInitials(me?.name, userEmail)

  const myArticles = me ? articles.filter((a) => a.author_user_id === me.id) : []
  const publishedCount = myArticles.filter((a) => a.status === 'published').length
  const draftsCount = myArticles.filter((a) => a.status === 'draft').length
  const recent = [...myArticles]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
  const spaceById = new Map(spaces.map((s) => [s.id, s]))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-8')}>
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
        )}
      >
        <div className={cm.flex({ align: 'start', gap: 'md', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-24 w-24 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary text-3xl font-extrabold text-white shadow-lg',
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className={cm.cn('min-w-0 flex-1')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-secondary',
              )}
            >
              {t('profile.eyebrow', {}, { defaultValue: 'Authoring profile' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight',
              )}
            >
              {loading
                ? '\u2026'
                : userName || t('profile.unknown', {}, { defaultValue: 'Workspace member' })}
            </h1>
            {userEmail ? (
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
                {userEmail}
              </p>
            ) : null}
          </div>
          <Link
            to="/settings"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
            )}
          >
            {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
          </Link>
        </div>
      </section>

      <section className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'sm:grid-cols-4')}>
        <CairnKpiCard
          label={t('profile.stats.published', {}, { defaultValue: 'Articles published' })}
          value={publishedCount}
          tone="primary"
          hint={t(
            'profile.stats.publishedHint',
            {},
            { defaultValue: 'Across all spaces you author' },
          )}
        />
        <CairnKpiCard
          label={t('profile.stats.drafts', {}, { defaultValue: 'Drafts in flight' })}
          value={draftsCount}
          tone="warning"
          hint={t('profile.stats.draftsHint', {}, { defaultValue: 'Open for the next pass' })}
        />
        <CairnKpiCard
          label={t('profile.stats.bookmarks', {}, { defaultValue: 'Articles bookmarked' })}
          value={bookmarkCount}
          tone="info"
          hint={t('profile.stats.bookmarksHint', {}, { defaultValue: 'Saved for later' })}
        />
        <CairnKpiCard
          label={t('profile.stats.spaces', {}, { defaultValue: 'Spaces you maintain' })}
          value={spaces.length}
          tone="success"
          hint={t('profile.stats.spacesHint', {}, { defaultValue: 'Owned or co-maintained' })}
        />
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>
          {t('profile.spaces', {}, { defaultValue: 'Spaces I maintain' })}
        </h2>
        {spaces.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'profile.spacesEmpty',
              {},
              { defaultValue: 'You don\u2019t own any spaces yet. Create one to start writing.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
            {spaces.map((s, idx) => (
              <li key={s.id}>
                <Link
                  to={`/spaces/${s.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-xl transition-colors hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn('h-3 w-3 shrink-0 rounded-full')}
                    style={{ backgroundColor: s.color ?? SPACE_COLORS[idx % SPACE_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className={cm.cn(cm.fontWeight('extrabold'), 'flex-1 text-on-surface')}>
                    {s.name}
                  </span>
                  <span
                    className={cm.cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-primary/15 text-primary',
                    )}
                  >
                    {t('profile.roleEditor', {}, { defaultValue: 'Editor' })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'profile.recentHeading',
            { name: userName || 'you' },
            { defaultValue: 'Recent articles by {{name}}' },
          )}
        </h2>
        {recent.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('py', 8),
              'text-center text-sm text-on-surface-variant',
            )}
          >
            {t(
              'profile.recentEmpty',
              {},
              {
                defaultValue:
                  'You haven\u2019t published or drafted anything yet. The first article is the hardest.',
              },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
            {recent.map((a) => (
              <CairnArticleRow
                key={a.id}
                id={a.id}
                title={a.title}
                excerpt={extractExcerpt(a.body_md ?? '')}
                spaceName={spaceById.get(a.space_id)?.name ?? ''}
                authorName={userName}
                authorInitials={initials}
                status={a.status}
                updatedAt={a.updated_at}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
