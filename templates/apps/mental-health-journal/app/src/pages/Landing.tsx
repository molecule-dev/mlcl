import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'gentle',
    defaultTitle: 'Gentle daily prompts',
    defaultBody: 'Start each entry with a thoughtful prompt — never a blank page.',
    icon: 'lightbulb',
  },
  {
    key: 'mood',
    defaultTitle: 'Mood-aware patterns',
    defaultBody: 'Track how you feel over time and surface what helps you thrive.',
    icon: 'monitoring',
  },
  {
    key: 'private',
    defaultTitle: 'Private and encrypted',
    defaultBody: 'End-to-end encryption and passcode lock. Your words stay yours.',
    icon: 'lock',
  },
  {
    key: 'insights',
    defaultTitle: 'AI-powered reflections',
    defaultBody: 'Discover triggers, themes, and gratitudes — without losing your voice.',
    icon: 'auto_awesome',
  },
] as const

/**
 * Reflect / Feel / Notice — the Stitch design's three-step flow.
 */
const STEPS = [
  {
    key: 'reflect',
    icon: 'edit_document',
    defaultTitle: 'Reflect',
    defaultBody: 'Take a moment to write down your thoughts in a safe, guided space.',
  },
  {
    key: 'feel',
    icon: 'favorite',
    defaultTitle: 'Feel',
    defaultBody: 'Log your daily mood and emotions to see the bigger picture.',
  },
  {
    key: 'notice',
    icon: 'insights',
    defaultTitle: 'Notice',
    defaultBody: 'Uncover gentle insights and patterns in your wellness journey over time.',
  },
] as const

const STATS = [
  { key: 'entries', defaultLabel: 'Entries this month', value: '24' },
  { key: 'streak', defaultLabel: 'Longest streak', value: '52 days' },
  { key: 'mood', defaultLabel: 'Average mood', value: 'Good' },
  { key: 'mindful', defaultLabel: 'Mindful minutes', value: '410' },
]

const SOCIAL_PROOF = [
  { value: '38k+', label: 'Quiet reflections daily' },
  { value: '4.9★', label: 'iOS App Store rating' },
  { value: '94%', label: 'Feel calmer after a week' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        {/* Hero — centered over the blob wash (Stitch bg-blobs). */}
        <section
          className={cm.cn('bg-blobs relative overflow-hidden', cm.sp('py', 20), cm.sp('px', 6))}
        >
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.mxAuto,
              cm.textCenter,
              'relative z-10',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.sp('mb', 6),
                cm.fontWeight('bold'),
                'inline-flex items-center gap-2 rounded-full text-xs uppercase tracking-widest',
              )}
              style={{
                backgroundColor: 'color-mix(in oklab, var(--mol-color-primary) 12%, transparent)',
                color: 'var(--mol-color-primary)',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                spa
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'A gentle daily practice' })}
            </span>
            <h1 className={cm.cn('text-5xl md:text-7xl tracking-tight leading-tight font-bold')}>
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mt', 6),
                cm.sp('mb', 8),
                'text-on-surface-variant',
                cm.maxW('2xl'),
                cm.mxAuto,
                'leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Daily journaling that helps you notice patterns, celebrate progress, and be kind to yourself.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
                'sm:flex-row flex-wrap gap-y-3',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  'btn-gradient text-white rounded-lg shadow-sm hover:opacity-90 transition-all whitespace-nowrap shrink-0 w-full sm:w-auto',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Begin your first entry' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  'whitespace-nowrap shrink-0 w-full sm:w-auto',
                  'rounded-lg text-primary hover:bg-primary/5 transition-colors',
                )}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it in action' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 12),
                cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
                'flex-wrap',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <div key={s.label} className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }))}>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'))}>
                    {s.value}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {t(`landing.proof.${s.label}`, {}, { defaultValue: s.label })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Journal preview mockup — tilted entry card with a floating streak
             chip (Stitch design). Static content; Lora italic journal voice. */}
          <div className={cm.cn('relative mt-16 w-full max-w-4xl mx-auto z-10', cm.sp('px', 6))}>
            <div className="relative shadow-2xl rounded-xl transition-transform duration-700 hover:[transform:none] md:[transform:perspective(1200px)_rotateX(4deg)]">
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'md:p-12 rounded-xl border border-outline-variant/15',
                  'bg-[var(--color-journal-bg,var(--mol-color-surface))]',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'start' }),
                    cm.sp('mb', 6),
                    'gap-4 flex-wrap',
                  )}
                >
                  <span
                    className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant font-journal')}
                  >
                    {t('landing.preview.date', {}, { defaultValue: 'Thursday, Oct 24' })}
                  </span>
                  <div className={cm.flex({ gap: 'xs' })}>
                    {['gratitude', 'morning'].map((tag) => (
                      <span
                        key={tag}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'bg-surface-variant text-on-surface-variant rounded-full',
                        )}
                      >
                        {t(`landing.preview.tag.${tag}`, {}, { defaultValue: tag })}
                      </span>
                    ))}
                  </div>
                </div>
                <p
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'md:text-3xl text-on-surface leading-relaxed font-journal',
                    cm.sp('mb', 10),
                  )}
                >
                  {t(
                    'landing.preview.quote',
                    {},
                    {
                      defaultValue:
                        '“Three small moments... a warm cup of tea before anyone else woke up, the sound of rain against the window, and finishing that project that was stressing me out.”',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    'border-t border-surface-variant/30 pt-6',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('landing.preview.moodLabel', {}, { defaultValue: 'Mood' })}
                  </span>
                  <div className={cm.flex({ gap: 'xs' })}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        aria-hidden="true"
                        className={cm.cn(
                          'w-6 h-6 rounded-full',
                          i === 2
                            ? 'bg-[var(--color-mood-good-dot)] shadow-[0_0_12px_color-mix(in_oklab,var(--color-mood-good-dot)_40%,transparent)]'
                            : 'bg-surface-variant opacity-50',
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating streak chip */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'absolute -right-4 -top-6 md:-right-8 md:-top-8 bg-surface-container-lowest rounded-xl p-4 shadow-xl border border-outline-variant/15',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[var(--color-mood-5)]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  local_fire_department
                </span>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {t('landing.preview.streak', {}, { defaultValue: '12 day streak' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('landing.preview.streakNote', {}, { defaultValue: "You're doing great" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reflect / Feel / Notice — three-step flow (Stitch). */}
        <section id="how" className={cm.cn('bg-surface', cm.sp('py', 20), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto)}>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-12 text-center')}>
              {STEPS.map((s) => (
                <div key={s.key} className={cm.cn(cm.flex({ direction: 'col', align: 'center' }))}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-20 h-20 rounded-full bg-primary-light',
                      cm.sp('mb', 6),
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-3xl text-primary')}
                      aria-hidden="true"
                    >
                      {s.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
                    {t(`landing.step.${s.key}.title`, {}, { defaultValue: s.defaultTitle })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                    {t(`landing.step.${s.key}.body`, {}, { defaultValue: s.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature bento — green left-border cards (Stitch). */}
        <section
          id="features"
          className={cm.cn('bg-surface-container-low', cm.sp('py', 20), cm.sp('px', 6))}
        >
          <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto)}>
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
              <h2 className={cm.cn('text-3xl md:text-4xl font-bold tracking-tight')}>
                {t('landing.featuresTitle', {}, { defaultValue: 'Built for honest reflection' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 3),
                  'text-on-surface-variant',
                  cm.maxW('2xl'),
                  cm.mxAuto,
                )}
              >
                {t(
                  'landing.featuresBody',
                  {},
                  {
                    defaultValue:
                      'Gentle prompts, private encryption, and quiet pattern-finding — designed to help, not nag.',
                  },
                )}
              </p>
            </div>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-l-[var(--color-mood-5)]',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-3xl text-[var(--color-mood-5)]"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mt', 4),
                      cm.sp('mb', 2),
                    )}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant')}>
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats strip (app-specific — kept from the previous landing). */}
        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary text-center',
                )}
              >
                <p
                  className={cm.cn('text-4xl font-extrabold tracking-tight')}
                  style={{ color: 'var(--mol-color-primary)' }}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 2),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial + privacy promise (Stitch). */}
        <section className={cm.cn('bg-surface', cm.sp('py', 16), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                'md:text-4xl text-on-surface font-journal leading-relaxed',
                cm.sp('mb', 8),
              )}
            >
              {t(
                'landing.testimonial.quote',
                { app: APP_NAME },
                {
                  defaultValue:
                    "I finally understand my patterns. {{app}} gave me the clarity I didn't know I needed.",
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.sp('mb', 16),
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 rounded-full bg-primary-light text-primary font-bold',
                )}
              >
                SJ
              </div>
              <div className={cm.cn('text-left')}>
                <p className={cm.cn(cm.fontWeight('bold'))}>
                  {t('landing.testimonial.name', {}, { defaultValue: 'Sarah J.' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('landing.testimonial.role', {}, { defaultValue: 'Creative Director' })}
                </p>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
                'md:flex-row md:justify-center bg-primary-light/30 rounded-xl p-8 border border-outline-variant/40 max-w-2xl mx-auto text-left',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary text-4xl')}
                aria-hidden="true"
              >
                lock
              </span>
              <div>
                <h4 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 1))}>
                  {t('landing.privacy.title', {}, { defaultValue: 'Your entries stay yours' })}
                </h4>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'landing.privacy.body',
                    { app: APP_NAME },
                    {
                      defaultValue:
                        'Everything is end-to-end encrypted. We can never read your journal.',
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA — blob wash + gradient button (Stitch). */}
        <section className={cm.cn('bg-blobs text-center', cm.sp('py', 24), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('3xl'), cm.mxAuto)}>
            <h2 className={cm.cn('text-4xl md:text-5xl font-bold tracking-tight', cm.sp('mb', 8))}>
              {t(
                'landing.ctaTitle',
                {},
                { defaultValue: 'A few quiet minutes a day. That’s all.' },
              )}
            </h2>
            <Link
              to="/signup"
              data-mol-id="landing-cta-signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 5),
                cm.fontWeight('medium'),
                cm.textSize('xl'),
                'btn-gradient text-white rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center gap-2',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Begin your first entry' })}
              <span className="material-symbols-outlined" aria-hidden="true">
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
          'bg-surface border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
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
        {/* Shared public-page footer: About link + Privacy/Terms + language picker,
            identical chrome to the About/Privacy/Terms pages. */}
        <Footer />
      </footer>
    </div>
  )
}

export default Landing
