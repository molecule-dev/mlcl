import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES: Array<{
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  accent: string
}> = [
  {
    icon: 'co_present',
    titleKey: 'landing.features.stage.title',
    titleDefault: 'Built for the stage',
    bodyKey: 'landing.features.stage.body',
    bodyDefault:
      'Deep-navy slide canvas, presenter timer, dual-screen rehearsal mode — every detail tuned for live audiences.',
    accent: '#7c3aed',
  },
  {
    icon: 'group',
    titleKey: 'landing.features.collab.title',
    titleDefault: 'Live collaboration',
    bodyKey: 'landing.features.collab.body',
    bodyDefault:
      'Cursor presence, inline comments, and version history so your team can pitch in without stepping on each other.',
    accent: '#ec4899',
  },
  {
    icon: 'auto_awesome_mosaic',
    titleKey: 'landing.features.themes.title',
    titleDefault: 'Themed in seconds',
    bodyKey: 'landing.features.themes.body',
    bodyDefault:
      'Pick a starting theme, drop in your brand kit — every slide auto-restyles with type, color, and motion presets.',
    accent: '#06b6d4',
  },
  {
    icon: 'animation',
    titleKey: 'landing.features.motion.title',
    titleDefault: 'Cinematic motion',
    bodyKey: 'landing.features.motion.body',
    bodyDefault:
      'Keyframe timeline + curated easing curves let you choreograph reveals without leaving the deck.',
    accent: '#f59e0b',
  },
]

const PROOF_NUMBERS = [
  { value: '5,400+', labelKey: 'landing.proof.teams', labelDefault: 'Teams shipping decks' },
  { value: '1.2M', labelKey: 'landing.proof.slides', labelDefault: 'Slides presented this year' },
  { value: '99.99%', labelKey: 'landing.proof.uptime', labelDefault: 'Stage-ready uptime' },
]

const SAMPLE_NAV: Array<{ icon: string; key: string; defaultLabel: string; active?: boolean }> = [
  { icon: 'co_present', key: 'decks', defaultLabel: 'Decks', active: true },
  { icon: 'auto_awesome_mosaic', key: 'templates', defaultLabel: 'Templates' },
  { icon: 'monitoring', key: 'analytics', defaultLabel: 'Analytics' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      {/* TopNavBar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              co_present
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
          <Link
            to="/templates"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/decks"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'text-on-surface hover:bg-surface-container/50 rounded-lg transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'relative overflow-hidden')}>
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -top-24 -right-24 bg-primary/15 blur-3xl pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.w(60),
            cm.h(60),
            cm.roundedFull,
            'absolute top-40 -left-24 bg-secondary/15 blur-3xl pointer-events-none',
          )}
        ></div>
        <div className={cm.cn(cm.maxW('2xl'), 'mx-auto relative z-10')}>
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }), 'items-center')}>
            <div className={cm.cn(cm.stack(6), 'lg:col-span-7')}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'w-fit text-[10px] uppercase tracking-widest bg-primary/10 text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>auto_awesome</span>
                {APP_TAGLINE}
              </span>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-on-surface',
                )}
              >
                {t('landing.hero.heading', {}, { defaultValue: 'Decks that command the room.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant leading-relaxed max-w-xl',
                )}
              >
                {t(
                  'landing.hero.body',
                  {},
                  {
                    defaultValue:
                      'Pitch decks, keynotes, investor updates — built fast, presented confidently. Themes, animations, presenter tools, and live collaboration in one stage-ready studio.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] transition-transform',
                  )}
                >
                  {t('landing.hero.cta', {}, { defaultValue: 'Build your first deck' })}
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/templates"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'border border-outline-variant/40 text-on-surface rounded-xl hover:bg-surface-container/50 transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                    auto_awesome_mosaic
                  </span>
                  {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
                </Link>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap pt-4')}>
                {PROOF_NUMBERS.map((p) => (
                  <div key={p.labelKey} className={cm.stack(1)}>
                    <span
                      className={cm.cn(
                        'text-3xl font-extrabold tracking-tighter text-on-surface tabular-nums',
                      )}
                    >
                      {p.value}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(p.labelKey, {}, { defaultValue: p.labelDefault })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample dashboard card mirroring the auth'd hero */}
            <div className={cm.cn('lg:col-span-5', cm.flex({ direction: 'col' }))}>
              <div
                className={cm.cn(
                  'relative bg-gradient-to-br from-primary via-primary-hover to-secondary rounded-[2rem] text-white overflow-hidden shadow-2xl shadow-primary/30',
                  cm.sp('p', 8),
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(60),
                    cm.h(60),
                    cm.roundedFull,
                    'absolute -right-16 -bottom-20 bg-surface/10 blur-3xl',
                  )}
                ></div>
                <div className={cm.cn('relative z-10', cm.stack(4))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-white/70',
                      )}
                    >
                      {t('landing.sample.eyebrow', {}, { defaultValue: 'Q4 Pitch · v3' })}
                    </span>
                    <span className={cm.cn('h-px w-8 bg-surface/30')}></span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xs'),
                        'text-white/70',
                      )}
                    >
                      {t('landing.sample.updated', {}, { defaultValue: 'Edited 12 min ago' })}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      'text-3xl md:text-4xl font-extrabold tracking-tighter leading-[0.95]',
                    )}
                  >
                    {t('landing.sample.title', {}, { defaultValue: 'Lumen Capital, Series B' })}
                  </h3>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-surface/20 backdrop-blur-md',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                        group
                      </span>
                      {t('landing.sample.collab', {}, { defaultValue: '4 editing now' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'bg-surface/15 backdrop-blur-md text-white/90',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                        filter_none
                      </span>
                      {t('landing.sample.slides', {}, { defaultValue: '14 slides' })}
                    </span>
                  </div>
                </div>
                <div className={cm.cn('relative z-10', cm.sp('mt', 6))}>
                  <svg viewBox="0 0 360 180" className={cm.cn(cm.w('full'))}>
                    <rect
                      x="0"
                      y="0"
                      width="240"
                      height="180"
                      rx="10"
                      style={{ fill: 'var(--color-slide-canvas)' }}
                      stroke="rgba(255,255,255,0.2)"
                    />
                    <rect
                      x="20"
                      y="36"
                      width="160"
                      height="14"
                      rx="4"
                      style={{ fill: 'var(--mol-color-primary-light)' }}
                    />
                    <rect
                      x="20"
                      y="58"
                      width="120"
                      height="6"
                      rx="2"
                      fill="#ffffff"
                      fillOpacity="0.55"
                    />
                    <path
                      d="M20 130 L60 110 L100 122 L140 90 L180 100 L220 70"
                      stroke="var(--mol-color-secondary)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle cx="220" cy="70" r="4" style={{ fill: 'var(--mol-color-secondary)' }} />
                    <rect x="252" y="0" width="108" height="40" rx="6" fill="#ffffff" />
                    <rect
                      x="262"
                      y="14"
                      width="48"
                      height="5"
                      rx="2"
                      style={{ fill: 'var(--mol-color-primary)' }}
                    />
                    <rect
                      x="262"
                      y="22"
                      width="32"
                      height="3"
                      rx="1"
                      style={{ fill: 'var(--color-slide-canvas-deep)' }}
                      fillOpacity="0.4"
                    />
                    <rect
                      x="252"
                      y="48"
                      width="108"
                      height="40"
                      rx="6"
                      style={{ fill: 'var(--mol-color-primary-light)' }}
                    />
                    <rect x="262" y="62" width="48" height="5" rx="2" fill="#ffffff" />
                    <rect
                      x="252"
                      y="96"
                      width="108"
                      height="40"
                      rx="6"
                      fill="rgba(255,255,255,0.6)"
                    />
                    <rect
                      x="252"
                      y="144"
                      width="108"
                      height="36"
                      rx="11"
                      style={{ fill: 'var(--mol-color-success)' }}
                    />
                    <text
                      x="306"
                      y="166"
                      fill="#fff"
                      fontFamily="Inter"
                      fontSize="13"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      12:34
                    </text>
                  </svg>
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('mt', 4),
                  cm.sp('p', 4),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
                )}
              >
                {SAMPLE_NAV.map((n) => (
                  <span
                    key={n.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.flex1,
                      n.active
                        ? 'bg-primary/15 text-primary rounded-lg'
                        : 'text-on-surface-variant',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[16px]')}>{n.icon}</span>
                    {t(`landing.sampleNav.${n.key}`, {}, { defaultValue: n.defaultLabel })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Quad */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'bg-surface-container-low')}>
        <div className={cm.cn(cm.maxW('2xl'), 'mx-auto')}>
          <div className={cm.cn(cm.stack(2), cm.sp('mb', 12))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.features.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Why {{appName}}' },
              )}
            </span>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tighter')}>
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Everything you need to walk on stage ready.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  cm.sp('p', 6),
                  cm.stack(3),
                  'col-span-12 md:col-span-6 lg:col-span-3 bg-surface-container-lowest rounded-xl shadow-sm border-l-4 hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
                style={{ borderLeftColor: f.accent }}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.roundedFull,
                    'text-white shadow-md',
                  )}
                  style={{ backgroundColor: f.accent }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[22px]')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 20))}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.maxW('xl'),
            cm.sp('p', 12),
            cm.stack(5),
            'mx-auto bg-gradient-to-br from-primary via-primary-hover to-secondary rounded-[2rem] text-white relative overflow-hidden text-center',
          )}
        >
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -top-24 -right-24 bg-surface/10 blur-3xl',
            )}
          ></div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-white/80',
            )}
          >
            {t('landing.finalCta.eyebrow', {}, { defaultValue: 'Free to start' })}
          </span>
          <h2
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tighter leading-[0.95]')}
          >
            {t(
              'landing.finalCta.heading',
              {},
              { defaultValue: 'Step on stage with the best deck of your career.' },
            )}
          </h2>
          <p
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), 'text-white/90 max-w-xl')}
          >
            {t(
              'landing.finalCta.body',
              {},
              {
                defaultValue:
                  'Spin up your studio in under a minute. No credit card. Cancel any time.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-surface text-primary rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform',
            )}
          >
            {t('landing.finalCta.cta', {}, { defaultValue: 'Create your free studio' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 8),
          'border-t border-outline-variant/30 flex-wrap gap-4',
        )}
      >
        <span
          className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface-variant')}
        >
          © {new Date().getFullYear()} {APP_NAME}.{' '}
          {t('landing.footer.rights', {}, { defaultValue: 'All rights reserved.' })}
        </span>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/login"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/templates"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
