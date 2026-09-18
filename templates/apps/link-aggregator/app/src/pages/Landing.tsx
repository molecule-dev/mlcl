import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { CairnHeroCard } from '../components/CairnHeroCard.js'
import { type LinkPost, LinkPostCard } from '../components/LinkPostCard.js'
import { SubBadge, type SubSummary } from '../components/SubBadge.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

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
      .get<{ data?: unknown }>('/api/subs?limit=3')
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

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-outline-variant/30',
        )}
      >
        <Link
          to="/"
          className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
          aria-label={APP_NAME}
        >
          <span
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-[var(--color-primary-deep)] text-white',
            )}
            aria-hidden="true"
          >
            <span className={'material-symbols-outlined text-lg'}>terrain</span>
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'tracking-tight text-on-surface',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/feed"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
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
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary hover:bg-primary-hover transition-colors',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'flex-1')}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            cm.sp('px', 6),
            'py-20 md:py-28 max-w-5xl mx-auto text-center',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-primary/10 text-primary uppercase tracking-widest',
            )}
          >
            <span className={'material-symbols-outlined text-base'}>terrain</span>
            {t('landing.eyebrow', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
          </span>
          <h1
            className={cm.cn(
              'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-on-surface',
            )}
          >
            {t(
              'landing.headline',
              {},
              { defaultValue: 'A small, slow place for the links worth marking.' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.maxW('2xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'landing.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a community link aggregator: vote, discuss, and stack up the things you want other curious people to read.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap justify-center')}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                cm.textSize('base'),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary hover:bg-primary-hover shadow-md transition-colors',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                cm.textSize('base'),
                cm.fontWeight('bold'),
                'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </section>

        <section
          className={cm.cn(cm.sp('px', 6), 'max-w-5xl w-full mx-auto')}
          aria-label={t(
            'landing.heroPreview',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} preview' },
          )}
        >
          <CairnHeroCard
            eyebrowKey="trending"
            eyebrowDefault={t('landing.trendingEyebrow', {}, { defaultValue: 'Trending today' })}
            headlineKey="trendingHeadline"
            headlineDefault={t(
              'landing.trendingHeadline',
              {},
              { defaultValue: '12,400 readers stacked their cairns this week.' },
            )}
            bodyKey="trendingBody"
            bodyDefault={t(
              'landing.trendingBody',
              {},
              {
                defaultValue:
                  'Three sub-communities, dozens of conversations, a single shared front page.',
              },
            )}
            pillIcon="trending_up"
            pillKey="trendingPill"
            pillDefault={t('landing.trendingPill', {}, { defaultValue: '+18% week over week' })}
          />
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('px', 6),
            'max-w-5xl w-full mx-auto py-12',
          )}
        >
          <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.todayEyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Today on {{appName}}' },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('landing.todayHeadline', {}, { defaultValue: 'A peek at the front page.' })}
            </h2>
          </header>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {previewPosts.map((p, i) => (
              <LinkPostCard key={p.id} post={p} rank={i + 1} />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('px', 6),
            'max-w-5xl w-full mx-auto pb-20',
          )}
        >
          <header>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.subsEyebrow', {}, { defaultValue: 'Active subs' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 1),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.subsHeadline',
                {},
                { defaultValue: 'Small communities, big conversations.' },
              )}
            </h2>
          </header>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
            {previewSubs.map((s) => (
              <SubBadge key={s.slug} sub={s} />
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), 'border-t border-outline-variant/30')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              'max-w-5xl mx-auto py-10 flex-wrap',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.footerCopy',
                { appName: APP_NAME },
                { defaultValue: '\u00a9 {{appName}} \u2014 Mark the path.' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.textSize('sm'),
                'flex-wrap',
              )}
            >
              <Link
                to="/pricing"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link
                to="/about"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
              </Link>
              <Link
                to="/terms"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              </Link>
              <Link
                to="/privacy"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
              </Link>
              <Link
                to="/login"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={'hover:text-primary text-on-surface-variant transition-colors'}
              >
                {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Landing
