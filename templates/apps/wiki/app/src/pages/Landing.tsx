import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { KnowledgeHeroCard } from '../components/KnowledgeHeroCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-surface-container-lowest')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          'h-16 border-b border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur sticky top-0 z-20',
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>layers</span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/home"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                'h-10 inline-flex items-center rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-colors',
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
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  'h-10 inline-flex items-center rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-colors',
                )}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className={cm.flex({ direction: 'col' })}>
        {/* Hero */}
        <section
          className={cm.cn(cm.sp('px', 8), 'py-24 md:py-32 border-b border-outline-variant/20')}
        >
          <div className={cm.cn('mx-auto max-w-5xl text-center')}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.sp('mb', 6),
                'inline-block rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Knowledge base · For deep teams' })}
            </span>
            <h1
              className={cm.cn(
                cm.sp('mb', 6),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold text-on-surface',
              )}
            >
              {t('landing.headline', {}, { defaultValue: 'Stack knowledge.\nMark the path.' })
                .split('\n')
                .map((line, i, arr) => (
                  <span
                    key={i}
                    className={cm.cn(i === arr.length - 1 ? 'text-primary' : '', 'block')}
                  >
                    {line}
                  </span>
                ))}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('2xl'),
                cm.mxAuto,
                cm.sp('mb', 10),
                'text-on-surface-variant leading-relaxed',
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
            <div className={cm.flex({ justify: 'center', gap: 'sm' })}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'h-12 rounded-full bg-primary text-on-primary text-base font-semibold hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start a workspace' })}
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  'h-12 inline-flex items-center rounded-full border border-outline-variant text-base font-semibold text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('landing.ctaSecondary', {}, { defaultValue: 'Tour a sample wiki' })}
              </Link>
            </div>
          </div>

          {/* Sample card mirrors the auth'd hero */}
          <div className={cm.cn(cm.sp('mt', 16), 'mx-auto max-w-4xl')}>
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
        <section className={cm.cn(cm.sp('px', 8), 'py-24 border-b border-outline-variant/20')}>
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <div className={cm.cn(cm.sp('mb', 12), 'text-center')}>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
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
            <div className={cm.cn('grid gap-6 md:grid-cols-3')}>
              {[
                {
                  icon: 'edit_note',
                  titleKey: 'editor',
                  defaultTitle: 'Markdown editor',
                  defaultBody:
                    'Live-split preview, slash commands, AI summary on demand. Your favourite editor, calmer.',
                },
                {
                  icon: 'history',
                  titleKey: 'history',
                  defaultTitle: 'Inline diff history',
                  defaultBody:
                    'Every save is a version. Restore any draft from a side-by-side timeline that never loses a paragraph.',
                },
                {
                  icon: 'account_tree',
                  titleKey: 'tree',
                  defaultTitle: 'Page atlas',
                  defaultBody:
                    'A persistent left-rail tree per space — drag to reorder, search to leap, breadcrumbs to ground.',
                },
              ].map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl bg-surface-container-lowest border-l-4 border-primary shadow-sm hover:-translate-y-0.5 transition-transform',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'h-10 w-10 rounded-lg bg-primary/10 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[22px]')}>{f.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold text-on-surface tracking-tight',
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
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
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

        {/* Social proof */}
        <section className={cm.cn(cm.sp('px', 8), 'py-20 bg-surface-container-low/30')}>
          <div className={cm.cn('mx-auto max-w-4xl text-center')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'mb-6 font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'landing.socialProof.eyebrow',
                {},
                { defaultValue: 'Used by deep-thinking teams' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ justify: 'center', align: 'center', gap: 'md' }),
                'flex-wrap text-on-surface-variant',
              )}
            >
              {['Lighthouse', 'North Star Labs', 'Atlas Research', 'Cooper & Hale', 'Ironclad'].map(
                (name) => (
                  <span
                    key={name}
                    className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 8),
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          'border-t border-outline-variant/40 text-sm text-on-surface-variant',
        )}
      >
        <span>
          {t('landing.footer.copyright', { name: APP_NAME }, { defaultValue: '© {{name}}' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {isAuthenticated ? (
            <Link
              to="/home"
              data-mol-id="landing-footer-dashboard"
              className={cm.cn('hover:text-on-surface transition-colors')}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link to="/login" className={cm.cn('hover:text-on-surface transition-colors')}>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link to="/signup" className={cm.cn('hover:text-on-surface transition-colors')}>
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
