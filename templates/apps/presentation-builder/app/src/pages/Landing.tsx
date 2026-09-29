import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/**
 * Landing — translated from reference/flagship-apps-designs/design-presentation-builder-landing.html
 * ("Overture"): violet/pink on white with a stage-navy slide tableau. Sticky
 * nav with an icon brand tile, hero badge pill, an extrabold Plus Jakarta
 * Sans headline with the gradient-clip "stage." span, glow CTA + "See sample
 * deck", a grayscale "trusted by" logo strip, and a 3D-perspective stage
 * slide with skeleton text bars, a "Confidential" chip and a thumbnail rail;
 * a features bento (three chrome cards + a wide AI-assist card with a
 * "Generating outline…" stage panel); and a near-black footer with the
 * italic brand. The palette (violet #7c3aed / pink #ec4899 / stage navy)
 * was already the app's brand tokens — this rebuild adopts the design's
 * composition, type, and shape language.
 */

const BENTO = [
  {
    key: 'templates',
    icon: 'auto_awesome',
    iconTint: 'text-secondary',
    titleDefault: 'Beautiful templates',
    bodyDefault: 'Start with layouts designed by experts, tailored for impact and clarity.',
  },
  {
    key: 'collab',
    icon: null,
    iconTint: '',
    titleDefault: 'Live collaboration',
    bodyDefault: 'Work together in real-time. See exactly what your team is crafting.',
  },
  {
    key: 'presenter',
    icon: 'speaker_notes',
    iconTint: 'text-on-surface',
    titleDefault: 'Presenter mode',
    bodyDefault: 'Command the room with private notes, timers, and next-slide previews.',
  },
] as const

const cnTextCenter = 'text-center max-w-2xl mx-auto mb-16'
const cnH2 = 'text-3xl md:text-4xl font-bold text-on-surface mb-4'
const cnSub = 'text-on-surface-variant text-lg'
const cnH3 = 'text-xl font-bold text-on-surface mb-2'
const cnBody = 'text-on-surface-variant leading-relaxed flex-1'
const cnTextLink =
  'text-primary font-semibold hover:text-primary-hover inline-flex items-center gap-1 transition-colors'
const cnFooter = 'bg-stage py-16 border-t border-white/10 w-full'
const cnFooterBrand =
  'text-xl font-bold italic text-white opacity-90 hover:opacity-100 transition-opacity'
const cnFooterMuted = 'text-sm tracking-wide text-white/60'
const cnFooterLink = 'text-sm tracking-wide text-white/60 hover:text-secondary transition-colors'
const cnFooterIcon = 'text-white/60 hover:text-secondary transition-colors'
const cnMonoMuted = 'text-white/60 text-sm font-mono'

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      {/* TopNavBar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 shadow-sm',
        )}
      >
        <BrandWordmark size="lg" />
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <Link
            to="/templates"
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-secondary transition-colors',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-secondary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/shared"
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-secondary transition-colors',
            )}
          >
            {t('nav.gallery', {}, { defaultValue: 'Gallery' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/decks"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm shadow-primary/20 active:scale-95 transition-all',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-secondary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="nav-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm shadow-primary/20 active:scale-95 transition-all',
                )}
              >
                {/* Landing-scoped key: the shared `common.startFree` packs
                    "Start free", and the design's nav CTA is "Take the Stage". */}
                {t('landing.navCta', {}, { defaultValue: 'Take the Stage' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero — badge, gradient-clip headline, glow CTA, 3D stage tableau */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'}>
              <div className={'max-w-xl relative z-10'}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1.5),
                    'inline-flex w-fit rounded-full bg-background border border-primary/20 text-primary font-medium text-sm mb-8 shadow-sm',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[16px]')}
                    aria-hidden="true"
                  >
                    star
                  </span>
                  {t('landing.heroBadge', {}, { defaultValue: 'Spotlight-ready decks in minutes' })}
                </div>
                <h1
                  className={cm.cn(
                    'text-5xl lg:text-[72px] xl:text-[88px] font-extrabold leading-[1.05] tracking-[-0.03em] mb-6 text-on-surface',
                  )}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t('landing.hero.heading', {}, { defaultValue: 'Command the' })}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    {t('landing.hero.headingAccent', {}, { defaultValue: 'stage.' })}
                  </span>
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    'text-on-surface-variant mb-10 leading-relaxed max-w-lg',
                  )}
                >
                  {t(
                    'landing.hero.body',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} is the presentation builder for those who demand attention. Craft theatrical, polished slides that leave a lasting impression, without spending hours designing.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-col sm:flex-row gap-4 mb-12')}>
                  <Link
                    to="/signup"
                    data-mol-id="hero-cta"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-[0_0_20px_var(--glow-primary)] hover:shadow-[0_0_28px_var(--glow-primary-strong)] transition-all active:scale-95',
                    )}
                  >
                    {t('common.startFree', {}, { defaultValue: 'Start free' })}
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/templates"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'bg-surface hover:bg-surface-container/60 text-on-surface border border-outline-variant rounded-lg shadow-sm transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                      play_circle
                    </span>
                    {t('landing.seeSampleDeck', {}, { defaultValue: 'See sample deck' })}
                  </Link>
                </div>
                <div className={cm.stack(4)}>
                  <p
                    className={cm.cn(
                      cm.fontWeight('medium'),
                      // #4a4560 on #ffffff = 9.09:1 (was /70: blends to
                      // #807d90 = 4.00:1, axe serious).
                      'text-sm text-on-surface-variant uppercase tracking-wider',
                    )}
                  >
                    {t('landing.trustedBy', {}, { defaultValue: 'Trusted by visionary teams' })}
                  </p>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'opacity-50')}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={'h-8 w-24 rounded bg-on-surface/20'}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 3D stage tableau — main slide + thumbnail rail */}
              <div className={'relative h-[600px] hidden lg:block'} aria-hidden="true">
                <div
                  className={
                    'absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-50 -translate-y-20 scale-150'
                  }
                />
                <div
                  className={
                    'group absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-none aspect-video bg-stage rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col transition-transform duration-500 hover:rotate-0 -rotate-2'
                  }
                >
                  <div
                    className={cm.cn(
                      cm.sp('p', 8),
                      'flex-1 relative z-10 flex flex-col justify-center',
                    )}
                  >
                    <span
                      className={
                        // White on the chip's effective bg (secondary/20 over the
                        // dark stage, glow bleed → #44234f) = 13.13:1 (was
                        // text-secondary #ec4899 = 3.72:1, axe serious; the pink
                        // accent stays on the chip tint + stage glows).
                        'inline-block px-3 py-1 bg-secondary/20 text-white text-xs font-bold rounded mb-4 w-max uppercase tracking-wider'
                      }
                    >
                      {t('landing.slide.confidential', {}, { defaultValue: 'Confidential' })}
                    </span>
                    <h3
                      className={'text-4xl font-bold text-white mb-4'}
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {t('landing.slide.q1Roadmap', {}, { defaultValue: 'Q1 Roadmap' })}
                    </h3>
                    <div className={'w-3/4 h-2 bg-white/10 rounded-full mb-2 overflow-hidden'}>
                      <div className={'h-full bg-gradient-to-r from-primary to-secondary w-2/3'} />
                    </div>
                    <div className={'w-1/2 h-2 bg-white/10 rounded-full mb-2'} />
                    <div className={'w-2/3 h-2 bg-white/10 rounded-full'} />
                  </div>
                  <div
                    className={
                      'absolute -bottom-20 -right-20 w-64 h-64 bg-secondary opacity-30 blur-[60px] rounded-full'
                    }
                  />
                </div>
                <div
                  className={
                    'absolute top-[8%] right-[2%] flex flex-col gap-4 -rotate-2 translate-y-[-40px]'
                  }
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cm.cn(
                        'w-32 aspect-video bg-stage rounded-lg shadow-lg',
                        i === 1
                          ? 'border-2 border-primary shadow-[0_0_15px_var(--glow-primary)]'
                          : 'border border-white/5 opacity-70',
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section className={cm.cn(cm.sp('py', 24), 'bg-surface')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cnTextCenter}>
              <h2 className={cnH2} style={{ fontFamily: 'var(--font-headline)' }}>
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Everything you need for a standing ovation.' },
                )}
              </h2>
              <p className={cnSub}>
                {t(
                  'landing.features.sub',
                  {},
                  { defaultValue: 'Powerful tools disguised as simple interfaces.' },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
              {BENTO.map((card) => (
                <div
                  key={card.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    cm.sp('p', 8),
                    'bg-background rounded-lg border border-outline-variant/60 shadow-sm min-h-[280px]',
                  )}
                >
                  {card.icon ? (
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(12),
                        cm.h(12),
                        'bg-surface rounded-lg mb-6 shadow-sm',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[24px]', card.iconTint)}
                      >
                        {card.icon}
                      </span>
                    </span>
                  ) : (
                    <div
                      className={cm.cn(cm.flex({ gap: 'xs' }), '-space-x-2 mb-6')}
                      aria-hidden="true"
                    >
                      <span
                        className={
                          'w-10 h-10 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center border-2 border-background z-20'
                        }
                      >
                        JD
                      </span>
                      <span
                        className={
                          'w-10 h-10 rounded-full bg-secondary text-on-secondary text-xs font-bold flex items-center justify-center border-2 border-background z-10'
                        }
                      >
                        AK
                      </span>
                      <span
                        className={
                          'w-10 h-10 rounded-full bg-on-surface text-background text-xs font-bold flex items-center justify-center border-2 border-background z-0'
                        }
                      >
                        +3
                      </span>
                    </div>
                  )}
                  <h3 className={cnH3} style={{ fontFamily: 'var(--font-headline)' }}>
                    {t(`landing.bento.${card.key}.title`, {}, { defaultValue: card.titleDefault })}
                  </h3>
                  <p className={cnBody}>
                    {t(`landing.bento.${card.key}.body`, {}, { defaultValue: card.bodyDefault })}
                  </p>
                </div>
              ))}

              {/* Wide AI-assist card */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'md:col-span-3 md:flex-row items-center bg-background rounded-lg border border-outline-variant/60 shadow-sm overflow-hidden relative min-h-[380px]',
                )}
              >
                <div className={cm.cn(cm.sp('p', 8), 'md:w-1/2 z-10 pb-8 md:pb-0 md:pr-8')}>
                  <span
                    className={
                      'inline-block px-3 py-1 bg-surface text-primary text-xs font-bold rounded mb-4 uppercase tracking-wider shadow-sm'
                    }
                  >
                    {t('landing.ai.newBadge', {}, { defaultValue: 'New' })}
                  </span>
                  <h3 className={cnH2} style={{ fontFamily: 'var(--font-headline)' }}>
                    {t('landing.ai.heading', {}, { defaultValue: 'AI-assisted slide generation' })}
                  </h3>
                  <p className={cnBody}>
                    {t(
                      'landing.ai.body',
                      { appName: APP_NAME },
                      {
                        defaultValue:
                          'Type an outline. Watch {{appName}} instantly generate a polished, structured deck ready for refinement.',
                      },
                    )}
                  </p>
                  <Link to="/decks" className={cnTextLink}>
                    {t('landing.ai.tryIt', {}, { defaultValue: 'Try it out' })}
                    <span className={cm.cn('material-symbols-outlined text-sm')}>
                      arrow_forward
                    </span>
                  </Link>
                </div>
                <div
                  className={
                    'md:w-1/2 w-full h-[300px] md:h-full relative md:-right-6 bg-stage rounded-xl border border-white/10 shadow-2xl p-6 flex flex-col overflow-hidden'
                  }
                  aria-hidden="true"
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mb-4')}>
                    <span className={cm.cn('material-symbols-outlined text-secondary text-sm')}>
                      auto_awesome
                    </span>
                    <span className={cnMonoMuted}>
                      {t('landing.ai.generating', {}, { defaultValue: 'Generating outline...' })}
                    </span>
                  </div>
                  <div className={'space-y-3 opacity-70'}>
                    <div className={'h-4 bg-white/10 rounded w-3/4'} />
                    <div className={'h-4 bg-white/10 rounded w-1/2'} />
                    <div className={'h-4 bg-white/10 rounded w-5/6'} />
                  </div>
                  <div
                    className={
                      'absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stage to-transparent'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — near-black stage footer */}
      <footer className={cnFooter}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ justify: 'between', align: 'center' }),
            'flex-col md:flex-row gap-6',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              'items-center md:items-start',
            )}
          >
            <Link to="/" className={cnFooterBrand}>
              <BrandWordmark as="span" size="sm" footer invert />
            </Link>
            {/* App-scoped key: the shared `common.copyrightBuiltWithMolecule`
                already contains ". Built with Molecule.dev", which duplicated
                the sibling link below. */}
            <p className={cnFooterMuted}>
              {t(
                'landing.copyright',
                { year, app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
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
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              'flex-wrap justify-center gap-6',
            )}
          >
            <Link to="/privacy" className={cnFooterLink}>
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" className={cnFooterLink}>
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link to="/about" className={cnFooterLink}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/pricing" className={cnFooterLink}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <span className={cnFooterIcon} aria-hidden="true">
            <span className="material-symbols-outlined">language</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Landing
