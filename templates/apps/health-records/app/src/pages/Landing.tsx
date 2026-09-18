import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { VitalsHeroCard } from '../components/VitalsHeroCard.js'

const heroGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #14b8a6)`

const SAMPLE_VITALS = [
  { label: 'BP', value: '118/76', unit: 'mmHg', state: 'normal' as const },
  { label: 'HR', value: '64', unit: 'bpm', state: 'normal' as const },
  { label: 'SpO₂', value: '98', unit: '%', state: 'normal' as const },
  { label: 'Temp', value: '98.4', unit: '°F', state: 'normal' as const },
  { label: 'A1C', value: '6.8', unit: '%', state: 'caution' as const },
  { label: 'LDL', value: '142', unit: 'mg/dL', state: 'abnormal' as const },
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

const TRUSTED_BY = [
  { initials: 'JK', color: '#0f766e' },
  { initials: 'AR', color: '#4f46e5' }, // was #6366f1 — 4.46:1 under white initials; indigo-600 = 6.3:1
  { initials: 'MP', color: '#15803d' }, // was #16a34a — 3.3:1; green-700 = 5.0:1
  { initials: 'SS', color: '#b45309' }, // was #d97706 — 3.2:1; amber-700 = 5.0:1
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background font-body text-on-surface relative overflow-hidden',
      )}
    >
      {/* §14.1 TopNavBar */}
      <header
        className={cm.cn(
          'fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10',
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
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
              style={{ background: heroGradient }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                health_and_safety
              </span>
            </div>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#security"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
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
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-white rounded-lg hover:shadow-lg transition-all',
                )}
                style={{ background: heroGradient }}
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
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-white rounded-lg hover:shadow-lg transition-all',
                  )}
                  style={{ background: heroGradient }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Decorative orbs */}
      <div
        className={cm.cn('absolute inset-0 -z-10 overflow-hidden pointer-events-none')}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute top-[-10%] right-[-10%] bg-primary/15 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/15 blur-[120px]',
          )}
        />
      </div>

      {/* Hero */}
      <main className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6), 'pt-32 pb-20')}>
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
                'inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6',
              )}
              style={{
                backgroundColor: 'var(--color-clinical-confidential-bg)',
                color: 'var(--color-clinical-confidential)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-xs')}>lock</span>
              {t('landing.hero.eyebrow', {}, { defaultValue: 'HIPAA · End-to-end encrypted' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
            >
              {t('landing.hero.title', {}, { defaultValue: 'Your complete health story.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 6),
                cm.maxW('lg'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'landing.hero.subtitle',
                {},
                {
                  defaultValue:
                    'Bring labs, medications, immunizations, and visit history together — and share targeted slices with your providers without losing privacy.',
                },
              )}
            </p>

            {/* §14.3 Hero CTAs */}
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 8))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'text-white rounded-xl hover:shadow-xl transform hover:scale-[0.98] transition-all',
                )}
                style={{ background: heroGradient }}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Create your record' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container rounded-xl transition-all',
                )}
              >
                <span className="material-symbols-outlined">login</span>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            {/* §14.4 Social proof */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('mt', 8),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.cn('flex -space-x-2')}>
                {TRUSTED_BY.map((p) => (
                  <span
                    key={p.initials}
                    className={cm.cn(
                      'w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-[11px] font-bold text-white',
                    )}
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  >
                    {p.initials}
                  </span>
                ))}
              </span>
              <span className={cm.fontWeight('medium')}>
                {t(
                  'landing.hero.trustedBy',
                  { count: '24,000' },
                  { defaultValue: 'Trusted by {{count}}+ patients and caregivers' },
                )}
              </span>
            </div>
          </div>

          {/* Sample auth'd hero card */}
          <div className={cm.cn('relative')}>
            <VitalsHeroCard
              patientName={t('landing.hero.sampleName', {}, { defaultValue: 'Jordan' })}
              vitals={SAMPLE_VITALS}
              conditionsCount={3}
              medicationsCount={5}
              alertsCount={2}
              recordedLabel={t('status.today', {}, { defaultValue: 'Today' })}
            />
            <div
              className={cm.cn(
                'absolute -top-4 -right-4 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg',
              )}
              style={{ background: heroGradient }}
            >
              {t('landing.hero.previewLabel', {}, { defaultValue: 'Live preview' })}
            </div>
          </div>
        </div>

        {/* §14.2 Feature quad */}
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
                  'bg-surface-container-low rounded-xl border border-outline-variant/10 hover:bg-surface-container transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'mb-6 rounded-xl text-primary',
                  )}
                  style={{ backgroundColor: 'color-mix(in srgb, ' + BRAND_COLOR + ' 14%, white)' }}
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

        {/* Security band */}
        <section
          id="security"
          className={cm.cn(
            cm.sp('mt', 16),
            cm.sp('p', 12),
            'rounded-[2rem] text-white relative overflow-hidden',
          )}
          style={{ backgroundColor: 'var(--color-hero-bg)' }}
        >
          <div
            className={cm.cn('absolute inset-0')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(13, 148, 136, 0.55) 0%, transparent 35%),' +
                'radial-gradient(circle at 80% 60%, rgba(20, 184, 166, 0.30) 0%, transparent 30%),' +
                'linear-gradient(135deg, var(--color-hero-bg) 0%, var(--color-hero-bg-gradient-end) 100%)',
            }}
            aria-hidden="true"
          />
          <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8')}>
            {[
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
            ].map((s) => (
              <div key={s.label}>
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 3),
                    'bg-surface/10 backdrop-blur-md',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {s.icon}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    'text-[11px] font-bold uppercase tracking-widest text-teal-300/90',
                  )}
                >
                  {t(
                    `landing.security.${s.label.replace(/\W+/g, '')}.label`,
                    {},
                    { defaultValue: s.label },
                  )}
                </p>
                <p
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mt', 1))}
                >
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
          className={cm.cn(cm.sp('mt', 16), cm.sp('py', 12), 'border-t border-outline-variant/20')}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}>
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tracking-tight',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                )}
                style={{ background: heroGradient }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-white text-base')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  health_and_safety
                </span>
              </div>
              {APP_NAME}
            </Link>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}} Health Records. All rights reserved.' },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-bold',
              )}
            >
              {t(
                'landing.footer.compliance',
                {},
                { defaultValue: 'HIPAA · SOC 2 Type II · End-to-end encrypted' },
              )}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
