import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
          <SafeLink to="/" className={cm.cn('text-xl font-extrabold tracking-tight text-white')}>
            {APP_NAME}
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/docs"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  'px-5 py-2 font-semibold bg-emerald-500 text-on-surface rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20',
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
                    'px-5 py-2 font-semibold bg-emerald-500 text-on-surface rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — dev-tools dark with terminal sample on the right */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--color-method-get) 25%, transparent), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, color-mix(in srgb, var(--color-method-patch) 20%, transparent), transparent 45%)',
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
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    'text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4 font-mono',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'API documentation · OpenAPI 3.1' })}
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
                    {},
                    {
                      defaultValue:
                        'Drop in your OpenAPI spec — get a navigable docs site, SDK matrix, and try-it console. Code samples always in sync.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-emerald-500 text-on-surface rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Try free' })}
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
              </div>

              {/* Sample terminal */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-surface/10',
                  )}
                  style={{ backgroundColor: 'var(--mol-color-secondary)' }}
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
                      {APP_NAME} · docs sample
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
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
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
                  'rounded-2xl p-6 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group border border-surface/10',
                )}
                style={{ backgroundColor: 'var(--mol-color-surface)' }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform',
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
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-emerald-500 text-on-surface rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30',
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
