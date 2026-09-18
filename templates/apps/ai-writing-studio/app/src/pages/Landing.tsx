import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AISuggestionCard } from '../components/AISuggestionCard.js'
import { DocumentStatusPill } from '../components/DocumentStatusPill.js'
import { SafeLink } from '../components/SafeLink.js'
import { WritingStreakHeroCard } from '../components/WritingStreakHeroCard.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'aiAssistant',
    defaultTitle: `${APP_NAME} Intelligence`,
    defaultBody:
      'Suggestions that respect your voice — never replace it. Imagery, pacing, and clarity refinements appear inline as quiet recommendations.',
    icon: 'auto_awesome',
    tint: 'text-primary',
  },
  {
    key: 'editor',
    defaultTitle: 'Distraction-free canvas',
    defaultBody:
      'Lora serif at 18px, generous line height, paragraph spacing that respects long-form rhythm. Toolbar disappears when the cursor moves.',
    icon: 'edit_note',
    tint: 'text-secondary',
  },
  {
    key: 'seo',
    defaultTitle: 'SEO without the noise',
    defaultBody:
      'Readability score, keyword density, and meta-description hints — all served as a single circular gauge instead of a wall of red flags.',
    icon: 'travel_explore',
    tint: 'text-info',
  },
  {
    key: 'templates',
    defaultTitle: 'Templates worth starting from',
    defaultBody:
      'Newsletter, essay, blog post, landing page — every template includes a sample outline and tone preset so you start mid-thought.',
    icon: 'auto_stories',
    tint: 'text-success',
  },
] as const

const TESTIMONIALS = [
  {
    key: 'newsletter',
    quoteDefault:
      'Plume reads like an editor who knows when to step back. I drafted my newsletter twice as fast and it still sounds like me.',
    roleDefault: 'Independent newsletter author',
  },
  {
    key: 'content-lead',
    quoteDefault:
      'The SEO panel is the first one I have ever actually trusted. It tells me what to fix in plain English.',
    roleDefault: 'Content lead, indie magazine',
  },
] as const

interface PricingTier {
  key: string
  name: string
  price: string
  cadence: string
  bullets: string[]
  featured?: boolean
}

// Mirrors the tier ladder the API actually enforces (api/src/tiers.ts) and
// the /pricing page renders — names, prices, and limits must stay in sync.
const PRICING: PricingTier[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'free forever',
    bullets: ['5 documents', '5 AI generations', '5 cover image generations'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$15',
    cadence: 'per month',
    bullets: [
      '500 documents',
      '500 AI generations + cover images',
      'Full SEO + readability suite',
      'Data export + 1-year history',
    ],
    featured: true,
  },
  {
    key: 'team',
    name: 'Team',
    price: '$49',
    cadence: 'per month',
    bullets: [
      'Everything in Pro',
      'Unlimited documents',
      'Unlimited AI + image generations',
      'Unlimited history retention',
    ],
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <SafeLink
            to="/"
            className={cm.cn(
              cm.textSize('xl'),
              'font-extrabold tracking-tight font-serif text-primary',
            )}
          >
            {APP_NAME}
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.textMuted,
                'hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#testimonials"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.textMuted,
                'hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.nav.testimonials', {}, { defaultValue: 'Testimonials' })}
            </a>
            <a
              href="#pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.textMuted,
                'hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </a>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-sm',
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
                    cm.textMuted,
                    'hover:text-on-surface transition-colors hidden sm:inline',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'bg-primary text-white rounded-full hover:bg-primary-dark transition-colors shadow-sm',
                  )}
                >
                  {t('landing.startWriting', {}, { defaultValue: 'Start writing' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden bg-quote-pattern')}>
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary-container/30 via-background to-background pointer-events-none"
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div
              className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-12 items-center')}
            >
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'AI writing studio for serious writers' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[0.95] font-serif',
                  )}
                >
                  {t('landing.heroTitle.intelligence', {}, { defaultValue: 'Intelligence meets ' })}
                  <span className="italic text-primary">
                    {t('landing.heroTitle.eloquence', {}, { defaultValue: 'eloquence' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    cm.textMuted,
                    'max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'A studio crafted for writers who care about their prose, pacing, and precision. {{appName}} drafts beside you — never instead of you.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'bg-primary text-white rounded-full hover:bg-primary-dark transition-colors inline-flex items-center gap-2 shadow-sm',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start your free trial' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('landing.heroSecondaryCta', {}, { defaultValue: 'See it in action' })}
                  </Link>
                </div>
                <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), cm.textMuted)}>
                  {t(
                    'landing.heroNote',
                    {},
                    { defaultValue: 'No credit card required. 14-day free trial.' },
                  )}
                </p>
              </div>

              {/* Sample hero card mirroring the auth'd dashboard hero */}
              <div className={cm.cn('lg:col-span-5')}>
                <WritingStreakHeroCard
                  writerName={t('nav.you', {}, { defaultValue: 'You' })}
                  wordsThisWeek={12400}
                  dayStreak={14}
                  wordsChange={2240}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Showcase: editor mock + AI panel */}
        <section className={cm.cn('relative')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 md:py-24')}>
            <div
              className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 lg:grid-cols-3 items-center')}
            >
              <div className={cm.cn('lg:col-span-2')}>
                <div
                  className={cm.cn(
                    'rounded-[2rem] bg-surface border border-outline-variant overflow-hidden',
                  )}
                  style={{
                    boxShadow:
                      '0 24px 60px -20px color-mix(in srgb, var(--mol-color-primary) 18%, transparent)',
                  }}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      'border-b border-outline-variant',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                      <span className="material-symbols-outlined text-primary" aria-hidden="true">
                        menu_book
                      </span>
                      <span className={cm.cn(cm.fontWeight('bold'), 'font-serif text-lg')}>
                        {t(
                          'landing.sampleDocTitle',
                          {},
                          { defaultValue: 'The Architecture of Silence' },
                        )}
                      </span>
                    </div>
                    <DocumentStatusPill status="draft" />
                  </div>
                  <div className={cm.cn(cm.sp('p', 8), 'md:p-12')}>
                    <div className={cm.cn('mx-auto max-w-[640px] font-serif text-on-surface')}>
                      <p className={cm.cn('text-[18px] leading-[1.8] mb-6')}>
                        {t(
                          'landing.sampleParagraph1',
                          {},
                          {
                            defaultValue:
                              'The city was never truly quiet. Even in the deepest hours of the night, a low hum vibrated through the concrete foundations — a mechanical heartbeat of subway trains and ventilation shafts.',
                          },
                        )}
                      </p>
                      <p className="text-[18px] leading-[1.8]">
                        {t('landing.sampleParagraph2.before', {}, { defaultValue: 'But ' })}
                        <span className="ai-text-selection">
                          {t(
                            'landing.sampleParagraph2.highlight',
                            {},
                            {
                              defaultValue:
                                'standing on the balcony of the 42nd floor, Elias felt a profound sense of isolation',
                            },
                          )}
                        </span>
                        {t(
                          'landing.sampleParagraph2.after',
                          {},
                          { defaultValue: ' against the glass.' },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cm.stack(4)}>
                <h2
                  className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-serif')}
                >
                  {t(
                    'landing.showcaseHeading',
                    {},
                    { defaultValue: 'A second pair of eyes — never a second author.' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('base'), cm.textMuted, 'leading-relaxed')}>
                  {t(
                    'landing.showcaseBody',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Highlight a sentence and {{appName}} offers a refinement. Accept it, tweak it, or wave it off. Suggestions are always tinted purple so you know what you wrote vs what was offered.',
                    },
                  )}
                </p>
                <AISuggestionCard
                  labelKey="landing.aiSuggestionLabel"
                  labelDefault="Enhance imagery"
                  suggestion={t(
                    'landing.aiSuggestionBody',
                    {},
                    {
                      defaultValue:
                        'standing on the balcony of the 42nd floor, Elias felt the city press against him — the wind sheared away the ambient hum, leaving him suspended in a frigid, silent void above the glowing grid.',
                    },
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12), cm.stack(3))}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </p>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-serif')}>
              {t('landing.featuresHeading', {}, { defaultValue: 'Tools that get out of the way' })}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/60 hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-3xl', f.tint)}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.sp('mb', 2),
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className={cm.cn('bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
            <div className={cm.cn(cm.grid({ gap: 'xl' }), 'grid-cols-1 md:grid-cols-2')}>
              {TESTIMONIALS.map((q) => (
                <figure
                  key={q.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-2xl bg-surface border border-outline-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-4xl text-primary/80"
                    aria-hidden="true"
                  >
                    format_quote
                  </span>
                  <blockquote
                    className={cm.cn(
                      cm.sp('mt', 4),
                      cm.textSize('lg'),
                      'font-serif italic leading-relaxed text-on-surface',
                    )}
                  >
                    {t(`landing.testimonial.${q.key}.quote`, {}, { defaultValue: q.quoteDefault })}
                  </blockquote>
                  <figcaption className={cm.cn(cm.sp('mt', 6), cm.textSize('sm'))}>
                    <span className={cm.cn(cm.textMuted)}>
                      {t(`landing.testimonial.${q.key}.role`, {}, { defaultValue: q.roleDefault })}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12), cm.stack(3))}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight font-serif')}>
              {t('landing.pricingHeading', {}, { defaultValue: 'Choose what fits your practice' })}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {PRICING.map((p) => (
              <div
                key={p.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col' }),
                  'rounded-2xl bg-surface border transition-shadow hover:shadow-md',
                  p.featured
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-outline-variant',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                  )}
                >
                  <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                    {t(`landing.plan.${p.key}.name`, {}, { defaultValue: p.name })}
                  </h3>
                  {p.featured ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest bg-primary text-white',
                      )}
                    >
                      {t('landing.plan.popular', {}, { defaultValue: 'Most loved' })}
                    </span>
                  ) : null}
                </div>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), cm.sp('mb', 6))}>
                  <span className="text-5xl font-extrabold tracking-tighter">{p.price}</span>
                  <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{p.cadence}</span>
                </div>
                <ul className={cm.cn(cm.stack(3), cm.sp('mb', 8), cm.flex1)}>
                  {p.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.textSize('sm'))}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span>
                        {t(`landing.plan.${p.key}.bullet.${i}`, {}, { defaultValue: bullet })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.textCenter,
                    'rounded-full transition-colors',
                    p.featured
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                  )}
                >
                  {t('landing.plan.cta', {}, { defaultValue: 'Start with this plan' })}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={cm.cn('bg-background border-t border-outline-variant')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'md' }),
            'md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              'md:items-start',
            )}
          >
            <span className={cm.cn('font-serif font-bold text-xl text-primary')}>{APP_NAME}</span>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'landing.footerCopy',
                { tagline: APP_TAGLINE, year: new Date().getFullYear() },
                { defaultValue: '© {{year}} {{tagline}}' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-on-surface transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-on-surface transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
