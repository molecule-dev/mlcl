import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/**
 * Public marketing home — Stitch landing design: dot-grid canvas, badge pill
 * with pulsing dot, two-tone headline with an underline swoosh, primary pill
 * CTAs, avatar-stack social proof, a mind-map blueprint visual (connected
 * nodes) and a four-up feature strip with tinted icon tiles.
 *
 * Catalog §14.1 (Landing TopNavBar) + §14.2 (Feature Triad) +
 * §1.2 (Marketing Editorial Hero), translated to Lattice's voice.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const features = [
    {
      icon: 'pan_tool',
      title: t('landing.feature.canvas.title', {}, { defaultValue: 'Infinite canvas' }),
      body: t(
        'landing.feature.canvas.body',
        {},
        {
          defaultValue:
            'Pan, zoom and let the map grow without bumping into edges. Your thinking deserves room to breathe.',
        },
      ),
      tile: 'bg-primary-light text-primary',
    },
    {
      icon: 'account_tree',
      title: t('landing.feature.branch.title', {}, { defaultValue: 'Organic branching' }),
      body: t(
        'landing.feature.branch.body',
        {},
        {
          defaultValue:
            'Drag a node from any other node — connections flow as smooth curves, no rigid grid required.',
        },
      ),
      tile: 'bg-[color-mix(in_oklab,var(--color-node-purple)_18%,white)] text-[var(--color-node-purple)]',
    },
    {
      icon: 'group',
      title: t('landing.feature.collab.title', {}, { defaultValue: 'Collaborative cursors' }),
      body: t(
        'landing.feature.collab.body',
        {},
        {
          defaultValue:
            'See teammates branch alongside you in real time. Brainstorm together, not in series.',
        },
      ),
      tile: 'bg-success-light text-success',
    },
    {
      icon: 'keyboard',
      title: t('landing.feature.shortcuts.title', {}, { defaultValue: 'Keyboard-first' }),
      body: t(
        'landing.feature.shortcuts.body',
        {},
        {
          defaultValue:
            'Tab to add a child, Enter for a sibling, ⌘K to jump anywhere. Power users stay in flow.',
        },
      ),
      tile: 'bg-warning-light text-warning',
    },
  ]

  const heroTitle = t('landing.hero.title', {}, { defaultValue: 'Where ideas branch out.' })
  const titleMatch = heroTitle.match(/^(.*?)(\S+ \S+\.?)$/)
  const titleHead = titleMatch ? titleMatch[1] : ''
  const titleTail = titleMatch ? titleMatch[2] : heroTitle

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background bg-dot-grid text-on-surface antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-outline-variant/30',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-primary',
          )}
        >
          {APP_NAME}
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary border-b-2 border-primary pb-1',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/templates"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'hidden md:inline-block text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="landing-nav-start"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all',
                )}
              >
                {t('landing.nav.start', {}, { defaultValue: 'Start branching' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <section className={cm.cn(cm.sp('px', 8), 'pt-16 pb-24 max-w-7xl w-full mx-auto')}>
        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-16 items-center')}>
          {/* Left — badge, two-tone headline with swoosh, CTAs, proof. */}
          <div className={cm.cn(cm.stack(5), 'relative z-10')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'self-start inline-flex items-center bg-surface/60 backdrop-blur-sm border border-outline-variant/50 rounded-full text-on-surface-variant',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('w-2 h-2 rounded-full bg-success animate-pulse')}
              />
              {t(
                'landing.hero.eyebrow',
                {},
                { defaultValue: 'Mind mapping for designers and thinkers' },
              )}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-on-surface',
              )}
            >
              {titleHead}
              <span className={cm.cn('text-primary relative inline-block')}>
                {titleTail}
                <svg
                  aria-hidden="true"
                  className={cm.cn('absolute -bottom-2 left-0 w-full')}
                  fill="none"
                  viewBox="0 0 200 12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 10C50 2 150 2 198 10"
                    stroke="var(--color-success)"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'landing.hero.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is a spacious infinite canvas for brainstorming, concept diagrams, and SWOTs. Drag, connect, and let the map grow with you — no rigid grids, no boxed-in templates.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                'sm:flex-row sm:items-center',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  'rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all',
                )}
              >
                {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start branching free' })}
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/templates"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-full bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low active:scale-95 transition-all',
                )}
              >
                {t('landing.hero.ctaTemplates', {}, { defaultValue: 'See templates' })}
              </Link>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-3')}>
                {[
                  { initials: 'AK', cls: 'bg-primary-light text-primary' },
                  { initials: 'JT', cls: 'bg-success-light text-success' },
                  { initials: 'MS', cls: 'bg-warning-light text-warning' },
                ].map((a) => (
                  <div
                    key={a.initials}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'w-10 h-10 rounded-full ring-2 ring-background',
                      a.cls,
                    )}
                  >
                    {a.initials}
                  </div>
                ))}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'w-10 h-10 rounded-full ring-2 ring-background bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  +40k
                </div>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {t('landing.proof.thinkers', {}, { defaultValue: 'Trusted by 40k+ thinkers' })}
              </p>
            </div>
          </div>

          {/* Right — mind-map blueprint (Stitch). Static decorative graphic. */}
          <div aria-hidden="true" className={cm.cn('relative h-[500px] w-full hidden lg:block')}>
            {/* Connectors */}
            <svg
              className={cm.cn('absolute inset-0 w-full h-full z-10')}
              style={{ pointerEvents: 'none' }}
            >
              <path
                d="M250,250 C150,250 150,100 100,100"
                fill="none"
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                strokeWidth="2"
              />
              <path
                d="M250,250 C350,250 350,80 400,80"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="2"
              />
              <path
                d="M250,250 C350,250 350,400 420,400"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="2"
              />
            </svg>
            {/* Central node */}
            <div
              className={cm.cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20')}
            >
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface shadow-xl rounded-lg w-48 text-center border-l-4',
                )}
                style={{ borderLeftColor: 'var(--color-node-purple)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined mb-2 inline-block')}
                  style={{ color: 'var(--color-node-purple)', fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </span>
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>
                  {t('landing.blueprint.center', {}, { defaultValue: 'New Product Launch' })}
                </h3>
              </div>
            </div>
            {/* Research node */}
            <div className={cm.cn('absolute top-[80px] left-[50px] z-20')}>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'bg-surface shadow-md rounded-lg w-32 border-l-4',
                )}
                style={{ borderLeftColor: 'var(--color-node-orange)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: 'var(--color-node-orange)' }}
                >
                  search
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('landing.blueprint.research', {}, { defaultValue: 'Research' })}
                </span>
              </div>
            </div>
            {/* Design node */}
            <div className={cm.cn('absolute top-[60px] right-[50px] z-20')}>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'bg-surface shadow-md rounded-lg w-32 border-l-4',
                )}
                style={{ borderLeftColor: 'var(--color-node-cyan)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: 'var(--color-node-cyan)' }}
                >
                  palette
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('landing.blueprint.design', {}, { defaultValue: 'Design' })}
                </span>
              </div>
            </div>
            {/* Marketing node */}
            <div className={cm.cn('absolute bottom-[80px] right-[40px] z-20')}>
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'bg-surface shadow-md rounded-lg w-32 border-l-4',
                )}
                style={{ borderLeftColor: 'var(--color-node-green)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-sm')}
                  style={{ color: 'var(--color-node-green)' }}
                >
                  campaign
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('landing.blueprint.marketing', {}, { defaultValue: 'Marketing' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className={cm.cn(
          'bg-surface border-y border-outline-variant/30',
          cm.sp('py', 16),
          cm.sp('px', 8),
        )}
      >
        <div className={cm.cn('max-w-7xl w-full mx-auto', cm.stack(8))}>
          <div className={cm.stack(3)}>
            <span className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-primary')}>
              {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for thinkers' })}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.featuresTitle',
                {},
                { defaultValue: 'Every interaction earns its place on the canvas' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'Toolbars, panels, and shortcuts feel ambient — present when you need them, invisible when you don’t.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8')}>
            {features.map((f) => (
              <article
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(3),
                  'bg-surface-container-low rounded-2xl border border-outline-variant/40 hover:shadow-lg transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-12 h-12 rounded-xl',
                    f.tile,
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), 'font-bold tracking-tight text-on-surface')}
                >
                  {f.title}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'max-w-6xl w-full mx-auto')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.stack(4),
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-xl relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
            )}
            aria-hidden
          />
          <div
            className={cm.cn(
              'absolute -left-16 -top-16 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden
          />
          <h2 className={cm.cn('relative text-3xl md:text-4xl font-extrabold tracking-tighter')}>
            {t('landing.cta.title', {}, { defaultValue: 'Plant your first idea today.' })}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), 'relative text-on-primary/85 max-w-xl')}>
            {t(
              'landing.cta.body',
              {},
              {
                defaultValue:
                  'Free forever for solo thinkers. Upgrade only when your team starts branching alongside you.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="landing-cta-signup"
            className={cm.cn(
              'relative self-center inline-flex items-center',
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-full bg-on-primary text-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Create your first map' })}
          </Link>
        </div>
      </section>

      <footer
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'border-t border-outline-variant/30')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'max-w-6xl mx-auto flex-wrap',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'landing.footer.copyright',
              { appName: APP_NAME, year: new Date().getFullYear() },
              { defaultValue: '© {{year}} {{appName}}.' },
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
          </span>
          <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex-wrap')}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link
              to="/privacy"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
