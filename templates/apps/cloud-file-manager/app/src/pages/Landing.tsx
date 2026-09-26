import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { NimbusBrandMark } from '../components/NimbusBrandMark.js'

interface FeatureCard {
  glyph: string
  titleKey: string
  bodyKey: string
  defaultTitle: string
  defaultBody: string
}

const FEATURES: FeatureCard[] = [
  {
    glyph: 'cloud_sync',
    titleKey: 'landing.features.sync.title',
    bodyKey: 'landing.features.sync.body',
    defaultTitle: 'Continuous sync, zero spinners',
    defaultBody:
      'Files appear on every signed-in device the instant you save them — no refresh dance, no half-uploaded ghosts.',
  },
  {
    glyph: 'lock',
    titleKey: 'landing.features.encryption.title',
    bodyKey: 'landing.features.encryption.body',
    defaultTitle: 'End-to-end encryption',
    defaultBody:
      'Every byte is sealed in transit and at rest with a unique key only you control. We never see your files.',
  },
  {
    glyph: 'workspaces',
    titleKey: 'landing.features.collab.title',
    bodyKey: 'landing.features.collab.body',
    defaultTitle: 'Spaces, not folders',
    defaultBody:
      'Group teammates around a campaign, a quarter, a launch. Permissions follow the work, not the file tree.',
  },
  {
    glyph: 'visibility',
    titleKey: 'landing.features.preview.title',
    bodyKey: 'landing.features.preview.body',
    defaultTitle: 'Preview anything, instantly',
    defaultBody:
      'PDFs, decks, raw video, RAW photos — they all render inline in the browser without a download round-trip.',
  },
]

interface TrustMetric {
  glyph: string
  valueKey: string
  defaultValue: string
  labelKey: string
  defaultLabel: string
}

const TRUST_METRICS: TrustMetric[] = [
  {
    glyph: 'cloud_done',
    valueKey: 'landing.trust.uptime.value',
    defaultValue: '99.99%',
    labelKey: 'landing.trust.uptime.label',
    defaultLabel: 'Uptime SLA',
  },
  {
    glyph: 'lock',
    valueKey: 'landing.trust.encryption.value',
    defaultValue: 'AES-256',
    labelKey: 'landing.trust.encryption.label',
    defaultLabel: 'End-to-end encrypted',
  },
  {
    glyph: 'public',
    valueKey: 'landing.trust.regions.value',
    defaultValue: '14 regions',
    labelKey: 'landing.trust.regions.label',
    defaultLabel: 'Global edge network',
  },
  {
    glyph: 'verified',
    valueKey: 'landing.trust.compliance.value',
    defaultValue: 'SOC 2 + HIPAA',
    labelKey: 'landing.trust.compliance.label',
    defaultLabel: 'Audited & compliant',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn('bg-surface text-on-surface antialiased overflow-x-hidden relative')}>
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.h(20),
          'fixed top-0 left-0 right-0 z-50 max-w-[1440px] mx-auto bg-surface/80 backdrop-blur-xl',
        )}
      >
        <Link
          to="/"
          data-mol-id="landing-logo"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <NimbusBrandMark size="sm" showIcon />
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.textSize('sm'),
            'hidden md:flex text-on-surface-variant',
          )}
        >
          <a href="#features" className={cm.cn('hover:text-primary transition-colors')}>
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a href="#pricing" className={cm.cn('hover:text-primary transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </a>
          <Link
            to="/about"
            data-mol-id="landing-nav-about"
            className={cm.cn('hover:text-primary transition-colors')}
          >
            {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {isAuthenticated ? (
            <Link
              to="/files"
              data-mol-id="landing-go-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="landing-signin"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'hidden md:inline text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t('landing.nav.logIn', {}, { defaultValue: 'Log In' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </nav>

      <main
        className={cm.cn(
          cm.sp('pt', 24),
          cm.sp('pb', 24),
          'pt-32 px-6 md:px-12 max-w-[1440px] mx-auto relative z-10',
        )}
      >
        <div className={cm.cn(cm.grid({ cols: 1, gap: 16 }), 'lg:grid-cols-2 items-center')}>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.roundedFull,
                cm.fontWeight('semibold'),
                'inline-flex w-fit bg-surface-container-low text-primary uppercase tracking-widest',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>auto_awesome</span>
              {t(
                'landing.hero.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Introducing {{appName}} v2' },
              )}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
              )}
            >
              {t('landing.hero.titleLead', {}, { defaultValue: 'Everything in' })}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary-container">
                {t('landing.hero.titleAccent', {}, { defaultValue: 'reach.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('lg'),
                'leading-relaxed text-on-surface-variant',
              )}
            >
              {t(
                'landing.hero.body',
                { tagline: APP_TAGLINE },
                {
                  defaultValue:
                    'The weightless archive for your digital life. Unified cloud storage that feels like breathing fresh air. No clutter, just clarity.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'sm:flex-row')}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-primary"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20',
                )}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Start free — 15 GB' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors',
                )}
              >
                <span className="material-symbols-outlined">play_circle</span>
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
          </div>

          <div className="relative">
            <div
              className={cm.cn(
                'absolute inset-0 bg-gradient-to-tr from-primary-container/20 to-tertiary-fixed/20 blur-3xl rounded-[3rem] rotate-3',
              )}
            />
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'relative z-10 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/15 shadow-2xl overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('pb', 4),
                  cm.sp('px', 2),
                  'border-b border-surface-container-high/50 mb-4',
                )}
              >
                <div className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
                <div className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
                <div className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
              </div>
              <div className={cm.cn(cm.grid({ cols: 12, gap: 4 }), 'h-auto lg:h-[400px]')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 3),
                    'col-span-3 rounded-xl bg-surface-container-low',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('p', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-lg bg-surface-container-highest text-primary',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-xl')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      folder_open
                    </span>
                    {t('landing.preview.myArchive', {}, { defaultValue: 'My Archive' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('p', 2),
                      cm.textSize('sm'),
                      'rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')}>group</span>
                    {t('status.shared', {}, { defaultValue: 'Shared' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('p', 2),
                      cm.textSize('sm'),
                      'rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-xl')}>star</span>
                    {t('status.starred', {}, { defaultValue: 'Starred' })}
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'col-span-9 rounded-xl bg-surface-container-lowest p-3',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                      {t('landing.preview.recentFiles', {}, { defaultValue: 'Recent Files' })}
                    </h3>
                    <div className={cm.cn(cm.flex({ gap: 'xs' }))}>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-on-surface-variant bg-surface-container-low p-1.5 rounded-lg',
                        )}
                      >
                        grid_view
                      </span>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-outline bg-surface-container-lowest p-1.5 rounded-lg',
                        )}
                      >
                        view_list
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn(cm.grid({ cols: 3, gap: 3 }))}>
                    {[
                      {
                        glyph: 'image',
                        tile: 'bg-primary-container/10 text-primary',
                        name: 'Q3_Campaign.png',
                        meta: '2.4 MB',
                      },
                      {
                        glyph: 'description',
                        tile: 'bg-tertiary-container/10 text-tertiary',
                        name: 'Project_Brief.pdf',
                        meta: '1.1 MB',
                      },
                      {
                        glyph: 'folder',
                        tile: 'bg-secondary-container/20 text-secondary',
                        name: 'Brand Assets',
                        meta: '12 items',
                      },
                    ].map((file) => (
                      <div
                        key={file.name}
                        className={cm.cn(
                          cm.flex({ direction: 'col', justify: 'between' }),
                          cm.sp('p', 3),
                          'h-32 sm:h-auto sm:aspect-square rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(10),
                            cm.h(10),
                            'rounded-lg',
                            file.tile,
                          )}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            {file.glyph}
                          </span>
                        </span>
                        <div>
                          <p
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('semibold'),
                              'truncate',
                            )}
                          >
                            {file.name}
                          </p>
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.sp('mt', 1),
                              'text-on-surface-variant',
                            )}
                          >
                            {file.meta}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="features" className={cm.cn(cm.sp('py', 16), 'bg-surface-container-low w-full')}>
        <div className={cm.cn('max-w-[1440px] mx-auto px-6 md:px-12')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.textCenter,
              cm.sp('mb', 12),
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-semibold text-primary',
              )}
            >
              {t(
                'landing.features.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Why {{appName}}' },
              )}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.features.title',
                {},
                { defaultValue: 'Storage that gets out of your way.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-on-surface-variant')}>
              {t(
                'landing.features.body',
                {},
                {
                  defaultValue:
                    'Built for individuals and teams who want their files to feel weightless — fast to find, safe to share, and a joy to organise.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-lg transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    cm.sp('mb', 2),
                    'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary text-2xl',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{f.glyph}</span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.sp('py', 12), 'bg-surface w-full')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            'max-w-[1440px] mx-auto px-6 md:px-12',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 4),
              'uppercase tracking-widest font-semibold text-outline',
            )}
          >
            {t(
              'landing.trustHeadline',
              {},
              { defaultValue: 'Built for teams who measure twice and ship once' },
            )}
          </p>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }), 'md:grid-cols-4 w-full')}>
            {TRUST_METRICS.map((m) => (
              <div
                key={m.valueKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                  cm.sp('p', 4),
                  cm.textCenter,
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-3xl text-primary')}
                  aria-hidden="true"
                >
                  {m.glyph}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tabular-nums',
                  )}
                >
                  {t(m.valueKey, {}, { defaultValue: m.defaultValue })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest font-semibold text-on-surface-variant',
                  )}
                >
                  {t(m.labelKey, {}, { defaultValue: m.defaultLabel })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className={cm.cn(
          cm.sp('py', 16),
          'bg-gradient-to-br from-primary to-tertiary-container text-on-primary',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            cm.textCenter,
            'max-w-[1440px] mx-auto px-6 md:px-12',
          )}
        >
          <h2 className={cm.cn('text-3xl md:text-5xl font-extrabold tracking-tight')}>
            {t('landing.cta.title', {}, { defaultValue: 'Lift the clutter. Keep the work.' })}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-on-primary/85')}>
            {t(
              'landing.cta.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Start with 15 GB free. Upgrade to Pro for 200 GB or invite your team to a shared space — all with the same fluid {{appName}} experience.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'sm:flex-row')}>
            <Link
              to="/signup"
              data-mol-id="landing-cta-bottom"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'rounded-xl bg-on-primary text-primary hover:opacity-90 transition-opacity',
              )}
            >
              {t('landing.cta.primary', {}, { defaultValue: 'Create your archive' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'rounded-xl border-2 border-on-primary text-on-primary hover:bg-on-primary/10 transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
        </div>
      </section>

      <footer className={cm.cn(cm.sp('py', 12), 'bg-surface-container-low w-full')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.textCenter,
            'max-w-[1440px] mx-auto px-6 md:px-12',
          )}
        >
          <NimbusBrandMark size="sm" showIcon />
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}}. Built for the weightless.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
