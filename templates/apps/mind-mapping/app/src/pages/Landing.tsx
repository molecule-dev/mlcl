import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DendriteHeroCard } from '../components/DendriteHeroCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/**
 * Public marketing home — TopNavBar + editorial hero + feature triad +
 * sample-of-auth'd-hero card so anonymous visitors can see what Dendrite
 * looks like inside.
 *
 * Catalog §14.1 (Landing TopNavBar) + §14.2 (Feature Triad) +
 * §1.2 (Marketing Editorial Hero), translated to Dendrite's voice
 * (imaginative / organic / spacious).
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
    },
  ]

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          "sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 font-['Inter']",
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_tree
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
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
                cm.fontWeight('bold'),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
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
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
                )}
              >
                {t('landing.nav.start', {}, { defaultValue: 'Start branching' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.stack(8), 'max-w-6xl w-full mx-auto')}
      >
        <div className={cm.cn(cm.stack(6), 'max-w-3xl')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'self-start bg-primary-fixed text-on-primary-fixed text-[10px] uppercase tracking-widest rounded-full',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              auto_awesome
            </span>
            {t(
              'landing.hero.eyebrow',
              {},
              { defaultValue: 'Mind mapping for designers and thinkers' },
            )}
          </span>
          <h1
            className={cm.cn(
              'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-on-surface',
            )}
          >
            {t('landing.hero.title', {}, { defaultValue: 'Where ideas branch out.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              'text-on-surface-variant max-w-2xl leading-relaxed',
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
          <div className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }))}>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
              )}
            >
              {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start branching free' })}
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                arrow_forward
              </span>
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap')}>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('text-success material-symbols-outlined')}>check_circle</span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t('landing.proof.free', {}, { defaultValue: 'Free for 5 maps' })}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('text-success material-symbols-outlined')}>check_circle</span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t('landing.proof.realtime', {}, { defaultValue: 'Real-time collaboration' })}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('text-success material-symbols-outlined')}>check_circle</span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t('landing.proof.export', {}, { defaultValue: 'Export to PNG, SVG, or Markdown' })}
              </span>
            </div>
          </div>
        </div>

        <DendriteHeroCard totalMaps={42} weeklyDelta={6} callToActionHref="/signup" />
      </section>

      <section
        id="features"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.stack(10), 'max-w-6xl w-full mx-auto')}
      >
        <div className={cm.stack(3)}>
          <span className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-primary')}>
            {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for thinkers' })}
          </span>
          <h2
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
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
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'md:grid-cols-2 lg:grid-cols-4')}>
          {features.map((f) => (
            <article
              key={f.icon}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border-l-4 border-primary shadow-sm hover:-translate-y-0.5 transition-transform duration-300',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(11),
                  cm.h(11),
                  cm.textSize('xl'),
                  'rounded-xl material-symbols-outlined bg-primary-fixed text-primary',
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {f.icon}
              </span>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {f.title}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {f.body}
              </p>
            </article>
          ))}
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
            className={cm.cn(
              'relative',
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-on-primary text-primary shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform',
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
              { defaultValue: '© {{year}} {{appName}}. Built with Molecule.dev.' },
            )}
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
