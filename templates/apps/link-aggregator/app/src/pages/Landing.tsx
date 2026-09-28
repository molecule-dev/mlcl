import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type LinkPost, timeAgo } from '../components/LinkPostCard.js'
import { formatCount, type SubSummary } from '../components/SubBadge.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { VoteCluster, type VoteDirection } from '../components/VoteCluster.js'

const FALLBACK_POSTS: LinkPost[] = [
  {
    id: 'demo-1',
    title: 'A field guide to slow-rendered, AI-tolerant interfaces',
    url: 'https://example.com/slow-rendered',
    domain: 'example.com',
    text: null,
    submitter_id: 'mira',
    submitter_name: 'mira',
    sub_slug: 'design',
    sub_name: 'design',
    points: 412,
    comment_count: 87,
    tags: ['design', 'ai', 'longread'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'After three years of Postgres, I\u2019m still finding new tricks',
    url: 'https://blog.example.io/postgres-tricks',
    domain: 'blog.example.io',
    text: null,
    submitter_id: 'arnav',
    submitter_name: 'arnav',
    sub_slug: 'databases',
    sub_name: 'databases',
    points: 264,
    comment_count: 53,
    tags: ['postgres', 'databases'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Why I left X for a tiny self-hosted aggregator',
    url: null,
    domain: null,
    text: 'A short essay on quitting the algorithmic timeline.',
    submitter_id: 'ren',
    submitter_name: 'ren',
    sub_slug: 'meta',
    sub_name: 'meta',
    points: 198,
    comment_count: 41,
    tags: ['meta', 'opinion'],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
]

const FALLBACK_SUBS: SubSummary[] = [
  {
    slug: 'design',
    name: 'design',
    description: 'Interfaces, type, and the small details that make them feel right.',
    member_count: 18420,
  },
  {
    slug: 'databases',
    name: 'databases',
    description: 'Schema design, query plans, and operational war stories.',
    member_count: 9120,
  },
  {
    slug: 'reading',
    name: 'reading',
    description: 'Long essays, books worth marking, and a slow share queue.',
    member_count: 12700,
  },
  {
    slug: 'typography',
    name: 'typography',
    description: 'Kerning, grids, and the typefaces worth arguing about.',
    member_count: 8400,
  },
  {
    slug: 'slowreading',
    name: 'slowreading',
    description: 'Marginalia, rereading, and the art of finishing long books.',
    member_count: 12000,
  },
  {
    slug: 'selfhosting',
    name: 'selfhosting',
    description: 'Tiny servers, big uptime, and quitting the managed web.',
    member_count: 5200,
  },
]

function toLandingPost(row: unknown): LinkPost {
  const r = row as Record<string, unknown>
  const tags = r.tags
  let parsedTags: string[] = []
  if (Array.isArray(tags)) parsedTags = tags.filter((x): x is string => typeof x === 'string')
  else if (typeof tags === 'string') {
    try {
      const j = JSON.parse(tags)
      if (Array.isArray(j)) parsedTags = j.filter((x): x is string => typeof x === 'string')
    } catch (_error) {
      // non-JSON tags string — parsedTags stays [] as the safe fallback
      parsedTags = []
    }
  }
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    url: (r.url as string | null) ?? null,
    domain: (r.domain as string | null) ?? null,
    text: (r.text as string | null) ?? null,
    submitter_id: String(r.submitter_id ?? ''),
    submitter_name: String(r.submitter_name ?? ''),
    sub_slug: String(r.sub_slug ?? ''),
    sub_name: String(r.sub_name ?? r.sub_slug ?? ''),
    points: Number(r.points ?? 0),
    comment_count: Number(r.comment_count ?? 0),
    tags: parsedTags,
    created_at: String(r.created_at ?? new Date().toISOString()),
  }
}

function toLandingSub(row: unknown): SubSummary {
  const r = row as Record<string, unknown>
  return {
    slug: String(r.slug ?? r.name ?? ''),
    name: String(r.name ?? r.slug ?? ''),
    description: (r.description as string | null) ?? '',
    member_count: Number(r.member_count ?? 0),
  }
}

/** One divided row inside the landing's single "Trending paths" card. */
function LandingPostRow({ post }: { post: LinkPost }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const detailHref = `/links/${post.id}`
  const titleClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.textSize('lg'),
    'text-on-surface hover:text-primary transition-colors leading-snug decoration-outline-variant underline-offset-4 hover:underline',
  )
  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 5),
        'border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-container-low/60 transition-colors',
      )}
    >
      <VoteCluster score={post.points} direction={(post.user_vote ?? null) as VoteDirection} />
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'flex-wrap text-on-surface-variant',
          )}
        >
          {post.sub_slug && (
            <Link
              to={`/subs/${post.sub_slug}`}
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-on-surface hover:text-primary transition-colors',
              )}
            >
              c/{post.sub_name || post.sub_slug}
            </Link>
          )}
          <span aria-hidden="true">•</span>
          <span>
            {t(
              'linkPostCard.byUser',
              { user: post.submitter_name || post.submitter_id },
              { defaultValue: 'by {{user}}' },
            )}
          </span>
          <span aria-hidden="true">•</span>
          <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
        </div>
        {post.url ? (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className={titleClass}>
            {post.title}
          </a>
        ) : (
          <Link to={detailHref} className={titleClass}>
            {post.title}
          </Link>
        )}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'pt-1 text-on-surface-variant',
          )}
        >
          {post.domain ? (
            <>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                link
              </span>
              <a
                href={post.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {post.domain}
              </a>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                article
              </span>
              <span>{t('landing.textPost', {}, { defaultValue: 'Text post' })}</span>
            </>
          )}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('sm'),
            'pt-3 text-on-surface-variant font-medium',
          )}
        >
          <Link
            to={detailHref}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'hover:text-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              chat_bubble
            </span>
            {t(
              'linkPostCard.commentsCount',
              { count: post.comment_count },
              { defaultValue: '{{count}} comments' },
            )}
          </Link>
        </div>
      </div>
    </article>
  )
}

const FEATURES = [
  { icon: 'swap_vert', tint: 'primary' as const },
  { icon: 'format_list_bulleted', tint: 'secondary' as const },
  { icon: 'explore', tint: 'primary' as const },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [posts, setPosts] = useState<LinkPost[] | null>(null)
  const [subs, setSubs] = useState<SubSummary[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<{ data?: unknown }>('/api/links?sort=hot&limit=3')
      .then((res) => {
        if (!active) return
        const list = (res as { data?: { data?: unknown[] } | unknown[] }).data
        const rows = Array.isArray(list)
          ? list
          : Array.isArray((list as { data?: unknown[] })?.data)
            ? (list as { data: unknown[] }).data
            : []
        setPosts(rows.map(toLandingPost))
      })
      .catch(() => active && setPosts(FALLBACK_POSTS))
    http
      .get<{ data?: unknown }>('/api/subs?limit=6')
      .then((res) => {
        if (!active) return
        const list = (res as { data?: { data?: unknown[] } | unknown[] }).data
        const rows = Array.isArray(list)
          ? list
          : Array.isArray((list as { data?: unknown[] })?.data)
            ? (list as { data: unknown[] }).data
            : []
        setSubs(rows.map(toLandingSub))
      })
      .catch(() => active && setSubs(FALLBACK_SUBS))
    return () => {
      active = false
    }
  }, [http])

  const previewPosts = posts && posts.length > 0 ? posts : FALLBACK_POSTS
  const previewSubs = subs && subs.length > 0 ? subs : FALLBACK_SUBS
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'flex-wrap gap-y-2',
          'sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <Link to="/" aria-label={APP_NAME} className="whitespace-nowrap shrink-0">
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('extrabold'),
                'tracking-tighter text-primary',
              )}
            >
              {APP_NAME}
            </span>
          </Link>
          <nav
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}
            aria-label={t('landing.primaryNav', {}, { defaultValue: 'Primary' })}
          >
            <Link
              to="/feed"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-tight text-on-surface-variant hover:text-secondary transition-colors',
              )}
            >
              {t('landing.navBrowse', {}, { defaultValue: 'Browse' })}
            </Link>
            <Link
              to="/subs"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-tight text-on-surface-variant hover:text-secondary transition-colors',
              )}
            >
              {t('landing.navSubs', {}, { defaultValue: 'Subs' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'tracking-tight text-on-surface-variant hover:text-secondary transition-colors',
              )}
            >
              {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
            </Link>
          </nav>
        </div>
        <nav
          className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-wrap gap-y-2')}
        >
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/feed"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),

                'rounded-lg',

                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'whitespace-nowrap shrink-0',
                'bg-primary text-on-primary hover:bg-primary-hover transition-colors',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap',
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-join-cta"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),

                  'rounded-lg',

                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap shrink-0',
                  'bg-primary text-on-primary hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.joinCta', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1')}>
        {/* Hero — soft violet→orange wash behind a giant two-tone headline */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute inset-0 -z-10',
              'bg-gradient-to-br from-[color:var(--color-hero-from)] to-[color:var(--color-hero-to)]',
            )}
          />
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
              cm.sp('px', 6),
              'py-24 md:py-28 max-w-4xl mx-auto text-center',
            )}
          >
            <h1
              className={cm.cn(
                'text-6xl md:text-8xl font-black tracking-tighter text-on-surface leading-[0.95]',
              )}
            >
              {t('landing.headlinePrefix', {}, { defaultValue: 'Mark the' })}{' '}
              <span className="text-primary">
                {t('landing.headlineAccent', {}, { defaultValue: 'path' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('2xl'),
                cm.fontWeight('medium'),
                'md:text-2xl text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'A grounded community for curious readers. Discover, share, and discuss the best links on the web.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                'flex-col sm:flex-row flex-wrap justify-center pt-4 w-full sm:w-auto',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-join"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),

                  'rounded-lg',

                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary hover:bg-primary-hover shadow-sm transition-colors text-center',
                )}
              >
                {t('landing.joinCta', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
              </Link>
              <Link
                to="/subs"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),

                  'rounded-lg',

                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-low shadow-sm transition-colors text-center',
                )}
              >
                {t('landing.exploreSubs', {}, { defaultValue: 'Explore subs' })}
              </Link>
            </div>
          </div>
        </section>

        {/* Trending paths — three posts inside one divided card */}
        <section
          className={cm.cn(cm.sp('px', 6), 'py-16 max-w-4xl w-full mx-auto')}
          aria-label={t('landing.trendingTitle', {}, { defaultValue: 'Trending paths' })}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mb-8')}>
            <span
              className="material-symbols-outlined text-secondary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              local_fire_department
            </span>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('landing.trendingTitle', {}, { defaultValue: 'Trending paths' })}
            </h2>
          </div>
          <div className="rounded-xl bg-surface border border-outline-variant/40 shadow-sm overflow-hidden">
            {previewPosts.map((p) => (
              <LandingPostRow key={p.id} post={p} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/feed"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex text-primary font-semibold hover:text-primary-hover transition-colors',
              )}
            >
              {t('landing.viewMore', {}, { defaultValue: 'View more paths' })}
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>

        {/* Feature grid — three pillars on a white band */}
        <section className="bg-surface border-y border-outline-variant/40">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3 text-center')}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.icon}
                  className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(16),
                      cm.h(16),
                      'rounded-2xl shadow-sm',
                      f.tint === 'primary'
                        ? 'bg-primary-container text-primary'
                        : 'bg-secondary-container text-secondary',
                    )}
                  >
                    <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {t(
                      `landing.feature${i + 1}Title`,
                      {},
                      {
                        defaultValue: [
                          'Vote what matters',
                          'Nest the conversation',
                          'Find your sub',
                        ][i],
                      },
                    )}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    {t(
                      `landing.feature${i + 1}Body`,
                      {},
                      {
                        defaultValue: [
                          'Help surface the most insightful content with simple upvote and downvote mechanics.',
                          'Dive deep into discussions with color-coded, deeply nested comment threads that stay readable.',
                          'Discover niche communities curated by passionate people just like you.',
                        ][i],
                      },
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular communities — pill chips with member counts */}
        <section className={cm.cn(cm.sp('px', 6), 'py-16 max-w-7xl w-full mx-auto')}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'uppercase tracking-widest text-on-surface-variant text-center mb-8',
            )}
          >
            {t('landing.communitiesTitle', {}, { defaultValue: 'Popular communities' })}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {previewSubs.map((s) => (
              <Link
                key={s.slug}
                to={`/subs/${s.slug}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.roundedFull,
                  'bg-surface border border-outline-variant hover:border-primary/40 hover:shadow-sm transition-all',
                )}
              >
                <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                  c/{s.name || s.slug}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'text-on-surface-variant bg-surface-container-high',
                  )}
                >
                  {formatCount(s.member_count)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Closing CTA — deep violet gradient band */}
        <section className="bg-gradient-to-br from-primary to-[color:var(--color-cta-gradient-to)] text-white">
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
              cm.sp('px', 6),
              'py-24 max-w-2xl mx-auto text-center',
            )}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              {t('landing.closingTitle', {}, { defaultValue: 'Ready to stack some stones?' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('medium'),
                'md:text-xl text-[color:var(--color-cta-gradient-sub)] leading-relaxed',
              )}
            >
              {t(
                'landing.closingBody',
                {},
                { defaultValue: 'Join thousands of curious minds sharing the best of the web.' },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-closing-join"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),

                'rounded-lg',

                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'inline-block bg-[color:var(--color-cta-inverse-bg)] text-[color:var(--color-cta-inverse-text)] shadow-lg hover:opacity-90 transition-opacity',
              )}
            >
              {t(
                'landing.closingCta',
                { appName: APP_NAME },
                { defaultValue: 'Join {{appName}} today' },
              )}
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-surface-container-low border-t border-outline-variant/40">
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'md' }),
              cm.sp('px', 6),
              cm.sp('py', 12),
              'max-w-7xl w-full mx-auto md:flex-row gap-6 text-center md:text-left',
            )}
          >
            <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {APP_NAME}
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.textSize('xs'),
                'flex-wrap justify-center uppercase tracking-widest',
              )}
            >
              <Link
                to="/privacy"
                className="text-on-surface-variant hover:text-secondary underline decoration-2 underline-offset-4 transition-colors"
              >
                {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              </Link>
              <Link
                to="/terms"
                className="text-on-surface-variant hover:text-secondary underline decoration-2 underline-offset-4 transition-colors"
              >
                {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              </Link>
              <Link
                to="/about"
                className="text-on-surface-variant hover:text-secondary underline decoration-2 underline-offset-4 transition-colors"
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
              </Link>
              <Link
                to="/pricing"
                className="text-on-surface-variant hover:text-secondary underline decoration-2 underline-offset-4 transition-colors"
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
            <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year, app: APP_NAME },
                { defaultValue: '\u00a9 {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default Landing
