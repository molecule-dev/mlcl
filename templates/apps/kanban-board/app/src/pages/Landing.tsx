import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'view_kanban',
    titleKey: 'landing.features.boards.title',
    titleDefault: 'Boards that breathe',
    bodyKey: 'landing.features.boards.body',
    bodyDefault:
      'Drag, drop, swimlane, filter — built for the rhythm of real product work, not Trello-clone nostalgia.',
  },
  {
    icon: 'bolt',
    titleKey: 'landing.features.realtime.title',
    titleDefault: 'Realtime collaboration',
    bodyKey: 'landing.features.realtime.body',
    bodyDefault:
      'See teammates move cards, leave comments, and edit checklists with millisecond presence cursors.',
  },
  {
    icon: 'shield_lock',
    titleKey: 'landing.features.permissions.title',
    titleDefault: 'Workspace-grade permissions',
    bodyKey: 'landing.features.permissions.body',
    bodyDefault:
      'Owner / admin / member / viewer roles per board. Audit log on every state change. SSO-ready.',
  },
  {
    icon: 'auto_awesome',
    titleKey: 'landing.features.shortcuts.title',
    titleDefault: 'Keyboard-first',
    bodyKey: 'landing.features.shortcuts.body',
    bodyDefault:
      'Mod+K command palette, vim-style card navigation, and a sub-100ms feel — built for power users.',
  },
]

const SAMPLE_CARDS = [
  {
    tone: 'rose',
    label: 'Critical',
    title: 'Investigate the slow board-load 95th percentile',
    sub: 'Diego · 11 comments',
  },
  {
    tone: 'amber',
    label: 'High',
    title: 'Migrate dashboard charts to the new color tokens',
    sub: 'Sarah, Marcus · 5/8',
  },
  {
    tone: 'blue',
    label: 'Medium',
    title: 'Wire SSE streaming into the activity feed',
    sub: 'James · Apr 30',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-x-6 gap-y-2',
          cm.sp('px', 6),
          cm.sp('py', 5),
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'flex-wrap gap-x-3 gap-y-1 sm:gap-x-6',
            'text-sm font-semibold text-on-surface-variant',
          )}
        >
          <a
            href="#features"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
            )}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                'px-5 py-2 rounded-full text-white text-sm font-bold shadow-md',
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
                  `px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors`,
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  'px-5 py-2 rounded-full text-white text-sm font-bold shadow-md',
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
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'mx-auto w-full max-w-7xl')}>
          <div className={cm.cn(`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center`)}>
            <div className={cm.cn(`lg:col-span-6`)}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'inline-flex w-fit px-3 py-1 mb-6 rounded-full text-[11px] font-black uppercase tracking-widest',
                  'bg-primary/10 text-primary-dark',
                )}
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                {t(
                  'landing.hero.eyebrow',
                  {},
                  { defaultValue: 'Built for product + engineering teams' },
                )}
              </span>
              <h1
                className={cm.cn(
                  `text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface`,
                )}
              >
                {t('landing.hero.headlineLeading', {}, { defaultValue: 'Move work forward,' })}
                <br />
                <span className="bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">
                  {t('landing.hero.headlineAccent', {}, { defaultValue: 'effortlessly.' })}
                </span>
              </h1>
              <p className={cm.cn(cm.sp('mt', 6), 'text-lg text-on-surface-variant max-w-xl')}>
                {t(
                  'landing.hero.subline',
                  {},
                  {
                    defaultValue:
                      'Boards, lists, cards, swimlanes, work-in-progress caps — every primitive your team already trusts, with realtime collaboration and a keyboard-first feel.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.sp('mt', 8), 'flex flex-wrap items-center gap-4')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-7 py-3 rounded-full text-white text-base font-bold shadow-lg',
                    'bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity',
                    cm.flex({ align: 'center', gap: 'xs' }),
                  )}
                >
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start your first board' })}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    `px-6 py-3 rounded-full text-on-surface text-base font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors`,
                  )}
                >
                  {t(
                    'landing.hero.secondaryCta',
                    {},
                    { defaultValue: 'I already have an account' },
                  )}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.sp('mt', 8),
                  'flex items-center gap-4 text-sm text-on-surface-variant',
                )}
              >
                <div className={cm.cn(`flex -space-x-2`)}>
                  <img
                    src="https://i.pravatar.cc/64?img=1"
                    alt=""
                    className={cm.cn(`w-8 h-8 rounded-full ring-2 ring-background object-cover`)}
                  />
                  <img
                    src="https://i.pravatar.cc/64?img=12"
                    alt=""
                    className={cm.cn(`w-8 h-8 rounded-full ring-2 ring-background object-cover`)}
                  />
                  <img
                    src="https://i.pravatar.cc/64?img=5"
                    alt=""
                    className={cm.cn(`w-8 h-8 rounded-full ring-2 ring-background object-cover`)}
                  />
                  <img
                    src="https://i.pravatar.cc/64?img=8"
                    alt=""
                    className={cm.cn(`w-8 h-8 rounded-full ring-2 ring-background object-cover`)}
                  />
                </div>
                <span className="font-semibold">
                  {t(
                    'landing.hero.socialProof',
                    { appName: APP_NAME },
                    { defaultValue: '4,200+ product teams ship with {{appName}}' },
                  )}
                </span>
              </div>
            </div>

            <div className={cm.cn(`lg:col-span-6`)}>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_70px_-30px_rgba(37,99,235,0.55)]',
                  'bg-gradient-to-br from-primary via-primary to-primary-container',
                )}
              >
                <div
                  className={cm.cn(
                    `absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl pointer-events-none`,
                  )}
                />
                <div
                  className={cm.cn(
                    `absolute -left-16 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl pointer-events-none`,
                  )}
                />
                <div className="relative z-10">
                  <p
                    className={cm.cn(
                      `text-[10px] uppercase tracking-[0.32em] text-white/70 font-black mb-2`,
                    )}
                  >
                    {t('landing.preview.workspace', {}, { defaultValue: 'Acme Engineering' })}
                  </p>
                  <h3 className={cm.cn(`text-3xl font-extrabold tracking-tight mb-6`)}>
                    {t('landing.preview.boardName', {}, { defaultValue: 'Q2 Product Launch' })}
                  </h3>
                  <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                    {SAMPLE_CARDS.map((card, idx) => (
                      <div
                        key={card.title}
                        className={cm.cn(
                          cm.sp('p', 4),
                          'rounded-2xl bg-surface/15 backdrop-blur-md text-white',
                        )}
                      >
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            'mb-2',
                          )}
                        >
                          <span
                            className={cm.cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                              card.tone === 'rose'
                                ? 'bg-rose-300/30'
                                : card.tone === 'amber'
                                  ? 'bg-amber-300/30'
                                  : 'bg-blue-300/30',
                            )}
                          >
                            {card.label}
                          </span>
                          <span className="text-[11px] font-semibold text-white/70">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="font-bold leading-snug">{card.title}</p>
                        <p className={cm.cn(`text-[11px] text-white/80 font-semibold mt-1`)}>
                          {card.sub}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'mx-auto w-full max-w-7xl')}
        >
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p
              className={cm.cn(
                `text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark mb-3`,
              )}
            >
              {t('landing.features.eyebrow', {}, { defaultValue: 'Why teams switch' })}
            </p>
            <h2
              className={cm.cn(
                `text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface`,
              )}
            >
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Built for the work, not the meta-work.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`)}>
            {FEATURES.map((feature) => (
              <div
                key={feature.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col' }),
                  cm.stack(3),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant/60 transition-colors shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(11),
                    cm.h(11),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-xl bg-primary/10 text-primary',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {feature.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'mx-auto w-full max-w-5xl')}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'relative overflow-hidden rounded-[2rem] text-white text-center',
              'bg-gradient-to-br from-primary via-primary to-primary-container shadow-lg',
            )}
          >
            <div
              className={cm.cn(
                `absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-surface/15 blur-3xl pointer-events-none`,
              )}
            />
            <div className="relative z-10">
              <h2
                className={cm.cn(
                  `text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4`,
                )}
              >
                {t('landing.cta.heading', {}, { defaultValue: 'Ship the next thing.' })}
              </h2>
              <p className={cm.cn(`text-white/85 text-lg max-w-xl mx-auto mb-8`)}>
                {t(
                  'landing.cta.body',
                  {},
                  {
                    defaultValue:
                      'Free for teams up to five. No credit card. Bring your boards or start fresh.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  `inline-flex items-center gap-2 px-7 py-3 rounded-full bg-surface text-primary text-base font-bold shadow-md hover:opacity-95 transition-opacity`,
                )}
              >
                {t('landing.cta.button', {}, { defaultValue: 'Create my workspace' })}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-x-6 gap-y-2',
          'border-t border-outline-variant/20 text-sm text-on-surface-variant',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className="font-bold text-on-surface">{APP_NAME}</span>
          <span>· {APP_TAGLINE}</span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'font-semibold')}>
          <Link
            to="/pricing"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/login"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
            )}
          >
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn(
              `inline-flex items-center py-2 hover:text-on-surface transition-colors`,
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
