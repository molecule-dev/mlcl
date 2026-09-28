import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { RecordingCard } from '../components/RecordingCard.js'

const SAMPLE_RECORDINGS = [
  {
    id: 'demo-1',
    title: 'Sprint demo: new comments timeline',
    thumbnail_url: null,
    duration_seconds: 247,
    view_count: 412,
    visibility: 'team' as const,
    status: 'ready' as const,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    posterEmoji: '🎯',
  },
  {
    id: 'demo-2',
    title: 'Bug repro: focus loop on ResetPassword',
    thumbnail_url: null,
    duration_seconds: 132,
    view_count: 64,
    visibility: 'private' as const,
    status: 'processing' as const,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    posterEmoji: '🐛',
  },
  {
    id: 'demo-3',
    title: 'Onboarding walkthrough — admin tools',
    thumbnail_url: null,
    duration_seconds: 542,
    view_count: 1823,
    visibility: 'public' as const,
    status: 'ready' as const,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    posterEmoji: '🚀',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), cm.surface, 'min-h-screen text-on-surface')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-30 backdrop-blur-md bg-surface/80 border-b border-outline-variant',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'text-2xl tracking-tighter font-display bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] bg-clip-text text-transparent',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 6 }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
          )}
        >
          <a
            href="#features"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors hidden md:inline',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#preview"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors hidden md:inline',
            )}
          >
            {t('landing.nav.preview', {}, { defaultValue: 'Preview' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/library"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                'rounded-lg text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/25 transition-colors',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'text-on-surface-variant hover:text-primary transition-colors hidden md:block',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  'rounded-lg text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/25 transition-colors',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.stack(16), cm.sp('px', 8), cm.sp('py', 16))}>
        <section
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'xl' }),
            cm.maxW('2xl'),
            'mx-auto items-center md:grid-cols-2 md:max-w-[1200px]',
          )}
        >
          <div className={cm.stack(6)}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] font-display text-on-surface',
              )}
            >
              {t(
                'landing.hero.title',
                {},
                { defaultValue: 'Record once. Share everywhere. Watch the impact.' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} captures async screencasts with audio, comments, and viewer analytics — so design reviews, bug reports, and walkthroughs travel further than any meeting could.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3, wrap: 'wrap' }))}>
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 2, justify: 'center' }),
                  'rounded-xl text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 transition-all active:scale-95',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  aria-hidden="true"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  videocam
                </span>
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Start recording free' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-xl border-2 border-outline-variant text-on-surface hover:border-outline transition-colors active:scale-95',
                )}
              >
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'Watch a 60s demo' })}
              </Link>
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'landing.hero.socialProof',
                {},
                { defaultValue: '3.2M recordings shared this month' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 6 }),
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-semibold',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                <span className={cm.cn('material-symbols-outlined text-base text-success')}>
                  verified
                </span>
                {t('landing.hero.proof.free', {}, { defaultValue: 'Free forever tier' })}
              </span>
              <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                {/* cyan-500 was 2.36:1 on white (axe fail); cyan-700 ≈ 4.8:1 */}
                <span className={cm.cn('material-symbols-outlined text-base text-cyan-700')}>
                  shield
                </span>
                {t('landing.hero.proof.privacy', {}, { defaultValue: 'SOC 2 ready' })}
              </span>
            </div>
          </div>

          {/* Video player mockup — dark frame, REC pill, playback bar with
              time-coded comment pins (the design's hero product shot) */}
          <div
            className="relative w-full aspect-video bg-[var(--color-brand-deep-a)] rounded-2xl shadow-2xl overflow-hidden border border-outline-variant"
            aria-hidden="true"
          >
            <img
              alt=""
              src="https://picsum.photos/seed/glint-hero-player/1280/720"
              className="w-full h-full object-cover opacity-80"
              loading="eager"
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                'absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10',
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
              <span className="font-mono text-xs font-bold text-white">REC 00:47</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-visible">
                <div className="absolute top-0 left-0 h-full w-[45%] rounded-full bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)]" />
                <span className="absolute top-1/2 -translate-y-1/2 left-[20%] w-2.5 h-2.5 rounded-full bg-[var(--color-brand-gradient-to)] border border-[var(--color-brand-deep-a)] shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                <span className="absolute top-1/2 -translate-y-1/2 left-[35%] w-2.5 h-2.5 rounded-full bg-[var(--color-brand-gradient-to)] border border-[var(--color-brand-deep-a)] shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                <span className="absolute top-1/2 -translate-y-1/2 left-[80%] w-2.5 h-2.5 rounded-full bg-[var(--color-brand-gradient-to)] border border-[var(--color-brand-deep-a)] shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'lg' }),
            cm.maxW('2xl'),
            'mx-auto md:grid-cols-3 md:max-w-[1200px]',
          )}
        >
          {[
            {
              icon: 'videocam',
              title: t('landing.feature.capture.title', {}, { defaultValue: 'One-tap capture' }),
              body: t(
                'landing.feature.capture.body',
                {},
                {
                  defaultValue:
                    'Browser, desktop, and mobile recording with mic, cam, and drawing.',
                },
              ),
            },
            {
              icon: 'forum',
              title: t(
                'landing.feature.comments.title',
                {},
                { defaultValue: 'Time-coded comments' },
              ),
              body: t(
                'landing.feature.comments.body',
                {},
                { defaultValue: 'Reviewers leave threaded comments pinned to exact frames.' },
              ),
            },
            {
              icon: 'insights',
              title: t(
                'landing.feature.analytics.title',
                {},
                { defaultValue: 'Engagement analytics' },
              ),
              body: t(
                'landing.feature.analytics.body',
                {},
                {
                  defaultValue:
                    'See who watched, when they dropped off, and where they re-watched.',
                },
              ),
            },
          ].map((feature) => (
            <div
              key={feature.icon}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 transition-transform',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  'rounded-xl bg-gradient-to-br from-[var(--color-brand-gradient-from)]/15 to-[var(--color-brand-gradient-to)]/15 text-[var(--color-brand-gradient-from)]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')}>{feature.icon}</span>
              </div>
              <h3 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface')}>
                {feature.title}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        <section id="preview" className={cm.cn(cm.maxW('2xl'), 'mx-auto md:max-w-[1200px]')}>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 6),
              'text-3xl md:text-4xl tracking-tight text-on-surface',
            )}
          >
            {t(
              'landing.preview.title',
              { appName: APP_NAME },
              { defaultValue: 'See real {{appName}} clips in action' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'sm:grid-cols-2 lg:grid-cols-3')}>
            {SAMPLE_RECORDINGS.map((rec) => (
              <RecordingCard key={rec.id} recording={rec} />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.maxW('xl'),
            cm.sp('p', 8),
            'mx-auto rounded-[2rem] text-center bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white shadow-2xl shadow-[var(--color-brand-gradient-from)]/30 relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
            )}
          />
          <h2
            className={cm.cn(cm.fontWeight('bold'), 'text-3xl md:text-4xl tracking-tight relative')}
          >
            {t(
              'landing.cta.title',
              { appName: APP_NAME },
              { defaultValue: 'Ship better feedback. Start with {{appName}}.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'opacity-90 relative')}>
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue:
                  'Free for unlimited 5-minute clips. Upgrade once your team is hooked.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 6),
              cm.fontWeight('bold'),
              'inline-block rounded-full bg-surface text-[var(--color-brand-gradient-from)] hover:bg-surface-secondary transition-colors relative',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Start recording free' })}
          </Link>
        </section>
      </main>

      {/* Footer — the design's slate-50 rounded band: brand, links, © */}
      <footer className="bg-surface-container-low border-t border-outline-variant rounded-t-3xl mt-20">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('px', 8),
            cm.sp('py', 12),
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.textSize('sm'),
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'text-on-surface font-display',
            )}
          >
            {APP_NAME}
          </span>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 4, wrap: 'wrap' }))}>
            <a
              href="#features"
              className="text-on-surface-variant hover:text-[var(--color-brand-gradient-to)] transition-colors"
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/pricing"
              className="text-on-surface-variant hover:text-[var(--color-brand-gradient-to)] transition-colors"
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/login"
              className="text-on-surface-variant hover:text-[var(--color-brand-gradient-to)] transition-colors"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className="text-on-surface-variant hover:text-[var(--color-brand-gradient-to)] transition-colors"
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </nav>
          <span className="text-on-surface-variant">
            {t(
              'landing.footer.copy',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}. Async, made luminous.' },
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
          </span>
        </div>
      </footer>
    </div>
  )
}
