import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { CollaboratorStack } from '../components/CollaboratorStack.js'
import { ProjectHeroCard } from '../components/ProjectHeroCard.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'pinch',
    titleKey: 'landing.features.canvas.title',
    titleDefault: 'Infinite vector canvas',
    bodyKey: 'landing.features.canvas.body',
    bodyDefault:
      'Pan, zoom, and pour pixels across an unbounded surface. Frames, components, and prototypes never need a margin.',
  },
  {
    icon: 'group',
    titleKey: 'landing.features.cursors.title',
    titleDefault: 'Live multiplayer cursors',
    bodyKey: 'landing.features.cursors.body',
    bodyDefault:
      'Watch your team think in real time. Five cursor colors keep every collaborator visible at a glance.',
  },
  {
    icon: 'palette',
    titleKey: 'landing.features.library.title',
    titleDefault: 'Shared design system',
    bodyKey: 'landing.features.library.body',
    bodyDefault:
      'Color tokens, components, and text styles sync across every file in your workspace — change once, ripple everywhere.',
  },
  {
    icon: 'history',
    titleKey: 'landing.features.history.title',
    titleDefault: 'Version history & branching',
    bodyKey: 'landing.features.history.body',
    bodyDefault:
      'Snapshots every minute. Branch a draft for a stakeholder review and merge when it’s approved.',
  },
]

const SOCIAL_PROOF = [
  { name: 'Northwind Studio', initials: 'NS', color: 'var(--color-collaborator-1)' },
  { name: 'Brightline', initials: 'BL', color: 'var(--color-collaborator-2)' },
  { name: 'Atlas Lab', initials: 'AL', color: 'var(--color-collaborator-3)' },
  { name: 'Maven Co.', initials: 'MC', color: 'var(--color-collaborator-4)' },
  { name: 'Cohere', initials: 'CO', color: 'var(--color-collaborator-5)' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'flex-wrap gap-x-4 gap-y-2',
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'min-w-0 whitespace-nowrap shrink-0',
          )}
        >
          <BrandWordmark as="span" size="lg" />
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            'flex-wrap min-w-0 gap-y-2',
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
          )}
        >
          <Link
            to="/templates"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors',
              'hidden sm:inline',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/library"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors',
              'hidden sm:inline',
            )}
          >
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              'text-on-surface-variant hover:text-on-surface transition-colors',
              'hidden sm:inline',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'whitespace-nowrap shrink-0',
                'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'whitespace-nowrap',
                  'text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'whitespace-nowrap shrink-0',
                  'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
                )}
              >
                {t('landing.nav.startDesigning', {}, { defaultValue: 'Start Designing' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'relative overflow-hidden')}>
        <div
          className={cm.cn(
            cm.w(96),
            cm.h(96),
            cm.roundedFull,
            'absolute -top-40 -right-32 bg-primary/20 blur-3xl',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -bottom-40 -left-20 bg-secondary/20 blur-3xl',
          )}
        ></div>

        <div
          className={cm.cn(
            cm.maxW('full'),
            cm.sp('px', 8),
            'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mx-auto',
          )}
        >
          {/* Left — copy (design: badge, gradient headline, CTAs) */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'start' }),
              cm.stack(6),
              'lg:col-span-5',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                'bg-surface-container-high w-fit',
              )}
            >
              <span className={cm.cn('w-2 h-2 rounded-full bg-secondary')} aria-hidden="true" />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'font-mono text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('landing.hero.badge', {}, { defaultValue: 'v2.0 Beta Live' })}
              </span>
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-on-surface',
              )}
            >
              {t('landing.hero.titleA', {}, { defaultValue: 'Shape every pixel with ' })}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t('landing.hero.titleB', {}, { defaultValue: 'intent.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('xl'),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.hero.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is the multiplayer design canvas for product teams who need to ship — vector editing, real-time presence, a shared design system, and developer-ready handoff in one workspace.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'stretch', gap: 4 }),
                'sm:flex-row sm:items-center sm:space-y-0',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  'bg-gradient-to-b from-primary to-primary-dark text-white rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-transform',
                )}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Open the canvas' })}
              </Link>
              <Link
                to="/templates"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  cm.textCenter,
                  'bg-transparent text-primary rounded-xl hover:bg-primary/5 transition-colors',
                )}
              >
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'View showcase' })}
              </Link>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 2))}>
              <CollaboratorStack
                size="sm"
                max={5}
                collaborators={SOCIAL_PROOF.map((s) => ({
                  id: s.name,
                  name: s.name,
                  avatarColor: s.color,
                  online: true,
                }))}
              />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'landing.hero.socialProof',
                  { count: '9,200+' },
                  { defaultValue: 'Trusted by {{count}} design teams worldwide' },
                )}
              </span>
            </div>
          </div>

          {/* Right — live canvas visual (design: abstract canvas w/ grid + cursors) */}
          <div className={cm.cn('lg:col-span-7')}>
            <ProjectHeroCard
              project={{
                id: 'demo-1',
                title: t(
                  'landing.demoProject.title',
                  {},
                  { defaultValue: 'Northwind · Brand Refresh' },
                )!,
                activeCollaborators: 5,
                updatedLabel: t(
                  'landing.demoProject.updated',
                  {},
                  { defaultValue: 'Updated 4 min ago' },
                )!,
                projectCode: 'ATELIER · LIVE',
                activeTool: t('landing.demoProject.activeTool', {}, { defaultValue: 'Pen tool' })!,
              }}
            />
          </div>
        </div>
      </section>

      {/* Why teams switch — three-up bullet band (content preserved from the
          former hero side card, reflowed to match the design's section flow) */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('pb', 16), 'relative z-10')}>
        <div
          className={cm.cn(
            'max-w-screen-xl mx-auto bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant/30',
            cm.sp('p', 8),
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), cm.sp('mb', 6))}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('landing.cta.eyebrow', {}, { defaultValue: 'Why teams switch' })}
            </span>
            <h2
              className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t(
                'landing.cta.title',
                {},
                { defaultValue: 'Built for designers who care about every pixel.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-3 items-start mb-8')}>
            {[
              ['bolt', 'Sub-60ms cursor sync, anywhere in the world.'],
              ['draw', 'Vector editing with bezier-precise pen and snap guides.'],
              ['code', 'Developer handoff with auto-generated CSS, React, and tokens.'],
            ].map(([icon, copy]) => (
              <div
                key={icon}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    'bg-primary-fixed/40 text-on-primary-container shrink-0',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>{icon}</span>
                </span>
                <span className={cm.cn(cm.flex1, 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.cta.bullet.${icon}`, {}, { defaultValue: copy })}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/signup"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-on-surface text-surface rounded-xl hover:opacity-90 transition-opacity',
            )}
          >
            {t('landing.cta.signupButton', {}, { defaultValue: 'Create your free workspace' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_outward</span>
          </Link>
        </div>
      </section>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'bg-surface-container-low')}>
        <div className={cm.cn('max-w-screen-xl', cm.stack(12), 'mx-auto')}>
          <div className={cm.cn(cm.textCenter, cm.stack(3), cm.maxW('lg'), 'mx-auto')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'landing.featuresEyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Inside {{appName}}' },
              )}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.featuresTitle',
                {},
                { defaultValue: 'Fast tools. Beautiful canvases. Zero friction.' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8')}>
            {FEATURES.map((f, idx) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.roundedFull,
                    'bg-primary-fixed/50 text-primary',
                  )}
                  style={{
                    borderTop:
                      idx % 2 === 0
                        ? '4px solid var(--color-primary)'
                        : '4px solid var(--color-secondary)',
                  }}
                >
                  <span
                    className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface',
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

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 12),
          cm.sp('py', 16),
          'flex-wrap rounded-t-[32px] bg-surface-container-low text-on-surface-variant',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <BrandWordmark as="span" size="sm" footer />
        </Link>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-mono uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'landing.footer.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}}. Built for the Precision Playground.' },
          )}
        </span>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'flex-wrap gap-x-4 gap-y-2',
          )}
        >
          <Link
            to="/templates"
            className={cm.cn(
              'font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/library"
            className={cm.cn(
              'font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors',
            )}
          >
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              'font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              'font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors',
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link
            to="/login"
            className={cm.cn(
              'font-mono text-xs uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors',
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
