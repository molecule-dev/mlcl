import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BoardHeroCard } from '../components/BoardHeroCard.js'
import { CollaboratorStack } from '../components/CollaboratorStack.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'pinch',
    titleKey: 'landing.features.canvas.title',
    titleDefault: 'Infinite canvas',
    bodyKey: 'landing.features.canvas.body',
    bodyDefault:
      'Pan, zoom, and drop sticky notes across an unbounded surface. Your ideas never need a margin.',
  },
  {
    icon: 'arrow_selector_tool',
    titleKey: 'landing.features.cursors.title',
    titleDefault: 'Live multiplayer cursors',
    bodyKey: 'landing.features.cursors.body',
    bodyDefault:
      'Watch teammates think in real time. Six distinct cursor colors keep every voice visible.',
  },
  {
    icon: 'auto_awesome',
    titleKey: 'landing.features.templates.title',
    titleDefault: 'Workshop-ready templates',
    bodyKey: 'landing.features.templates.body',
    bodyDefault: 'Brainstorms, retros, mind-maps, and journey maps — pre-wired for facilitation.',
  },
  {
    icon: 'history',
    titleKey: 'landing.features.history.title',
    titleDefault: 'Time-travel version history',
    bodyKey: 'landing.features.history.body',
    bodyDefault:
      'Snapshots every minute. Roll back any board to a moment when the breakthrough was still fresh.',
  },
]

const SOCIAL_PROOF = [
  { name: 'Atlas Studio', initials: 'AS', color: '#5b5bf7' },
  { name: 'Brightline', initials: 'BL', color: '#00c4a8' },
  { name: 'Maven Lab', initials: 'ML', color: '#a855f7' },
  { name: 'Cohere Co.', initials: 'CC', color: '#f97316' },
  { name: 'Figment', initials: 'FG', color: '#ec4899' },
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
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'bg-gradient-to-br from-primary to-primary-hover rounded-xl text-white shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard_customize
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'gap-3 sm:gap-6',
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
          )}
        >
          <Link
            to="/templates"
            className={cm.cn(
              'hidden md:inline text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link
            to="/pricing"
            className={cm.cn(
              'hidden md:inline text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/boards"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
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
                  'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform',
                )}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 20), 'relative overflow-hidden')}>
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
            cm.flex({ direction: 'col', align: 'center' }),
            cm.stack(8),
            cm.textCenter,
            cm.maxW('2xl'),
            'relative z-10 mx-auto',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest bg-primary-fixed/40 text-primary-dark',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>auto_awesome</span>
            {t('landing.hero.eyebrow', {}, { defaultValue: APP_TAGLINE })}
          </span>
          <h1
            className={cm.cn(
              'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95] text-on-surface',
            )}
          >
            {t('landing.hero.title', {}, { defaultValue: 'A canvas as fast as your thoughts' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('medium'),
              cm.maxW('xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'landing.hero.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a multiplayer whiteboard for design teams, workshop facilitators, and educators who run live brainstorms and need ideas to converge in one place.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap justify-center')}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'sm' }),
                'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-transform',
              )}
            >
              {t('landing.hero.primaryCta', {}, { defaultValue: 'Start a board for free' })}
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                arrow_forward
              </span>
            </Link>
            <Link
              to="/templates"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
              )}
            >
              {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
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
                { count: '12,400+' },
                { defaultValue: 'Trusted by {{count}} design teams worldwide' },
              )}
            </span>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.maxW('full'),
            cm.sp('mt', 16),
            cm.sp('px', 8),
            'relative z-10 lg:px-24',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
            <BoardHeroCard
              board={{
                id: 'demo-1',
                title: t(
                  'landing.demoBoard.title',
                  {},
                  { defaultValue: 'Q1 Workshop · Brand Voice' },
                )!,
                activeCollaborators: 6,
                updatedLabel: t(
                  'landing.demoBoard.updated',
                  {},
                  { defaultValue: 'Updated 12 min ago' },
                )!,
                projectCode: `${APP_NAME.toUpperCase()} · LIVE`,
              }}
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                cm.sp('p', 8),
                cm.stack(6),
                'lg:col-span-4 bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant/30',
              )}
            >
              <div className={cm.stack(2)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.cta.eyebrow', {}, { defaultValue: 'Why teams switch' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('3xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t(
                    'landing.cta.title',
                    {},
                    { defaultValue: 'Built for messy, generative, in-person thinking.' },
                  )}
                </h2>
              </div>
              <ul className={cm.cn(cm.stack(3))}>
                {[
                  ['bolt', 'Sub-80ms cursor sync, anywhere in the world.'],
                  ['lock', 'Granular share + lock controls per element.'],
                  ['restore', 'Time-travel back to any past version of a board.'],
                ].map(([icon, copy]) => (
                  <li
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
                        'bg-primary-fixed/40 text-primary-dark',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-[18px]')}>{icon}</span>
                    </span>
                    <span className={cm.cn(cm.flex1, 'text-on-surface-variant leading-relaxed')}>
                      {t(`landing.cta.bullet.${icon}`, {}, { defaultValue: copy })}
                    </span>
                  </li>
                ))}
              </ul>
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
                {t('landing.cta.signupButton', {}, { defaultValue: 'Create your free board' })}
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_outward
                </span>
              </Link>
            </div>
          </div>
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
                { defaultValue: 'What makes {{appName}} tessellate' },
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
                { defaultValue: 'Fast feedback. Beautiful canvases. Zero friction.' },
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
          cm.sp('px', 8),
          cm.sp('py', 8),
          'border-t border-outline-variant/30 text-on-surface-variant',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(7),
              cm.h(7),
              'bg-gradient-to-br from-primary to-primary-hover rounded-lg text-white',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard_customize
            </span>
          </span>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {APP_NAME}
          </span>
        </Link>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
          )}
        >
          <Link to="/templates" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/about" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          {isAuthenticated ? (
            <Link to="/boards" className={cm.cn('hover:text-on-surface transition-colors')}>
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <Link to="/login" className={cm.cn('hover:text-on-surface transition-colors')}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}

export default Landing
