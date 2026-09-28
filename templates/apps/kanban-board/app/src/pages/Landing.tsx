import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

// Design feature set (Stitch "Driftboard" landing): six capability cards in a
// 2/3-column grid. Copy mirrors the design's cards.
const FEATURES = [
  {
    icon: 'drag_pan',
    titleKey: 'landing.features.drag.title',
    titleDefault: 'Drag-and-drop boards',
    bodyKey: 'landing.features.drag.body',
    bodyDefault:
      'Intuitive interfaces that let you move work across stages with a fluid, satisfying click-and-drag motion.',
  },
  {
    icon: 'view_column_2',
    titleKey: 'landing.features.swimlanes.title',
    titleDefault: 'Swim lanes',
    bodyKey: 'landing.features.swimlanes.body',
    bodyDefault:
      'Organize complex projects horizontally and vertically. Keep different streams of work distinct but aligned.',
  },
  {
    icon: 'group',
    titleKey: 'landing.features.presence.title',
    titleDefault: 'Real-time presence',
    bodyKey: 'landing.features.presence.body',
    bodyDefault:
      'See exactly who is looking at what. Collaborate on cards simultaneously without stepping on toes.',
  },
  {
    icon: 'filter_list',
    titleKey: 'landing.features.filters.title',
    titleDefault: 'Powerful filters',
    bodyKey: 'landing.features.filters.body',
    bodyDefault:
      'Cut through the noise. Instantly find tasks by assignee, label, due date, or custom fields.',
  },
  {
    icon: 'bolt',
    titleKey: 'landing.features.automations.title',
    titleDefault: 'Card automations',
    bodyKey: 'landing.features.automations.body',
    bodyDefault:
      'Set up rules to move cards, assign team members, or change statuses automatically based on triggers.',
  },
  {
    icon: 'sync',
    titleKey: 'landing.features.sync.title',
    titleDefault: 'Slack/GitHub sync',
    bodyKey: 'landing.features.sync.body',
    bodyDefault:
      'Keep discussions and code linked to tasks. Updates in connected tools reflect directly on your board.',
  },
] as const

// Fictional team wordmarks for the trusted-by strip (design copy).
const TRUSTED_BY = [
  { key: 'acme', defaultLabel: 'AcmeCorp' },
  { key: 'globex', defaultLabel: 'Globex' },
  { key: 'initech', defaultLabel: 'Initech' },
  { key: 'soylent', defaultLabel: 'Soylent' },
  { key: 'massive', defaultLabel: 'Massive Dynamic' },
] as const

// Mini board preview inside the glass panel (design composition:
// "To Do 3" + "In Progress 1" columns, color bars, avatar initials).
const PREVIEW_TODO = [
  {
    key: 'hero',
    bars: ['bg-error-container', 'bg-tertiary-container'],
    titleKey: 'landing.preview.cardHero',
    titleDefault: 'Redesign landing page hero',
    commentIcon: 'subject',
    initials: 'JD',
    avatarTone: 'bg-primary-container text-on-primary-container',
    highlighted: false,
  },
  {
    key: 'pricing',
    bars: [] as string[],
    titleKey: 'landing.preview.cardPricing',
    titleDefault: 'Update pricing tiers',
    commentIcon: 'chat_bubble',
    initials: 'AS',
    avatarTone: 'bg-secondary-container text-on-secondary-container',
    highlighted: false,
  },
] as const

const PREVIEW_PROGRESS = [
  {
    key: 'ai',
    bars: ['bg-tertiary-container'],
    titleKey: 'landing.preview.cardAi',
    titleDefault: 'Integrate AI sprint suggestions',
    commentIcon: 'auto_awesome',
    initials: 'MK',
    avatarTone: 'bg-tertiary text-on-tertiary',
    highlighted: true,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const ctaPrimary = cm.cn(
    cm.sp('px', 6),
    cm.sp('py', 3),
    cm.textSize('base'),
    cm.fontWeight('bold'),
    'inline-flex items-center justify-center gap-2 rounded-lg text-on-primary',
    'bg-gradient-to-br from-primary to-primary-container shadow-md transition-opacity hover:opacity-90 active:scale-95',
  )
  const navLink = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'text-on-surface-variant transition-colors hover:text-primary',
  )

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      {/* Fixed nav — frosted white bar (design: bg-white/80 blur, h-64px) */}
      <header
        className={cm.cn(
          'fixed top-0 z-50 w-full border-b border-outline-variant/15 bg-surface/80 backdrop-blur-xl shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'between' }),
            'h-16 w-full',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link
              to="/"
              className={cm.cn(cm.textSize('xl'), 'font-black tracking-tighter text-primary')}
            >
              {APP_NAME}
            </Link>
            <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
              <a href="#features" className={navLink}>
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link to="/pricing" className={navLink}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link to="/about" className={navLink}>
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span className={cm.cn('hidden sm:inline-flex')}>
              <ThemeToggle />
            </span>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-lg text-on-primary bg-gradient-to-br from-primary to-primary-container transition-opacity hover:opacity-90',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link to="/login" className={cm.cn(navLink, 'hidden sm:inline-flex')}>
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="nav-get-started"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-lg text-on-primary bg-gradient-to-br from-primary to-primary-container transition-transform hover:opacity-90 active:scale-95',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'flex flex-col pt-16')}>
        {/* Hero — split panel on surface-container-low with glass board preview */}
        <section className={cm.cn('relative overflow-hidden bg-surface-container-low')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              cm.sp('pt', 20),
              cm.sp('pb', 24),
              'grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16',
            )}
          >
            <div className={cm.cn('relative z-10', cm.flex({ direction: 'col', gap: 'lg' }))}>
              <div>
                <span
                  className={cm.cn(
                    cm.sp('mb', 6),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    'inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface-container-highest text-[13px] font-medium text-primary-text',
                  )}
                >
                  <span className={cm.cn('h-2 w-2 rounded-full bg-success')} aria-hidden="true" />
                  {t('landing.hero.eyebrow', {}, { defaultValue: 'New: AI sprint suggestions' })}
                </span>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl font-black leading-[1.1] tracking-tighter text-on-surface lg:text-[64px]',
                  )}
                >
                  {t('landing.hero.headlineLeading', {}, { defaultValue: 'Move work forward,' })}{' '}
                  {t('landing.hero.headlineAccent', {}, { defaultValue: 'effortlessly' })}
                </h1>
                <p
                  className={cm.cn(
                    cm.maxW('xl'),
                    cm.textSize('xl'),
                    cm.fontWeight('medium'),
                    'leading-relaxed text-on-surface-variant',
                  )}
                >
                  {t(
                    'landing.hero.subline',
                    {},
                    {
                      defaultValue:
                        'The visual collaboration platform that helps teams align, execute, and deliver faster. Stop managing tools and start moving work.',
                    },
                  )}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ wrap: 'wrap', align: 'center', gap: 'md' }))}>
                <Link to="/signup" data-mol-id="hero-start-free" className={ctaPrimary}>
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start free' })}
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'inline-flex items-center gap-2 rounded-lg bg-surface-container-highest text-primary-text transition-colors hover:opacity-80',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    play_circle
                  </span>
                  {t(
                    'landing.hero.secondaryCta',
                    {},
                    { defaultValue: 'I already have an account' },
                  )}
                </Link>
              </div>
              <div className={cm.cn(cm.sp('pt', 8))}>
                <p
                  className={cm.cn(
                    cm.sp('mb', 4),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('landing.hero.trustedBy', {}, { defaultValue: 'Trusted by innovative teams' })}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ wrap: 'wrap', align: 'center', gap: 'lg' }),
                    'opacity-60 grayscale transition-all duration-300 hover:grayscale-0',
                  )}
                >
                  {TRUSTED_BY.map((brand) => (
                    <span
                      key={brand.key}
                      className={cm.cn(
                        cm.textSize('xl'),
                        'font-bold tracking-tight text-on-surface',
                      )}
                    >
                      {t(
                        `landing.hero.trusted.${brand.key}`,
                        {},
                        { defaultValue: brand.defaultLabel },
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating glass kanban preview, tilted -2deg until hover */}
            <div
              className={cm.cn('relative z-10 flex items-center justify-center lg:min-h-[600px]')}
            >
              <div
                className={cm.cn(
                  'absolute top-1/2 left-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl',
                  'bg-gradient-to-tr from-surface-variant to-primary-fixed-dim',
                )}
                aria-hidden="true"
              />
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'w-full max-w-lg rotate-[-2deg] rounded-xl border border-outline-variant/25 bg-surface/70 shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:rotate-0',
                )}
                aria-hidden="true"
              >
                <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }))}>
                  <div
                    className={cm.cn(
                      cm.flex1,
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-lg border border-outline-variant/15 bg-surface/50',
                    )}
                  >
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.flex({ justify: 'between' }),
                        'text-on-surface',
                      )}
                    >
                      {t('landing.preview.todo', {}, { defaultValue: 'To Do' })}
                      <span className={cm.cn(cm.fontWeight('normal'), 'text-on-surface-variant')}>
                        3
                      </span>
                    </h3>
                    {PREVIEW_TODO.map((card) => (
                      <div
                        key={card.key}
                        className={cm.cn(
                          cm.sp('p', 3),
                          'rounded border border-outline-variant/15 bg-surface-container-lowest shadow-sm',
                        )}
                      >
                        {card.bars.length ? (
                          <div className={cm.cn(cm.sp('mb', 2), cm.flex({ gap: 'xs' }))}>
                            {card.bars.map((bar) => (
                              <span key={bar} className={cm.cn('h-2 w-8 rounded-full', bar)} />
                            ))}
                          </div>
                        ) : null}
                        <p
                          className={cm.cn(
                            cm.sp('mb', 3),
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                          )}
                        >
                          {t(
                            `landing.preview.card.${card.key}`,
                            {},
                            { defaultValue: card.titleDefault },
                          )}
                        </p>
                        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                          <span
                            className={cm.cn(
                              'material-symbols-outlined text-sm text-on-surface-variant',
                            )}
                          >
                            {card.commentIcon}
                          </span>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'h-6 w-6 rounded-full text-[10px] font-bold',
                              card.avatarTone,
                            )}
                          >
                            {card.initials}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex1,
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-lg border border-outline-variant/15 bg-surface/50',
                    )}
                  >
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.flex({ justify: 'between' }),
                        'text-on-surface',
                      )}
                    >
                      {t('landing.preview.progress', {}, { defaultValue: 'In Progress' })}
                      <span className={cm.cn(cm.fontWeight('normal'), 'text-on-surface-variant')}>
                        1
                      </span>
                    </h3>
                    {PREVIEW_PROGRESS.map((card) => (
                      <div
                        key={card.key}
                        className={cm.cn(
                          cm.sp('p', 3),
                          'rounded border bg-surface-container-lowest shadow-sm',
                          card.highlighted
                            ? 'border-primary/40 outline outline-2 outline-primary/20'
                            : 'border-outline-variant/15',
                        )}
                      >
                        {card.bars.length ? (
                          <div className={cm.cn(cm.sp('mb', 2), cm.flex({ gap: 'xs' }))}>
                            {card.bars.map((bar) => (
                              <span key={bar} className={cm.cn('h-2 w-8 rounded-full', bar)} />
                            ))}
                          </div>
                        ) : null}
                        <p
                          className={cm.cn(
                            cm.sp('mb', 3),
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                          )}
                        >
                          {t(
                            `landing.preview.card.${card.key}`,
                            {},
                            { defaultValue: card.titleDefault },
                          )}
                        </p>
                        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
                          <span
                            className={cm.cn('material-symbols-outlined text-sm text-primary-text')}
                          >
                            {card.commentIcon}
                          </span>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              'h-6 w-6 rounded-full text-[10px] font-bold',
                              card.avatarTone,
                            )}
                          >
                            {card.initials}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid — six capability cards on surface */}
        <section
          id="features"
          className={cm.cn('relative bg-surface', cm.sp('px', 6), cm.sp('py', 24))}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
              <p
                className={cm.cn(
                  cm.sp('mb', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'block uppercase tracking-widest text-primary-text',
                )}
              >
                {t('landing.features.eyebrow', {}, { defaultValue: 'Capabilities' })}
              </p>
              <h2
                className={cm.cn(cm.textSize('4xl'), 'font-black tracking-tighter text-on-surface')}
              >
                {t(
                  'landing.features.heading',
                  {},
                  { defaultValue: 'Everything your team needs to ship' },
                )}
              </h2>
            </div>
            <div className={cm.grid({ cols: 3, gap: 'lg' })}>
              {FEATURES.map((feature) => (
                <div
                  key={feature.titleKey}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'rounded-xl border border-outline-variant/25 bg-surface-container-low transition-transform duration-300 hover:-translate-y-1',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.sp('mb', 6),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 rounded-lg bg-surface-container-highest text-primary-text',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      {feature.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.sp('mb', 3),
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      'text-on-surface',
                    )}
                  >
                    {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                  </h3>
                  <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
                    {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA banner — inverse-surface card on surface-container-low */}
        <section className={cm.cn('bg-surface-container-low', cm.sp('px', 6), cm.sp('py', 24))}>
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto)}>
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                'relative overflow-hidden rounded-2xl bg-inverse-surface',
              )}
            >
              <div
                className={cm.cn(
                  'absolute top-0 right-0 h-64 w-64 rounded-full bg-primary-container opacity-20 blur-[100px]',
                )}
                aria-hidden="true"
              />
              <div
                className={cm.cn(
                  'absolute bottom-0 left-0 h-64 w-64 rounded-full bg-tertiary-container opacity-20 blur-[100px]',
                )}
                aria-hidden="true"
              />
              <h2
                className={cm.cn(
                  cm.sp('mb', 6),
                  cm.textSize('4xl'),
                  'relative z-10 font-black tracking-tighter text-inverse-on-surface',
                )}
              >
                {t('landing.cta.heading', {}, { defaultValue: 'Start moving work forward today' })}
              </h2>
              <p
                className={cm.cn(
                  cm.sp('mb', 10),
                  cm.mxAuto,
                  cm.maxW('2xl'),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'relative z-10 text-surface-variant',
                )}
              >
                {t(
                  'landing.cta.body',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Join thousands of teams already using {{app}} to align, execute, and deliver faster.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ wrap: 'wrap', justify: 'center', gap: 'md' }),
                  'relative z-10',
                )}
              >
                <Link to="/signup" data-mol-id="cta-start-free-trial" className={ctaPrimary}>
                  {t('landing.cta.button', {}, { defaultValue: 'Start free trial' })}
                </Link>
                <Link
                  to="/about"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('base'),
                    cm.fontWeight('bold'),
                    'inline-flex items-center rounded-lg bg-surface-container/10 text-inverse-on-surface transition-colors hover:bg-surface-container/20',
                  )}
                >
                  {t('landing.cta.secondary', {}, { defaultValue: 'Talk to sales' })}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — brand column + link columns (design's 5-column grid) */}
      <footer className={cm.cn('w-full bg-surface-container-low px-6 py-16')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'grid grid-cols-2 gap-12 md:grid-cols-4')}>
          <div className={cm.cn('col-span-2 md:col-span-1')}>
            <Link
              to="/"
              className={cm.cn(cm.sp('mb', 4), cm.textSize('xl'), 'block font-black text-primary')}
            >
              {APP_NAME}
            </Link>
            <p className={cm.cn(cm.sp('mb', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {APP_TAGLINE}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '\u00a9 {{year}} {{app}}. All rights reserved.' },
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
          <div>
            <h4
              className={cm.cn(
                cm.sp('mb', 6),
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface',
              )}
            >
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.stack(4))}>
              <li>
                <a
                  href="#features"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('nav.features', {}, { defaultValue: 'Features' })}
                </a>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.sp('mb', 6),
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface',
              )}
            >
              {t('landing.footer.company', {}, { defaultValue: 'Company' })}
            </h4>
            <ul className={cm.cn(cm.stack(4))}>
              <li>
                <Link
                  to="/about"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.sp('mb', 6),
                cm.textSize('sm'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface',
              )}
            >
              {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <ul className={cm.cn(cm.stack(4))}>
              <li>
                <Link
                  to="/privacy"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4',
                  )}
                >
                  {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
