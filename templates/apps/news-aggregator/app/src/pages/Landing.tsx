import { Link, useNavigate } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BiasIndicator } from '../components/BiasIndicator.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { Footer } from '../components/Footer.js'
import { TopicChipsRow } from '../components/TopicChipsRow.js'

/** Spectrum sample cards — how three outlets frame the same story (Stitch design). */
const SPECTRUM_CARDS = [
  {
    key: 'left',
    source: 'The Guardian',
    icon: 'article',
    headlineKey: 'landing.spectrum.leftHeadline',
    defaultHeadline: 'Climate Summit Yields Urgent Pledges, But Activists Demand Action',
    excerptKey: 'landing.spectrum.leftExcerpt',
    defaultExcerpt:
      'World leaders agreed to ambitious new targets at today\u2019s summit, though frontline organizers insist the timeline remains critically inadequate.',
    bias: '20%',
    lifted: false,
  },
  {
    key: 'center',
    source: 'Reuters',
    icon: 'breaking_news_alt_1',
    headlineKey: 'landing.spectrum.centerHeadline',
    defaultHeadline: 'Nations Agree on Revised Emissions Targets at Global Summit',
    excerptKey: 'landing.spectrum.centerExcerpt',
    defaultExcerpt:
      'Delegates concluded the three-day conference with a signed agreement to reduce industrial emissions by 15% over the next decade.',
    bias: '50%',
    lifted: true,
  },
  {
    key: 'right',
    source: 'Wall Street Journal',
    icon: 'article',
    headlineKey: 'landing.spectrum.rightHeadline',
    defaultHeadline: 'New Climate Regulations Poised to Strain Industrial Sector',
    excerptKey: 'landing.spectrum.rightExcerpt',
    defaultExcerpt:
      'The latest international climate agreement introduces stringent regulatory hurdles that analysts warn could significantly impact manufacturing output.',
    bias: '80%',
    lifted: false,
  },
] as const

const SAMPLE_TOPICS = [
  { slug: 'world', label: 'World', icon: 'public', tint: 'world' as const, storyCount: 24 },
  {
    slug: 'business',
    label: 'Business',
    icon: 'trending_up',
    tint: 'business' as const,
    storyCount: 18,
  },
  { slug: 'tech', label: 'Tech', icon: 'memory', tint: 'tech' as const, storyCount: 31 },
  { slug: 'science', label: 'Science', icon: 'science', tint: 'science' as const, storyCount: 9 },
  {
    slug: 'sports',
    label: 'Sports',
    icon: 'sports_basketball',
    tint: 'sports' as const,
    storyCount: 14,
  },
  {
    slug: 'culture',
    label: 'Culture',
    icon: 'theater_comedy',
    tint: 'culture' as const,
    storyCount: 11,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-w-0 whitespace-nowrap shrink-0',
            )}
          >
            {/* the nav Link already provides the destination — span avoids <a> inside <a> */}
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0')}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden sm:inline whitespace-nowrap',
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/home"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap shrink-0',
                  'rounded bg-primary text-on-primary transition-colors hover:bg-primary-container',
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
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'whitespace-nowrap shrink-0',
                    'rounded bg-primary text-on-primary transition-colors hover:bg-primary-container',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start reading' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — gradient panel with editorial wordmark + sample story card */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7 flex flex-col gap-8'}>
                <h1
                  className={cm.cn(
                    'font-headline text-5xl md:text-[3.5rem] lg:text-7xl font-semibold tracking-[-0.02em] leading-[1.1]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    'text-on-surface-variant max-w-2xl leading-[1.6]',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Read every angle of every story. {{appName}} groups headlines from across the political spectrum so you know not just what happened, but how it is being told.',
                    },
                  )}
                </p>
                {/* Email capture — routes into signup with the address carried over */}
                <form
                  className={cm.cn(cm.flex({ gap: 'md' }), 'max-w-md flex-col sm:flex-row')}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const input = e.currentTarget.elements.namedItem('email')
                    const email = input instanceof HTMLInputElement ? input.value : ''
                    navigate(email ? `/signup?email=${encodeURIComponent(email)}` : '/signup')
                  }}
                >
                  <input
                    name="email"
                    type="email"
                    data-mol-id="landing-hero-email"
                    placeholder={t(
                      'landing.heroEmailPlaceholder',
                      {},
                      { defaultValue: 'Enter your email' },
                    )}
                    className={cm.cn(
                      'w-full rounded bg-surface-container-low border-0 border-b-2 border-transparent px-4 py-3 text-on-surface transition-colors',
                      'focus:border-primary focus:ring-0 focus:outline-none',
                    )}
                  />
                  <button
                    type="submit"
                    data-mol-id="landing-hero-submit"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      'rounded bg-primary text-on-primary whitespace-nowrap transition-colors hover:bg-primary-container',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start reading free' })}
                  </button>
                </form>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'landing.heroSocialProof',
                    {},
                    { defaultValue: 'Join 50,000+ informed readers.' },
                  )}
                </p>
              </div>

              {/* Editorial photo — soft primary glow behind, per the Stitch design */}
              <div className={'lg:col-span-5 relative'}>
                <div
                  className={'absolute inset-0 bg-primary-container/10 blur-[40px] rounded-full'}
                  aria-hidden="true"
                />
                <img
                  src="https://picsum.photos/seed/vantage-editorial/800/1000"
                  alt={t(
                    'landing.heroImageAlt',
                    {},
                    {
                      defaultValue:
                        'High-angle view of scattered newspapers and magazines on a wooden desk in warm morning light',
                    },
                  )}
                  className="relative z-10 aspect-[4/5] h-auto w-full rounded object-cover object-center shadow-xl shadow-primary/5"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Topic chips strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <TopicChipsRow
            heading={t('landing.topicsHeading', {}, { defaultValue: 'Today across the spectrum' })}
            topics={SAMPLE_TOPICS}
          />
        </section>

        {/* Spectrum cards — three outlets, one story (Stitch design centerpiece) */}
        <section className="bg-surface-container-low">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}>
            <div className={cm.cn(cm.sp('mb', 16), cm.textCenter, 'max-w-2xl mx-auto')}>
              <h2
                className={cm.cn(
                  cm.sp('mb', 4),
                  'font-headline text-3xl md:text-4xl tracking-tight',
                )}
              >
                {t('landing.spectrum.title', {}, { defaultValue: 'Read across the spectrum.' })}
              </h2>
              <p className="text-on-surface-variant leading-relaxed">
                {t(
                  'landing.spectrum.subtitle',
                  {},
                  {
                    defaultValue:
                      'See how different outlets cover the same breaking story. Our intelligence engine analyzes tone, facts, and omissions to present a complete picture.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3 items-start')}>
              {SPECTRUM_CARDS.map((card) => (
                <article
                  key={card.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    cm.sp('p', 6),
                    'rounded bg-surface-container-lowest',
                    card.lifted &&
                      'shadow-[0_8px_32px_color-mix(in_oklab,var(--color-primary)_8%,transparent)] relative z-10 md:-translate-y-4',
                  )}
                >
                  <div className={cm.flex({ justify: 'between', align: 'start' })}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest px-2 py-1 rounded bg-surface-container-high text-on-surface-variant',
                      )}
                    >
                      {card.source}
                    </span>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined',
                        card.lifted ? 'text-tertiary' : 'text-outline-variant',
                      )}
                      aria-hidden="true"
                    >
                      {card.icon}
                    </span>
                  </div>
                  <h3 className="font-headline mt-2 text-xl leading-snug">
                    {t(card.headlineKey, {}, { defaultValue: card.defaultHeadline })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'flex-grow line-clamp-3 text-on-surface-variant',
                    )}
                  >
                    {t(card.excerptKey, {}, { defaultValue: card.defaultExcerpt })}
                  </p>
                  <div>
                    <div
                      className={cm.cn(
                        cm.flex({ justify: 'between' }),
                        // text-on-surface-variant, NOT text-outline — the outline
                        // token is a border color (#e5e7eb on white = 1.23:1);
                        // as 12px label text it was an axe serious contrast fail.
                        'text-xs uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      <span>{t('landing.spectrum.left', {}, { defaultValue: 'Left' })}</span>
                      <span>{t('landing.spectrum.center', {}, { defaultValue: 'Center' })}</span>
                      <span>{t('landing.spectrum.right', {}, { defaultValue: 'Right' })}</span>
                    </div>
                    <div className="bias-track">
                      <div className="bias-indicator" style={{ left: card.bias }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Bias spectrum demo strip — Vantage's signature feature */}
        <section className={'border-t border-outline-variant/40 bg-surface-container-lowest'}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'font-bold uppercase tracking-widest text-orange-800 dark:text-secondary mb-3 text-center',
              )}
            >
              {t('landing.spectrumEyebrow', {}, { defaultValue: 'Bias awareness, built in' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mb', 6),
                cm.textCenter,
                'font-headline text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t(
                'landing.spectrumHeading',
                {},
                { defaultValue: 'Every source plotted. No mystery.' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 10),
                cm.textCenter,
                'text-on-surface-variant max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.spectrumBody',
                {},
                {
                  defaultValue:
                    'A transparent left-to-right scale shows where each outlet sits. The cursor below shows the average bias for the demo headline above.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.maxW('xl'),
                cm.mxAuto,
                cm.sp('p', 6),
                'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm',
              )}
            >
              <BiasIndicator value={-0.2} variant="spectrum" />
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-headline font-extrabold tracking-tight',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'See the news from every angle' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No paywall, no algorithm. Just transparent multi-source coverage of every story.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('medium'),
                'rounded bg-primary text-on-primary inline-flex items-center gap-2 transition-colors hover:bg-primary-container',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start reading free' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <Footer />
        <p className={cm.sp('mt', 4)}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Read the spectrum.' },
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
        </p>
      </footer>
    </div>
  )
}
