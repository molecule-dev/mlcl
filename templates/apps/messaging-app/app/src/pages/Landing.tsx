import { Link, Navigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'e2ee',
    defaultTitle: 'End-to-end encryption',
    defaultBody:
      'Your messages, your keys. Nothing readable on our servers — ever. Open source, audited, defaults on.',
    icon: 'lock',
    tint: 'text-success',
  },
  {
    key: 'disappearing',
    defaultTitle: 'Disappearing messages',
    defaultBody:
      "Set timers per chat: 30 seconds to 4 weeks. Once it fades, it's gone — even from our database.",
    icon: 'timer',
    tint: 'text-warning',
  },
  {
    key: 'verified',
    defaultTitle: 'Verify your contacts',
    defaultBody:
      'Compare safety numbers in person or over a trusted channel. Once verified, never silently rotated.',
    icon: 'verified',
    tint: 'text-primary',
  },
  {
    key: 'open',
    defaultTitle: 'Open source. Donate-funded.',
    defaultBody:
      'No ads, no tracking, no investor pressure. Reproducible builds. Audited every year.',
    icon: 'volunteer_activism',
    tint: 'text-cyan-500',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()

  // Already signed in? Skip the marketing page and go straight to the inbox.
  // Wait for auth to initialize so we don't flash the marketing page on
  // refresh while the JWT is being restored from storage.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/inbox" replace />
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
        }
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={'text-xl font-extrabold tracking-tight'}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/login"
              className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={
                'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
              }
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — slate panel, sample chat thread on the right */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, color-mix(in srgb, var(--mol-color-info) 12%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-4'}>
                  {t('landing.eyebrow', {}, { defaultValue: 'Encrypted messaging · open source' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10'}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'A messaging app for people who want privacy without compromise. End-to-end encrypted by default. No ads, no tracking, no compromises.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                    }
                  >
                    {t(
                      'auth.signup.createYourAccount',
                      {},
                      { defaultValue: 'Create your account' },
                    )}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{ backgroundColor: 'var(--color-text)', minHeight: '380px' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--color-accent) 45%, transparent) 0%, transparent 40%),' +
                        'radial-gradient(circle at 70% 70%, color-mix(in srgb, var(--mol-color-info) 30%, transparent) 0%, transparent 35%),' +
                        'linear-gradient(135deg, var(--color-text) 0%, var(--mol-color-background-secondary) 100%)',
                    }}
                    aria-hidden="true"
                  />

                  <div className={'relative z-10 p-6 flex flex-col justify-between min-h-[380px]'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={'material-symbols-outlined text-emerald-300 text-base'}
                        aria-hidden="true"
                      >
                        lock
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                        {t(
                          'common.endToEndEncrypted',
                          {},
                          { defaultValue: 'End-to-end encrypted' },
                        )}
                      </span>
                    </div>

                    <div className={'space-y-2 my-4'}>
                      {/* Received bubble */}
                      <div className={'flex justify-start'}>
                        <div className="max-w-[80%]">
                          <p className={'text-[11px] font-semibold text-indigo-300 mb-0.5 px-1'}>
                            Henry Park
                          </p>
                          <div
                            className={
                              'px-4 py-2.5 text-sm bg-surface/10 backdrop-blur-md rounded-[18px] rounded-bl-[4px]'
                            }
                          >
                            morning! still on for coffee?
                          </div>
                        </div>
                      </div>
                      {/* Self bubble */}
                      <div className={'flex justify-end'}>
                        <div className="max-w-[80%]">
                          <div
                            className={
                              'px-4 py-2.5 text-sm bg-accent text-white rounded-[18px] rounded-br-[4px] shadow-lg shadow-accent/30'
                            }
                          >
                            yep, the corner one with the big windows
                          </div>
                          <div className={'flex items-center gap-1 justify-end mt-1 px-1'}>
                            <span className="text-[10px] text-white/60">10:42 AM</span>
                            <span
                              className="material-symbols-outlined text-[14px] text-emerald-300"
                              aria-hidden="true"
                            >
                              done_all
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Received bubble */}
                      <div className={'flex justify-start'}>
                        <div className="max-w-[80%]">
                          <p className={'text-[11px] font-semibold text-indigo-300 mb-0.5 px-1'}>
                            Henry Park
                          </p>
                          <div
                            className={
                              'px-4 py-2.5 text-sm bg-surface/10 backdrop-blur-md rounded-[18px] rounded-bl-[4px]'
                            }
                          >
                            👍 11 still good for you?
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/70'
                        }
                      >
                        {t('landing.sampleDisappearing', {}, { defaultValue: 'Disappears in 30m' })}
                      </span>
                      <span
                        className={
                          'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300'
                        }
                      >
                        {t('landing.sampleVerified', {}, { defaultValue: 'Verified' })}
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl'
                    }
                  />
                  <div
                    className={
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-cyan-400/20 blur-xl'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t('landing.featuresHeading', {}, { defaultValue: 'Privacy without compromise' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group'
                }
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={'text-lg font-bold mt-5 mb-2'}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={'text-3xl font-extrabold tracking-tight mb-4'}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Quiet, secure, intimate' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free forever for personal use. Take 60 seconds to register and you’re done.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
              }
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            cm.sp('mb', 3),
          )}
          aria-label={t('footer.navLabel', {}, { defaultValue: 'Footer navigation' })}
        >
          <Link to="/pricing" className={'hover:text-on-surface'}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/about" className={'hover:text-on-surface'}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/terms" className={'hover:text-on-surface'}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </Link>
          <Link to="/privacy" className={'hover:text-on-surface'}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </Link>
        </nav>
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
