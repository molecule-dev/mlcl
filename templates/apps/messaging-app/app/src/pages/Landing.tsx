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
  },
  {
    key: 'disappearing',
    defaultTitle: 'Disappearing messages',
    defaultBody:
      "Set timers per chat: 30 seconds to 4 weeks. Once it fades, it's gone — even from our database.",
    icon: 'timer',
  },
  {
    key: 'verified',
    defaultTitle: 'Verify your contacts',
    defaultBody:
      'Compare safety numbers in person or over a trusted channel. Once verified, never silently rotated.',
    icon: 'gpp_good',
  },
  {
    key: 'open',
    defaultTitle: 'Open source. Donate-funded.',
    defaultBody:
      'No ads, no tracking, no investor pressure. Reproducible builds. Audited every year.',
    icon: 'sync',
  },
] as const

const TRUST_METRICS = [
  { key: 'people', icon: null, defaultValue: '2.1M people' },
  { key: 'countries', icon: null, defaultValue: '180 countries' },
  { key: 'breaches', icon: 'verified_user', defaultValue: '0 data breaches in 8 years' },
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
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_12px_32px_color-mix(in_oklab,var(--color-on-surface)_6%,transparent)]'
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link to="/" className={'text-2xl font-bold tracking-tighter'}>
              {APP_NAME}
            </Link>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden md:flex tracking-tight',
              )}
            >
              <a
                href="#features"
                className={'text-on-surface-variant hover:text-primary transition-colors'}
              >
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link
                to="/about"
                className={'text-on-surface-variant hover:text-primary transition-colors'}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
              <Link
                to="/pricing"
                className={'text-on-surface-variant hover:text-primary transition-colors'}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/login"
              data-mol-id="landing-nav-signin"
              className={
                'hidden md:inline-flex items-center py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors'
              }
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="landing-nav-signup"
              className={
                'px-5 py-2.5 text-sm font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm'
              }
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </nav>

      <main className="overflow-hidden">
        {/* Hero — 2-col with the light phone-frame chat mockup (Stitch). */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pt-16 pb-20 md:pt-24')}
        >
          <div className={'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative z-10')}>
              <p className={'text-sm font-bold uppercase tracking-widest text-primary'}>
                {t('landing.eyebrow', {}, { defaultValue: 'Encrypted messaging · open source' })}
              </p>
              <h1
                className={
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]'
                }
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              </h1>
              <p className={'text-xl text-on-surface-variant max-w-xl leading-relaxed'}>
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
                  data-mol-id="landing-hero-cta"
                  className={
                    'inline-flex items-center gap-2 px-8 py-4 font-semibold text-on-primary rounded-xl shadow-xl shadow-primary/20 hover:opacity-90 transition-opacity bg-gradient-to-br from-primary to-primary-dark'
                  }
                >
                  {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={
                    'inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-xl bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant/30 hover:bg-surface-container-low transition-colors'
                  }
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    forum
                  </span>
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  'text-on-surface-variant flex-wrap pt-2',
                )}
              >
                <span>{t('landing.availableOn', {}, { defaultValue: 'Available on' })}</span>
                {['phone_iphone', 'android', 'laptop_mac', 'desktop_windows', 'language'].map(
                  (icon) => (
                    <span
                      key={icon}
                      className={'material-symbols-outlined text-[18px]'}
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Phone-frame chat mockup (Stitch). Static sample thread. */}
            <div
              className={cm.cn('relative h-[560px] md:h-[640px] flex justify-center items-center')}
            >
              <div
                aria-hidden="true"
                className={cm.cn(
                  'absolute inset-0 rounded-[40px] bg-gradient-to-tr from-surface-container-low to-surface-container-lowest',
                )}
              />
              <div
                className={cm.cn(
                  'relative w-[300px] md:w-[320px] h-full bg-surface-container-lowest rounded-[48px] shadow-2xl shadow-on-surface/10 ring-1 ring-outline-variant/20 overflow-hidden flex flex-col z-0',
                )}
              >
                {/* Chat header */}
                <div
                  className={cm.cn(
                    'bg-surface-container-lowest/80 backdrop-blur-md px-6 py-4 flex items-center gap-3 z-10',
                  )}
                >
                  <div className={'relative'}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-full bg-primary-light text-primary text-xs font-bold',
                      )}
                    >
                      HP
                    </div>
                    <div
                      aria-hidden="true"
                      className={cm.cn(
                        'absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success ring-2 ring-surface-container-lowest',
                      )}
                    />
                  </div>
                  <div className={'flex-1 min-w-0'}>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t('landing.phone.contact', {}, { defaultValue: 'Henry Park' })}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('landing.phone.status', {}, { defaultValue: 'Online' })}
                    </p>
                  </div>
                  <span
                    className={'material-symbols-outlined text-on-surface-variant'}
                    aria-hidden="true"
                  >
                    more_horiz
                  </span>
                </div>
                {/* Chat feed */}
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'lg' }),
                    'grow bg-surface-container p-5 overflow-hidden',
                  )}
                >
                  <div className={cm.flex({ justify: 'center' })}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 4),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-full bg-success-light text-success-dark tracking-wide',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px]')}
                        aria-hidden="true"
                      >
                        lock
                      </span>
                      {t('common.endToEndEncrypted', {}, { defaultValue: 'End-to-end encrypted' })}
                    </div>
                  </div>
                  {/* Sent */}
                  <div className={'self-end max-w-[85%] flex flex-col gap-1 items-end'}>
                    <div
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'bg-primary text-on-primary text-[15px] leading-normal rounded-[18px] rounded-br-sm shadow-lg shadow-primary/15',
                      )}
                    >
                      {t(
                        'landing.phone.sent1',
                        {},
                        { defaultValue: 'Are we still on for the security review tomorrow?' },
                      )}
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'opacity-70')}>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        10:42 AM
                      </span>
                      <span
                        className={cm.cn('material-symbols-outlined text-[12px] text-success')}
                        aria-hidden="true"
                      >
                        lock
                      </span>
                    </div>
                  </div>
                  {/* Sent 2 */}
                  <div className={'self-end max-w-[85%] flex flex-col gap-1 items-end'}>
                    <div
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'bg-primary text-on-primary text-[15px] leading-normal rounded-[18px] rounded-tr-sm rounded-br-sm shadow-lg shadow-primary/15',
                      )}
                    >
                      {t(
                        'landing.phone.sent2',
                        {},
                        { defaultValue: 'I have the new protocol specs ready.' },
                      )}
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'opacity-70')}>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        10:43 AM
                      </span>
                      <span
                        className={cm.cn('material-symbols-outlined text-[12px] text-success')}
                        aria-hidden="true"
                      >
                        lock
                      </span>
                    </div>
                  </div>
                  {/* Received */}
                  <div className={'self-start max-w-[85%] flex flex-col gap-1 items-start'}>
                    <div
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        'bg-surface-container-highest text-on-surface text-[15px] leading-normal rounded-[18px] rounded-bl-sm shadow-sm',
                      )}
                    >
                      {t(
                        'landing.phone.received',
                        {},
                        {
                          defaultValue:
                            "Yes, perfect. The connection is secure here. Send them over when you're ready.",
                        },
                      )}
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'opacity-70')}>
                      <span
                        className={cm.cn('material-symbols-outlined text-[12px] text-success')}
                        aria-hidden="true"
                      >
                        lock
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        10:45 AM
                      </span>
                    </div>
                  </div>
                </div>
                {/* Input area */}
                <div className={cm.cn('bg-surface-container-lowest px-4 py-4 z-10')}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'bg-surface-container-low rounded-xl px-4 py-3',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-on-surface-variant'}
                      aria-hidden="true"
                    >
                      add_circle
                    </span>
                    <div className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface-variant/60')}>
                      {t(
                        'landing.phone.placeholder',
                        { app: APP_NAME },
                        { defaultValue: 'Message…' },
                      )}
                    </div>
                    <span
                      className={'material-symbols-outlined text-primary'}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      mic
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust metric band (Stitch). */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'lg' }),
              'bg-surface-container-lowest py-8 px-12 rounded-3xl shadow-sm ring-1 ring-outline-variant/15 text-center md:text-left',
            )}
          >
            {TRUST_METRICS.map((m) => (
              <div
                key={m.key}
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'tracking-tight inline-flex items-center gap-2',
                )}
              >
                {m.icon ? (
                  <span
                    className={cm.cn('material-symbols-outlined text-success')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {m.icon}
                  </span>
                ) : null}
                {t(`landing.trust.${m.key}`, {}, { defaultValue: m.defaultValue })}
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid — 2x2 bento cards (Stitch). */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
        >
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 10),
                  'bg-surface-container-lowest rounded-3xl shadow-sm ring-1 ring-outline-variant/10 hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-14 h-14 bg-primary-fixed rounded-2xl',
                    cm.sp('mb', 6),
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-primary text-[28px]')}
                    aria-hidden="true"
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 3),
                    'tracking-tight',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight mb-4',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Quiet, secure, intimate' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                'text-on-surface-variant max-w-xl mx-auto mb-8',
              )}
            >
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
              data-mol-id="landing-cta-signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold text-on-primary rounded-xl shadow-xl shadow-primary/20 hover:opacity-90 transition-opacity bg-gradient-to-br from-primary to-primary-dark'
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

      <footer className={cm.cn(cm.sp('py', 10), cm.sp('px', 6), 'bg-surface-container-low')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'md' }),
            'md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
              'justify-center',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{APP_NAME}</span>
            <span className={cm.cn('text-outline-variant hidden md:inline')} aria-hidden="true">
              |
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
          </div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
              cm.textSize('sm'),
            )}
            aria-label={t('footer.navLabel', {}, { defaultValue: 'Footer navigation' })}
          >
            <Link
              to="/pricing"
              className={
                'inline-flex items-center py-2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={
                'inline-flex items-center py-2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/terms"
              className={
                'inline-flex items-center py-2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link
              to="/privacy"
              className={
                'inline-flex items-center py-2 text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
