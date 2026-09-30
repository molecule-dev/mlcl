import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'ai',
    defaultTitle: 'Smart Bug Detection',
    defaultBody:
      'Every PR gets a quality score — logical flaws and edge cases flagged before they hit production, with cite-back to the offending line.',
    icon: 'bug_report',
  },
  {
    key: 'security',
    defaultTitle: 'Security Audits',
    defaultBody:
      'Catch OWASP top 10 vulnerabilities, hardcoded secrets, and unsafe dependencies in real-time.',
    icon: 'shield',
  },
  {
    key: 'perf',
    defaultTitle: 'Performance Insights',
    defaultBody:
      'Flag n+1 queries, memory leaks, and inefficient algorithms with actionable optimization suggestions.',
    icon: 'speed',
  },
  {
    key: 'style',
    defaultTitle: 'Style Consistency',
    defaultBody:
      'Enforce your formatting and convention rules on every diff, so style debates end at the review gate — not in the comments.',
    icon: 'palette',
  },
  {
    key: 'rules',
    defaultTitle: 'Team Rules',
    defaultBody:
      'Tune severities per category, add team-specific lint rules, and pin "must-fix-before-merge" guardrails on every single pull request.',
    icon: 'rule',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports your team reads',
    defaultBody:
      'Trend charts on quality, hotspots by file/contributor, weekly digests delivered to Slack — without dashboards nobody opens.',
    icon: 'analytics',
  },
  {
    key: 'github',
    defaultTitle: 'GitHub Native',
    defaultBody:
      'Connect a repo in 30 seconds. {{appName}} reviews every push and comments directly on your PR lines — no new dashboards to check.',
    icon: 'hub',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      // .landing-scope re-pins the Stitch LIGHT palette inside this wrapper so
      // the landing matches the design regardless of the app's dark default
      // (see the .landing-scope block in index.css).
      className={cm.cn(
        'landing-scope',
        cm.minH('screen'),
        'bg-surface text-on-surface font-sans antialiased',
      )}
    >
      {/* TopNavBar */}
      <nav className={cm.cn('lp-nav sticky top-0 w-full z-50 backdrop-blur-xl')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'h-20',
          )}
        >
          <SafeLink to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
            <BrandWordmark as="span" size="lg" />
          </SafeLink>
          <nav className={cm.cn('hidden md:flex gap-8')}>
            <a
              href="#features"
              className={cm.cn(
                'text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <SafeLink
              to="/pricing"
              className={cm.cn(
                'text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </SafeLink>
            <SafeLink
              to="/about"
              className={cm.cn(
                'text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.docs', {}, { defaultValue: 'Docs' })}
            </SafeLink>
            <SafeLink
              to="/about"
              className={cm.cn(
                'text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.changelog', {}, { defaultValue: 'Changelog' })}
            </SafeLink>
          </nav>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'lp-btn-gradient px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium tracking-tight text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'lp-btn-gradient px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 active:scale-95 transition-all',
                  )}
                >
                  {t('landing.navCta', {}, { defaultValue: 'Connect with GitHub' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className={cm.cn('relative pt-24 pb-32 overflow-hidden')}>
          <div className={cm.cn('lp-hero-glow absolute inset-0 z-0')} aria-hidden="true" />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',
            )}
          >
            <div className={cm.cn('max-w-2xl')}>
              <h1
                className={cm.cn(
                  'text-5xl md:text-7xl font-black tracking-tighter text-on-surface leading-tight mb-6',
                )}
              >
                {t(
                  'landing.heroTitleLine1',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Code in a' },
                )}
                <br />
                <span className={cm.cn('gradient-text')}>
                  {t('landing.heroTitleLine2', {}, { defaultValue: 'new light' })}
                </span>
              </h1>
              <p className={cm.cn('text-xl text-on-surface-variant mb-10 leading-relaxed')}>
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'AI code review that catches bugs before they ship. Maintain high standards, enforce team rules, and speed up your workflow with surgical precision.',
                  },
                )}
              </p>
              <div className={cm.cn('flex flex-col sm:flex-row gap-4')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'inline-flex justify-center items-center gap-2 bg-on-surface text-surface px-8 py-4 rounded-lg font-semibold text-base hover:bg-inverse-surface transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                    code
                  </span>
                  {t('landing.heroCta', {}, { defaultValue: 'Connect GitHub' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'inline-flex justify-center items-center gap-2 bg-surface-container text-on-surface px-8 py-4 rounded-lg font-semibold text-base hover:bg-surface-container-high transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                    play_circle
                  </span>
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
              </div>
              <p
                className={cm.cn(
                  'mt-8 text-xs font-mono text-on-surface-variant',
                  cm.flex({ align: 'center', gap: 'sm' }),
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[14px] text-primary')}
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

            {/* Hero visual — the reviewer window */}
            <div
              className={cm.cn(
                'lp-visual-shadow relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-surface-variant/10 text-sm',
              )}
              style={{
                backgroundColor: 'var(--color-code-window)',
                color: 'var(--color-code-text)',
              }}
            >
              <div
                className={cm.cn('flex items-center gap-2 px-4 py-3 border-b')}
                style={{
                  backgroundColor: 'var(--color-code-header)',
                  borderColor: 'var(--color-code-border)',
                }}
              >
                <span
                  className={cm.cn('w-3 h-3 rounded-full')}
                  style={{ backgroundColor: 'var(--color-code-rose)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('w-3 h-3 rounded-full')}
                  style={{ backgroundColor: 'var(--color-code-peach)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('w-3 h-3 rounded-full')}
                  style={{ backgroundColor: 'var(--color-code-green)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn('ml-4 font-mono text-xs')}
                  style={{ color: 'var(--color-code-lavender)' }}
                >
                  {t('landing.windowTitle', {}, { defaultValue: 'auth.ts — PR #492' })}
                </span>
              </div>
              <div className={cm.cn('p-4 font-mono leading-relaxed overflow-hidden')}>
                <div className={cm.cn('flex opacity-50')}>
                  <span
                    className={cm.cn('w-8 text-right mr-4 select-none')}
                    style={{ color: 'var(--color-code-dim)' }}
                  >
                    12
                  </span>
                  <span>function validateUser(token: string) {'{'}</span>
                </div>
                <div
                  className={cm.cn('flex')}
                  style={{ backgroundColor: 'rgba(243, 138, 168, 0.1)' }}
                >
                  <span
                    className={cm.cn('w-8 text-right mr-4 select-none')}
                    style={{ color: 'var(--color-code-rose)' }}
                  >
                    13
                  </span>
                  <span style={{ color: 'var(--color-code-rose)' }}>
                    - const decoded = jwt.decode(token);
                  </span>
                </div>
                <div
                  className={cm.cn('flex')}
                  style={{ backgroundColor: 'rgba(166, 227, 161, 0.1)' }}
                >
                  <span
                    className={cm.cn('w-8 text-right mr-4 select-none')}
                    style={{ color: 'var(--color-code-green)' }}
                  >
                    13
                  </span>
                  <span style={{ color: 'var(--color-code-green)' }}>
                    + const decoded = jwt.verify(token, process.env.SECRET);
                  </span>
                </div>
                <div className={cm.cn('flex opacity-50')}>
                  <span
                    className={cm.cn('w-8 text-right mr-4 select-none')}
                    style={{ color: 'var(--color-code-dim)' }}
                  >
                    14
                  </span>
                  <span>{'  '}return decoded;</span>
                </div>
                <div className={cm.cn('flex opacity-50')}>
                  <span
                    className={cm.cn('w-8 text-right mr-4 select-none')}
                    style={{ color: 'var(--color-code-dim)' }}
                  >
                    15
                  </span>
                  <span>{'}'}</span>
                </div>
                {/* AI comment bubble */}
                <div
                  className={cm.cn(
                    'mt-6 ml-12 rounded-lg p-4 border flex gap-4 items-start relative',
                  )}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(203, 166, 247, 0.3)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div
                    className={cm.cn(
                      'absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg',
                    )}
                    style={{ backgroundColor: 'var(--color-code-mauve)' }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined fill text-white text-sm')}
                      aria-hidden="true"
                    >
                      auto_awesome
                    </span>
                  </div>
                  <div className={cm.cn('flex-1')}>
                    <p
                      className={cm.cn('font-semibold text-xs uppercase tracking-wider mb-1')}
                      style={{ color: 'var(--color-code-mauve)' }}
                    >
                      {t('landing.insightLabel', {}, { defaultValue: `${APP_NAME} Insight` })}
                    </p>
                    <p className={cm.cn('text-sm')} style={{ color: 'var(--color-code-subtext)' }}>
                      {t(
                        'landing.insightBody',
                        {},
                        {
                          defaultValue:
                            'Critical Security Issue: using `jwt.decode` without verification allows spoofed tokens. Suggesting `jwt.verify` instead.',
                        },
                      )}
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      'relative w-12 h-12 flex items-center justify-center shrink-0',
                    )}
                  >
                    <svg className={cm.cn('w-full h-full -rotate-90')} viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="var(--color-code-border)"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="var(--color-code-green)"
                        strokeDasharray="87, 100"
                        strokeLinecap="round"
                        strokeWidth="3"
                      />
                    </svg>
                    <span
                      className={cm.cn('absolute text-[10px] font-bold')}
                      style={{ color: 'var(--color-code-green)' }}
                    >
                      87
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className={cm.cn('py-24 bg-surface-container-low')} id="features">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('text-center mb-16 max-w-2xl mx-auto')}>
              <h2
                className={cm.cn(
                  'text-3xl md:text-4xl font-bold tracking-tight mb-4 text-on-surface',
                )}
              >
                {t(
                  'landing.featuresHeading',
                  {},
                  { defaultValue: 'Review faster. Merge with confidence.' },
                )}
              </h2>
              <p className={cm.cn('text-lg text-on-surface-variant')}>
                {t(
                  'landing.featuresSubheading',
                  {},
                  { defaultValue: 'Automated insights tailored to your codebase context.' },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    'p-8 rounded-xl bg-surface-container-lowest transition-transform duration-300 hover:-translate-y-1',
                  )}
                >
                  <div
                    className={cm.cn(
                      'w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center mb-6',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined fill text-primary text-2xl')}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn('text-xl font-bold mb-3 text-on-surface')}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                    {t(
                      `landing.feature.${f.key}.body`,
                      { appName: APP_NAME },
                      { defaultValue: f.defaultBody },
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars — the four promises every surface of the product is held to */}
        <section className={cm.cn('py-20 border-t border-surface-variant/60')} id="pillars">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <h2
              className={cm.cn(
                'text-2xl md:text-3xl font-bold tracking-tight text-center mb-12 text-on-surface',
              )}
            >
              {t('landing.pillarsHeading', {}, { defaultValue: 'Built to be trusted on main' })}
            </h2>
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            >
              {(
                [
                  {
                    key: 'scoring',
                    icon: 'fact_check',
                    title: 'AI quality scoring on every PR',
                    body: 'A 0–10 score per pull request, with findings cited to the exact offending line.',
                  },
                  {
                    key: 'flow',
                    icon: 'account_tree',
                    title: 'GitHub-native flow',
                    body: 'Reviews land as inline PR comments on every push — no new dashboard to babysit.',
                  },
                  {
                    key: 'rules',
                    icon: 'rule',
                    title: 'Bring your rules',
                    body: 'Team conventions and severity tuning, enforced automatically on every diff.',
                  },
                  {
                    key: 'reports',
                    icon: 'analytics',
                    title: 'Reports your team reads',
                    body: 'Weekly digests and trend charts people open — not another wall of graphs.',
                  },
                ] as const
              ).map((p) => (
                <div key={p.key} className={cm.cn('flex flex-col gap-3 text-center sm:text-left')}>
                  <div
                    className={cm.cn(
                      'w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center mx-auto sm:mx-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined fill text-primary text-xl')}>
                      {p.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn('text-base font-bold text-on-surface leading-snug')}>
                    {t(`landing.pillar.${p.key}`, {}, { defaultValue: p.title })}
                  </h3>
                  <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                    {t(`landing.pillar.${p.key}.body`, {}, { defaultValue: p.body })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={cm.cn('py-24')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'text-center')}>
            <h3
              className={cm.cn(
                'text-3xl md:text-4xl font-bold tracking-tight mb-4 text-on-surface',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop merging the bug-prone diff' })}
            </h3>
            <p className={cm.cn('text-lg text-on-surface-variant max-w-xl mx-auto mb-10')}>
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
                'lp-btn-gradient inline-flex items-center gap-2 px-10 py-4 rounded-lg font-semibold text-base hover:opacity-90 transition-opacity',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Connect GitHub' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={cm.cn('w-full border-t border-surface-variant bg-surface py-16')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.grid({ gap: 'lg' }),
            'grid-cols-2 md:grid-cols-4',
          )}
        >
          <div>
            <div className={cm.cn('mb-6')}>
              <BrandWordmark as="span" size="sm" footer />
            </div>
            <p className={cm.cn('text-sm leading-relaxed text-on-surface-variant')}>
              {t(
                'common.copyrightBuiltWithMolecule',
                { year: new Date().getFullYear(), app: `${APP_NAME} Logic` },
                { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
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
          <div className={cm.cn('flex flex-col gap-4')}>
            <h4 className={cm.cn('font-semibold text-on-surface')}>
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <SafeLink
              to="/"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </SafeLink>
            <SafeLink
              to="/pricing"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </SafeLink>
            <SafeLink
              to="/about"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.changelog', {}, { defaultValue: 'Changelog' })}
            </SafeLink>
          </div>
          <div className={cm.cn('flex flex-col gap-4')}>
            <h4 className={cm.cn('font-semibold text-on-surface')}>
              {t('landing.footer.company', {}, { defaultValue: 'Company' })}
            </h4>
            <SafeLink
              to="/about"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.footer.aboutUs', {}, { defaultValue: 'About Us' })}
            </SafeLink>
            <SafeLink
              to="/privacy"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </SafeLink>
            <SafeLink
              to="/terms"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </SafeLink>
          </div>
          <div className={cm.cn('flex flex-col gap-4')}>
            <h4 className={cm.cn('font-semibold text-on-surface')}>
              {t('landing.footer.resources', {}, { defaultValue: 'Resources' })}
            </h4>
            <SafeLink
              to="/about"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.docs', {}, { defaultValue: 'Documentation' })}
            </SafeLink>
            <SafeLink
              to="/login"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
            </SafeLink>
            <SafeLink
              to="/signup"
              className={cm.cn(
                'text-sm text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.navCta', {}, { defaultValue: 'Connect with GitHub' })}
            </SafeLink>
          </div>
        </div>
      </footer>
    </div>
  )
}
