import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { AmbientOrbs } from '../components/AmbientOrbs.js'
import { ChatBubble } from '../components/ChatBubble.js'
import { SafeLink } from '../components/SafeLink.js'
import { WaveformBars } from '../components/WaveformBars.js'

interface Feature {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
  /** Which brand hue drives the icon tile — alternates like the design. */
  accent: 'primary' | 'secondary'
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    icon: 'record_voice_over',
    titleKey: 'features.voice.title',
    defaultTitle: 'Voice-first conversation',
    bodyKey: 'features.voice.body',
    defaultBody: 'Engage in fluid back-and-forth without touching a screen or a keyboard.',
    accent: 'primary',
  },
  {
    icon: 'transcribe',
    titleKey: 'features.transcribe.title',
    defaultTitle: 'Real-time transcription',
    bodyKey: 'features.transcribe.body',
    defaultBody:
      'Watch your thoughts turn into perfectly formatted text as you speak — zero latency.',
    accent: 'secondary',
  },
  {
    icon: 'psychology',
    titleKey: 'features.personas.title',
    defaultTitle: 'Multi-agent personas',
    bodyKey: 'features.personas.body',
    defaultBody:
      'Switch between a creative brainstormer, a strict editor, or a technical advisor seamlessly.',
    accent: 'primary',
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
      { key: 'plans.free.perks.conversations', defaultLabel: '5 conversations' },
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
      { key: 'plans.pro.perks.conversations', defaultLabel: '500 conversations' },
      { key: 'plans.pro.perks.voices', defaultLabel: 'HD voice models' },
      { key: 'plans.pro.perks.history', defaultLabel: '1-year history' },
      { key: 'plans.pro.perks.personas', defaultLabel: 'Custom personas' },
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
      { key: 'plans.team.perks.workspace', defaultLabel: 'Shared workspace' },
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
    // The Stitch design is a dark neon page — pin the landing stage to the
    // dark token set (scoped to this subtree) so the glow/glass treatment
    // reads as designed in either app mode.
    <div
      data-mol-mode="dark"
      className={cm.cn(
        'landing-stage',
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
          'top-0 z-30 h-20 bg-background/80 backdrop-blur-md border-b border-white/5 shadow-2xl shadow-primary/10',
        )}
      >
        <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 bg-gradient-to-br from-primary to-secondary text-white',
            )}
            style={{
              boxShadow: '0 0 18px color-mix(in srgb, var(--mol-color-primary) 50%, transparent)',
            }}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              graphic_eq
            </span>
          </span>
          <BrandWordmark as="span" />
        </SafeLink>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {isAuthenticated ? (
            <Link
              to="/conversation"
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
        {/* Hero — gradient headline, glowing mic orb, single bold CTA */}
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('px', 6),
            cm.sp('pt', 16),
            cm.sp('pb', 12),
            cm.textCenter,
            cm.mxAuto,
            'max-w-[1280px] min-h-[716px]',
          )}
        >
          <h1
            className={cm.cn(
              cm.sp('mb', 6),
              'text-5xl md:text-[72px] font-black tracking-tight leading-tight gradient-text max-w-4xl',
            )}
          >
            {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
          </h1>
          <p
            className={cm.cn(
              'text-xl md:text-2xl',
              cm.textMuted,
              cm.fontWeight('medium'),
              cm.sp('mb', 12),
              cm.mxAuto,
              'max-w-2xl',
            )}
          >
            {t(
              'landing.heroSubtitle',
              {},
              {
                defaultValue:
                  'The AI voice assistant that understands your natural flow. Converse, ideate, and command — seamlessly.',
              },
            )}
          </p>

          {/* Glowing orb — radial cyan→violet halo with a glass mic core */}
          <div
            className={cm.cn(
              cm.position('relative'),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('mb', 16),
              'w-[240px] h-[240px]',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.roundedFull,
                'glow-orb animate-pulse opacity-80',
              )}
            />
            <div
              className={cm.cn(
                cm.position('relative'),
                'z-10 w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center',
              )}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-white text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mic
              </span>
            </div>
            <span className="sr-only">
              {t('voiceOrb.state.idle', {}, { defaultValue: 'Idle' })}
            </span>
          </div>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <Link
              to="/signup"
              className={cm.cn(
                cm.roundedFull,
                cm.fontWeight('bold'),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.textSize('lg'),
                'bg-gradient-to-r from-primary to-secondary text-white shadow-xl shadow-primary/40 hover:opacity-90 hover:scale-105 active:scale-95 transition-all',
                cm.flex({ align: 'center', gap: 'xs' }),
              )}
            >
              {t('landing.tryDemo', {}, { defaultValue: 'Try the demo' })}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
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

        {/* Waveform band — full-width gradient bar strip between sections */}
        <section className="w-full h-24 bg-surface-container-high/20 border-y border-white/5 my-24 flex items-center justify-center overflow-hidden">
          <WaveformBars count={32} variant="tall" className="opacity-60" />
        </section>

        {/* Features — glass cards with glowing icon tiles */}
        <section className={cm.cn(cm.sp('px', 6), 'mb-32', cm.mxAuto, 'max-w-[1280px]')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight',
              )}
            >
              {t('landing.featuresTitle', {}, { defaultValue: 'Intelligence that speaks.' })}
            </h2>
            <p className={cm.cn(cm.textCenter, cm.textMuted, cm.mxAuto, 'max-w-2xl')}>
              {t(
                'landing.featuresSubtitle',
                {},
                {
                  defaultValue:
                    'Built for natural dialogue — adapts to your speed, tone, and context.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3')}>
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 8),
                  'glass-card rounded-xl hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 border',
                    f.accent === 'primary'
                      ? 'bg-primary/20 border-primary/30 text-secondary'
                      : 'bg-secondary/20 border-secondary/30 text-primary',
                  )}
                  style={{
                    boxShadow:
                      f.accent === 'primary'
                        ? '0 0 15px color-mix(in srgb, var(--mol-color-primary) 30%, transparent)'
                        : '0 0 15px color-mix(in srgb, var(--mol-color-secondary) 30%, transparent)',
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

        {/* Live demo split — chat mockup + "speak naturally" callout */}
        <section className={cm.cn(cm.sp('px', 6), 'mb-32', cm.mxAuto, 'max-w-[1280px]')}>
          <div
            className={cm.cn(
              cm.position('relative'),
              'glass-card rounded-2xl p-8 md:p-12 border border-white/10 shadow-2xl overflow-hidden',
            )}
          >
            <div
              aria-hidden="true"
              className={cm.cn(
                cm.position('absolute'),
                cm.roundedFull,
                'top-0 right-0 w-64 h-64 bg-secondary/10 blur-[80px] pointer-events-none',
              )}
            />
            <div
              className={cm.cn(
                cm.grid({ cols: 1, gap: 'lg' }),
                'md:grid-cols-2 items-center relative z-10',
              )}
            >
              {/* Chat UI mockup */}
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-background rounded-[24px] border border-white/10 shadow-xl max-w-[320px] mx-auto w-full',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 6),
                    'pb-4 border-b border-white/5',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        'h-8 w-8 bg-primary/30',
                      )}
                    >
                      <span className="material-symbols-outlined text-xs text-white">robot_2</span>
                    </span>
                    <span className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'))}>
                      {t(
                        'landing.demo.assistantName',
                        { appName: APP_NAME },
                        { defaultValue: '{{appName}}' },
                      )}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-muted text-sm" aria-hidden="true">
                    more_horiz
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
                  <ChatBubble speaker="assistant">
                    {t(
                      'landing.demoMessage1',
                      {},
                      { defaultValue: 'Hi Sarah — ready to brainstorm the new campaign?' },
                    )}
                  </ChatBubble>
                  <ChatBubble speaker="user" source="voice">
                    {t(
                      'landing.demoMessage2',
                      {},
                      { defaultValue: "Yes — let's focus on organic growth strategies for Q3." },
                    )}
                  </ChatBubble>
                  <ChatBubble speaker="assistant">
                    {t(
                      'landing.demoMessage3',
                      {},
                      {
                        defaultValue:
                          "Great. I'd start with a community-led initiative. Want me to outline the phases?",
                      },
                    )}
                  </ChatBubble>
                </div>
              </div>
              {/* Callout */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md', justify: 'center' }),
                  'relative z-10',
                )}
              >
                <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t('landing.naturallyTitle', {}, { defaultValue: 'Speak naturally.' })}
                </h2>
                <p className={cm.cn(cm.textMuted, 'leading-relaxed')}>
                  {t(
                    'landing.naturallyBody',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'No trigger words. No rigid commands. {{appName}} understands context, interruptions, and the nuance of human speech — like chatting with a colleague.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-high/50 border border-white/5',
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
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {t('landing.listening', {}, { defaultValue: 'Listening…' })}
                    </span>
                    <WaveformBars
                      count={20}
                      className={cm.cn(cm.sp('mt', 1), 'opacity-70')}
                      active
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing — glass cards, highlighted Pro with glow + scale */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('mb', 24), cm.mxAuto, 'max-w-[1280px]')}>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.textCenter,
              cm.sp('mb', 16),
              'tracking-tight',
            )}
          >
            {t('landing.pricingTitle', {}, { defaultValue: 'Simple, transparent pricing' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-3 items-center')}>
            {PLANS.map((p) => (
              <article
                key={p.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.position('relative'),
                  cm.sp('p', 8),
                  p.highlighted
                    ? 'glass-card rounded-xl border-2 border-primary/50 md:scale-105 z-10 bg-surface-container-high/80'
                    : 'glass-card rounded-xl border border-white/5',
                  p.highlighted
                    ? 'shadow-[0_0_30px_color-mix(in_srgb,var(--mol-color-primary)_15%,transparent)]'
                    : '',
                )}
              >
                {p.highlighted ? (
                  <span
                    className={cm.cn(
                      cm.position('absolute'),
                      'top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-[10px] uppercase tracking-wider',
                    )}
                  >
                    {t('landing.popular', {}, { defaultValue: 'Popular' })}
                  </span>
                ) : null}
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    p.highlighted ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                  )}
                >
                  {t(`plans.${p.key}.name`, {}, { defaultValue: p.defaultName })}
                </h3>
                <p>
                  <span
                    className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tabular-nums')}
                  >
                    {p.price}
                  </span>
                  <span className={cm.cn(cm.textMuted, cm.fontWeight('normal'), cm.textSize('lg'))}>
                    {p.unit}
                  </span>
                </p>
                <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mb', 8))}>
                  {p.perks.map((perk) => (
                    <li
                      key={perk.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('sm'),
                        cm.textMuted,
                      )}
                    >
                      <span className="material-symbols-outlined text-secondary text-sm">
                        check
                      </span>
                      <span>{t(perk.key, {}, { defaultValue: perk.defaultLabel })}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.textCenter,
                    'rounded-lg',
                    cm.fontWeight(p.highlighted ? 'bold' : 'medium'),
                    p.highlighted
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 hover:opacity-90'
                      : 'bg-surface-container-high text-foreground border border-white/10 hover:bg-surface-container transition-colors',
                    'transition-all w-full block',
                  )}
                >
                  {t(p.ctaKey, {}, { defaultValue: p.defaultCta })}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer — brand block + two link groups, hairline top border */}
      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'relative z-10 w-full border-t border-white/5 bg-background',
        )}
      >
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.grid({ cols: 1, gap: 'lg' }),
            'max-w-[1280px] md:grid-cols-4',
          )}
        >
          <div className="md:col-span-2">
            <div className={cm.cn(cm.sp('mb', 4))}>
              <BrandWordmark as="span" footer size="sm" />
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), brand: APP_NAME },
                { defaultValue: '© {{year}} {{brand}}. Think out loud.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-foreground transition-colors w-fit',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-foreground transition-colors w-fit',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link
              to="/privacy"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-foreground transition-colors w-fit',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(
                cm.textSize('sm'),
                cm.textMuted,
                'hover:text-foreground transition-colors w-fit',
              )}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
