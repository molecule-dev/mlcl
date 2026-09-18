import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { type PetChip, PetSnapshotHero } from '../components/PetSnapshotHero.js'

const heroGradient = 'linear-gradient(135deg, var(--mol-color-primary), var(--mol-color-secondary))'

const SAMPLE_PETS: ReadonlyArray<PetChip> = [
  { id: 'p1', name: 'Bella', species: 'dog', health: 'healthy' },
  { id: 'p2', name: 'Mochi', species: 'cat', health: 'healthy' },
  { id: 'p3', name: 'Pickles', species: 'dog', health: 'attention' },
  { id: 'p4', name: 'Kiwi', species: 'bird', health: 'healthy' },
  { id: 'p5', name: 'Hops', species: 'rabbit', health: 'healthy' },
]

const FEATURES = [
  {
    icon: 'medical_information',
    titleKey: 'landing.features.records.title',
    titleDefault: 'Vet records, all in one place',
    bodyKey: 'landing.features.records.body',
    bodyDefault:
      'Vaccinations, lab work, surgeries — every visit captured with attachments and follow-ups.',
  },
  {
    icon: 'event_available',
    titleKey: 'landing.features.bookings.title',
    titleDefault: 'Trusted sitters, easy bookings',
    bodyKey: 'landing.features.bookings.body',
    bodyDefault:
      'Find vetted local sitters, view real reviews, and book walks, sittings, and overnight care in seconds.',
  },
  {
    icon: 'medication',
    titleKey: 'landing.features.medications.title',
    titleDefault: 'Medications & refill reminders',
    bodyKey: 'landing.features.medications.body',
    bodyDefault:
      'Track every dose, get refill reminders before you run out, and share schedules with your sitter.',
  },
  {
    icon: 'notifications',
    titleKey: 'landing.features.alerts.title',
    titleDefault: 'Health alerts that matter',
    bodyKey: 'landing.features.alerts.body',
    bodyDefault:
      'Never miss a checkup, vaccination, or medication. Smart reminders tuned to each pet\u2019s schedule.',
  },
]

const TRUSTED_BY = [
  { initials: 'BL', color: '#0e7490' },
  { initials: 'MC', color: '#047857' },
  { initials: 'PK', color: '#b45309' },
  { initials: 'KW', color: '#7c3aed' },
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
                pets
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
              href="#sitters"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.nav.sitters', {}, { defaultValue: 'Sitters' })}
            </a>
            <a
              href="#trust"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.nav.trust', { appName: APP_NAME }, { defaultValue: 'Why {{appName}}' })}
            </a>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-dashboard"
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
                'inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 bg-primary-container text-on-primary-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-xs')}>pets</span>
              {t('landing.hero.eyebrow', {}, { defaultValue: 'Loved by 24,000+ pet households' })}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
            >
              {t('landing.hero.title', {}, { defaultValue: 'Every pet, perfectly cared for.' })}
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
                    'Profiles, vet records, refill reminders, and vetted sitters — all in one warm, calm place. Built for the household that never wants to miss a wag, purr, or chirp.',
                },
              )}
            </p>

            {/* Hero CTAs */}
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
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Add your pets' })}
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
                <span className={cm.cn('material-symbols-outlined')}>login</span>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            {/* Social proof */}
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
                  { defaultValue: 'Trusted by {{count}}+ pet households' },
                )}
              </span>
            </div>
          </div>

          {/* Sample auth'd hero card */}
          <div className={cm.cn('relative')}>
            <PetSnapshotHero
              ownerName={t('landing.hero.sampleName', {}, { defaultValue: 'Jordan' })}
              pets={SAMPLE_PETS}
              petsCount={5}
              upcomingCount={2}
              alertsCount={1}
              nextAppointmentLabel={t(
                'landing.hero.sampleNext',
                {},
                { defaultValue: 'Today, 3:00 PM · Dr. Riley' },
              )}
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
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-3',
              )}
            >
              {t('landing.features.eyebrow', {}, { defaultValue: 'What\u2019s inside' })}
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
                { defaultValue: 'Built for every pet, every household.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.features.subheading',
                {},
                {
                  defaultValue:
                    'A calm, organized hub for the messiest, fluffiest part of your life.',
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
                    'mb-6 rounded-xl text-primary bg-primary-container',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
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

        {/* Sitters band */}
        <section id="sitters" className={cm.cn(cm.sp('mt', 16), cm.sp('py', 12))}>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 items-center')}>
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-bold uppercase tracking-widest text-primary-dark dark:text-primary mb-3',
                )}
              >
                {t('landing.sitters.eyebrow', {}, { defaultValue: 'Sitters & walkers' })}
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
                  'landing.sitters.heading',
                  {},
                  { defaultValue: 'Local, vetted, and ready when you need them.' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  cm.sp('mb', 6),
                  'text-on-surface-variant max-w-md',
                )}
              >
                {t(
                  'landing.sitters.body',
                  {},
                  {
                    defaultValue:
                      'Browse a curated marketplace of background-checked sitters and walkers. Real reviews, real availability, real time check-ins from the moment they pick up the leash.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'inline-flex',
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-primary-dark dark:text-primary rounded-xl border border-primary/40 hover:bg-primary-container transition-all',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>
                  volunteer_activism
                </span>
                {t('landing.sitters.cta', {}, { defaultValue: 'Browse sitters' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.sp('p', 10),
                'rounded-[2rem] text-white relative overflow-hidden shadow-2xl',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--color-pet-healthy) 100%)',
                minHeight: '320px',
              }}
            >
              <div
                className={cm.cn(
                  'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                )}
                aria-hidden="true"
              />
              <p
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-widest text-white/70 mb-3',
                )}
              >
                {t('landing.sitters.statsEyebrow', {}, { defaultValue: 'Trust by the numbers' })}
              </p>
              <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-2 relative z-10')}>
                {[
                  { stat: '4.9', label: 'Average rating', icon: 'star' },
                  { stat: '15k', label: 'Happy walks', icon: 'directions_walk' },
                  { stat: '100%', label: 'Background checks', icon: 'shield_person' },
                  { stat: '24/7', label: 'Support', icon: 'support_agent' },
                ].map((s) => (
                  <div key={s.label}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'mb-1 text-white/70',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-base')}>{s.icon}</span>
                      <span className={cm.cn('text-[10px] font-bold uppercase tracking-widest')}>
                        {t(
                          `landing.sitters.stat.${s.label.replace(/\s+/g, '')}.label`,
                          {},
                          { defaultValue: s.label },
                        )}
                      </span>
                    </span>
                    <p className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tight')}>
                      {s.stat}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust band */}
        <section
          id="trust"
          className={cm.cn(
            cm.sp('mt', 16),
            cm.sp('p', 12),
            'rounded-[2rem] text-white relative overflow-hidden',
          )}
          style={{ backgroundColor: 'var(--color-brand-navy)' }}
        >
          <div
            className={cm.cn('absolute inset-0')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--mol-color-primary) 55%, transparent) 0%, transparent 35%),' +
                'radial-gradient(circle at 80% 60%, color-mix(in srgb, var(--mol-color-secondary) 30%, transparent) 0%, transparent 30%),' +
                'linear-gradient(135deg, var(--color-brand-navy) 0%, var(--mol-color-primary-dark) 100%)',
            }}
            aria-hidden="true"
          />
          <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8')}>
            {[
              {
                icon: 'shield_person',
                label: 'Background checked',
                body: 'Every sitter verified with ID + reference checks before they ever touch a leash.',
              },
              {
                icon: 'verified_user',
                label: 'Insured visits',
                body: 'Every booking covered by liability insurance — zero out-of-pocket worry for you.',
              },
              {
                icon: 'lock',
                label: 'Privacy-first',
                body: 'Pet records encrypted at rest. Share targeted slices with vets and sitters, revoke anytime.',
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
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {s.icon}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    'text-[11px] font-bold uppercase tracking-widest text-cyan-300/90',
                  )}
                >
                  {t(
                    `landing.trust.${s.label.replace(/\W+/g, '')}.label`,
                    {},
                    { defaultValue: s.label },
                  )}
                </p>
                <p
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mt', 1))}
                >
                  {t(
                    `landing.trust.${s.label.replace(/\W+/g, '')}.body`,
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
                  pets
                </span>
              </div>
              {APP_NAME}
            </Link>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('landing.footer.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
            <nav
              aria-label={t('landing.footer.navLabel', {}, { defaultValue: 'Footer navigation' })}
              className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.textSize('xs'))}
            >
              <Link
                to="/about"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
              <Link
                to="/terms"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('footer.termsOfService', {}, { defaultValue: 'Terms' })}
              </Link>
              <Link
                to="/privacy"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy' })}
              </Link>
            </nav>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}} Pet Care. All rights reserved.' },
              )}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
