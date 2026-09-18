import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'

interface Collection {
  slug: string
  name: string
  count: number
}

const ALL_COLLECTION: Collection = { slug: 'all', name: 'All saved', count: 0 }

export function Saved() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [collections, setCollections] = useState<Collection[]>([ALL_COLLECTION])
  const [active, setActive] = useState('all')
  const [posts, setPosts] = useState<LinkPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const folderQuery = active === 'all' ? '' : `?folder=${encodeURIComponent(active)}`
    Promise.all([
      http.get<{ data?: Collection[] }>('/api/bookmarks/collections').catch(() => null),
      http
        .get<{ data?: unknown[]; total?: number }>(`/api/bookmarks${folderQuery}`)
        .catch(() => null),
    ])
      .then(([collRes, postsRes]) => {
        if (!alive) return
        const collEnvelope = (collRes as { data?: { data?: Collection[] } | Collection[] } | null)
          ?.data
        const collData = Array.isArray(collEnvelope)
          ? collEnvelope
          : Array.isArray((collEnvelope as { data?: Collection[] } | undefined)?.data)
            ? (collEnvelope as { data: Collection[] }).data
            : []
        const totalSaved = (postsRes as { data?: { total?: number } } | null)?.data?.total ?? 0
        setCollections([
          { ...ALL_COLLECTION, count: totalSaved },
          ...collData.filter((c) => c.slug && c.slug !== 'all'),
        ])
        const postEnvelope = (postsRes as { data?: { data?: unknown[] } | unknown[] } | null)?.data
        const postData = Array.isArray(postEnvelope)
          ? postEnvelope
          : Array.isArray((postEnvelope as { data?: unknown[] } | undefined)?.data)
            ? (postEnvelope as { data: unknown[] }).data
            : []
        setPosts(normalizePosts(postData))
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(
          err instanceof Error
            ? err.message
            : t('saved.loadError', {}, { defaultValue: 'Failed to load saved posts.' }),
        )
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [http, active, t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('common.saved', {}, { defaultValue: 'Saved' })}
        headlineKey="headline"
        headlineDefault={t('saved.heroHeadline', {}, { defaultValue: 'Your private library.' })}
        bodyKey="body"
        bodyDefault={t(
          'saved.heroBody',
          {},
          {
            defaultValue:
              'Bookmarks live here \u2014 organise them into collections so the path back is short.',
          },
        )}
        pillIcon="bookmark"
        pillKey="pill"
        pillDefault={t(
          'saved.heroPill',
          { count: posts.length },
          { defaultValue: '{{count}} stones marked' },
        )}
      />

      <nav className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
        {collections.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setActive(c.slug)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'transition-colors',
              active === c.slug
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/10 hover:text-primary',
            )}
            aria-pressed={active === c.slug}
          >
            <span className={'material-symbols-outlined text-base'}>folder</span>
            {c.slug === 'all'
              ? t('saved.allCollection', {}, { defaultValue: 'All saved' })
              : c.name}
            {c.count > 0 && (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  'tabular-nums bg-surface/30 text-current',
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        {loading ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t('saved.loading', {}, { defaultValue: 'Opening your library\u2026' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-error')} role="alert">
            {error}
          </p>
        ) : posts.length === 0 ? (
          <p className={cm.cn(cm.textCenter, cm.sp('py', 12), 'text-on-surface-variant')}>
            {t(
              'saved.empty',
              {},
              {
                defaultValue:
                  'Nothing saved yet \u2014 tap bookmark on a post to start your library.',
              },
            )}
          </p>
        ) : (
          posts.map((p) => <LinkPostCard key={p.id} post={p} />)
        )}
      </section>
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
      saved: true,
      user_vote: r.user_vote === 'up' || r.user_vote === 'down' ? r.user_vote : null,
      created_at: String(r.created_at ?? new Date().toISOString()),
    }
  })
}

export default Saved
