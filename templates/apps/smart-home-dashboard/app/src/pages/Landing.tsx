import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'rooms',
    defaultTitle: 'Every room, one glance',
    defaultBody: 'Lights, climate, and ambience grouped by where they actually live in your home.',
    icon: 'home',
    tint: 'text-lm-glow',
  },
  {
    key: 'scenes',
    defaultTitle: 'Scenes that feel like you',
    defaultBody:
      'Set the mood with a tap — Movie Night, Morning, Away — or chain them into routines.',
    icon: 'auto_awesome',
    tint: 'text-primary',
  },
  {
    key: 'automations',
    defaultTitle: 'Automations without the YAML',
    defaultBody:
      'When this happens, do that. A visual builder that handles motion, time, and people.',
    icon: 'bolt',
    tint: 'text-secondary',
  },
  {
    key: 'energy',
    defaultTitle: 'Energy you can read',
    defaultBody: 'Live wattage, daily kWh, and monthly cost — color-coded so the spikes find you.',
    icon: 'eco',
    tint: 'text-success',
  },
] as const

/* Room tiles inside the hero dashboard mockup (design product shot). */
const MOCKUP_TILES = [
  {
    key: 'living',
    icon: 'lightbulb',
    iconCls: 'text-amber-400',
    title: 'landing.mockup.livingRoom',
    titleDefault: 'Living Room',
    sub: 'landing.mockup.livingSub',
    subDefault: '4 Lights On',
    subCls: 'text-slate-400',
    online: true,
  },
  {
    key: 'door',
    icon: 'lock_open',
    iconCls: 'text-slate-400',
    title: 'landing.mockup.frontDoor',
    titleDefault: 'Front Door',
    sub: 'landing.mockup.doorSub',
    subDefault: 'Unlocked',
    subCls: 'text-red-400 font-medium',
    online: false,
  },
  {
    key: 'audio',
    icon: 'music_note',
    iconCls: 'text-cyan-300',
    title: 'landing.mockup.officeAudio',
    titleDefault: 'Office Audio',
    sub: 'landing.mockup.audioSub',
    subDefault: 'Playing',
    subCls: 'text-cyan-300',
    online: true,
  },
  {
    key: 'network',
    icon: 'router',
    iconCls: 'text-slate-500',
    title: 'landing.mockup.network',
    titleDefault: 'Network',
    sub: 'landing.mockup.networkSub',
    subDefault: 'Stable',
    subCls: 'text-slate-500',
    online: false,
  },
]

/* Mini bar chart heights (%) in the mockup climate card. */
const CLIMATE_BARS = [40, 60, 80, 70, 90]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-lm-canvas-from/90 backdrop-blur-md border-b border-lm-card-edge',
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
          <Link
            to="/"
            data-mol-id="nav-brand"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          >
            <BrandWordmark as="span" size="md" />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/overview"
                data-mol-id="nav-dashboard-cta"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-lm-glow text-lm-on-glow rounded-lg landing-glow hover:brightness-110 transition-all',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="nav-signin"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-lm-muted hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-signup-cta"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'bg-lm-glow text-lm-on-glow rounded-lg landing-glow hover:brightness-110 transition-all',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Set up your home' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — split copy / tilted dashboard mockup over a deep wash */}
        <section className={cm.cn('landing-hero-canvas relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'pt-16 pb-24 md:pt-24 md:pb-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
              <div className={cm.cn(cm.maxW('2xl'))}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    cm.fontWeight('bold'),
                    'uppercase tracking-wider text-primary block',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Home automation, evolved' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.sp('mb', 10),
                    'text-lm-muted max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Intelligence in every glow. {{appName}} transforms your space into an ambient, attentive environment that responds to your presence and preferences before you even ask.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-cta"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('bold'),
                      'bg-lm-glow text-lm-on-glow rounded-lg landing-glow hover:brightness-110 transition-all inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Set up your home' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('medium'),
                      'rounded-lg text-lm-muted hover:text-on-surface border border-lm-card-edge hover:border-outline transition-all inline-flex items-center gap-2',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-base'}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_circle
                    </span>
                    {t('landing.heroCtaSecondary', {}, { defaultValue: 'See it in action' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.sp('mt', 12),
                  )}
                >
                  {[
                    { icon: 'shield', key: 'e2e', defaultLabel: 'End-to-end encrypted' },
                    { icon: 'wifi_off', key: 'offline', defaultLabel: 'Works offline' },
                    { icon: 'home_work', key: 'matter', defaultLabel: 'Matter-ready' },
                  ].map((b) => (
                    <div
                      key={b.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-widest text-lm-muted',
                      )}
                    >
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                        {b.icon}
                      </span>
                      {t(`landing.badge.${b.key}`, {}, { defaultValue: b.defaultLabel })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tilted dashboard mockup — browser chrome + climate + room tiles.
                  The screen stays dark in both modes (it's a device shot). */}
              <div className={cm.cn('relative')}>
                <div
                  aria-hidden="true"
                  className={cm.cn('landing-mockup-bloom absolute -inset-4 rounded-2xl blur-2xl')}
                />
                <div
                  className={cm.cn(
                    'landing-mockup-screen relative border border-lm-card-edge rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[420px] sm:min-h-[500px] -rotate-2 hover:rotate-0 transition-transform duration-500',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'px-4 py-3 border-b border-slate-700/50 bg-slate-800/30',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ gap: 'xs' }))} aria-hidden="true">
                      <span className={cm.cn('w-3 h-3 rounded-full bg-slate-600')} />
                      <span className={cm.cn('w-3 h-3 rounded-full bg-slate-600')} />
                      <span className={cm.cn('w-3 h-3 rounded-full bg-slate-600')} />
                    </div>
                    <span className={cm.cn('ml-4 text-xs font-medium text-slate-400')}>
                      {t('landing.mockup.crumb', {}, { defaultValue: 'Dashboard / Overview' })}
                    </span>
                  </div>
                  <div className={cm.cn(cm.sp('p', 6), 'flex-1 grid grid-cols-2 gap-4')}>
                    {/* Climate card */}
                    <div
                      className={cm.cn(
                        'col-span-2 landing-mockup-tile rounded-xl p-5 relative overflow-hidden',
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className={cm.cn(
                          'absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl -mr-10 -mt-10',
                        )}
                      />
                      <div
                        className={cm.cn(
                          cm.flex({ justify: 'between', align: 'start' }),
                          cm.sp('mb', 2),
                        )}
                      >
                        <div className={cm.cn(cm.textSize('sm'), 'font-medium text-slate-400')}>
                          {t('landing.mockup.mainClimate', {}, { defaultValue: 'Main Climate' })}
                        </div>
                        <span
                          className={cm.cn('material-symbols-outlined text-cyan-300')}
                          aria-hidden="true"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          thermostat
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          'text-5xl font-bold tabular-nums text-white',
                          cm.sp('mb', 4),
                        )}
                      >
                        {t('landing.sampleTemp', {}, { defaultValue: '22°C' })}
                      </div>
                      <div className={cm.cn('h-8 flex items-end gap-1')} aria-hidden="true">
                        <div
                          className={cm.cn(
                            cm.w('full'),
                            'h-full bg-slate-700/50 rounded flex items-end overflow-hidden',
                          )}
                        >
                          {CLIMATE_BARS.map((h, i) => (
                            <div
                              key={i}
                              className={cm.cn(
                                cm.w('full'),
                                i === CLIMATE_BARS.length - 1
                                  ? 'bg-cyan-300'
                                  : i >= 2
                                    ? 'bg-cyan-400/80'
                                    : 'bg-cyan-400/40',
                              )}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Room tiles */}
                    {MOCKUP_TILES.map((tile) => (
                      <div
                        key={tile.key}
                        className={cm.cn(
                          'landing-mockup-tile rounded-xl p-4 flex flex-col justify-between h-28 relative',
                        )}
                      >
                        {tile.online && (
                          <span
                            aria-hidden="true"
                            className={cm.cn(
                              'absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse',
                            )}
                          />
                        )}
                        <span
                          className={cm.cn('material-symbols-outlined', tile.iconCls)}
                          aria-hidden="true"
                        >
                          {tile.icon}
                        </span>
                        <div>
                          <div className={cm.cn(cm.textSize('sm'), 'font-medium text-white')}>
                            {t(tile.title, {}, { defaultValue: tile.titleDefault })}
                          </div>
                          <div className={cm.cn(cm.textSize('xs'), tile.subCls)}>
                            {t(tile.sub, {}, { defaultValue: tile.subDefault })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features — the design has no grid section; kept (app content) and
            restyled to the design's card language. */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'A home that hums in the background' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-lm-card border border-lm-card-edge rounded-xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-lm-canvas-from rounded-lg group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    cm.fontWeight('bold'),
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-lm-muted leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band — glowing hairline + amber button on a cyan-tinted wash */}
        <section className={cm.cn('landing-cta-band relative overflow-hidden')}>
          <div aria-hidden="true" className={cm.cn('landing-cta-line absolute top-0 w-full')} />
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'py-24 text-center')}>
            <h2 className={cm.cn('text-4xl sm:text-5xl font-bold tracking-tight', cm.sp('mb', 8))}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Make your home respond to you.' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-lm-muted max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Plug in the hub, scan the QR, and {{appName}} discovers every Matter, Zigbee, and Z-Wave device on your network.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-cta-band-button"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'bg-primary text-on-primary rounded-lg hover:brightness-110 transition-all inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Set up your home' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 12),
          cm.sp('px', 6),
          cm.textSize('sm'),
          'bg-lm-footer border-t border-lm-footer-edge text-lm-muted',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
            'md:flex-row md:justify-between',
          )}
        >
          {/* footer lockup: shared BrandWordmark (footer variant keeps the
              per-page brand-wordmark e2e contract header-scoped) */}
          <div className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
            <BrandWordmark as="span" size="md" footer />
          </div>
          <nav className={cm.cn(cm.flex({ wrap: 'wrap', align: 'center', gap: 'lg' }))}>
            <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
              {t('landing.aboutLink', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/privacy" className={cm.cn('hover:text-primary transition-colors')}>
              {t('landing.privacyLink', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/terms" className={cm.cn('hover:text-primary transition-colors')}>
              {t('landing.termsLink', {}, { defaultValue: 'Terms' })}
            </Link>
          </nav>
          <p className={cm.cn(cm.textSize('xs'))}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Intelligence in every glow.' },
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
