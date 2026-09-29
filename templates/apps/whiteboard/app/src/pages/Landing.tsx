import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BoardHeroCard } from '../components/BoardHeroCard.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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
    tileClass: 'bg-primary-light text-primary',
  },
  {
    icon: 'arrow_selector_tool',
    titleKey: 'landing.features.cursors.title',
    titleDefault: 'Live multiplayer cursors',
    bodyKey: 'landing.features.cursors.body',
    bodyDefault:
      'Watch teammates think in real time. Six distinct cursor colors keep every voice visible.',
    tileClass: 'bg-canvas-accent/10 text-canvas-accent',
  },
  {
    icon: 'auto_awesome',
    titleKey: 'landing.features.templates.title',
    titleDefault: 'Workshop-ready templates',
    bodyKey: 'landing.features.templates.body',
    bodyDefault: 'Brainstorms, retros, mind-maps, and journey maps — pre-wired for facilitation.',
    tileClass: 'bg-secondary/10 text-secondary',
  },
  {
    icon: 'history',
    titleKey: 'landing.features.history.title',
    titleDefault: 'Time-travel version history',
    bodyKey: 'landing.features.history.body',
    bodyDefault:
      'Snapshots every minute. Roll back any board to a moment when the breakthrough was still fresh.',
    tileClass: 'bg-primary-light text-primary',
  },
]

const SOCIAL_PROOF = [
  { name: 'Atlas Studio', initials: 'AS', color: '#5b5bf7', logoClass: 'font-black' },
  { name: 'Brightline', initials: 'BL', color: '#00c4a8', logoClass: 'font-bold italic' },
  { name: 'Maven Lab', initials: 'ML', color: '#a855f7', logoClass: 'font-serif font-bold' },
  {
    name: 'Cohere Co.',
    initials: 'CC',
    color: '#f97316',
    logoClass: 'font-black tracking-tighter',
  },
  { name: 'Figment', initials: 'FG', color: '#ec4899', logoClass: 'font-bold uppercase' },
]

/** Board-tool tiles (Tools row) — pastel sticky palette from theme.css. */
const TOOLS = [
  { icon: 'sticky_note_2', tile: 'bg-sticky-yellow', labelDefault: 'Sticky' },
  { icon: 'category', tile: 'bg-sticky-blue', labelDefault: 'Shape' },
  { icon: 'trending_flat', tile: 'bg-sticky-green', labelDefault: 'Arrow' },
  { icon: 'draw', tile: 'bg-sticky-pink', labelDefault: 'Draw' },
  { icon: 'title', tile: 'bg-sticky-purple', labelDefault: 'Text' },
  { icon: 'crop_free', tile: 'bg-sticky-orange', labelDefault: 'Frame' },
  { icon: 'stars', tile: 'bg-sticky-gray', labelDefault: 'Stamp' },
  { icon: 'add_comment', tile: 'bg-canvas', labelDefault: 'Comment' },
]

/** Hand-drawn underline stroke beneath the handwriting word in the H1. */
function SquiggleUnderline() {
  return (
    <svg
      className="absolute -bottom-2 left-0 h-3 w-full text-canvas-accent"
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,10 Q50,20 100,5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  )
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const primaryPill = cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.fontWeight('bold'),
    cm.roundedFull,
    'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 transition-transform hover:-translate-y-1 active:scale-95',
  )
  const quietPill = cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    cm.fontWeight('medium'),
    cm.roundedFull,
    'bg-surface text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      {/* ── Top navigation ─────────────────────────────────────────────── */}
      <header
        className={cm.cn(
          cm.position('sticky'),
          'top-0 z-30 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'max-w-7xl mx-auto px-6 h-16',
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <BrandWordmark size="md" />
            <span
              className={cm.cn(
                'font-handwriting text-canvas-accent text-2xl font-bold leading-none',
              )}
              aria-hidden="true"
            >
              ★
            </span>
          </Link>
          <nav
            className={cm.cn(
              cm.hiddenBelow('md'),
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
            )}
          >
            <Link
              to="/templates"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('nav.templates', {}, { defaultValue: 'Templates' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/boards"
                className={cm.cn(primaryPill, cm.sp('px', 5), cm.sp('py', 2.5), cm.textSize('sm'))}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.hiddenBelow('sm'),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    primaryPill,
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.textSize('sm'),
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero: dot-grid canvas, copy left, live board right ────────── */}
        <section className={cm.cn('relative overflow-hidden bg-canvas dot-grid')}>
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.roundedFull,
              'pointer-events-none absolute top-0 right-0 blur-3xl bg-gradient-to-br from-primary/5 to-canvas-accent/5 translate-x-1/3 -translate-y-1/4',
            )}
            style={{ width: '800px', height: '800px' }}
          ></div>
          <div
            className={cm.cn(
              cm.grid({ cols: 2, gap: 16 }),
              'items-center max-w-7xl mx-auto px-6 pt-20 pb-24 relative',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', align: 'start' }), cm.stack(8))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'self-start bg-primary-light text-primary border border-primary/10',
                )}
              >
                <span
                  className={cm.cn('w-2 h-2 rounded-full bg-primary animate-pulse')}
                  aria-hidden="true"
                ></span>
                {t('landing.hero.eyebrow', {}, { defaultValue: 'Real-time collaboration' })}
              </span>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl leading-tight font-extrabold tracking-tight text-on-surface',
                )}
              >
                {t('landing.hero.titleTop', {}, { defaultValue: 'Where ideas' })}
                <br />
                <span
                  className={cm.cn(
                    'font-handwriting text-canvas-accent font-bold relative inline-block',
                  )}
                >
                  {t('landing.hero.titleAccent', {}, { defaultValue: 'converge' })}
                  <SquiggleUnderline />
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.maxW('lg'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(
                  'landing.hero.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a multiplayer whiteboard for creative teams. Brainstorm, plan, and build together on an infinite multiplayer canvas.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  cm.sp('pt', 4),
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(primaryPill, cm.sp('px', 8), cm.sp('py', 4), cm.textSize('lg'))}
                >
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start a board for free' })}
                  <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/templates"
                  className={cm.cn(quietPill, cm.sp('px', 8), cm.sp('py', 4), cm.textSize('lg'))}
                >
                  <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                    grid_view
                  </span>
                  {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
                </Link>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
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
          </div>
        </section>

        {/* ── Social proof ──────────────────────────────────────────────── */}
        <section
          className={cm.cn('bg-surface border-y border-outline-variant/30', cm.sp('py', 12))}
        >
          <div className={cm.cn('max-w-7xl mx-auto px-6 text-center')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.uppercase,
                cm.trackingWide,
                'text-on-surface-variant',
                cm.sp('mb', 8),
              )}
            >
              {t('landing.socialProof.title', {}, { defaultValue: 'Teams who brainstorm here' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', wrap: 'wrap', gap: 'xl' }),
                'md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500',
              )}
            >
              {SOCIAL_PROOF.map((s) => (
                <div
                  key={s.name}
                  className={cm.cn(cm.textSize('xl'), 'text-on-surface', s.logoClass)}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature bento ─────────────────────────────────────────────── */}
        <section className={cm.cn('bg-canvas', cm.sp('py', 24), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div
              className={cm.cn(
                cm.textCenter,
                cm.stack(3),
                cm.maxW('2xl'),
                'mx-auto',
                cm.sp('mb', 16),
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.uppercase,
                  cm.trackingWide,
                  'text-on-surface-variant',
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
            <div className={cm.cn('grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4')}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    cm.stack(4),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-14 h-14 rounded-xl text-3xl',
                      f.tileClass,
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-3xl')}>{f.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                    {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tools row ─────────────────────────────────────────────────── */}
        <section
          className={cm.cn(
            'bg-surface border-y border-outline-variant/30 overflow-hidden',
            cm.sp('py', 16),
          )}
        >
          <div className={cm.cn('max-w-7xl mx-auto px-6 text-center', cm.sp('mb', 10))}>
            <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('landing.tools.title', {}, { defaultValue: 'Tools for every thought' })}
            </h3>
          </div>
          <div
            className={cm.cn(cm.flex({ justify: 'center', wrap: 'wrap', gap: 'md' }), 'px-6 pb-4')}
          >
            {TOOLS.map((tool) => (
              <div
                key={tool.icon}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                  'flex-none w-20 h-20 rounded-xl shadow-sm border border-outline-variant/40 hover:-translate-y-2 transition-transform',
                  tool.tile,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-on-surface')}>
                  {tool.icon}
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface')}
                >
                  {t(`landing.tools.${tool.icon}`, {}, { defaultValue: tool.labelDefault })}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why teams switch ──────────────────────────────────────────── */}
        <section className={cm.cn('bg-canvas', cm.sp('py', 24), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-5xl mx-auto')}>
            <div
              className={cm.cn(
                cm.sp('p', 10),
                cm.stack(8),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.cn(cm.stack(2))}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    cm.uppercase,
                    cm.trackingWide,
                    'text-on-surface-variant',
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
              <ul className={cm.cn('grid grid-cols-1 gap-6 md:grid-cols-3')}>
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
                        'bg-primary-light text-primary shrink-0',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                        {icon}
                      </span>
                    </span>
                    <span className={cm.cn(cm.flex1, 'text-on-surface-variant leading-relaxed')}>
                      {t(`landing.cta.bullet.${icon}`, {}, { defaultValue: copy })}
                    </span>
                  </li>
                ))}
              </ul>
              <div>
                <Link
                  to="/signup"
                  className={cm.cn(
                    primaryPill,
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'inline-flex',
                  )}
                >
                  {t('landing.cta.signupButton', {}, { defaultValue: 'Create your free board' })}
                  <span className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}>
                    arrow_outward
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className={cm.cn('relative overflow-hidden bg-inverse-surface', cm.sp('py', 24))}>
          <div
            aria-hidden="true"
            className={cm.cn(cm.inset0, cm.position('absolute'), 'dot-grid opacity-10')}
          ></div>
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.roundedFull,
              'pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-40 bg-gradient-to-r from-primary to-canvas-accent',
            )}
            style={{ width: '800px', height: '300px' }}
          ></div>
          <div className={cm.cn('relative max-w-4xl mx-auto px-6 text-center')}>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight text-surface',
                cm.sp('mb', 8),
              )}
            >
              {t('landing.finalCta.title', {}, { defaultValue: 'Give your team a real canvas' })}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('2xl'),
                'text-surface/70 mx-auto',
                cm.sp('mb', 10),
              )}
            >
              {t(
                'landing.finalCta.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Join thousands of creative teams who use {{appName}} to map out their best ideas.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
                'sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'w-full sm:w-auto bg-surface text-on-surface shadow-lg hover:bg-surface-container-lowest transition-colors',
                )}
              >
                {t('landing.finalCta.button', {}, { defaultValue: 'Get started for free' })}
              </Link>
              <p className={cm.cn(cm.textSize('sm'), 'text-surface/60')}>
                {t(
                  'landing.finalCta.note',
                  {},
                  { defaultValue: 'No credit card required. Free forever plan.' },
                )}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className={cm.cn('bg-surface-container-low border-t border-outline-variant/30')}>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'md' }),
            'max-w-7xl mx-auto px-6 py-12 gap-6 md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              'md:items-start',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <BrandWordmark as="span" size="md" footer />
              <span
                className={cm.cn('font-handwriting text-canvas-accent text-xl')}
                aria-hidden="true"
              >
                ★
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'leading-relaxed text-on-surface-variant text-center md:text-left',
              )}
            >
              {t(
                'landing.footer.copy',
                { appName: APP_NAME },
                { defaultValue: '© 2026 {{appName}}. Where ideas converge.' },
              )}
              <br />
              <span className={cm.cn('font-handwriting text-canvas-accent text-lg')}>
                {t('landing.footer.flourish', {}, { defaultValue: 'made for creative teams ♡' })}
              </span>
            </p>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', wrap: 'wrap', gap: 'lg' }),
              cm.textSize('sm'),
            )}
          >
            <Link
              to="/templates"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('nav.templates', {}, { defaultValue: 'Templates' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/boards"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <Link
                to="/login"
                className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
