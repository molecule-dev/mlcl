import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { KnowledgeHeroCard } from '../components/KnowledgeHeroCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'edit_note',
    titleKey: 'editor',
    defaultTitle: 'Markdown editor',
    defaultBody:
      'Live-split preview, slash commands, AI summary on demand. Your favourite editor, calmer.',
    tile: 'bg-primary-fixed text-on-primary-fixed',
  },
  {
    icon: 'history',
    titleKey: 'history',
    defaultTitle: 'Inline diff history',
    defaultBody:
      'Every save is a version. Restore any draft from a side-by-side timeline that never loses a paragraph.',
    tile: 'bg-tertiary-fixed text-on-tertiary-fixed',
  },
  {
    icon: 'account_tree',
    titleKey: 'tree',
    defaultTitle: 'Page atlas',
    defaultBody:
      'A persistent left-rail tree per space — drag to reorder, search to leap, breadcrumbs to ground.',
    tile: 'bg-secondary-fixed text-on-secondary-fixed',
  },
] as const

/* The design's grayscale logo strip (material icons standing in for partner
   marks). */
const TRUST_ICONS = [
  'cruelty_free',
  'eco',
  'architecture',
  'dashboard',
  'extension',
  'hive',
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-surface-container-lowest')}
    >
      {/* Top navigation */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          'h-20 bg-surface/80 backdrop-blur-lg sticky top-0 z-20',
        )}
      >
        <Link
          to="/"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex items-center gap-2')}
        >
          <BrandWordmark size="lg" />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex items-center gap-4')}>
          {isAuthenticated ? (
            <Link
              to="/home"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                'h-10 inline-flex items-center rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-medium shadow-sm hover:opacity-90 transition-opacity',
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
                  'hidden sm:inline text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  'h-10 inline-flex items-center rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-medium shadow-sm hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start your wiki' })}
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className={cm.flex({ direction: 'col' })}>
        {/* Hero */}
        <section
          className={cm.cn(
            cm.sp('px', 8),
            'pt-24 pb-20 md:pt-32 md:pb-24 flex flex-col items-center text-center',
          )}
        >
          {/* Cairn indicator — three stacked stones */}
          <div className="flex flex-col gap-1 mb-8" aria-hidden="true">
            <span className="w-1.5 h-1.5 bg-tertiary rounded-full mx-auto opacity-40" />
            <span className="w-2 h-1.5 bg-tertiary rounded-full mx-auto opacity-70" />
            <span className="w-3 h-1.5 bg-tertiary rounded-full mx-auto" />
          </div>
          <h1
            className={cm.cn(
              cm.sp('mb', 6),
              'text-5xl md:text-7xl font-bold tracking-tight text-on-surface max-w-4xl leading-tight',
            )}
          >
            {t('landing.headlineA', {}, { defaultValue: 'Stack ' })}
            <span className="font-serif italic text-primary-container">
              {t('landing.headlineAccent', {}, { defaultValue: 'knowledge' })}
            </span>
            {t('landing.headlineB', {}, { defaultValue: ', mark the path.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.maxW('2xl'),
              cm.mxAuto,
              cm.sp('mb', 10),
              'md:text-xl text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'landing.subtitle',
              { tagline: APP_TAGLINE },
              {
                defaultValue:
                  'A calm, editorial wiki for teams that read deeply. Versioned pages, AI-summarised long reads, and a page tree that finally feels like furniture, not paperwork.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', gap: 'md' }),
              'flex flex-col sm:flex-row gap-4 mb-20',
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                'h-14 rounded-lg bg-gradient-to-r from-primary to-primary-container text-on-primary text-base font-medium shadow-sm hover:opacity-90 transition-opacity',
              )}
            >
              {t('landing.ctaPrimary', {}, { defaultValue: 'Start your wiki' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('px', 8),
                cm.flex({ align: 'center', justify: 'center' }),
                'h-14 inline-flex items-center rounded-lg bg-surface-container-high text-on-surface text-base font-medium hover:bg-surface-dim transition-colors',
              )}
            >
              {t('landing.ctaSecondary', {}, { defaultValue: 'Tour a sample wiki' })}
            </Link>
          </div>

          {/* Trust strip — on-surface-variant (#464555, 9.4:1 on white) not
              text-outline (#777587, 4.48:1 — axe color-contrast fail at 4.5:1) */}
          <p className="text-sm font-medium text-on-surface-variant mb-6 tracking-wide uppercase">
            {t(
              'landing.socialProof.eyebrow',
              {},
              { defaultValue: 'Trusted by forward-thinking teams' },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'center', gap: 'lg' }),
              'flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            {TRUST_ICONS.map((icon) => (
              <span key={icon} className="material-symbols-outlined text-4xl">
                {icon}
              </span>
            ))}
          </div>

          {/* Sample card mirrors the auth'd hero */}
          <div className={cm.cn(cm.sp('mt', 16), 'mx-auto max-w-4xl w-full')}>
            <KnowledgeHeroCard
              workspaceName="Lighthouse Engineering"
              pageCount={1284}
              contributorCount={42}
              weeklyEdits={[12, 18, 14, 22, 19, 26, 24]}
              lastEditedLabel={t(
                'landing.heroLastEdited',
                {},
                { defaultValue: 'Updated 2 minutes ago by Alex Lin' },
              )}
            />
          </div>
        </section>

        {/* Feature triad */}
        <section className={cm.cn(cm.sp('px', 8), 'py-24 bg-surface-container-low')}>
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <div className={cm.cn(cm.sp('mb', 12), 'text-center')}>
              <h2 className={cm.cn(cm.textSize('4xl'), 'font-bold tracking-tight text-on-surface')}>
                {t(
                  'landing.featuresHeadline',
                  {},
                  { defaultValue: 'Three pillars, calmly stacked.' },
                )}
              </h2>
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('lg'), 'text-on-surface-variant')}>
                {t(
                  'landing.featuresSubtitle',
                  {},
                  { defaultValue: 'Editor, archive, atlas — all in one quiet shell.' },
                )}
              </p>
            </div>
            <div className={cm.cn('grid gap-8 md:grid-cols-3 gap-6')}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'group relative rounded-lg bg-surface-container-lowest hover:bg-surface-bright transition-colors',
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-lg border border-outline-variant opacity-15 group-hover:opacity-30 transition-opacity"
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 6),
                      'w-12 h-12 rounded-full',
                      f.tile,
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined')}>{f.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      'font-semibold text-on-surface tracking-tight',
                    )}
                  >
                    {t(
                      `landing.features.${f.titleKey}.title`,
                      {},
                      { defaultValue: f.defaultTitle },
                    )}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 3),
                      cm.textSize('base'),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(`landing.features.${f.titleKey}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/40 bg-surface-container-lowest">
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 8), 'py-16')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div>
              <h4
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface mb-4 tracking-wide',
                )}
              >
                {t('landing.footer.product', {}, { defaultValue: 'Product' })}
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/pricing"
                    data-mol-id="landing-footer-pricing"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.pricing', {}, { defaultValue: 'Pricing' })}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    data-mol-id="landing-footer-signup"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('common.startFree', {}, { defaultValue: 'Start free' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface mb-4 tracking-wide',
                )}
              >
                {t('landing.footer.company', {}, { defaultValue: 'Company' })}
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/about"
                    data-mol-id="landing-footer-about"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.about', {}, { defaultValue: 'About' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-surface mb-4 tracking-wide',
                )}
              >
                {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/privacy"
                    data-mol-id="landing-footer-privacy"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    data-mol-id="landing-footer-terms"
                    className="text-on-surface-variant hover:text-primary transition-colors"
                  >
                    {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="flex flex-col justify-end">
              {isAuthenticated ? (
                <Link
                  to="/home"
                  data-mol-id="landing-footer-dashboard"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-outline-variant/40 gap-4">
            <Link
              to="/"
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex items-center gap-2')}
            >
              {/* footer lockup: shared BrandWordmark (footer variant keeps the
                  per-page brand-wordmark e2e contract header-scoped) */}
              <BrandWordmark as="span" size="md" footer />
            </Link>
            <p className="text-sm text-on-surface-variant">
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), name: APP_NAME },
                { defaultValue: '© {{year}} {{name}}' },
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
        </div>
      </footer>
    </div>
  )
}
