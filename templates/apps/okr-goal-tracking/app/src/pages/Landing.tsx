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

const FEATURES = [
  {
    icon: 'flag',
    titleKey: 'feature1Title',
    titleDefault: 'Objectives that align',
    bodyKey: 'feature1Body',
    bodyDefault:
      'Cascade company-level OKRs into team and individual key results without losing context.',
  },
  {
    icon: 'fact_check',
    titleKey: 'feature2Title',
    titleDefault: 'Weekly check-ins',
    bodyKey: 'feature2Body',
    bodyDefault:
      'Score progress, log confidence, and surface blockers in a five-minute Friday ritual.',
  },
  {
    icon: 'rate_review',
    titleKey: 'feature3Title',
    titleDefault: 'Quarterly reviews',
    bodyKey: 'feature3Body',
    bodyDefault:
      'Roll-up scorecards, reflection prompts, and grades make the next quarter sharper than the last.',
  },
  {
    icon: 'insights',
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

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/40',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30',
            )}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              arrow_upward
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
              'hidden sm:inline-flex sm:items-center sm:py-2 text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden sm:inline-flex sm:items-center sm:py-2 text-on-surface-variant hover:text-on-surface transition-colors',
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
                'whitespace-nowrap rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
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
                  'inline-flex items-center py-2 text-indigo-700 hover:text-indigo-900 transition-colors',
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
                  'whitespace-nowrap rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
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
          'relative overflow-hidden',
        )}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -top-32 -right-40 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-indigo-200 to-sky-100 blur-3xl opacity-70',
          )}
        />
        <div
          aria-hidden
          className={cm.cn(
            'absolute -bottom-40 -left-32 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 blur-3xl opacity-60',
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
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-indigo-700 self-start',
              )}
            >
              <span aria-hidden className={cm.cn('w-6 h-px bg-indigo-500')} />
              {t('landing.eyebrow', {}, { defaultValue: 'OKRs · Check-ins · Reviews' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Climb toward what matters.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'max-w-xl text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.heroBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} gives every team a measurable path up the mountain — set objectives, score key results weekly, and review the climb every quarter.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-xl text-white bg-gradient-to-br from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start free for 14 days' })}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                {t('landing.ctaSecondary', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.sp('pt', 6))}>
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
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('p', 6),
                'relative rounded-[2rem] text-white shadow-2xl shadow-indigo-900/40',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-primary-container, #312e81) 100%)',
              }}
            >
              <div
                aria-hidden
                className={cm.cn(
                  'absolute -right-10 -top-10 w-48 h-48 rounded-full bg-sky-400/30 blur-3xl',
                )}
              />
              <div
                aria-hidden
                className={cm.cn(
                  'absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-400/30 blur-3xl',
                )}
              />
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                  'relative',
                )}
              >
                <ProgressRing
                  value={68}
                  size={150}
                  stroke={12}
                  status="on-track"
                  className="text-white"
                />
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-[0.22em] text-indigo-200',
                  )}
                >
                  {t('landing.heroProgressLabel', {}, { defaultValue: 'Q2 company plan' })}
                </span>
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
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-indigo-700',
              )}
            >
              {t('landing.featuresEyebrow', {}, { defaultValue: 'How teams climb' })}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.featuresTitle',
                {},
                { defaultValue: 'Coaching-grade OKRs, without the spreadsheet sprawl.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 4, gap: 'xl' }))}>
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.stack(3),
                  'bg-surface rounded-2xl shadow-sm border border-outline-variant/40 hover:-translate-y-1 hover:shadow-md transition-all duration-200',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16))}>
        <div
          className={cm.cn(
            'max-w-[1100px] mx-auto rounded-[2rem] relative overflow-hidden',
            cm.sp('p', 12),
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-primary-hover) 50%, var(--color-secondary) 100%)',
          }}
        >
          <div
            aria-hidden
            className={cm.cn(
              'absolute -right-20 -top-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
            )}
          />
          <div
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center', gap: 'lg' }),
              'relative flex-col md:flex-row',
            )}
          >
            <div className={cm.cn(cm.stack(3), 'max-w-xl')}>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight',
                )}
              >
                {t('landing.ctaTitle', {}, { defaultValue: 'Start your first climb today.' })}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-indigo-100 leading-relaxed')}>
                {t(
                  'landing.ctaBody',
                  {},
                  {
                    defaultValue:
                      'Set up your first objective, invite three teammates, and run your first weekly check-in by Friday.',
                  },
                )}
              </p>
            </div>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface text-indigo-700 shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform shrink-0',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create my workspace' })}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('py', 8),
          'border-t border-outline-variant/40 max-w-[1200px] mx-auto flex-wrap',
        )}
      >
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-[0.18em] text-on-surface-variant',
          )}
        >
          {t(
            'landing.footerCopyright',
            { year: new Date().getFullYear(), name: APP_NAME, tagline: APP_TAGLINE },
            { defaultValue: '© {{year}} {{name}} — {{tagline}}' },
          )}
        </span>
        {/* flex-wrap: at 390px the six links + gaps over-run one row and the
            row (unclipped, outside every overflow-hidden section) pushed the
            document to 485px scroll width (fleet-qa 2026-09-22). py on each
            link lifts the 16px text to a ~36px tap target. */}
        <div
          className={cm.cn(
            cm.flex({ gap: 'md', wrap: 'wrap' }),
            'gap-y-2 justify-end flex-1 min-w-0',
          )}
        >
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/terms"
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
          <Link
            to="/privacy"
            className={cm.cn(
              cm.fontWeight('bold'),
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
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
              'inline-flex items-center py-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.footerBuiltOn', {}, { defaultValue: 'Built on Molecule.dev' })}
          </a>
        </div>
      </footer>
    </div>
  )
}

export default Landing
