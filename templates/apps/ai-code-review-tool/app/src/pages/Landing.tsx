import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'ai',
    defaultTitle: 'AI quality scoring',
    defaultBody:
      'Every PR gets a 0-10 score — security, performance, maintainability, and style breakdowns with cite-back to the offending line.',
    icon: 'auto_awesome',
    tint: 'text-violet-400',
  },
  {
    key: 'github',
    defaultTitle: 'GitHub-native flow',
    defaultBody:
      'Connect a repo in 30 seconds. {{appName}} reviews every push and posts inline comments on the PR you already use.',
    icon: 'hub',
    tint: 'text-cyan-400',
  },
  {
    key: 'rules',
    defaultTitle: 'Bring your rules',
    defaultBody:
      'Tune severities per category, add team-specific lint rules, and pin "must-fix-before-merge" guardrails.',
    icon: 'gavel',
    tint: 'text-amber-400',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports your team reads',
    defaultBody:
      'Trend charts on quality, hotspots by file/contributor, weekly digests delivered to Slack — without dashboards nobody opens.',
    icon: 'analytics',
    tint: 'text-emerald-400',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased')}
      // Always-dark ink marketing page — the copy below is hardcoded white,
      // so the backdrop must not flip with the theme toggle (var(--color-bg)
      // turned it white in light mode: white-on-white headings).
      style={{ backgroundColor: 'var(--color-ink-panel)', color: 'var(--color-ink-text)' }}
    >
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-surface/10',
        )}
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
          <SafeLink
            to="/"
            className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'px-5 py-2 font-semibold bg-violet-600 text-white rounded-full hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/25',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-semibold bg-violet-600 text-white rounded-full hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/25',
                  )}
                >
                  {t(
                    'landing.getStarted',
                    { appName: APP_NAME },
                    { defaultValue: 'Get {{appName}} free' },
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, rgba(124, 58, 237, 0.30), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, rgba(6, 182, 212, 0.22), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-15 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(167, 139, 250, 0.55) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
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
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    'text-sm font-bold uppercase tracking-widest text-violet-300 mb-4 font-mono',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'AI · Pull request review · GitHub-native' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6 text-white',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={cm.cn('text-lg text-white/75 max-w-xl leading-relaxed mb-10')}>
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} reads every pull request like a senior engineer would — flags security holes, suggests rewrites, and grades the diff. Ship faster without shipping regressions.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-violet-600 text-white rounded-full hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/30',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Connect your first repo' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      'px-8 py-4 font-semibold rounded-full border border-surface/20 hover:bg-surface/10 transition-colors text-white',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <p
                  className={cm.cn(
                    'mt-6 text-xs font-mono text-white/50',
                    cm.flex({ align: 'center', gap: 'sm' }),
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[14px] text-emerald-400"
                    aria-hidden="true"
                  >
                    verified
                  </span>
                  {t(
                    'landing.heroProof',
                    {},
                    {
                      defaultValue:
                        '12k+ pull requests reviewed · SOC2 in progress · zero source code stored',
                    },
                  )}
                </p>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-surface/10',
                  )}
                  style={{ backgroundColor: 'var(--color-ink-panel)' }}
                >
                  <div
                    className={cm.cn(
                      'flex items-center gap-2 px-4 py-2 border-b border-surface/10',
                    )}
                  >
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-red-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-amber-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-emerald-400/70')}
                      aria-hidden="true"
                    />
                    <span className={cm.cn('ml-3 text-[10px] font-mono text-white/50')}>
                      {t(
                        'landing.previewWindowTitle',
                        {},
                        { defaultValue: 'refract · review preview' },
                      )}
                    </span>
                  </div>
                  <div className={cm.cn('p-5 font-mono text-[12px] leading-relaxed space-y-1.5')}>
                    <p className={cm.cn('text-white/70')}>@@ -42,6 +42,8 @@ src/auth/oauth.ts</p>
                    <p className={cm.cn('text-white/85')}>
                      <span className={cm.cn('text-white/60 mr-3 select-none')}>42</span>
                      export function rotateToken(user) &#123;
                    </p>
                    <p className={cm.cn('bg-red-500/15 border-l-2 border-red-400 -mx-5 px-5')}>
                      <span className={cm.cn('text-red-400 mr-3 select-none')}>43</span>
                      <span className={cm.cn('text-red-300')}>- const fresh = sql`SELECT … `</span>
                    </p>
                    <p
                      className={cm.cn(
                        'bg-emerald-500/15 border-l-2 border-emerald-400 -mx-5 px-5',
                      )}
                    >
                      <span className={cm.cn('text-emerald-400 mr-3 select-none')}>43</span>
                      <span className={cm.cn('text-emerald-300')}>
                        + const fresh = await users.rotate(user.id)
                      </span>
                    </p>
                    <p className={cm.cn('text-white/85')}>
                      <span className={cm.cn('text-white/60 mr-3 select-none')}>44</span>
                      return signJwt(fresh)
                    </p>
                    <div className={cm.cn('border-t border-surface/10 my-2.5')} />
                    <div className={cm.cn('flex items-start gap-2')}>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-violet-300 text-[14px] mt-0.5',
                        )}
                        aria-hidden="true"
                      >
                        auto_awesome
                      </span>
                      <p className={cm.cn('text-violet-200/90')}>
                        {t(
                          'landing.aiPreview',
                          {},
                          {
                            defaultValue:
                              'AI: parameterised query closes a SQLi vector seen in the audit log.',
                          },
                        )}
                      </p>
                    </div>
                    <div className={cm.cn('flex items-center gap-3 text-[11px] mt-2')}>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold',
                        )}
                      >
                        +24
                      </span>
                      <span
                        className={cm.cn(
                          'px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold',
                        )}
                      >
                        -18
                      </span>
                      <span className={cm.cn('ml-auto text-white/60')}>
                        score <span className={cm.cn('text-emerald-300 font-bold')}>9.1</span> / 10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-white',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for developers who actually merge' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'rounded-2xl p-6 hover:shadow-2xl hover:shadow-violet-500/10 transition-all group border border-surface/10',
                )}
                style={{ backgroundColor: 'var(--color-ink-panel)' }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                  style={{ backgroundColor: 'var(--color-inverse-surface)' }}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-bold mt-5 mb-2 text-white')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-white/70 leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-surface/10')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-extrabold tracking-tight mb-4 text-white')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop merging the bug-prone diff' })}
            </h3>
            <p className={cm.cn('text-base text-white/70 max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for solo devs and OSS. Pro for teams. Self-hosted for the paranoid.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-violet-600 text-white rounded-full hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/30',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Connect your first repo' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('py-8 text-center text-sm text-white/60 border-t border-surface/10')}
      >
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
