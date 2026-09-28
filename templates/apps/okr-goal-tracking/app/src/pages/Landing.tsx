import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ObjectiveCard, type ObjectiveCardData } from '../components/ObjectiveCard.js'
import { ProgressRing } from '../components/ProgressRing.js'

const HERO_OBJECTIVE: ObjectiveCardData = {
  id: 'sample',
  title: 'Launch Q2 customer onboarding revamp',
  ownerName: 'Avery Chen',
  period: 'Q2 2026',
  progress: 68,
  status: 'on-track',
  keyResultCount: 4,
  keyResultsCompleted: 2,
  description: 'Cut activation time in half and ship the new welcome flow to every plan tier.',
}

const HERO_KEY_RESULTS = [
  { label: 'Launch onboarding revamp', progress: 80, status: 'on-track' as const },
  { label: 'Expand self-serve tier', progress: 45, status: 'at-risk' as const },
]

const TRUSTED_BY = [
  { icon: 'hexagon', name: 'Acorn' },
  { icon: 'change_history', name: 'Zenith' },
  { icon: 'radio_button_unchecked', name: 'O-Ring' },
  { icon: 'polyline', name: 'Vertex' },
]

const FEATURES = [
  {
    icon: 'account_tree',
    tint: 'primary',
    titleKey: 'feature1Title',
    titleDefault: 'Goal-tree hierarchy',
    bodyKey: 'feature1Body',
    bodyDefault:
      'Cascade company-level OKRs into team and individual key results without losing context.',
  },
  {
    icon: 'event_available',
    tint: 'accent',
    titleKey: 'feature2Title',
    titleDefault: 'Weekly check-ins',
    bodyKey: 'feature2Body',
    bodyDefault:
      'Score progress, log confidence, and surface blockers in a five-minute Friday ritual.',
  },
  {
    icon: 'donut_large',
    tint: 'success',
    titleKey: 'feature5Title',
    titleDefault: 'Real-time progress',
    bodyKey: 'feature5Body',
    bodyDefault:
      'Key-result progress rolls up the moment check-ins land — no manual data entry, no stale dashboards.',
  },
  {
    icon: 'summarize',
    tint: 'primary',
    titleKey: 'feature3Title',
    titleDefault: 'Quarterly reviews',
    bodyKey: 'feature3Body',
    bodyDefault:
      'Roll-up scorecards, reflection prompts, and grades make the next quarter sharper than the last.',
  },
  {
    icon: 'cycle',
    tint: 'accent',
    titleKey: 'feature6Title',
    titleDefault: 'Cadence automations',
    bodyKey: 'feature6Body',
    bodyDefault:
      'Set your OKR rhythm — monthly, quarterly, annual — and drafting and review cycles run themselves.',
  },
  {
    icon: 'hub',
    tint: 'primary',
    titleKey: 'feature4Title',
    titleDefault: 'Coaching nudges',
    bodyKey: 'feature4Body',
    bodyDefault: "{{appName}} flags drift early so you're recalibrating midweek, not midquarter.",
  },
]

const SOCIAL_PROOF = [
  { count: '12,400+', labelKey: 'objectivesTracked', labelDefault: 'objectives tracked' },
  { count: '94%', labelKey: 'checkInRate', labelDefault: 'weekly check-in rate' },
  { count: '4.8 / 5', labelKey: 'teamRating', labelDefault: 'team coach rating' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const chipTint: Record<string, string> = {
    primary: 'bg-primary-fixed text-primary',
    accent: 'bg-secondary-container text-on-secondary-container',
    success: 'bg-success/10 text-success',
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/40 shadow-sm',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30',
            )}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              landscape
            </span>
          </div>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <a
            href="#features"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              // Hidden below `sm`: at 390px the logo + both links + CTA
              // over-run the row and the wordmark collides with "Features"
              // (fleet-qa 2026-09-22). The page footer carries the same links.
              // inline-flex + py keeps the 20px text at the tap-target floor.
              'hidden sm:inline-flex sm:items-center sm:py-2 text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden sm:inline-flex sm:items-center sm:py-2 text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'whitespace-nowrap rounded-lg text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all',
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
                  'inline-flex items-center py-2 text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'whitespace-nowrap rounded-lg text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('pt', 16),
          cm.sp('pb', 16),
          'relative overflow-hidden bg-background',
        )}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -top-32 -right-40 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tr from-primary-light to-secondary-container blur-3xl opacity-50',
          )}
        />
        <div
          className={cm.cn(
            'max-w-[1200px] mx-auto',
            cm.grid({ cols: 12, gap: 'xl' }),
            'relative items-center',
          )}
        >
          <div className={cm.cn('col-span-12 lg:col-span-7', cm.stack(6))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'self-start inline-flex items-center px-3 py-1.5 rounded-full bg-secondary-container/60 border border-outline-variant/50 text-on-secondary-container tracking-wide',
              )}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden>
                rocket_launch
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Built for teams who set and hit goals' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-on-surface',
              )}
            >
              {t('landing.heroTitleLeading', {}, { defaultValue: 'Climb toward' })}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                {t('landing.heroTitleAccent', {}, { defaultValue: 'what matters.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'max-w-2xl text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.heroBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Set objectives, track key results, and keep every team aligned on the only metrics that move the business forward.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-col sm:flex-row')}>
              <Link
                to="/signup"
                data-mol-id="landing-hero-primary-cta"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-lg text-white bg-primary hover:bg-primary-hover active:scale-95 transition-all',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start free for 14 days' })}
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
              <a
                href="#features"
                data-mol-id="landing-hero-secondary-cta"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/60 hover:bg-surface-container-low active:scale-95 transition-all',
                )}
              >
                <span
                  className="material-symbols-outlined text-[18px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_circle
                </span>
                {t('landing.ctaSecondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            <div className={cm.sp('pt', 6)}>
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant mb-4',
                )}
              >
                {t('landing.trustedBy', {}, { defaultValue: 'Trusted by 1,200+ modern teams' })}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', wrap: 'wrap', gap: 'lg' }),
                  'opacity-60 grayscale',
                )}
              >
                {TRUSTED_BY.map((b) => (
                  <div
                    key={b.name}
                    className={cm.flex({ align: 'center', gap: 'xs' }) + ' font-bold text-lg'}
                  >
                    <span className="material-symbols-outlined" aria-hidden>
                      {b.icon}
                    </span>
                    {b.name}
                  </div>
                ))}
              </div>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.sp('pt', 2))}>
              {SOCIAL_PROOF.map((p) => (
                <div key={p.labelKey} className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-extrabold tracking-tight text-on-surface tabular-nums',
                    )}
                  >
                    {p.count}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      `landing.${p.labelKey}` as 'landing.objectivesTracked',
                      {},
                      { defaultValue: p.labelDefault },
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className={cm.cn('col-span-12 lg:col-span-5', cm.stack(4), 'relative')}>
            {/* Stylized product mockup (design: rotated white card, progress
                ring, KR bars, floating context chip) */}
            <div
              data-mol-id="landing-hero-mockup"
              className="relative bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 p-6 flex flex-col gap-6 lg:rotate-2 hover:rotate-0 transition-transform duration-500"
            >
              <div
                className={
                  cm.flex({ justify: 'between', align: 'center' }) +
                  ' pb-4 border-b border-outline-variant/40'
                }
              >
                <div>
                  <h3 className="font-bold text-on-surface">
                    {t('landing.mock.title', {}, { defaultValue: 'Q3 Objectives' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('landing.mock.subtitle', {}, { defaultValue: 'Company-wide progress' })}
                  </p>
                </div>
                <ProgressRing value={75} size={56} stroke={5} status="on-track" />
              </div>
              <div className={cm.stack(4)}>
                {HERO_KEY_RESULTS.map((kr) => (
                  <div
                    key={kr.label}
                    className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/40"
                  >
                    <div
                      className={cm.flex({ justify: 'between', align: 'center' }) + ' mb-2 gap-2'}
                    >
                      <div className={cm.flex({ align: 'center', gap: 'xs' }) + ' min-w-0'}>
                        <span
                          className={cm.cn(
                            'w-2 h-2 rounded-full shrink-0',
                            kr.status === 'on-track' ? 'bg-success' : 'bg-warning',
                          )}
                          aria-hidden
                        />
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface truncate',
                          )}
                        >
                          {kr.label}
                        </span>
                      </div>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0')}
                      >
                        {kr.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={cm.cn(
                          'h-full rounded-full',
                          kr.status === 'on-track' ? 'bg-success' : 'bg-warning',
                        )}
                        style={{ width: `${kr.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Floating context card */}
              <div className="absolute -right-4 -bottom-8 bg-surface-container-lowest p-4 rounded-xl shadow-xl border border-outline-variant/40 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center text-primary">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden
                  >
                    trending_up
                  </span>
                </div>
                <div>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-medium')}>
                    {t('landing.mock.alignmentLabel', {}, { defaultValue: 'Team alignment' })}
                  </p>
                  <p className="font-bold text-on-surface">+12%</p>
                </div>
              </div>
            </div>
            <ObjectiveCard objective={HERO_OBJECTIVE} className="bg-surface" />
          </div>
        </div>
      </section>

      <section
        id="features"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'bg-surface-container-low')}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className={cm.cn(cm.stack(4), cm.textCenter, 'mb-12')}>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface max-w-3xl mx-auto',
              )}
            >
              {t(
                'landing.featuresTitle',
                {},
                { defaultValue: 'Everything your team needs to align and deliver.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'A comprehensive suite designed to turn strategy into measurable execution.',
                },
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.stack(3),
                  'group bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-lg',
                    chipTint[f.tint],
                  )}
                >
                  <span className="material-symbols-outlined text-[22px]" aria-hidden>
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}
                >
                  {t(
                    `landing.${f.titleKey}` as 'landing.feature1Title',
                    {},
                    { defaultValue: f.titleDefault },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.${f.bodyKey}` as 'landing.feature1Body',
                    { appName: APP_NAME },
                    { defaultValue: f.bodyDefault },
                  )}
                </p>
                <Link
                  to="/about"
                  className={
                    cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'inline-flex items-center text-primary group-hover:text-primary-hover transition-colors',
                    ) + ' mt-auto'
                  }
                >
                  {t('landing.learnMore', {}, { defaultValue: 'Learn more' })}
                  <span
                    className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform"
                    aria-hidden
                  >
                    arrow_forward
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band — full-bleed primary→accent gradient (design: CTA band) */}
      <section
        className={
          cm.sp('px', 8) +
          ' py-24 bg-[linear-gradient(90deg,var(--color-cta-grad-from),var(--color-cta-grad-to))]'
        }
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8 tracking-tight leading-tight">
            {t('landing.ctaTitle', {}, { defaultValue: 'Start your next quarter with clarity.' })}
          </h2>
          <Link
            to="/signup"
            data-mol-id="landing-footer-cta"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex rounded-lg bg-surface-container-lowest text-on-surface shadow-lg hover:bg-surface-container-low active:scale-95 transition-all',
            )}
          >
            {t('landing.ctaButton', {}, { defaultValue: 'Create my workspace' })}
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <footer className="w-full bg-[var(--color-nav-bg)] py-12">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            'max-w-[1200px] mx-auto flex-col md:flex-row gap-8',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'text-white',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              landscape
            </span>
            {APP_NAME}
          </span>
          {/* flex-wrap: at 390px the six links + gaps over-run one row and the
              row (unclipped, outside every overflow-hidden section) pushed the
              document to 485px scroll width (fleet-qa 2026-09-22). py on each
              link lifts the 16px text to a ~36px tap target. */}
          <div
            className={cm.cn(
              cm.flex({ gap: 'md', wrap: 'wrap' }),
              'gap-y-2 justify-center md:justify-end flex-1 min-w-0',
            )}
          >
            <Link
              to="/login"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link
              to="/privacy"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <a
              href="https://www.molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className={cm.cn(
                cm.fontWeight('bold'),
                'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors',
              )}
            >
              {t('landing.footerBuiltOn', {}, { defaultValue: 'Built on Molecule.dev' })}
            </a>
          </div>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-[0.18em] text-white/40',
            )}
          >
            {t(
              'landing.footerCopyright',
              { year: new Date().getFullYear(), name: APP_NAME, tagline: APP_TAGLINE },
              { defaultValue: '© {{year}} {{name}} — {{tagline}}' },
            )}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Landing
