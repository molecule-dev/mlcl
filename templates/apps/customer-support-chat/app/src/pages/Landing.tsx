import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/** Grayscale wordmarks for the "trusted by" band (design shows partner logos). */
const TRUSTED_LOGOS = ['TechFlow', 'Nova', 'RetailHub', 'Brightline', 'Corelink']

/** Compact feature strip under the hero (icon tile + title + one-liner). */
const FEATURE_STRIP = [
  {
    icon: 'inbox',
    key: 'landing.strip.inbox',
    title: 'Unified inbox',
    body: 'Bring email, chat, and social into one cohesive workspace.',
  },
  {
    icon: 'route',
    key: 'landing.strip.routing',
    title: 'AI-powered routing',
    body: 'Automatically assign complex issues to the right expert immediately.',
  },
  {
    icon: 'monitoring',
    key: 'landing.strip.csat',
    title: 'CSAT-first reporting',
    body: 'Measure success by customer sentiment, not just handle times.',
  },
] as const

/** Wide capability grid near the footer (cyan icon + label tiles). */
const CAPABILITY_GRID = [
  { icon: 'hub', key: 'landing.grid.omnichannel', label: 'Omnichannel' },
  { icon: 'smart_toy', key: 'landing.grid.botHandoff', label: 'Bot Handoff' },
  { icon: 'flash_on', key: 'landing.grid.macros', label: 'Smart Macros' },
  { icon: 'alt_route', key: 'landing.grid.skillsRouting', label: 'Skills Routing' },
  { icon: 'insights', key: 'landing.grid.analytics', label: 'Deep Analytics' },
  { icon: 'extension', key: 'landing.grid.integrations', label: '100+ Integrations' },
  { icon: 'translate', key: 'landing.grid.multilingual', label: 'Multilingual' },
  { icon: 'shield', key: 'landing.grid.security', label: 'Enterprise Security' },
] as const

/** Testimonial cards (design: five violet stars + italic quote + avatar). */
const TESTIMONIALS = [
  {
    key: 'landing.testimonial.one',
    quote:
      'Parlance completely changed how our team handles volume. The contextual notes feel like a superpower during escalations.',
    name: 'Sarah Jenkins',
    role: 'CX Lead, TechFlow',
    initials: 'SJ',
  },
  {
    key: 'landing.testimonial.two',
    quote:
      'Finally, a tool that focuses on the human element. Our CSAT scores jumped 15% in the first quarter of using the platform.',
    name: 'Marcus Wright',
    role: 'Support Director, Nova',
    initials: 'MW',
  },
  {
    key: 'landing.testimonial.three',
    quote:
      'The UI is clean, fast, and the AI routing actually works. It gets issues to the right tier-2 agent almost instantly.',
    name: 'Elena Rostova',
    role: 'VP Operations, RetailHub',
    initials: 'ER',
  },
] as const

function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn('bg-surface text-on-surface')}>
      {/* Top nav — fixed, blurred white, hairline bottom border */}
      <header
        className={cm.cn(
          'sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[color:var(--color-border)] shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'h-16 px-6 md:px-12 max-w-7xl mx-auto',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
            <Link
              to="/"
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'text-primary tracking-tighter',
              )}
            >
              {APP_NAME}
            </Link>
            <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
              <a
                href="#product"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-primary border-b-2 border-primary pb-1',
                )}
              >
                {t('nav.product', {}, { defaultValue: 'Product' })}
              </a>
              <a
                href="#solutions"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.nav.solutions', {}, { defaultValue: 'Solutions' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.nav.resources', {}, { defaultValue: 'Resources' })}
              </a>
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            {isAuthenticated ? (
              <Link
                to="/inbox"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded bg-primary text-white shadow-sm hover:bg-[var(--color-bot-accent)] transition-all active:scale-95',
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
                    'hidden sm:block text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded bg-primary text-white shadow-sm hover:bg-[var(--color-bot-accent)] transition-all active:scale-95',
                  )}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — 55/45 split: copy + CTAs + trust band left, chat mockup right */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 12 }),
          'pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-[560px] lg:flex-row lg:items-center',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'start', gap: 8 }),
            'w-full lg:w-[55%] z-10',
          )}
        >
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('bold'),
              'tracking-tight leading-[1.1] text-5xl md:text-[64px]',
            )}
          >
            {t('landing.hero.title', {}, { defaultValue: 'Every message matters' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.maxW('xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'landing.hero.subtitle',
              {},
              {
                defaultValue:
                  'The empathetic support workspace built for modern teams. Connect with your customers like humans, not tickets.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              'flex-col sm:flex-row w-full sm:w-auto',
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('medium'),
                cm.textSize('lg'),
                'rounded bg-primary text-white shadow-md hover:bg-[var(--color-bot-accent)] transition-all text-center w-full sm:w-auto active:scale-95',
              )}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
            <a
              href="#product"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('px', 8),
                cm.sp('py', 4),
                cm.fontWeight('medium'),
                cm.textSize('lg'),
                'group rounded text-primary hover:bg-primary-light transition-all text-center w-full sm:w-auto',
              )}
            >
              {t('landing.hero.secondary', {}, { defaultValue: 'Book a demo' })}
              <span
                className="material-symbols-outlined transition-transform group-hover:translate-x-1"
                style={{ fontSize: 20 }}
              >
                arrow_forward
              </span>
            </a>
          </div>
          <div
            className={cm.cn(
              'pt-8 border-t border-[color:var(--color-border-secondary)] w-full mt-4',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-text-secondary mb-4 uppercase tracking-wider',
              )}
            >
              {t('landing.trustedBy', { count: 2400 }, { defaultValue: 'Trusted by 2,400+ teams' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 6 }),
                'sm:gap-10 opacity-60 grayscale flex-wrap',
              )}
            >
              {TRUSTED_LOGOS.map((logo) => (
                <span
                  key={logo}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                    'tracking-tight text-slate-500 whitespace-nowrap',
                  )}
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right 45% — chat mockup card with floating launcher */}
        <div className={cm.cn('w-full lg:w-[45%] relative mt-12 lg:mt-0')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-primary-light rounded-full blur-3xl opacity-70 -z-10 translate-x-10 -translate-y-10',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'bg-surface rounded-lg shadow-lg border border-[color:var(--color-border-secondary)] overflow-hidden h-[400px] w-full max-w-md mx-auto relative',
            )}
          >
            {/* Mockup header */}
            <div
              className={cm.cn(
                'h-12 border-b border-[color:var(--color-border-secondary)] bg-surface-secondary flex items-center px-4 justify-between',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                <div
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-primary text-white flex items-center justify-center',
                  )}
                >
                  {t('landing.mockup.initials', {}, { defaultValue: 'JS' })}
                </div>
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-text leading-tight',
                    )}
                  >
                    {t('landing.mockup.customerName', {}, { defaultValue: 'Jane Smith' })}
                  </p>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                    <div className={cm.cn('w-2 h-2 rounded-full bg-success border border-white')} />
                    <span className={cm.cn(cm.textSize('xs'), 'text-text-secondary')}>
                      {t('landing.mockup.activeNow', {}, { defaultValue: 'Active now' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className={cm.cn(cm.flex({ gap: 2 }), 'text-text-secondary')}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  star
                </span>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  more_vert
                </span>
              </div>
            </div>
            {/* Mockup chat area */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                'flex-1 p-4 overflow-hidden bg-surface',
              )}
            >
              <div
                className={cm.cn(
                  'self-end bg-surface-hover text-text px-4 py-2.5 rounded-[12px_4px_12px_12px] max-w-[85%] text-sm shadow-sm',
                )}
              >
                {t(
                  'landing.mockup.agentOne',
                  {},
                  {
                    defaultValue:
                      "Hi Jane! I see you're having trouble with the billing page. Let me take a look.",
                  },
                )}
              </div>
              <div
                className={cm.cn(
                  cm.flex({ gap: 2 }),
                  'self-start bg-[color:var(--color-border-secondary)] text-text px-4 py-2.5 rounded-[4px_12px_12px_12px] max-w-[85%] text-sm shadow-sm',
                )}
              >
                <div className="w-6 h-6 rounded-full bg-[color:var(--color-border)] shrink-0 mt-0.5" />
                <div>
                  {t(
                    'landing.mockup.customer',
                    {},
                    {
                      defaultValue:
                        'Yes, it keeps showing a loading spinner when I try to update my card.',
                    },
                  )}
                </div>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 2 }),
                  'self-center w-full bg-[color:var(--color-note-bg)] border border-dashed border-[color:var(--color-note-border)] text-[color:var(--color-note-text)] px-3 py-2 rounded text-xs italic shadow-sm',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  lock
                </span>
                <span>
                  {t(
                    'landing.mockup.note',
                    {},
                    {
                      defaultValue:
                        'Checking her account status. Looks like a stuck API call. Escalating quietly.',
                    },
                  )}
                </span>
              </div>
              <div
                className={cm.cn(
                  'self-end bg-primary text-white px-4 py-2.5 rounded-[12px_4px_12px_12px] max-w-[85%] text-sm shadow-sm relative',
                )}
              >
                {t(
                  'landing.mockup.agentTwo',
                  {},
                  {
                    defaultValue:
                      "Got it! I've just refreshed the connection on our end. Could you try reloading the page?",
                  },
                )}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'absolute -bottom-2 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-white shadow-sm',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-white font-bold"
                    style={{ fontSize: 8, fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
              </div>
            </div>
            {/* Floating launcher */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute -bottom-4 -right-4 w-14 h-14 bg-primary rounded-full shadow-lg border-4 border-white z-20 hover:scale-105 transition-transform',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
                chat_bubble
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip — three icon tiles on a banded white strip */}
      <section
        className={cm.cn('py-16 bg-surface border-y border-[color:var(--color-border-secondary)]')}
      >
        <div className={cm.cn('max-w-7xl mx-auto px-6 md:px-12')}>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'md:grid-cols-3')}>
            {FEATURE_STRIP.map((feature) => (
              <div key={feature.key} className={cm.cn(cm.flex({ align: 'start', gap: 4 }))}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'rounded bg-primary-light text-primary shrink-0',
                  )}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    {feature.icon}
                  </span>
                </div>
                <div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      'text-text mb-1',
                    )}
                  >
                    {t(feature.key, {}, { defaultValue: feature.title })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`${feature.key}Body`, {}, { defaultValue: feature.body })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase — centered heading + product UI mockup (rail, list, thread) */}
      <section id="solutions" className={cm.cn('py-24 bg-surface-secondary')}>
        <div className={cm.cn('max-w-7xl mx-auto px-6 md:px-12 text-center mb-16')}>
          <h2
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'text-text mb-4 tracking-tight',
            )}
          >
            {t(
              'landing.showcase.title',
              {},
              { defaultValue: 'See what your customers feel, not just what they say.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
            {t(
              'landing.showcase.subtitle',
              {},
              {
                defaultValue:
                  'Our interface is designed to highlight empathy and context, empowering agents to deliver exceptional support experiences.',
              },
            )}
          </p>
        </div>
        <div id="product" className={cm.cn('max-w-5xl mx-auto px-6')}>
          <div
            className={cm.cn(
              'relative bg-surface rounded-lg shadow-xl border border-[color:var(--color-border)] p-2 overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({}),
                'bg-surface-secondary h-[500px] border border-[color:var(--color-border-secondary)] overflow-hidden',
              )}
            >
              {/* Icon rail */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center', gap: 4 }),
                  'w-16 bg-surface border-r border-[color:var(--color-border)] py-4 shrink-0',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    'rounded bg-primary-light text-primary mb-4',
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                  >
                    home
                  </span>
                </div>
                {['inbox', 'group', 'bar_chart'].map((icon, index) => (
                  <div
                    key={icon}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      'relative rounded text-text-secondary hover:bg-[color:var(--color-border-secondary)]',
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {icon}
                    </span>
                    {index === 1 && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-status-error-text)] rounded-full" />
                    )}
                  </div>
                ))}
              </div>
              {/* Conversation list */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'w-64 bg-surface border-r border-[color:var(--color-border)] shrink-0 hidden md:flex',
                )}
              >
                <div className={cm.cn('p-4 border-b border-[color:var(--color-border-secondary)]')}>
                  <div className={cm.cn('h-8 bg-surface-hover rounded w-full')} />
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 2 }),
                    'p-4 border-l-2 border-primary bg-surface-secondary',
                  )}
                >
                  <div className={cm.cn('h-4 bg-slate-800 rounded w-24')} />
                  <div className={cm.cn('h-3 bg-slate-400 rounded w-full')} />
                </div>
                {[32, 20].map((width) => (
                  <div
                    key={width}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 2 }),
                      'p-4 border-b border-[color:var(--color-border-secondary)] opacity-50',
                    )}
                  >
                    <div className={cm.cn('h-4 bg-slate-800 rounded')} style={{ width }} />
                    <div className={cm.cn('h-3 bg-slate-400 rounded w-3/4')} />
                  </div>
                ))}
              </div>
              {/* Thread pane */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'flex-1 bg-surface-secondary relative min-w-0',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    'h-14 bg-surface border-b border-[color:var(--color-border)] px-6 shrink-0',
                  )}
                >
                  <div className={cm.cn('w-32 h-4 bg-[color:var(--color-border)] rounded')} />
                  <div className={cm.cn('w-16 h-6 bg-primary-light rounded-full')} />
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 4 }),
                    'flex-1 p-6 overflow-hidden',
                  )}
                >
                  <div
                    className={cm.cn(
                      'self-start bg-surface shadow-sm p-3 rounded-[4px_12px_12px_12px] w-3/4 h-16 relative',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'absolute -left-3 top-3 w-8 h-8 rounded-full bg-[var(--color-status-warning-bg)] border-2 border-white',
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-[color:var(--color-status-warning-text)]"
                        style={{ fontSize: 14 }}
                      >
                        mood_bad
                      </span>
                    </div>
                  </div>
                  <div
                    className={cm.cn(
                      'self-end bg-surface-hover shadow-sm p-3 rounded-[12px_4px_12px_12px] w-2/3 h-20',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'self-start bg-surface shadow-sm p-3 rounded-[4px_12px_12px_12px] w-1/2 h-12',
                    )}
                  />
                </div>
                <div
                  className={cm.cn(
                    'h-20 bg-surface border-t border-[color:var(--color-border)] p-4 shrink-0',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      'w-full h-full border border-[color:var(--color-border)] rounded bg-surface-secondary px-4',
                    )}
                  >
                    <div className={cm.cn('w-4 h-4 bg-slate-300 rounded-sm')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={cm.cn('py-24 bg-surface')}>
        <div className={cm.cn('max-w-7xl mx-auto px-6 md:px-12')}>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'text-text text-center mb-12 tracking-tight',
            )}
          >
            {t('landing.testimonials.title', {}, { defaultValue: 'Beloved by support heroes' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'md:grid-cols-3')}>
            {TESTIMONIALS.map((item) => (
              <div
                key={item.key}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  'bg-surface-secondary rounded-lg p-8 border border-[color:var(--color-border-secondary)] shadow-sm',
                )}
              >
                <div className={cm.cn(cm.flex({ gap: 0 }), 'text-[var(--color-bot-accent)] mb-4')}>
                  {[0, 1, 2, 3, 4].map((star) => (
                    <span
                      key={star}
                      className="material-symbols-outlined"
                      style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className={cm.cn(cm.textSize('base'), 'text-text-secondary italic mb-6')}>
                  “{t(item.key, {}, { defaultValue: item.quote })}”
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'bg-[color:var(--color-border)] text-text-secondary',
                    )}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <div
                      className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-text')}
                    >
                      {item.name}
                    </div>
                    <div className={cm.cn(cm.textSize('xs'), 'text-text-secondary')}>
                      {item.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capability grid */}
      <section
        id="features"
        className={cm.cn('py-20 bg-surface-secondary border-t border-[color:var(--color-border)]')}
      >
        <div className={cm.cn('max-w-7xl mx-auto px-6 md:px-12')}>
          <h2 className="sr-only">
            {t('landing.grid.title', {}, { defaultValue: 'Comprehensive Features' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }), 'md:grid-cols-4')}>
            {CAPABILITY_GRID.map((item) => (
              <div
                key={item.key}
                className={cm.cn(
                  'bg-surface p-6 rounded shadow-sm border border-[color:var(--color-border-secondary)] hover:border-primary transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-secondary mb-3 block">
                  {' '}
                  {item.icon}
                </span>
                <h4 className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-text')}>
                  {t(item.key, {}, { defaultValue: item.label })}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band — violet-to-cyan gradient */}
      <section className={cm.cn('py-24 relative overflow-hidden')}>
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'max-w-4xl mx-auto px-6 text-center relative z-10 flex flex-col items-center gap-8',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('bold'),
              'text-white tracking-tight',
            )}
          >
            {t('landing.cta.title', {}, { defaultValue: 'Ready to make every message matter?' })}
          </h2>
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 10),
              cm.sp('py', 4),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'bg-surface text-primary rounded hover:bg-surface-secondary transition-colors shadow-xl active:scale-95',
            )}
          >
            {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
          </Link>
        </div>
      </section>

      {/* Footer — dark four-column band */}
      <footer
        className={cm.cn(
          'bg-[color:var(--color-footer)] text-[color:var(--color-text-secondary)] py-12 w-full border-t border-[color:var(--color-border)]',
        )}
      >
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 8 }),
            'px-6 md:px-12 max-w-7xl mx-auto md:grid-cols-2 lg:grid-cols-4',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-white tracking-tighter',
              )}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-slate-400 max-w-xs')}>
              {t(
                'landing.footer.tagline',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}}. Human-centric customer support.' },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <h4
              className={cm.cn('text-white', cm.fontWeight('semibold'), cm.textSize('sm'), 'mb-2')}
            >
              {t('landing.footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <a
              href="#product"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#solutions"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('landing.nav.solutions', {}, { defaultValue: 'Solutions' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <h4
              className={cm.cn('text-white', cm.fontWeight('semibold'), cm.textSize('sm'), 'mb-2')}
            >
              {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <Link
              to="/privacy"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(cm.textSize('sm'), 'hover:text-secondary transition-colors')}
            >
              {t('landing.footer.status', {}, { defaultValue: 'Status' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            <h4
              className={cm.cn('text-white', cm.fontWeight('semibold'), cm.textSize('sm'), 'mb-2')}
            >
              {t('landing.footer.connect', {}, { defaultValue: 'Connect' })}
            </h4>
            <div className={cm.cn(cm.flex({ gap: 4 }))}>
              <a
                href="#top"
                aria-label={t('landing.footer.share', {}, { defaultValue: 'Share' })}
                className={cm.cn('text-slate-400 hover:text-primary transition-colors')}
              >
                <span className="material-symbols-outlined">share</span>
              </a>
              <a
                href="#top"
                aria-label={t('landing.footer.email', {}, { defaultValue: 'Email' })}
                className={cm.cn('text-slate-400 hover:text-primary transition-colors')}
              >
                <span className="material-symbols-outlined">mail</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
