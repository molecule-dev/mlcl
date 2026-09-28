/**
 * Landing — Agora public marketing home.
 *
 * Trio: gradient hero → trending threads (signature feature embed) →
 * featured categories triad → CTA strip.
 */
import { Link, Navigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { CategoryCard, type CategoryCardData } from '../components/CategoryCard.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { ThreadRow, type ThreadRowData } from '../components/ThreadRow.js'

const SAMPLE_TRENDING: ThreadRowData[] = [
  {
    id: 'sample-1',
    title:
      'After eight years of running my own studio, here is the one process change I wish I had made on day one.',
    author: 'mira-ken',
    authorBadge: 'op',
    category: 'design-craft',
    categorySlug: 'design-craft',
    categoryColor: '#0e7c6b',
    flair: 'Discussion',
    timestamp: '2h',
    commentCount: 247,
    score: 1820,
    voteState: 'up',
    status: 'hot',
    excerpt:
      'I used to hand-stitch every brief. Switching to a five-question intake template made room for the actual creative work — and clients still feel heard.',
  },
  {
    id: 'sample-2',
    title: 'Show & tell: a 90-day moss garden experiment with surprisingly forgiving species',
    author: 'lichen-and-stone',
    category: 'gardening',
    categorySlug: 'gardening',
    categoryColor: '#16a34a',
    flair: 'Show & Tell',
    timestamp: '5h',
    commentCount: 88,
    score: 612,
    status: 'pinned',
  },
  {
    id: 'sample-3',
    title: 'Help me debug this: useEffect runs twice on mount but only in StrictMode dev builds',
    author: 'kotaro',
    category: 'web-dev',
    categorySlug: 'web-dev',
    categoryColor: '#0c6558',
    flair: 'Help',
    timestamp: '8h',
    commentCount: 41,
    score: 96,
    status: 'resolved',
  },
]

const SAMPLE_CATEGORIES: CategoryCardData[] = [
  {
    slug: 'design-craft',
    name: 'design-craft',
    description: 'Studio practice, briefs, pricing, and the people-side of visual work.',
    emoji: '🪶',
    accentColor: '#0e7c6b',
    subscribers: 48200,
    activeNow: 312,
  },
  {
    slug: 'gardening',
    name: 'gardening',
    description: 'Forgiving species, balcony bins, and the slow joy of growing things.',
    emoji: '🌿',
    accentColor: '#16a34a',
    subscribers: 132100,
    activeNow: 884,
  },
  {
    slug: 'web-dev',
    name: 'web-dev',
    description: 'Frontend, backend, deployment — pragmatic answers from working engineers.',
    emoji: '💻',
    accentColor: '#0c6558',
    subscribers: 287300,
    activeNow: 2014,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()

  // Authenticated users browsing to / should land on /feed (the live
  // forum), not the marketing page filled with sample-thread previews.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/feed" replace />
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'border-b border-outline-variant/30 bg-surface',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
            style={{ color: 'var(--color-primary, var(--color-pinned))' }}
          >
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {APP_TAGLINE}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/categories"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.navCategories', {}, { defaultValue: 'Categories' })}
          </Link>
          <Link
            to="/feed"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.navFeed', {}, { defaultValue: 'Trending' })}
          </Link>
          <ThemeToggle />
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/signup"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors',
            )}
          >
            {t('landing.navJoin', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
          </Link>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-hidden')}>
        {/* Hero — light typographic split with a live thread preview (Quorum design) */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'lg:py-24')}>
          <div
            className={cm.cn(
              'max-w-[1120px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16',
            )}
          >
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'inline-block text-[11px] uppercase tracking-widest text-primary',
                )}
              >
                {t(
                  'landing.heroEyebrow',
                  { appName: APP_NAME, tagline: APP_TAGLINE },
                  { defaultValue: 'Welcome to {{appName}} — {{tagline}}' },
                )}
              </span>
              <h1
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-5xl lg:text-7xl tracking-tight leading-tight text-on-surface [font-family:var(--font-headline)]',
                )}
              >
                {t(
                  'landing.heroHeadline',
                  {},
                  { defaultValue: 'Discussions that compound, instead of disappear.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.maxW('2xl'),
                  'leading-relaxed text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroLede',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a slow-cooked forum for hobbyists, builders, and quietly opinionated experts. Earn standing one good thread at a time.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  'justify-center lg:justify-start pt-2',
                )}
              >
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-join"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm text-lg',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    arrow_forward
                  </span>
                  {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
                </Link>
                <Link
                  to="/categories"
                  data-mol-id="landing-hero-browse"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-lg border-2 border-outline-variant hover:border-outline text-on-surface bg-surface transition-colors shadow-sm text-lg',
                  )}
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'Browse communities' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg' }),
                  'flex-wrap justify-center lg:justify-start',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface')}>
                    {t('landing.heroStat1', {}, { defaultValue: '847k' })}
                  </span>
                  <span
                    className={cm.cn('uppercase tracking-widest text-xs text-on-surface-variant')}
                  >
                    {t('nav.members', {}, { defaultValue: 'Members' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface')}>
                    {t('landing.heroStat2', {}, { defaultValue: '2,180' })}
                  </span>
                  <span
                    className={cm.cn('uppercase tracking-widest text-xs text-on-surface-variant')}
                  >
                    {t('landing.heroStat2Label', {}, { defaultValue: 'Communities' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface')}>
                    {t('landing.heroStat3', {}, { defaultValue: '4.6m' })}
                  </span>
                  <span
                    className={cm.cn('uppercase tracking-widest text-xs text-on-surface-variant')}
                  >
                    {t('landing.heroStat3Label', {}, { defaultValue: 'Threads this year' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Thread preview card — the app's own ThreadRow with its vote column */}
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div
                className={cm.cn(
                  'bg-surface rounded-xl shadow-lg border border-outline-variant/40 overflow-hidden hover:-translate-y-1 transition-transform',
                )}
              >
                <ThreadRow thread={SAMPLE_TRENDING[0]} href="/signup" />
              </div>
            </div>
          </div>
        </section>

        {/* Trending — white band (design: Trending Now) */}
        <section className="bg-surface border-y border-outline-variant/40">
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-[1120px] mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('mb', 6),
                'flex-wrap',
              )}
            >
              <div>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-3xl md:text-4xl tracking-tight text-on-surface flex items-center gap-2',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[var(--color-accent)]"
                    aria-hidden="true"
                  >
                    trending_up
                  </span>
                  {t(
                    'landing.trendingTitle',
                    {},
                    { defaultValue: 'What the room is talking about' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {t(
                    'landing.trendingSubtitle',
                    {},
                    {
                      defaultValue: 'Live previews — sign in to vote, comment, or open a thread.',
                    },
                  )}
                </p>
              </div>
              <Link
                to="/feed"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-primary hover:underline',
                )}
              >
                {t('landing.trendingViewAll', {}, { defaultValue: 'See all' })}
                <span className={cm.cn('material-symbols-outlined text-base')}>arrow_forward</span>
              </Link>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {SAMPLE_TRENDING.map((thread) => (
                <ThreadRow key={thread.id} thread={thread} href="/signup" />
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 16), 'max-w-[1120px] mx-auto')}>
          <div className={cm.cn(cm.sp('mb', 6))}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t('landing.communitiesTitle', {}, { defaultValue: 'Communities to begin with' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'landing.communitiesSubtitle',
                {},
                { defaultValue: 'Earn karma, share work, ask better questions.' },
              )}
            </p>
          </div>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
            {SAMPLE_CATEGORIES.map((c) => (
              <CategoryCard key={c.slug} category={c} href="/signup" />
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20), 'max-w-[1120px] mx-auto')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('p', 10),
              'rounded-2xl border border-outline-variant/30 bg-surface text-center',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.ctaEyebrow', {}, { defaultValue: 'Ready when you are' })}
            </span>
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.ctaHeadline',
                {},
                { defaultValue: 'Find your community. Bring your voice.' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.maxW('xl'),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Sign up free. Build reputation across topics that matter to you, and help the rest of us think a little more clearly.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.sp('px', 8),
                cm.sp('py', 3),
                'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
              <span className={cm.cn('material-symbols-outlined text-base')}>arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
