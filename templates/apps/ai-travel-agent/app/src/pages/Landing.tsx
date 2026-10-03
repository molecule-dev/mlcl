import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { ChatBubble } from '../components/ChatBubble.js'
import { SafeLink } from '../components/SafeLink.js'
import { VoiceOrb } from '../components/VoiceOrb.js'
import { WaveformBars } from '../components/WaveformBars.js'

interface Feature {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: 'record_voice_over',
    titleKey: 'features.voice.title',
    defaultTitle: 'Book by voice',
    bodyKey: 'features.voice.body',
    defaultBody:
      'Say where and when. The agent searches, reads back the options and books the one you pick.',
  },
  {
    icon: 'swap_horiz',
    titleKey: 'features.rebook.title',
    defaultTitle: 'Rebooked when delayed',
    bodyKey: 'features.rebook.body',
    defaultBody:
      'A delay of an hour or more moves you to the next flight on the route, and you get a text with the new details.',
  },
  {
    icon: 'call_split',
    titleKey: 'features.split.title',
    defaultTitle: 'Split the bill',
    bodyKey: 'features.split.body',
    defaultBody: 'Name who is flying and everyone gets an even share and a pay link by text.',
  },
]

interface PlanPerk {
  key: string
  defaultLabel: string
}

interface Plan {
  key: string
  defaultName: string
  price: string
  unit: string
  perks: ReadonlyArray<PlanPerk>
  highlighted?: boolean
  ctaKey: string
  defaultCta: string
}

// Prices/limits mirror the API tier ladder (api/src/tiers.ts) so the
// marketing block never contradicts the real /pricing + /settings/billing
// surfaces.
const PLANS: ReadonlyArray<Plan> = [
  {
    key: 'free',
    defaultName: 'Free',
    price: '$0',
    unit: '/mo',
    perks: [
      { key: 'plans.free.perks.bookings', defaultLabel: '3 bookings' },
      { key: 'plans.free.perks.voices', defaultLabel: 'Standard voices' },
      { key: 'plans.free.perks.history', defaultLabel: '90-day history' },
    ],
    ctaKey: 'plans.free.cta',
    defaultCta: 'Get Started',
  },
  {
    key: 'pro',
    defaultName: 'Pro',
    price: '$15',
    unit: '/mo',
    perks: [
      { key: 'plans.pro.perks.bookings', defaultLabel: '200 bookings' },
      { key: 'plans.pro.perks.voices', defaultLabel: 'HD voices' },
      { key: 'plans.pro.perks.history', defaultLabel: '1-year history' },
      { key: 'plans.pro.perks.splits', defaultLabel: 'Bill splitting by text' },
    ],
    highlighted: true,
    ctaKey: 'plans.pro.cta',
    defaultCta: 'Upgrade to Pro',
  },
  {
    key: 'team',
    defaultName: 'Team',
    price: '$49',
    unit: '/mo',
    perks: [
      { key: 'plans.team.perks.everything', defaultLabel: 'Everything in Pro' },
      { key: 'plans.team.perks.workspace', defaultLabel: 'Shared trips' },
      { key: 'plans.team.perks.admin', defaultLabel: 'Admin controls' },
    ],
    ctaKey: 'plans.team.cta',
    defaultCta: 'Contact Sales',
  },
]

function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-foreground antialiased relative overflow-hidden',
      )}
    >
      <AmbientOrbs />
      <nav
        className={cm.cn(
          cm.position('sticky'),
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border',
        )}
      >
        <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <BrandWordmark as="span" />
        </SafeLink>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {isAuthenticated ? (
            <Link
              to="/talk"
              data-mol-id="landing-go-to-dashboard"
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('semibold'),
                cm.sp('px', 5),
                cm.sp('py', 2),
                'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  cm.textMuted,
                  'hover:text-foreground transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.roundedFull,
                  cm.fontWeight('semibold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className={cm.cn('relative z-10 flex-1')}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('px', 6),
            cm.sp('pt', 16),
            cm.sp('pb', 12),
            cm.textCenter,
            cm.mxAuto,
            'max-w-[1024px]',
          )}
        >
          <span
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('semibold'),
              cm.sp('mb', 6),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-primary/15 text-primary border border-primary/30',
            )}
          >
            {t('landing.eyebrow', {}, { defaultValue: 'Your AI travel agent' })}
          </span>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 6),
              'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] bg-gradient-to-br from-foreground via-foreground to-secondary bg-clip-text text-transparent',
            )}
          >
            {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.textMuted,
              cm.sp('mb', 10),
              cm.mxAuto,
              'max-w-2xl leading-relaxed',
            )}
          >
            {t(
              'landing.heroSubtitle',
              {},
              {
                defaultValue:
                  'Say where you are going. The agent finds the flight, books it, moves you when it is delayed, and splits the bill with whoever is coming.',
              },
            )}
          </p>
          <VoiceOrb size="lg" />
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 8))}>
            <Link
              to="/signup"
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.textSize('lg'),
                'bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/40 hover:opacity-90 active:scale-95 transition-all',
              )}
            >
              {t('landing.tryDemo', {}, { defaultValue: 'Try the demo' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('semibold'),
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.textSize('base'),
                'border border-border text-foreground hover:bg-surface-secondary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('py', 12),
            cm.flex({ direction: 'col', align: 'center' }),
            'border-y border-border bg-surface/30',
          )}
        >
          <WaveformBars count={48} variant="tall" />
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, 'max-w-[1200px]')}>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.textCenter,
              cm.sp('mb', 4),
              'tracking-tight',
            )}
          >
            {t('landing.featuresTitle', {}, { defaultValue: 'One conversation, start to finish.' })}
          </h2>
          <p
            className={cm.cn(cm.textCenter, cm.textMuted, cm.mxAuto, cm.sp('mb', 12), 'max-w-2xl')}
          >
            {t(
              'landing.featuresSubtitle',
              {},
              {
                defaultValue: 'Search, booking, delays and money, handled in the same voice.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 8),
                  'rounded-2xl bg-surface border border-border hover:-translate-y-1 hover:border-primary/40 transition-all duration-200 shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 bg-primary/15 border border-primary/30 text-secondary',
                  )}
                  style={{
                    boxShadow:
                      '0 0 18px color-mix(in srgb, var(--mol-color-primary) 25%, transparent)',
                  }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{f.icon}</span>
                </span>
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.textMuted, 'leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, 'max-w-[1200px]')}>
          <div
            className={cm.cn(
              cm.grid({ cols: 1, gap: 'lg' }),
              cm.sp('p', 10),
              'md:grid-cols-2 rounded-3xl bg-surface border border-border relative overflow-hidden',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.position('absolute'),
                cm.roundedFull,
                'top-[-30%] right-[-15%] w-[24rem] h-[24rem] bg-secondary/15 blur-[100px] pointer-events-none',
              )}
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-2xl bg-background border border-border relative z-10',
              )}
            >
              <ChatBubble speaker="user" source="voice">
                {t(
                  'landing.demoMessage1',
                  {},
                  {
                    defaultValue: 'Get me to London on the 10th, two of us, and split it with Ana.',
                  },
                )}
              </ChatBubble>
              <ChatBubble speaker="assistant">
                {t(
                  'landing.demoMessage2',
                  {},
                  {
                    defaultValue:
                      'NS 101 leaves JFK at 7am, $489 each. Book it and text Ana her half?',
                  },
                )}
              </ChatBubble>
              <ChatBubble speaker="user" source="voice">
                {t('landing.demoMessage3', {}, { defaultValue: 'Yes.' })}
              </ChatBubble>
              <ChatBubble speaker="assistant">
                {t(
                  'landing.demoMessage4',
                  {},
                  {
                    defaultValue:
                      'Booked, confirmation KX7P2QM4. Ana has her pay link. I will move you if it is delayed.',
                  },
                )}
              </ChatBubble>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md', justify: 'center' }),
                'relative z-10',
              )}
            >
              <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                {t('landing.naturallyTitle', {}, { defaultValue: 'Just say it.' })}
              </h2>
              <p className={cm.cn(cm.textMuted, 'leading-relaxed')}>
                {t(
                  'landing.naturallyBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'No forms, no filters. {{appName}} confirms the flight and the total before it books, and every booking, move and payment shows up in your trips.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-secondary border border-border',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 bg-secondary/20 text-secondary',
                  )}
                >
                  <span className="material-symbols-outlined">graphic_eq</span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t('landing.listening', {}, { defaultValue: 'Listening…' })}
                  </span>
                  <WaveformBars count={20} className={cm.cn(cm.sp('mt', 1))} active />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), cm.mxAuto, 'max-w-[1200px]')}>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.textCenter,
              cm.sp('mb', 12),
              'tracking-tight',
            )}
          >
            {t('landing.pricingTitle', {}, { defaultValue: 'Simple, transparent pricing' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
            {PLANS.map((p) => (
              <article
                key={p.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 8),
                  p.highlighted
                    ? 'rounded-2xl bg-surface border-2 border-primary/60 shadow-2xl shadow-primary/30 md:scale-[1.03]'
                    : 'rounded-2xl bg-surface border border-border',
                )}
              >
                {p.highlighted ? (
                  <span
                    className={cm.cn(
                      cm.roundedFull,
                      cm.fontWeight('bold'),
                      'self-start px-3 py-1 text-[10px] uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-white',
                    )}
                  >
                    {t('landing.popular', {}, { defaultValue: 'Most Popular' })}
                  </span>
                ) : null}
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                  {t(`plans.${p.key}.name`, {}, { defaultValue: p.defaultName })}
                </h3>
                <p>
                  <span
                    className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tabular-nums')}
                  >
                    {p.price}
                  </span>
                  <span className={cm.cn(cm.textMuted)}>{p.unit}</span>
                </p>
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {p.perks.map((perk) => (
                    <li
                      key={perk.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('sm'),
                        cm.textMuted,
                      )}
                    >
                      <span className={'material-symbols-outlined text-secondary text-base'}>
                        check
                      </span>
                      <span>{t(perk.key, {}, { defaultValue: perk.defaultLabel })}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.sp('py', 3),
                    cm.textCenter,
                    p.highlighted
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90'
                      : 'bg-surface-secondary text-foreground border border-border hover:bg-background-tertiary',
                    'transition-all',
                  )}
                >
                  {t(p.ctaKey, {}, { defaultValue: p.defaultCta })}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.flex({ align: 'center', justify: 'between' }),
          'relative z-10 border-t border-border bg-background/80 backdrop-blur-md',
        )}
      >
        <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), brand: APP_NAME },
            { defaultValue: '© {{year}} {{brand}}.' },
          )}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textMuted,
              'hover:text-foreground transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textMuted,
              'hover:text-foreground transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/privacy"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textMuted,
              'hover:text-foreground transition-colors',
            )}
          >
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </Link>
          <Link
            to="/terms"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textMuted,
              'hover:text-foreground transition-colors',
            )}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
