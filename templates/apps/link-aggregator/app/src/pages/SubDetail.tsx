import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'
import { formatCount, type SubSummary } from '../components/SubBadge.js'

const RULES_FALLBACK = [
  { key: 'subDetail.rules.curious', defaultValue: 'Stay curious. No personal attacks.' },
  {
    key: 'subDetail.rules.selfPromotion',
    defaultValue: 'Self-promotion needs context \u2014 tell us why we should read.',
  },
  { key: 'subDetail.rules.spoilers', defaultValue: 'Mark spoilers in the title.' },
  { key: 'subDetail.rules.sources', defaultValue: 'Cite primary sources whenever possible.' },
]

export function SubDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { slug = '' } = useParams<{ slug: string }>()

  const [sub, setSub] = useState<SubSummary | null>(null)
  const [posts, setPosts] = useState<LinkPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      http.get(`/api/subs/${slug}`).catch(() => null),
      http.get(`/api/links?sub=${encodeURIComponent(slug)}`).catch(() => null),
    ])
      .then(([subRes, linksRes]) => {
        if (!active) return
        const subEnvelope = (subRes as { data?: unknown } | null)?.data
        const subData =
          subEnvelope && typeof subEnvelope === 'object' && 'data' in (subEnvelope as object)
            ? (subEnvelope as { data: unknown }).data
            : subEnvelope
        const linksEnvelope = (linksRes as { data?: unknown } | null)?.data
        const linksData =
          linksEnvelope && typeof linksEnvelope === 'object' && 'data' in (linksEnvelope as object)
            ? (linksEnvelope as { data: unknown }).data
            : linksEnvelope
        setSub(
          (subData as SubSummary) ?? {
            slug,
            name: slug,
            description: t(
              'subDetail.descriptionFallback',
              { appName: APP_NAME },
              { defaultValue: 'A small, focused community on {{appName}}.' },
            ),
            member_count: 0,
          },
        )
        setPosts(normalizePosts(linksData))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [http, slug, t])

  const join = async () => {
    if (!sub) return
    const wasJoined = !!sub.joined
    setSub({
      ...sub,
      joined: !wasJoined,
      member_count: (sub.member_count ?? 0) + (wasJoined ? -1 : 1),
    })
    try {
      const res = await http.post<{ joined: boolean; member_count: number }>(
        `/api/subs/${sub.slug}/${wasJoined ? 'leave' : 'join'}`,
      )
      const data = (res as { data?: { joined?: boolean; member_count?: number } })?.data
      if (data) {
        setSub((s) =>
          s
            ? {
                ...s,
                joined: typeof data.joined === 'boolean' ? data.joined : !wasJoined,
                member_count:
                  typeof data.member_count === 'number' ? data.member_count : s.member_count,
              }
            : s,
        )
      }
    } catch (_error) {
      // Optimistic revert — server rejected the join/leave; restore prior membership state.
      setSub((s) =>
        s
          ? {
              ...s,
              joined: wasJoined,
              member_count: (s.member_count ?? 0) + (wasJoined ? 1 : -1),
            }
          : s,
      )
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('subDetail.eyebrow', {}, { defaultValue: 'sub-community' })}
        headlineKey="headline"
        headlineDefault={`c/${sub?.name ?? slug}`}
        bodyKey="body"
        bodyDefault={
          sub?.description ??
          t('subDetail.bodyFallback', {}, { defaultValue: 'A small, focused community.' })
        }
        pillIcon="group"
        pillKey="pill"
        pillDefault={t(
          'subDetail.pill',
          { count: formatCount(sub?.member_count ?? 0) },
          { defaultValue: '{{count}} members' },
        )}
        cta={
          <button
            type="button"
            onClick={join}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest transition-colors',
              sub?.joined
                ? 'bg-surface/20 text-white hover:bg-surface/30 backdrop-blur-md'
                : 'bg-surface text-primary hover:bg-surface/90',
            )}
          >
            {sub?.joined
              ? t('subDetail.joined', {}, { defaultValue: 'Joined' })
              : t('subDetail.join', {}, { defaultValue: 'Join sub' })}
          </button>
        }
      />

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'lg:col-span-2')}>
          {loading ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
              {t('subDetail.loading', {}, { defaultValue: 'Loading the sub\u2026' })}
            </p>
          ) : posts.length === 0 ? (
            <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
              {t(
                'subDetail.empty',
                {},
                {
                  defaultValue: 'No posts here yet \u2014 share a link to start the conversation.',
                },
              )}
            </p>
          ) : (
            posts.map((p, i) => <LinkPostCard key={p.id} post={p} rank={i + 1} />)
          )}
        </section>
        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('subDetail.rulesEyebrow', {}, { defaultValue: 'Sub rules' })}
            </p>
            <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              {RULES_FALLBACK.map((rule, i) => (
                <li key={i} className={cm.cn(cm.flex({ gap: 'sm' }), 'text-on-surface-variant')}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-primary')}>
                    {i + 1}.
                  </span>
                  <span>{t(rule.key, {}, { defaultValue: rule.defaultValue })}</span>
                </li>
              ))}
            </ol>
          </section>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('subDetail.modsEyebrow', {}, { defaultValue: 'Moderators' })}
            </p>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textSize('sm'))}>
              {['mira', 'ren', 'arnav'].map((name) => (
                <li
                  key={name}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'text-on-surface')}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(7),
                      cm.h(7),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      'bg-primary/15 text-primary uppercase',
                    )}
                  >
                    {name.slice(0, 1)}
                  </span>
                  <span>u/{name}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function normalizePosts(payload: unknown): LinkPost[] {
  const list = Array.isArray(payload) ? payload : []
  return list.map((row) => {
    const r = row as Record<string, unknown>
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

export default SubDetail
