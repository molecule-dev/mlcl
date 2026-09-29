import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'openapi',
    defaultTitle: 'OpenAPI-driven',
    defaultBody:
      'Drop in your OpenAPI 3 spec — {{appName}} generates a navigable docs site, SDK matrix, and try-it console.',
    icon: 'description',
    tint: 'text-emerald-400',
  },
  {
    key: 'tryit',
    defaultTitle: 'Try it from the browser',
    defaultBody:
      'Method, headers, body, environment selector. See real responses with status + timing.',
    icon: 'play_arrow',
    tint: 'text-blue-400',
  },
  {
    key: 'examples',
    defaultTitle: 'Code samples in 6 langs',
    defaultBody:
      'Curl, Node, Python, Go, Ruby, PHP — copy-paste-ready, always in sync with the spec.',
    icon: 'code',
    tint: 'text-violet-400',
  },
  {
    key: 'changelog',
    defaultTitle: 'Changelog & status',
    defaultBody:
      'Versioned release notes plus a public uptime page. Subscribe to webhooks on breaking changes.',
    icon: 'history',
    tint: 'text-amber-400',
  },
] as const

/* Social-proof stat cards — verbatim structure of the Stitch hero band. */
const STATS = [
  { key: 'apis', value: '10k+', defaultLabel: 'APIs Documented' },
  { key: 'developers', value: '2M', defaultLabel: 'Developers Served' },
  { key: 'uptime', value: '99.9%', defaultLabel: 'Global Uptime' },
  { key: 'integrations', value: '50+', defaultLabel: 'Integrations' },
] as const

const METHOD_TINT = {
  GET: {
    bg: 'color-mix(in srgb, var(--color-method-get) 20%, transparent)',
    text: 'var(--color-method-get)',
  },
  POST: {
    bg: 'color-mix(in srgb, var(--color-method-post) 20%, transparent)',
    text: 'var(--color-method-post)',
  },
  PUT: {
    bg: 'color-mix(in srgb, var(--color-method-put) 20%, transparent)',
    text: 'var(--color-method-put)',
  },
  DELETE: {
    bg: 'color-mix(in srgb, var(--color-method-delete) 20%, transparent)',
    text: 'var(--color-method-delete)',
  },
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  /* Gradient-accent the final word of the (translated) headline, per the
     Stitch design — works for any locale without new i18n keys. */
  const heroTitle = t(
    'landing.heroTitle',
    { tagline: APP_TAGLINE },
    { defaultValue: '{{tagline}}' },
  )
  const lastSpace = heroTitle.lastIndexOf(' ')
  const heroHead = lastSpace === -1 ? heroTitle : heroTitle.slice(0, lastSpace)
  const heroAccent = lastSpace === -1 ? '' : heroTitle.slice(lastSpace + 1)

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased')}
      style={{
        backgroundColor: 'var(--mol-color-secondary)',
        color: 'var(--mol-color-background-secondary)',
      }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b border-surface/10')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-secondary) 85%, transparent)',
        }}
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
            <SafeLink to="/" className={cm.cn('text-xl font-extrabold tracking-tight text-white')}>
              <BrandWordmark as="span" invert />
            </SafeLink>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), cm.hiddenBelow('md'))}>
              <a
                href="#features"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-white/60 hover:text-emerald-400 transition-colors',
                )}
              >
                {t('nav.product', {}, { defaultValue: 'Product' })}
              </a>
              <SafeLink
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-white/60 hover:text-emerald-400 transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </SafeLink>
              <SafeLink
                to="/about"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-white/60 hover:text-emerald-400 transition-colors',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </SafeLink>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/docs"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  'px-4 py-2 font-medium bg-emerald-500 text-on-surface rounded hover:bg-emerald-400 transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn('text-sm font-medium text-white/70 hover:text-white')}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-4 py-2 font-medium bg-emerald-500 text-on-surface rounded hover:bg-emerald-400 transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Get Started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — centered per the Stitch design: glow blobs, gradient word,
            email capture, stat band */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--color-method-get) 8%, transparent), transparent 45%),' +
                'radial-gradient(circle at 85% 8%, color-mix(in srgb, var(--color-method-patch) 7%, transparent), transparent 40%)',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, color-mix(in srgb, var(--color-method-get) 60%, transparent) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative pt-32 pb-20 md:pb-24',
            )}
          >
            <div className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.textCenter)}>
              <p
                className={cm.cn(
                  'text-sm font-bold uppercase tracking-widest text-emerald-400 mb-8 font-mono',
                )}
              >
                {t('landing.eyebrow', {}, { defaultValue: 'API documentation · OpenAPI 3.1' })}
              </p>
              <h1
                className={cm.cn(
                  'text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-white mb-8',
                )}
              >
                {heroHead}
                {heroAccent ? (
                  <>
                    {' '}
                    <span className="text-gradient">{heroAccent}</span>
                  </>
                ) : null}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'md:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto mb-10',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Drop in your OpenAPI spec — get a navigable docs site, SDK matrix, and try-it console. Code samples always in sync.',
                  },
                )}
              </p>
              {/* Email capture row (decorative input + CTA, per the design) */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 3 }),
                  'sm:flex-row sm:items-center sm:justify-center max-w-md mx-auto',
                )}
              >
                <input
                  type="email"
                  aria-label={t('landing.emailPlaceholder', {}, { defaultValue: 'Email address' })}
                  placeholder={t(
                    'landing.emailPlaceholder',
                    {},
                    { defaultValue: 'developer@company.com' },
                  )}
                  className={cm.cn(
                    'flex-1 bg-surface/5 border border-surface/10 focus:border-emerald-400/50 rounded px-4 py-3 text-white placeholder:text-white/40 focus:ring-1 focus:ring-emerald-400/50 transition-all outline-none text-sm',
                  )}
                />
                <Link
                  to="/signup"
                  className={cm.cn(
                    'inline-flex items-center justify-center gap-2 px-6 py-3 font-medium bg-emerald-500 text-on-surface rounded transition-colors glow-emerald',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start Free' })}
                </Link>
              </div>
            </div>

            {/* Stat band */}
            <div
              className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-4 mt-20 relative')}
            >
              {STATS.map((s) => (
                <div
                  key={s.key}
                  className={cm.cn(
                    'rounded-lg border border-surface/10 p-6 relative group overflow-hidden backdrop-blur',
                  )}
                  style={{
                    backgroundColor: 'color-mix(in srgb, white 4%, transparent)',
                  }}
                >
                  <div
                    aria-hidden="true"
                    className={cm.cn(
                      'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    )}
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, color-mix(in srgb, var(--color-method-get) 10%, transparent), transparent)',
                    }}
                  />
                  <div className={cm.cn('text-3xl font-bold text-white mb-1 relative')}>
                    {s.value}
                  </div>
                  <div
                    className={cm.cn(
                      'text-white/60 font-medium uppercase tracking-wider text-xs relative',
                    )}
                  >
                    {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sample terminal — kept from the previous landing, now centered
                under the stat band */}
            <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, 'mt-16 relative')}>
              <div
                className={cm.cn(
                  'rounded-lg shadow-2xl shadow-black/40 overflow-hidden border border-surface/10 text-left',
                )}
                style={{ backgroundColor: 'var(--mol-color-secondary)' }}
              >
                <div
                  className={cm.cn('flex items-center gap-2 px-4 py-2 border-b border-surface/10')}
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
                      'landing.mockup.label',
                      { appName: APP_NAME },
                      { defaultValue: '{{appName}} · docs sample' },
                    )}
                  </span>
                </div>
                <div className={cm.cn('p-5 font-mono text-[12px] leading-relaxed space-y-2.5')}>
                  {/* GET */}
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span
                      className={cm.cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest',
                      )}
                      style={{ backgroundColor: METHOD_TINT.GET.bg, color: METHOD_TINT.GET.text }}
                    >
                      GET
                    </span>
                    <span className="text-white/90">/v3/accounts</span>
                  </div>
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span
                      className={cm.cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest',
                      )}
                      style={{
                        backgroundColor: METHOD_TINT.POST.bg,
                        color: METHOD_TINT.POST.text,
                      }}
                    >
                      POST
                    </span>
                    <span className="text-white/90">/v3/transactions</span>
                  </div>
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span
                      className={cm.cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest',
                      )}
                      style={{ backgroundColor: METHOD_TINT.PUT.bg, color: METHOD_TINT.PUT.text }}
                    >
                      PUT
                    </span>
                    <span className="text-white/90">/v3/accounts/&#123;id&#125;</span>
                  </div>
                  <div className={cm.cn('flex items-center gap-2')}>
                    <span
                      className={cm.cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest',
                      )}
                      style={{
                        backgroundColor: METHOD_TINT.DELETE.bg,
                        color: METHOD_TINT.DELETE.text,
                      }}
                    >
                      DEL
                    </span>
                    <span className="text-white/90">/v3/webhooks/&#123;id&#125;</span>
                  </div>
                  <div className={cm.cn('border-t border-surface/10 my-2.5')} />
                  <p className="text-emerald-400">
                    200 OK <span className={cm.cn('text-white/70 ml-2')}>· 47ms · 2.3 KB</span>
                  </p>
                  <pre className="text-white/85 overflow-x-auto">
                    {`{
  "data": [
    { "id": "acc_8w2j", "currency": "USD",
      "balance_cents": 142090 },
    { "id": "acc_b1nr", "currency": "EUR",
      "balance_cents": 87410 }
  ],
  "next_cursor": "Y3Jzcj0xMA"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}
          id="features"
        >
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-white',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for developers, by developers' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'rounded-lg p-6 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group border border-surface/10',
                )}
                style={{
                  /* Elevated dark card on the section's dark canvas (same
                     inverted-token scheme as the hero terminal below) — NOT
                     `--mol-color-surface`, which is #ffffff in light mode and
                     rendered these cards white-on-white under the hardcoded
                     white feature text. */
                  backgroundColor: 'color-mix(in srgb, white 4%, var(--mol-color-secondary))',
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                  style={{ backgroundColor: 'var(--mol-color-background-secondary)' }}
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
              {t('landing.ctaHeading', {}, { defaultValue: 'Ship docs your developers will use' })}
            </h3>
            <p className={cm.cn('text-base text-white/70 max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free tier for public APIs. Pro for teams. Enterprise for self-hosted.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-emerald-500 text-on-surface rounded hover:bg-emerald-400 transition-colors glow-emerald',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Try free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={cm.cn('border-t border-surface/10')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.grid({ cols: 2, gap: 'lg' }),
            'md:grid-cols-4 text-sm',
          )}
        >
          <div className={cm.cn('col-span-2 md:col-span-1')}>
            <div className={cm.cn('mb-4')}>
              <BrandWordmark as="span" invert footer size="sm" />
            </div>
            <p className={cm.cn('text-white/60')}>
              {t(
                'landing.footerTagline',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}.' },
              )}
            </p>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-white uppercase tracking-wider text-xs mb-4',
              )}
            >
              {t('footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.stack(2)}>
              <li>
                <SafeLink
                  to="/pricing"
                  className={cm.cn('text-white/60 hover:text-violet-400 transition-colors')}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </SafeLink>
              </li>
              <li>
                <SafeLink
                  to="/about"
                  className={cm.cn('text-white/60 hover:text-violet-400 transition-colors')}
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </SafeLink>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-white uppercase tracking-wider text-xs mb-4',
              )}
            >
              {t('footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.stack(2)}>
              <li>
                <SafeLink
                  to="/privacy"
                  className={cm.cn('text-white/60 hover:text-violet-400 transition-colors')}
                >
                  {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                </SafeLink>
              </li>
              <li>
                <SafeLink
                  to="/terms"
                  className={cm.cn('text-white/60 hover:text-violet-400 transition-colors')}
                >
                  {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
                </SafeLink>
              </li>
            </ul>
          </div>
        </div>
        <div className={cm.cn('border-t border-surface/10 py-6 text-center text-sm text-white/60')}>
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
        </div>
      </footer>
    </div>
  )
}
