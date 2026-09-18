import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface SpaceDetail {
  key: string
  name: string
  description: string
  icon: string
  /** Aggregate columns are absent from live API rows (fixture-only). */
  article_count?: number
  editor_count?: number
  accent_color?: string
  hero_quote?: string
  hero_attribution?: string
  maintainers?: { id: string; name: string; initials: string; color?: string }[]
  sections?: { key: string; label: string; article_count: number; icon: string }[]
}

interface ArticleSummary {
  id: string
  title: string
  excerpt: string
  space_name: string
  section_path?: string[]
  author_name: string
  author_initials: string
  status: CairnArticleStatus
  updated_at: string
  bookmarked?: boolean
}

const DEMO_SPACE: SpaceDetail = {
  key: 'engineering',
  name: 'Engineering',
  description:
    'Runbooks, on-call playbooks, postmortems, and architectural decisions for the platform — written by the people who run it.',
  icon: 'engineering',
  article_count: 84,
  editor_count: 12,
  accent_color: '#0f766e',
  hero_quote:
    '“Documenting the system as it is — not as we wish it were — is the only way to onboard the next person.”',
  hero_attribution: 'Maya Patel, Senior Operations Engineer',
  maintainers: [
    { id: 'mp', name: 'Maya Patel', initials: 'MP', color: '#0f766e' },
    { id: 'jr', name: 'Jules Reyes', initials: 'JR', color: '#d97706' },
    { id: 'ak', name: 'Aiyana Klein', initials: 'AK', color: '#7c3aed' },
    { id: 'rs', name: 'Rosa Salazar', initials: 'RS', color: '#16a34a' },
  ],
  sections: [
    { key: 'runbooks', label: 'Runbooks', article_count: 32, icon: 'menu_book' },
    { key: 'oncall', label: 'On-call', article_count: 18, icon: 'support' },
    { key: 'rfcs', label: 'RFCs', article_count: 14, icon: 'lightbulb' },
    { key: 'postmortems', label: 'Postmortems', article_count: 11, icon: 'history_edu' },
    { key: 'onboarding', label: 'Onboarding', article_count: 9, icon: 'rocket_launch' },
  ],
}

const DEMO_ARTICLES: ArticleSummary[] = [
  {
    id: 'oncall-rotation',
    title: 'On-call rotation: rules of engagement',
    excerpt:
      'How we run the rotation, what counts as paged, when to escalate, and how we keep the on-call humane.',
    space_name: 'Engineering',
    section_path: ['Runbooks', 'On-call'],
    author_name: 'Maya Patel',
    author_initials: 'MP',
    status: 'published',
    updated_at: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    bookmarked: true,
  },
  {
    id: 'postgres-failover',
    title: 'Postgres primary failover — quick reference',
    excerpt:
      'Five-minute walkthrough for promoting the replica, drafting a comms blurb, and verifying replication caught up.',
    space_name: 'Engineering',
    section_path: ['Runbooks'],
    author_name: 'Jules Reyes',
    author_initials: 'JR',
    status: 'recent',
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'incident-comms',
    title: 'How we communicate during incidents',
    excerpt:
      'Status page cadence, customer comms templates, and what NOT to say in the first 30 minutes.',
    space_name: 'Engineering',
    section_path: ['On-call'],
    author_name: 'Tomás Llewellyn',
    author_initials: 'TL',
    status: 'published',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'service-mesh-decision',
    title: 'RFC-014: pick a service mesh (or do not)',
    excerpt:
      'Three options weighed against complexity-cost. Recommendation: stay with sidecar-less for two more quarters.',
    space_name: 'Engineering',
    section_path: ['RFCs'],
    author_name: 'Aiyana Klein',
    author_initials: 'AK',
    status: 'draft',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: 'staging-restore',
    title: 'Restoring the staging database from a snapshot',
    excerpt:
      'Snapshot policy, the actual `pg_restore` invocation, and how to reseat the workers afterwards.',
    space_name: 'Engineering',
    section_path: ['Runbooks'],
    author_name: 'Rosa Salazar',
    author_initials: 'RS',
    status: 'published',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
]

export function SpaceHome() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { key: routeKey } = useParams<{ key: string }>()
  const [space, setSpace] = useState<SpaceDetail | null>(null)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  // Demo data only used as type compile-time reference; runtime renders empty state.
  void DEMO_SPACE
  void DEMO_ARTICLES

  useEffect(() => {
    let cancelled = false
    if (!routeKey) return
    setLoading(true)
    setNotFound(false)
    Promise.all([
      http.get(`/spaces/${routeKey}`).catch(() => null),
      http
        .get('/articles', { params: { space_id: routeKey, sort: 'updated_at', order: 'desc' } })
        .catch(() => null),
    ])
      .then(([spaceRes, articlesRes]) => {
        if (cancelled) return
        const apiSpace = unwrapSingle<SpaceDetail>(spaceRes)
        if (apiSpace) setSpace(apiSpace)
        else setNotFound(true)
        setArticles(unwrapList<ArticleSummary>(articlesRes))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, routeKey])

  if (loading && !space) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'text-center text-on-surface-variant')}
      >
        {t('spaceHome.loading', {}, { defaultValue: 'Opening this space\u2026' })}
      </div>
    )
  }

  if (notFound || !space) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          'text-center text-on-surface-variant space-y-4',
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'), 'text-on-surface')}>
          {t('spaceHome.notFound', {}, { defaultValue: 'Space not found' })}
        </p>
        <p>
          {t(
            'spaceHome.notFoundBody',
            {},
            { defaultValue: 'This space does not exist (or you do not have access).' },
          )}
        </p>
        <Link
          to="/spaces"
          className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
        >
          {t('spaceHome.backToSpaces', {}, { defaultValue: '\u2190 Back to spaces' })}
        </Link>
      </div>
    )
  }

  const accent = space.accent_color ?? '#0f766e'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <nav className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        <Link to="/spaces" className={cm.cn('hover:text-on-surface')}>
          {t('spaceHome.spaces', {}, { defaultValue: 'Spaces' })}
        </Link>
        <span className={cm.cn(cm.sp('px', 2))}>{'\u203a'}</span>
        <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{space.name}</span>
      </nav>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] text-white shadow-xl',
        )}
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 75%, white) 100%)`,
        }}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-surface/20 blur-3xl',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-foreground/15 blur-3xl',
          )}
        />

        <div className={cm.cn('relative z-10', cm.flex({ align: 'start', gap: 'md' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-16 w-16 shrink-0 rounded-2xl bg-surface/15 backdrop-blur-md ring-1 ring-white/25',
            )}
            aria-hidden="true"
          >
            <span
              className={cm.cn('material-symbols-outlined text-white')}
              style={{ fontSize: '2.25rem' }}
            >
              {space.icon}
            </span>
          </span>
          <div className={cm.cn('min-w-0 flex-1')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-white/70',
              )}
            >
              {t('spaceHome.eyebrow', {}, { defaultValue: 'Knowledge space' })}
            </p>
            <h1
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight',
              )}
            >
              {space.name}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'text-white/85 max-w-2xl')}>
              {space.description}
            </p>
          </div>
        </div>

        {space.hero_quote ? (
          <blockquote
            className={cm.cn(
              cm.sp('mt', 8),
              'relative z-10 max-w-2xl text-2xl italic leading-snug text-white/95',
            )}
            style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
          >
            {space.hero_quote}
            {space.hero_attribution ? (
              <footer
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-white/70',
                )}
              >
                — {space.hero_attribution}
              </footer>
            ) : null}
          </blockquote>
        ) : null}

        <div
          className={cm.cn(
            cm.sp('mt', 8),
            'relative z-10',
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('extrabold'))}>
              {t(
                'spaceHome.articleCount',
                // The live API returns raw space rows without aggregates —
                // fall back to the article list we fetched for this space.
                { count: space.article_count ?? articles.length },
                { defaultValue: '{{count}} articles' },
              )}
            </span>
            {space.editor_count === undefined ? null : (
              <span className={cm.cn(cm.textSize('sm'), 'text-white/80')}>
                {t(
                  'spaceHome.editorCount',
                  { count: space.editor_count },
                  { defaultValue: '{{count}} maintainers' },
                )}
              </span>
            )}
          </div>
          {space.maintainers && space.maintainers.length > 0 ? (
            <div className={cm.cn('flex -space-x-2')}>
              {space.maintainers.slice(0, 5).map((m) => (
                <span
                  key={m.id}
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface/40 text-xs font-extrabold text-white',
                  )}
                  style={{ backgroundColor: m.color ?? accent }}
                >
                  {m.initials}
                </span>
              ))}
              {space.maintainers.length > 5 ? (
                <span
                  className={cm.cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface/40 bg-surface/15 text-xs font-extrabold text-white backdrop-blur-md',
                  )}
                >
                  +{space.maintainers.length - 5}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {space.sections && space.sections.length > 0 ? (
        <section>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('spaceHome.sectionsHeading', {}, { defaultValue: 'Sections' })}
          </h2>
          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.grid({ cols: 1, gap: 'sm' }),
              'sm:grid-cols-2 lg:grid-cols-5',
            )}
          >
            {space.sections.map((sec) => (
              <Link
                key={sec.key}
                to={`/spaces/${space.key}#${sec.key}`}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg text-white',
                  )}
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: '1.125rem' }}
                  >
                    {sec.icon}
                  </span>
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('extrabold'),
                      'truncate text-on-surface',
                    )}
                  >
                    {sec.label}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'spaceHome.sectionMeta',
                      { count: sec.article_count },
                      { defaultValue: '{{count}} articles' },
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('spaceHome.recentHeading', {}, { defaultValue: 'Recently updated in this space' })}
          </h2>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Link
              to={`/search?space=${encodeURIComponent(space.key)}`}
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('spaceHome.searchSpace', {}, { defaultValue: 'Search this space \u2192' })}
            </Link>
            <Link
              to={`/article/new/edit?space=${encodeURIComponent(space.key)}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('extrabold'),
                cm.textSize('xs'),
                'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
              )}
            >
              {t('spaceHome.newArticle', {}, { defaultValue: 'New article' })}
            </Link>
          </div>
        </div>
        {articles.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('py', 12),
              'text-center text-sm text-on-surface-variant',
            )}
          >
            {t(
              'spaceHome.empty',
              {},
              { defaultValue: 'No articles in this space yet. Be the first to write one.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.sp('mt', 4), 'space-y-3')}>
            {articles.map((a) => (
              <CairnArticleRow
                key={a.id}
                id={a.id}
                title={a.title}
                excerpt={a.excerpt}
                spaceName={a.space_name}
                sectionPath={a.section_path}
                authorName={a.author_name}
                authorInitials={a.author_initials}
                status={a.status}
                updatedAt={a.updated_at}
                bookmarked={a.bookmarked}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SpaceHome
