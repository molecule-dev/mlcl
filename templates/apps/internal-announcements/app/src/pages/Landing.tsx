/**
 * Landing — Herald public marketing home.
 *
 * Trio: gradient hero (with sample auth'd-feed mirror) → why-Herald triad
 * → embedded sample announcement (logged-out preview of the feed) → CTA
 * strip + footer.
 *
 * Translated from forum/Landing.tsx using the Herald indigo + cyan
 * palette and "signal above the noise" voice from DESIGN.md.
 */
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AnnouncementCard } from '../components/AnnouncementCard.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { Footer } from '../components/Footer.js'
import { SAMPLE_FEED } from '../components/SampleData.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const HERO_PREVIEW = SAMPLE_FEED[0]!

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

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
          <BrandWordmark as="span" withTagline />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/feed"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 5),
                cm.sp('py', 2),
                'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
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
                  'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'overflow-hidden')}>
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.sp('p', 10),
              'relative max-w-[1120px] mx-auto rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white',
            )}
            style={{ minHeight: 360 }}
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
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Internal comms — {{tagline}}' },
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
                  { defaultValue: 'The announcements that have to land — actually do.' },
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
                      '{{appName}} is the announcement layer for mid-to-large companies. Priority levels, explicit acknowledgments, and threaded discussion — so signal stops drowning in chat noise.',
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
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    arrow_forward
                  </span>
                  {t('landing.heroCtaPrimary', {}, { defaultValue: 'Start your workspace' })}
                </Link>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-full border border-surface/40 text-white hover:bg-surface/10 backdrop-blur-md transition-colors',
                  )}
                >
                  {t('landing.heroCtaSecondary', {}, { defaultValue: 'Compare plans' })}
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
                    {t('landing.heroStat1', {}, { defaultValue: '94%' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t('landing.heroStat1Label', {}, { defaultValue: 'Median ack rate' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-white')}>
                    {t('landing.heroStat2', {}, { defaultValue: '4h' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t('landing.heroStat2Label', {}, { defaultValue: 'Median time to ack' })}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-white')}>
                    {t('landing.heroStat3', {}, { defaultValue: '1,200+' })}
                  </span>
                  <span className={cm.cn('uppercase tracking-widest text-xs')}>
                    {t(
                      'landing.heroStat3Label',
                      { appName: APP_NAME },
                      { defaultValue: 'Teams using {{appName}}' },
                    )}
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
                'absolute right-16 top-12 bg-secondary/40 blur-xl',
              )}
              aria-hidden="true"
            />
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 16), 'max-w-[1120px] mx-auto')}>
          <div className={cm.cn(cm.sp('mb', 6), 'text-center')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.featuresEyebrow',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} works' },
              )}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t('landing.featuresTitle', {}, { defaultValue: 'Three jobs, on the same page.' })}
            </h2>
          </div>
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
            {[
              {
                icon: 'flag',
                title: t('landing.feature1Title', {}, { defaultValue: 'Priority that survives' }),
                body: t(
                  'landing.feature1Body',
                  {},
                  {
                    defaultValue:
                      'Urgent, Pinned, Normal, FYI — colored left-borders and pills make priority readable at a glance, never by color alone.',
                  },
                ),
                accent: 'var(--color-priority-urgent, #dc2626)',
              },
              {
                icon: 'task_alt',
                title: t('landing.feature2Title', {}, { defaultValue: 'Acks as first-class' }),
                body: t(
                  'landing.feature2Body',
                  {},
                  {
                    defaultValue:
                      'Visible progress bar, audit trail, and ack-only digests for the people who never opened the post — no more "did you see it?".',
                  },
                ),
                accent: 'var(--color-acknowledged, #059669)',
              },
              {
                icon: 'forum',
                title: t(
                  'landing.feature3Title',
                  {},
                  { defaultValue: 'Discussion that compounds' },
                ),
                body: t(
                  'landing.feature3Body',
                  {},
                  {
                    defaultValue:
                      'Threaded comments live next to the post — context stays attached, instead of scattered across chat backchannels.',
                  },
                ),
                accent: 'var(--mol-color-primary, #4f46e5)',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 6),
                  cm.accentCard({ tone: 'custom' }),
                  'rounded-xl border border-outline-variant/40 bg-surface hover:-translate-y-0.5 hover:shadow-sm transition-all',
                )}
                style={{ ['--mol-accent' as string]: feature.accent }}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                  )}
                  style={{ backgroundColor: `${feature.accent}1f`, color: feature.accent }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')}>{feature.icon}</span>
                </span>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {feature.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 16), 'max-w-[920px] mx-auto')}>
          <div className={cm.cn(cm.sp('mb', 6))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.previewEyebrow', {}, { defaultValue: 'A peek inside' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'text-3xl md:text-4xl tracking-tight text-on-surface',
              )}
            >
              {t('landing.previewTitle', {}, { defaultValue: 'What teams see in the feed.' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'landing.previewSubtitle',
                {},
                {
                  defaultValue:
                    'A live sample card. Same component your team will see — gradient priority border, ack progress, and threaded comments one tap away.',
                },
              )}
            </p>
          </div>
          <AnnouncementCard announcement={HERO_PREVIEW} />
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
                { defaultValue: 'Stop drowning your important messages.' },
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
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Spin up a {{appName}} workspace in two minutes. Start on the Free plan — no card required.',
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
              {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
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
