import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { KeyframeTimelineMini } from '../components/KeyframeTimelineMini.js'
import { ProjectCard } from '../components/ProjectCard.js'
import { VivaceWordmark } from '../components/VivaceWordmark.js'
import { loadContent } from '../config.js'

interface FeatureBlock {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureBlock[] = [
  {
    icon: 'animation',
    titleKey: 'landing.feature1Title',
    defaultTitle: 'Keyframe with intent',
    defaultBody:
      'Diamond keyframes, drag-friendly hit targets, and a frame-accurate playhead. Author every micro-interaction without leaving the timeline.',
    bodyKey: 'landing.feature1Body',
  },
  {
    icon: 'tune',
    titleKey: 'landing.feature2Title',
    defaultTitle: 'Curate the easing',
    defaultBody:
      'Hand-tuned bezier presets, a live curve editor, and spring physics tied to scroll. Pick the right feel for the right beat.',
    bodyKey: 'landing.feature2Body',
  },
  {
    icon: 'hub',
    titleKey: 'landing.feature3Title',
    defaultTitle: 'Wire the states',
    defaultBody:
      'Compose Idle / Hover / Pressed / Custom states into a node graph. Triggers and transitions render exactly as your users will see them.',
    bodyKey: 'landing.feature3Body',
  },
]

const SAMPLE_PROJECTS = [
  {
    id: 'sample-neon',
    name: 'Neon Fluid Intro',
    duration: '00:15:24',
    lastEdited: 'feature loop',
    status: 'ready' as const,
    swatch: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    icon: 'auto_awesome',
  },
  {
    id: 'sample-synth',
    name: 'Synthwave Loop',
    duration: '01:04:12',
    lastEdited: 'audio-reactive',
    status: 'rendering' as const,
    swatch: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
    icon: 'graphic_eq',
  },
  {
    id: 'sample-onboard',
    name: 'Onboarding Loop',
    duration: '00:08:00',
    lastEdited: 'state machine',
    status: 'shared' as const,
    swatch: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
    icon: 'rocket_launch',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--anim-background)] text-[var(--anim-text)] font-body',
      )}
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          'h-16 border-b border-[var(--anim-border)] backdrop-blur-md bg-[var(--anim-surface)]/80 sticky top-0 z-30',
        )}
      >
        <VivaceWordmark size="md" to="/" />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-nav-login"
                className={
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--anim-text-secondary)] hover:text-[var(--anim-primary)] transition-colors'
                }
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.cta', {}, { defaultValue: 'Start animating' })}
              </Link>
            </>
          )}
        </div>
      </nav>

      <main>
        <section className={cm.cn(cm.sp('py', 20), cm.sp('px', 6), 'relative overflow-hidden')}>
          <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
            <div
              className={cm.cn(
                'absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px]',
              )}
              style={{ background: 'color-mix(in srgb, var(--anim-primary) 20%, transparent)' }}
            />
            <div
              className={cm.cn(
                'absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[color-mix(in_srgb,var(--anim-secondary)_15%,transparent)] blur-[140px]',
              )}
            />
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              'max-w-[1100px] mx-auto relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 5),
                'font-mono uppercase tracking-widest text-[var(--anim-primary)]',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: '// motion design workbench' })}
            </p>
            <h1
              className={cm.cn(
                cm.textCenter,
                'font-headline font-extrabold tracking-tight text-5xl md:text-6xl lg:text-7xl leading-[0.95] max-w-[820px]',
              )}
            >
              <span className={cm.cn('text-[var(--anim-text)]')}>
                {t('landing.headline.start', {}, { defaultValue: 'Motion' })}
              </span>{' '}
              <span
                className={cm.cn(
                  'bg-clip-text text-transparent bg-gradient-to-r from-[var(--anim-primary)] via-[var(--anim-primary)] to-[var(--anim-secondary)]',
                )}
              >
                {t(
                  'landing.headline.brand',
                  { brand: APP_NAME },
                  { defaultValue: 'brought to life' },
                )}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 6),
                cm.textCenter,
                'text-[var(--anim-text-secondary)] max-w-[640px]',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'Compose keyframes, wire state machines, and ship motion to the web — without leaving the browser.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mt', 8))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 2 }),
                  'rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity',
                )}
              >
                <span>{t('landing.ctaPrimary', {}, { defaultValue: 'Start a project' })}</span>
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-lg border border-[var(--anim-border)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] text-[var(--anim-text)] transition-colors',
                )}
              >
                {t(
                  'landing.ctaSecondary',
                  { appName: APP_NAME },
                  { defaultValue: 'Open {{appName}}' },
                )}
              </Link>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 6),
                'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
              )}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20), 'max-w-[1100px] mx-auto')}>
          <KeyframeTimelineMini
            caption={t(
              'landing.timelineCaption',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Three tracks · 10 keyframes · 1 playhead — the heart of every {{appName}} project.',
              },
            )}
          />
        </section>

        <section
          className={cm.cn(
            cm.sp('py', 16),
            cm.sp('px', 6),
            'bg-[var(--anim-surface)] border-y border-[var(--anim-border)]',
          )}
        >
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 3),
                  'font-mono uppercase tracking-widest text-[var(--anim-primary)]',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: '// what makes it sing' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'font-headline tracking-tight text-[var(--anim-text)]',
                )}
              >
                {t('landing.featuresTitle', {}, { defaultValue: 'Live in your browser' })}
              </h2>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl border border-[var(--anim-border)] bg-[var(--anim-background)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'rounded-lg bg-gradient-to-br from-[var(--anim-primary)]/20 to-[var(--anim-secondary)]/20 text-[var(--anim-primary)]',
                    )}
                  >
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      cm.sp('mb', 2),
                      'font-headline text-[var(--anim-text)]',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-[var(--anim-text-secondary)] leading-relaxed',
                    )}
                  >
                    {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'between', gap: 4 }),
                cm.sp('mb', 8),
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 2),
                    'font-mono uppercase tracking-widest text-[var(--anim-primary)]',
                  )}
                >
                  {t('landing.gallerySection', {}, { defaultValue: '// from the showcase' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'font-headline tracking-tight text-[var(--anim-text)]',
                  )}
                >
                  {t('landing.galleryTitle', {}, { defaultValue: 'A few loops we love' })}
                </h2>
              </div>
              <Link
                to="/signup"
                className={
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--anim-primary)] hover:text-[var(--anim-secondary)] transition-colors'
                }
              >
                {t('landing.viewAll', {}, { defaultValue: 'See more →' })}
              </Link>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              {SAMPLE_PROJECTS.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 10),
          cm.sp('px', 6),
          'border-t border-[var(--anim-border)] bg-[var(--anim-background)]',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 4 }),
            'max-w-[1100px] mx-auto',
          )}
        >
          <VivaceWordmark size="sm" />
          <div
            className={cm.cn(
              cm.flex({ gap: 6 }),
              'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-text-secondary)]',
            )}
          >
            <LegalModalLinks
              linkClassName={'hover:text-[var(--anim-primary)] transition-colors'}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
            <Link
              to="/pricing"
              data-mol-id="landing-footer-pricing"
              className={cm.cn('hover:text-[var(--anim-primary)] transition-colors')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <p className={cm.cn('font-mono text-[10px] text-[var(--anim-text-muted)]')}>
            {t(
              'landing.footer.copyright',
              { appName: APP_NAME },
              { defaultValue: '© {{appName}} Motion. Precise. Playful.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
