import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'account_tree',
    titleKey: 'landing.features.editor.title',
    titleDefault: 'Hierarchical pages',
    bodyKey: 'landing.features.editor.body',
    bodyDefault:
      "Organize your thoughts with infinite nesting and flexible folders. Headings, lists, code, callouts — slash-commands when you want them; out of the way when you don't.",
  },
  {
    icon: 'link',
    titleKey: 'landing.features.graph.title',
    titleDefault: 'Bi-directional links',
    bodyKey: 'landing.features.graph.body',
    bodyDefault:
      'Connect ideas naturally. Type [[ to link a note — backlinks are created automatically as you write, and the graph shows how thinking connects.',
  },
  {
    icon: 'search',
    titleKey: 'landing.features.search.title',
    titleDefault: 'Full-text search',
    bodyKey: 'landing.features.search.body',
    bodyDefault:
      'Press ⌘K, type two letters. Sub-50ms results across every notebook, with highlights.',
  },
  {
    icon: 'sell',
    titleKey: 'landing.features.tags.title',
    titleDefault: 'Tags + nested notebooks',
    bodyKey: 'landing.features.tags.body',
    bodyDefault:
      'Group by topic, by project, by season. Tags compose with notebooks — never either / or.',
  },
]

const WORKSPACE_TREE = [
  { icon: 'description', label: 'Quarterly review', active: true },
  { icon: 'folder', label: 'Projects', active: false },
  { icon: 'folder', label: 'Reading list', active: false },
  { icon: 'event_note', label: 'Daily notes', active: false },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const microLabel = cm.cn('uppercase text-[0.7rem] tracking-widest font-bold')

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      {/* Top nav — fixed + blurred on md+; static on phones so the wrapping
          second row never overlays the hero (a 390px fixed header would). */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-x-4 gap-y-2 w-full',
          cm.sp('px', 6),
          cm.sp('py', 5),
          'md:fixed md:top-0 md:z-50 md:bg-surface/70 md:backdrop-blur-xl md:shadow-[var(--shadow-nav)]',
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              'font-headline font-semibold tracking-tighter text-on-surface',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'flex-wrap gap-y-1 md:gap-8',
            microLabel,
            'text-on-surface-variant',
          )}
        >
          <a
            href="#features"
            className={cm.cn(
              'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              'inline-flex min-h-[40px] items-center hover:text-primary transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/home"
              className={cm.cn(
                'inline-flex min-h-[40px] items-center px-6 py-2 rounded-lg text-white shadow-md',
                microLabel,
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'inline-flex min-h-[40px] items-center px-4 py-2 hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex min-h-[40px] items-center px-6 py-2 rounded-lg text-white shadow-md',
                  microLabel,
                  'bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.flex1, 'flex flex-col')}>
        {/* Hero — centered serif statement (design: landing hero) */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            'pt-12 pb-20 md:pt-40 md:pb-20 text-center mx-auto w-full max-w-4xl',
          )}
        >
          <p className={cm.cn(microLabel, 'text-primary mb-6')}>
            {t('landing.hero.eyebrow', {}, { defaultValue: 'For knowledge workers and students' })}
          </p>
          <h1
            className={cm.cn(
              'font-headline text-5xl md:text-7xl tracking-tighter font-semibold text-on-background mb-8 leading-tight',
            )}
          >
            {t('landing.hero.headlineLeading', {}, { defaultValue: 'Where thoughts' })}
            <br />
            <span
              className={cm.cn(
                'bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent',
              )}
            >
              {t('landing.hero.headlineAccent', {}, { defaultValue: 'take shape.' })}
            </span>
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 0),
              'text-xl text-on-surface-variant max-w-2xl mx-auto mb-12',
            )}
          >
            {t(
              'landing.hero.subline',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Capture ideas instantly, connect them seamlessly, and build a structured knowledge base that grows with you.',
              },
            )}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
            <Link
              to="/signup"
              data-mol-id="landing-hero-primary-cta"
              className={cm.cn(
                'px-8 py-3 rounded-lg text-white w-full sm:w-auto',
                microLabel,
                'bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity',
                cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
              )}
            >
              {t('landing.hero.primaryCta', {}, { defaultValue: 'Start your knowledge base' })}
              <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
            </Link>
            <Link
              to="/login"
              data-mol-id="landing-hero-secondary-cta"
              className={cm.cn(
                'px-8 py-3 rounded-lg text-on-surface-variant w-full sm:w-auto',
                microLabel,
                'bg-surface-container-high hover:bg-surface-container-highest transition-colors',
                cm.flex({ align: 'center', justify: 'center' }),
              )}
            >
              {t('landing.hero.secondaryCta', {}, { defaultValue: 'I already have an account' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.sp('mt', 8),
              'flex items-center justify-center gap-4 text-sm text-on-surface-variant',
            )}
          >
            <div className={cm.cn('flex -space-x-2')}>
              <img
                src="https://i.pravatar.cc/64?img=15"
                alt=""
                className={cm.cn('w-8 h-8 rounded-full ring-2 ring-background object-cover')}
              />
              <img
                src="https://i.pravatar.cc/64?img=22"
                alt=""
                className={cm.cn('w-8 h-8 rounded-full ring-2 ring-background object-cover')}
              />
              <img
                src="https://i.pravatar.cc/64?img=33"
                alt=""
                className={cm.cn('w-8 h-8 rounded-full ring-2 ring-background object-cover')}
              />
              <img
                src="https://i.pravatar.cc/64?img=44"
                alt=""
                className={cm.cn('w-8 h-8 rounded-full ring-2 ring-background object-cover')}
              />
            </div>
            <span className={cm.cn('font-semibold')}>
              {t(
                'landing.hero.socialProof',
                { appName: APP_NAME },
                { defaultValue: '12,800+ writers, students, and PhDs think with {{appName}}' },
              )}
            </span>
          </div>

          {/* App-frame mockup — sidebar + editor artifact (design: hero mock) */}
          <div
            data-mol-id="landing-hero-mockup"
            className="mt-20 rounded-xl overflow-hidden shadow-[var(--shadow-frame)] bg-surface-container-lowest max-w-5xl mx-auto border border-outline-variant/15 flex text-left"
          >
            {/* Mock sidebar */}
            <div className="w-64 bg-surface-container-low p-6 hidden md:block shrink-0">
              {/* Micro labels carry the FULL variant token: the old /60 alpha
                  blended to #8a8c92 = 3.05:1 on container-low #f4f4f1 at
                  11.2px (axe serious). #444652 direct is 8.49:1. Same fix on
                  every microLabel below (the footer link flagged as its own
                  node because it inherited the diluted color). */}
              <div className={cm.cn(microLabel, 'text-on-surface-variant mb-4')}>
                {t('landing.mock.workspace', {}, { defaultValue: 'Workspace' })}
              </div>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                {WORKSPACE_TREE.map((item) => (
                  <li
                    key={item.label}
                    className={
                      cm.flex({ align: 'center', gap: 'xs' }) +
                      (item.active ? ' text-primary font-medium' : '')
                    }
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Mock editor */}
            <div className="flex-1 p-8 md:p-12 bg-surface-container-lowest min-w-0">
              <h2 className="font-headline text-3xl font-medium mb-6 text-on-surface">
                {t('landing.mock.title', {}, { defaultValue: 'Quarterly review — Q3' })}
              </h2>
              <div className="text-base text-on-surface-variant space-y-4">
                <p>
                  {t(
                    'landing.mock.p1',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        'Reviewing progress on key initiatives — every page links back to the annual strategy, so context is never more than one click away.',
                    },
                  )}
                </p>
                <h3 className="font-headline text-xl font-medium mt-8 mb-2 text-on-surface">
                  {t('landing.mock.highlights', {}, { defaultValue: 'Key Highlights' })}
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  {SAMPLE_BULLETS.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid — flat bordered cards, plain primary icons */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'mx-auto w-full max-w-7xl')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.titleKey}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col' }),
                  cm.stack(3),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:bg-surface-container-highest transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-primary text-3xl')}>
                  {feature.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), 'font-semibold text-on-surface')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(feature.bodyKey, { appName: APP_NAME }, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA — quiet band, serif statement (design: final CTA) */}
        <section className={cm.sp('px', 6) + ' py-24 bg-surface-container-low text-center'}>
          <h2 className="font-headline text-4xl md:text-5xl font-semibold mb-8 text-on-background">
            {t('landing.cta.heading', {}, { defaultValue: "Open today's page." })}
          </h2>
          <Link
            to="/signup"
            data-mol-id="landing-footer-cta"
            className={cm.cn(
              'inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white',
              microLabel,
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-md',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Create my workspace' })}
            <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
          </Link>
        </section>
      </main>

      {/* Footer — four-column directory (design: footer) */}
      <footer className="w-full bg-surface-container-low py-16 px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
          <div className="col-span-2 md:col-span-1">
            <div className="font-headline text-xl font-medium text-on-surface mb-3">{APP_NAME}</div>
            <p className="text-sm text-on-surface-variant mb-8">{APP_TAGLINE}</p>
            <div className={cm.cn(microLabel, 'text-on-surface-variant')}>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}}' },
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
            </div>
          </div>
          <div>
            <h4 className={cm.cn(microLabel, 'text-on-surface-variant mb-4')}>
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#features"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('nav.features', {}, { defaultValue: 'Features' })}
                </a>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(microLabel, 'text-on-surface-variant mb-4')}>
              {t('landing.footer.resources', {}, { defaultValue: 'Resources' })}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(microLabel, 'text-on-surface-variant mb-4')}>
              {t('landingFooter.account', {}, { defaultValue: 'Account' })}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/login"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('landing.footer.createAccount', {}, { defaultValue: 'Create account' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

const SAMPLE_BULLETS = [
  'Launched the new writing templates.',
  'Linked 40+ notes into the projects hub.',
  'Onboarded five new notebooks without friction.',
]

export default Landing
