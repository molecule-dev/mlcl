import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LibraryStatsHero } from '../components/LibraryStatsHero.js'
import { RecordingCard } from '../components/RecordingCard.js'
import { RecordingIndicator } from '../components/RecordingIndicator.js'

const SAMPLE_TREND = [12, 18, 14, 22, 28, 24, 31]

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
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-gradient-to-br from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white shadow-md shadow-[var(--color-brand-gradient-from)]/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-xl')}>graphic_eq</span>
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}>{APP_NAME}</span>
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
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/30 hover:opacity-90',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-md shadow-[var(--color-brand-gradient-from)]/30 hover:opacity-90',
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
            <RecordingIndicator state="live" size="md" />
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold text-on-surface',
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
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full text-white bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] shadow-lg shadow-[var(--color-brand-gradient-from)]/30 hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Start recording free' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'Watch a 60s demo' })}
              </Link>
            </div>
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

          <div className={cm.stack(4)}>
            <LibraryStatsHero
              totalRecordings={42}
              totalViews={5_812}
              averageWatchPercent={78}
              trend7d={SAMPLE_TREND}
              weeklyChangePercent={18.4}
            />
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-center')}>
              {t(
                'landing.hero.cardCaption',
                {},
                { defaultValue: 'Sample workspace overview — try it free.' },
              )}
            </p>
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

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          cm.textSize('xs'),
          'border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <span>
          {t(
            'landing.footer.copy',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Async, made luminous.' },
          )}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <a href="#features" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/login" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link to="/signup" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}
