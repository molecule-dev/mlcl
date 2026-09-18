import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CairnArticleRow } from '../components/CairnArticleRow.js'
import type { CairnArticleStatus } from '../components/CairnArticleStatusPill.js'
import { CairnKpiCard } from '../components/CairnKpiCard.js'
import { CairnTrailHero } from '../components/CairnTrailHero.js'
import { unwrapList } from '../lib/unwrap.js'

interface SpaceSummary {
  key: string
  name: string
  description: string
  icon: string
  /** Aggregate columns are absent from live API rows (fixture-only). */
  article_count?: number
  editor_count?: number
  accent_color?: string
  updated_at?: string
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

const DEMO_SPACES: SpaceSummary[] = [
  {
    key: 'engineering',
    name: 'Engineering',
    description:
      'Runbooks, on-call playbooks, postmortems, and architectural decisions for the platform.',
    icon: 'engineering',
    article_count: 84,
    editor_count: 12,
    accent_color: '#0f766e',
    updated_at: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
  },
  {
    key: 'people-ops',
    name: 'People Ops',
    description:
      'Hiring loops, benefits, time-off policies, and the handbook nobody actually reads — until they need it.',
    icon: 'group',
    article_count: 52,
    editor_count: 7,
    accent_color: '#d97706',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    key: 'product',
    name: 'Product',
    description:
      'Roadmaps, RFCs, decision records, and the rituals — RICE scores, DACI, the works.',
    icon: 'lightbulb',
    article_count: 41,
    editor_count: 9,
    accent_color: '#7c3aed',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    key: 'security',
    name: 'Security',
    description:
      'SOC 2 evidence, incident playbooks, and the policies that keep the auditors happy.',
    icon: 'shield',
    article_count: 33,
    editor_count: 5,
    accent_color: '#b91c1c',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(),
  },
]

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
    id: 'parental-leave',
    title: 'Parental leave: the policy and the spirit of it',
    excerpt:
      'Sixteen weeks paid, flexible ramp, no pressure to return early. Here is exactly how to take it.',
    space_name: 'People Ops',
    section_path: ['Benefits'],
    author_name: 'Aiyana Klein',
    author_initials: 'AK',
    status: 'published',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: 'q4-pricing-rfc',
    title: 'Q4 pricing RFC — usage-based tiers',
    excerpt:
      'Proposing a shift from seat-based to usage-based pricing for the platform plan. Open for comment until Friday.',
    space_name: 'Product',
    section_path: ['RFCs'],
    author_name: 'Rosa Salazar',
    author_initials: 'RS',
    status: 'draft',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
  },
  {
    id: 'incident-comms',
    title: 'How we communicate during incidents',
    excerpt:
      'Status page cadence, customer comms templates, and what NOT to say in the first 30 minutes.',
    space_name: 'Security',
    section_path: ['Incident response'],
    author_name: 'Tomás Llewellyn',
    author_initials: 'TL',
    status: 'restricted',
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 73).toISOString(),
  },
]

interface MeProps {
  id: string
  name: string | null
  email: string
}

function unwrapMe(res: unknown): MeProps | null {
  if (!res || typeof res !== 'object') return null
  const r = res as Record<string, unknown>
  const data = (r.data ?? r) as Record<string, unknown>
  const props = (data.props ?? data) as Record<string, unknown> | undefined
  if (!props || typeof props !== 'object') return null
  const id = typeof props.id === 'string' ? props.id : ''
  const email = typeof props.email === 'string' ? props.email : ''
  const name = typeof props.name === 'string' ? props.name : null
  if (!id) return null
  return { id, name, email }
}

export function Home() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [bookmarkTotal, setBookmarkTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [me, setMe] = useState<MeProps | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/spaces').catch(() => null),
      http.get('/articles', { params: { sort: 'updated_at', order: 'desc' } }).catch(() => null),
      http.get('/users/me').catch(() => null),
      http.get('/bookmarks').catch(() => null),
    ])
      .then(([spacesRes, articlesRes, meRes, bookmarksRes]) => {
        if (cancelled) return
        setSpaces(unwrapList<SpaceSummary>(spacesRes))
        // Keep the full list — KPI counts derive from it; the "Recently
        // updated" feed slices at render time.
        setArticles(unwrapList<ArticleSummary>(articlesRes))
        setMe(unwrapMe(meRes))
        setBookmarkTotal(unwrapList<unknown>(bookmarksRes).length)
        setHasFetched(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const firstName = me?.name?.trim().split(/\s+/)[0] || me?.email?.split('@')[0] || ''

  // Show DEMO_SPACES/DEMO_ARTICLES only as a placeholder skeleton during the
  // very first load, never as a substitute for real (but empty) state — once
  // we know the user has zero spaces, we render an empty state instead.
  void DEMO_SPACES
  void DEMO_ARTICLES

  // The live API returns raw space rows without aggregate columns, so treat
  // per-space counts as optional and fall back to what we can derive from the
  // fetched articles — never NaN, never fabricated numbers.
  const totalArticles = spaces.length
    ? spaces.reduce((sum, s) => sum + (s.article_count ?? 0), 0) || articles.length
    : articles.length
  const totalEditors =
    spaces.reduce((sum, s) => sum + (s.editor_count ?? 0), 0) || (articles.length > 0 ? 1 : 0)
  const draftCount = articles.filter((a) => a.status === 'draft').length
  const bookmarkCount = bookmarkTotal || articles.filter((a) => a.bookmarked).length
  const updatedToday = articles.filter(
    (a) => Date.now() - new Date(a.updated_at).getTime() < 1000 * 60 * 60 * 24,
  ).length

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('home.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} workspace' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {firstName
              ? t(
                  'home.greetingWithName',
                  { name: firstName },
                  { defaultValue: `Welcome back, ${firstName}` },
                )
              : t('home.heading', {}, { defaultValue: 'Welcome back' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'home.subtitle',
              {},
              {
                defaultValue:
                  'Recent articles, your bookmarks, and what the team has been writing.',
              },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/search"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              aria-hidden="true"
              style={{ fontSize: '1rem' }}
            >
              search
            </span>
            {t('common.search', {}, { defaultValue: 'Search' })}
          </Link>
          <Link
            to="/article/new/edit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
            )}
          >
            {t('home.newCta', {}, { defaultValue: 'New article' })}
          </Link>
        </div>
      </header>

      <CairnTrailHero articlesUpdatedToday={updatedToday} draftsInFlight={draftCount} />

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <CairnKpiCard
          tone="primary"
          label={t('home.kpi.articles', {}, { defaultValue: 'Articles in workspace' })}
          value={totalArticles}
          hint={t('home.kpi.articlesHint', {}, { defaultValue: 'Across all spaces' })}
        />
        <CairnKpiCard
          tone="info"
          label={t('home.kpi.editors', {}, { defaultValue: 'Active editors' })}
          value={totalEditors}
          hint={t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        />
        <CairnKpiCard
          tone="warning"
          label={t('home.kpi.drafts', {}, { defaultValue: 'Drafts in flight' })}
          value={draftCount}
          hint={t('home.kpi.draftsHint', {}, { defaultValue: 'Yours and the team\u2019s' })}
        />
        <CairnKpiCard
          tone="success"
          label={t('home.kpi.bookmarks', {}, { defaultValue: 'Bookmarked' })}
          value={bookmarkCount}
          hint={t('home.kpi.bookmarksHint', {}, { defaultValue: 'Your starred reads' })}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-4')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('home.recentHeading', {}, { defaultValue: 'Recently updated' })}
            </h2>
            <Link
              to="/spaces"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('home.browseAll', {}, { defaultValue: 'Browse all spaces \u2192' })}
            </Link>
          </div>
          {loading && !hasFetched ? (
            <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
              {t('home.loading', {}, { defaultValue: 'Opening the library\u2026' })}
            </p>
          ) : articles.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant text-center',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'home.recentEmpty',
                  {},
                  {
                    defaultValue:
                      'No articles yet. Stack the first stone — open a space and write the first article.',
                  },
                )}
              </p>
              <Link
                to="/article/new/edit"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('extrabold'),
                  cm.textSize('sm'),
                  'inline-block rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md',
                )}
              >
                {t('home.recentEmptyCta', {}, { defaultValue: 'Write the first article' })}
              </Link>
            </div>
          ) : (
            <div className={cm.cn('space-y-3')}>
              {articles.slice(0, 5).map((a) => (
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

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm space-y-4',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('home.spacesHeading', {}, { defaultValue: 'Your spaces' })}
            </h2>
            <Link
              to="/spaces"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('home.allSpaces', {}, { defaultValue: 'All \u2192' })}
            </Link>
          </div>
          {spaces.length === 0 ? (
            <div className={cm.cn(cm.sp('py', 4), cm.textSize('sm'), 'space-y-3 text-center')}>
              <p className={cm.cn('text-on-surface-variant')}>
                {t(
                  'home.spacesEmpty',
                  {},
                  { defaultValue: 'No spaces yet. Open one to start collecting articles.' },
                )}
              </p>
              <Link
                to="/spaces/new"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('extrabold'),
                  cm.textSize('xs'),
                  'inline-block rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md',
                )}
              >
                {t('home.newSpaceCta', {}, { defaultValue: 'Create a space' })}
              </Link>
            </div>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {spaces.slice(0, 4).map((s) => (
                <li key={s.key}>
                  <Link
                    to={`/spaces/${s.key}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-xl transition-colors hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-9 w-9 rounded-lg text-white shrink-0',
                      )}
                      style={{ backgroundColor: s.accent_color ?? 'var(--mol-color-primary)' }}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn('material-symbols-outlined')}
                        style={{ fontSize: '1.125rem' }}
                      >
                        {s.icon}
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
                        {s.name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'home.spaceMeta',
                          { count: s.article_count ?? 0 },
                          { defaultValue: '{{count}} articles' },
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Home
