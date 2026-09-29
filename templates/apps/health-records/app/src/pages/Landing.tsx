import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const SAMPLE_VITALS = [
  { label: 'BP', value: '118/76', unit: 'mmHg', state: 'normal' as const },
  { label: 'HR', value: '64', unit: 'bpm', state: 'normal' as const },
  { label: 'Glucose', value: '95', unit: 'mg/dL', state: 'normal' as const },
]

const FEATURES = [
  {
    icon: 'science',
    titleKey: 'landing.features.labs.title',
    titleDefault: 'Lab trends, not lab fragments',
    bodyKey: 'landing.features.labs.body',
    bodyDefault:
      'See every result, with reference ranges and history charts. Out-of-range values flagged H/L instantly.',
  },
  {
    icon: 'medication',
    titleKey: 'landing.features.medications.title',
    titleDefault: 'Medications, refills, interactions',
    bodyKey: 'landing.features.medications.body',
    bodyDefault:
      'A live list of what you take, when refills run out, and which combinations need attention.',
  },
  {
    icon: 'shield_person',
    titleKey: 'landing.features.sharing.title',
    titleDefault: 'Share slices, never the keys',
    bodyKey: 'landing.features.sharing.body',
    bodyDefault:
      'Grant a provider read-only access to vaccinations only, or a caregiver full visit history. Revoke at any time.',
  },
  {
    icon: 'lock',
    titleKey: 'landing.features.encryption.title',
    titleDefault: 'End-to-end encrypted',
    bodyKey: 'landing.features.encryption.body',
    bodyDefault:
      'Documents stored with AES-256, never readable on disk. HIPAA-grade audit log on every access.',
  },
]

const TRUST_ROW = [
  { icon: 'verified_user', key: 'landing.hero.trust.hipaa', defaultValue: 'HIPAA compliant' },
  {
    icon: 'enhanced_encryption',
    key: 'landing.hero.trust.encrypted',
    defaultValue: 'End-to-end encrypted',
  },
  {
    icon: 'admin_panel_settings',
    key: 'landing.hero.trust.control',
    defaultValue: 'Your data, your control',
  },
]

const SECURITY = [
  {
    icon: 'lock',
    label: 'AES-256 at rest',
    body: 'Documents encrypted before leaving your browser. Server never sees plaintext.',
  },
  {
    icon: 'shield',
    label: 'Audit trail',
    body: 'Every access — by you, a caregiver, a provider — logged with time, location, and scope.',
  },
  {
    icon: 'key',
    label: 'You hold the keys',
    body: "Revoke a provider's access in one tap. Decrypt history rolls forward, never back.",
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface font-body text-on-surface')}>
      {/* TopNavBar — design: frosted white bar, bare brand icon, flat teal CTA */}
      <header
        className={cm.cn(
          'fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-primary/10',
        )}
      >
        <div
          className={cm.cn(
            'max-w-7xl',
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <Link
            to="/"
            data-mol-id="landing-nav-brand"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          >
            <BrandWordmark as="span" />
          </Link>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#security"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary-hover transition-colors',
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
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6), 'pt-32 pb-20')}>
        {/* Hero — design: light two-column, badge pill + headline + flat teal
            CTAs + icon trust row left, white vitals mockup card right */}
        <div
          className={cm.cn(
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 lg:grid-cols-2 lg:gap-16 items-center',
          )}
        >
          <div>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex px-3 py-1.5 rounded-full text-sm font-medium mb-6 border',
              )}
              style={{
                backgroundColor:
                  'color-mix(in oklab, var(--color-primary) 8%, var(--color-surface))',
                borderColor: 'color-mix(in oklab, var(--color-primary) 18%, transparent)',
                color: 'var(--color-primary-dark)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>lock</span>
              {t(
                'landing.hero.eyebrow',
                {},
                { defaultValue: 'HIPAA Compliant & AES-256 Encrypted' },
              )}
            </span>
            <h1 className="text-5xl md:text-6xl tracking-tight leading-[1.1] font-extrabold">
              {t('landing.hero.title', {}, { defaultValue: 'Your complete health story' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.maxW('lg'),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subtitle',
                {},
                {
                  defaultValue:
                    'Labs, medications, visits, and documents in one secure place — shared only with who you choose.',
                },
              )}
            </p>

            {/* Hero CTAs */}
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 10))}>
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta-primary"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center justify-center bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Get started free' })}
              </Link>
              <Link
                to="/login"
                data-mol-id="landing-hero-cta-secondary"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center justify-center border-2 border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors',
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined">
                  play_circle
                </span>
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'See a tour' })}
              </Link>
            </div>

            {/* Design trust row — three clinical-assurance items */}
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', align: 'center', gap: 'md' }),
                cm.sp('mt', 10),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {TRUST_ROW.map((item) => (
                <span key={item.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-primary text-base"
                  >
                    {item.icon}
                  </span>
                  {t(item.key, {}, { defaultValue: item.defaultValue })}
                </span>
              ))}
            </div>
          </div>

          {/* Hero mockup — design: rotated tinted backdrop behind a white
              patient-chart card with a vitals list */}
          <div className={cm.cn('relative')}>
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl rotate-2 scale-105"
              style={{
                backgroundImage:
                  'linear-gradient(to top right, color-mix(in oklab, var(--color-primary) 14%, transparent), color-mix(in oklab, var(--color-secondary) 10%, transparent))',
              }}
            />
            <div className="relative bg-surface rounded-xl border border-outline-variant/40 overflow-hidden shadow-[0_20px_40px_-15px] shadow-on-surface/10">
              <div
                className={cm.cn(
                  'bg-surface-container-low border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in oklab, var(--color-primary) 16%, var(--color-surface))',
                      color: 'var(--color-primary-dark)',
                    }}
                    aria-hidden="true"
                  >
                    {t('landing.hero.sampleInitials', {}, { defaultValue: 'JS' })}
                  </div>
                  <div>
                    <div className={cm.cn(cm.fontWeight('semibold'))}>
                      {t('landing.hero.sampleName', {}, { defaultValue: 'Jane Smith' })}
                    </div>
                    <div
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant font-mono tabular-nums',
                      )}
                    >
                      {t('landing.hero.sampleDob', {}, { defaultValue: 'DOB: 1985-04-12' })}
                    </div>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-on-surface-variant/60"
                >
                  more_horiz
                </span>
              </div>
              <div className={cm.cn(cm.sp('p', 6))}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 4),
                    cm.flex({ align: 'center', gap: 'sm' }),
                  )}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-primary">
                    monitor_heart
                  </span>
                  {t('landing.hero.recentVitals', {}, { defaultValue: 'Recent Vitals' })}
                </h2>
                <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 gap-4')}>
                  {SAMPLE_VITALS.map((v) => (
                    <div
                      key={v.label}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 4),
                        'rounded-lg border border-outline-variant/30 bg-surface-container-lowest',
                      )}
                    >
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-on-surface-variant font-medium">
                          {t(`landing.vital.${v.label}`, {}, { defaultValue: v.label })}
                        </span>
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {v.value} <span className="text-on-surface-variant text-sm">{v.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature quad */}
        <section id="features" className={cm.cn(cm.sp('mt', 16), cm.sp('py', 12))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-3')}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight',
              )}
            >
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Built for patients, not portals.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.features.subheading',
                {},
                {
                  defaultValue:
                    'A clinical-grade timeline of your own health, secured for the moments that matter.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface rounded-xl border border-outline-variant/30 hover:border-primary/30 transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'mb-6 rounded-xl text-primary',
                  )}
                  style={{
                    backgroundColor:
                      'color-mix(in oklab, var(--color-primary) 12%, var(--color-surface))',
                  }}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Security band — design: light full-bleed strip, big filled teal
            icons over the border-y seam */}
        <section
          id="security"
          className={cm.cn(
            '-mx-6 mt-16 px-6 lg:-mx-40 lg:px-40 py-12 bg-surface-container-low border-y border-outline-variant/40',
          )}
        >
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-8')}>
            {SECURITY.map((s) => (
              <div
                key={s.label}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center' }),
                  cm.textCenter,
                  'gap-3',
                )}
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-4xl text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {s.icon}
                </span>
                <p className={cm.cn(cm.fontWeight('medium'))}>
                  {t(
                    `landing.security.${s.label.replace(/\W+/g, '')}.label`,
                    {},
                    { defaultValue: s.label },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.security.${s.label.replace(/\W+/g, '')}.body`,
                    {},
                    { defaultValue: s.body },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Marketing footer */}
        <footer
          className={cm.cn(
            '-mx-6 mt-16 px-6 lg:-mx-40 lg:px-40 py-12 bg-surface-container-low border-t border-outline-variant/40',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'md' }),
              'md:flex-row',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
                'md:items-start',
              )}
            >
              <Link
                to="/"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-primary-dark',
                )}
              >
                <BrandWordmark as="span" size="sm" footer />
              </Link>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'landing.footer.copyright',
                  { year: new Date().getFullYear(), appName: APP_NAME },
                  { defaultValue: '© {{year}} {{appName}} Health Records. All rights reserved.' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
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
                cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
                cm.textSize('sm'),
              )}
            >
              <Link
                to="/privacy"
                className="text-on-surface-variant hover:text-primary underline underline-offset-4"
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
              </Link>
              <Link
                to="/terms"
                className="text-on-surface-variant hover:text-primary underline underline-offset-4"
              >
                {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
              </Link>
              <Link
                to="/pricing"
                className="text-on-surface-variant hover:text-primary underline underline-offset-4"
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 6),
              cm.textCenter,
              'text-on-surface-variant uppercase tracking-widest font-bold',
            )}
          >
            {t(
              'landing.footer.compliance',
              {},
              { defaultValue: 'HIPAA · SOC 2 Type II · End-to-end encrypted' },
            )}
          </p>
        </footer>
      </main>
    </div>
  )
}
