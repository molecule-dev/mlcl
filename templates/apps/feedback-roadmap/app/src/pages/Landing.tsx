/**
 * Landing — SignalLoop public marketing home.
 *
 * Trio: gradient hero → top requests (signature feature embed, live from
 * the API) → how-it-works strip → CTA band. Signed-in visitors are routed
 * straight to the boards.
 */
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PostCard } from '../components/PostCard.js'
import type { ApiPost } from '../utils/posts.js'

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()
  const [topPosts, setTopPosts] = useState<ApiPost[]>([])

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ data?: ApiPost[] }>('/api/posts?sort=top&limit=3')
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data?.data)) setTopPosts(res.data.data)
      })
      .catch(() => {
        /* marketing page degrades to the static sections */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Authenticated users browsing to / should land on the live boards, not
  // the marketing page.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/boards" replace />
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
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <img src="/logo.svg" alt="" className={cm.cn(cm.w(8), cm.h(8))} aria-hidden="true" />
          <span
            className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
            style={{ color: 'var(--color-primary)' }}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/boards"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.navBoards', {}, { defaultValue: 'Boards' })}
          </Link>
          <Link
            to="/roadmap"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.navRoadmap', {}, { defaultValue: 'Roadmap' })}
          </Link>
          <Link
            to="/changelog"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.navChangelog', {}, { defaultValue: 'Changelog' })}
          </Link>
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
            data-mol-id="landing-signup-cta"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
            )}
          >
            {t('landing.navJoin', { appName: APP_NAME }, { defaultValue: 'Join {{appName}}' })}
          </Link>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-hidden')}>
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.sp('p', 10),
              'relative max-w-[1120px] mx-auto rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white',
            )}
            style={{ minHeight: 380 }}
          >
            <div className="relative z-10 max-w-3xl">
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  'inline-block text-[11px] uppercase tracking-widest text-primary-fixed/80',
                )}
              >
                {t(
                  'landing.heroEyebrow',
                  { appName: APP_NAME, tagline: APP_TAGLINE },
                  { defaultValue: '{{appName}} — {{tagline}}' },
                )}
              </span>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 6),
                  'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
                )}
              >
                {t(
                  'landing.heroHeadline',
                  {},
                  { defaultValue: 'Stop guessing. Ship what they vote for.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mb', 8),
                  cm.maxW('xl'),
                  'leading-relaxed text-primary-fixed/90',
                )}
              >
                {t(
                  'landing.heroLede',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} turns scattered feature requests into a public board of voted ideas, an official roadmap, and a changelog your customers actually read.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('bold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-full bg-surface text-primary hover:-translate-y-0.5 transition-transform shadow-sm',
                  )}
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    arrow_forward
                  </span>
                  {t('landing.heroCtaPrimary', {}, { defaultValue: 'Start collecting votes' })}
                </Link>
                <Link
                  to="/boards"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-full border border-surface/40 text-white hover:bg-surface/10 backdrop-blur-md transition-colors',
                  )}
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'See a live board' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg' }),
                  cm.sp('mt', 10),
                  cm.textSize('sm'),
                  'flex-wrap text-primary-fixed/80',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-white')}>
                    {t('landing.heroStat1', {}, { defaultValue: '3,200+' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t('landing.heroStat1Label', {}, { defaultValue: 'Teams listening' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-white')}>
                    {t('landing.heroStat2', {}, { defaultValue: '1.4m' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t('landing.heroStat2Label', {}, { defaultValue: 'Votes counted' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-white')}>
                    {t('landing.heroStat3', {}, { defaultValue: '89%' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t('landing.heroStat3Label', {}, { defaultValue: 'Requests answered' })}
                  </span>
                </div>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.w(80),
                cm.h(80),
                cm.roundedFull,
                'absolute -right-24 -bottom-24 bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                cm.w(20),
                cm.h(20),
                cm.roundedFull,
                'absolute right-16 top-12 bg-primary-fixed/30 blur-xl',
              )}
              aria-hidden="true"
            />
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 12), 'max-w-[1040px] mx-auto')}>
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
                  'text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t('landing.topTitle', {}, { defaultValue: 'What users are asking for right now' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  'landing.topSubtitle',
                  {},
                  { defaultValue: 'Live from this board — sign in to add your vote.' },
                )}
              </p>
            </div>
            <Link
              to="/boards"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'text-primary hover:underline',
              )}
            >
              {t('landing.topViewAll', {}, { defaultValue: 'All boards' })}
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {topPosts.map((post) => (
              <PostCard key={post.id} post={post} href="/signup" />
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 16), 'max-w-[1040px] mx-auto')}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 6),
              'text-3xl md:text-4xl tracking-tight text-on-surface',
            )}
          >
            {t('landing.howTitle', {}, { defaultValue: 'From request to release, in the open' })}
          </h2>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
            {[
              {
                icon: 'campaign',
                title: t('landing.step1Title', {}, { defaultValue: 'Collect' }),
                body: t(
                  'landing.step1Body',
                  {},
                  {
                    defaultValue:
                      'Customers post ideas to public boards. Duplicates merge, votes pool, and demand ranks itself.',
                  },
                ),
              },
              {
                icon: 'map',
                title: t('landing.step2Title', {}, { defaultValue: 'Commit' }),
                body: t(
                  'landing.step2Body',
                  {},
                  {
                    defaultValue:
                      'Mark requests planned or in progress with a target quarter — the roadmap updates the moment you do.',
                  },
                ),
              },
              {
                icon: 'local_shipping',
                title: t('landing.step3Title', {}, { defaultValue: 'Ship' }),
                body: t(
                  'landing.step3Body',
                  {},
                  {
                    defaultValue:
                      'Shipped posts become changelog entries, and every voter sees the outcome on their own list.',
                  },
                ),
              },
            ].map((step) => (
              <div
                key={step.title}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 6),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.roundedFull,
                  )}
                  style={{ backgroundColor: 'var(--color-primary-container)' }}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {step.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                  {step.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20), 'max-w-[1040px] mx-auto')}>
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
              {t('landing.ctaHeadline', {}, { defaultValue: 'Your roadmap, backed by votes.' })}
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
                    'Spin up a public feedback board in minutes. Free while you find your footing; upgrade when the votes pour in.',
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
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
