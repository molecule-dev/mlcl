import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'menu_book',
    titleKey: 'landing.features.editor.title',
    titleDefault: 'Quiet block editor',
    bodyKey: 'landing.features.editor.body',
    bodyDefault:
      "Headings, lists, code, callouts. Slash-commands when you want them; out of the way when you don't.",
  },
  {
    icon: 'hub',
    titleKey: 'landing.features.graph.title',
    titleDefault: 'Backlinks + graph',
    bodyKey: 'landing.features.graph.body',
    bodyDefault:
      'Type [[ to link a note. {{appName}} threads them together so you can see how thinking connects.',
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

const SAMPLE_OUTLINE = [
  { kind: 'h1' as const, text: 'On letting drafts breathe' },
  {
    kind: 'p' as const,
    text: 'A second pass tomorrow always reads better than a first pass tonight.',
  },
  { kind: 'callout' as const, text: 'Park rough cuts in the deep work folder before bed.' },
  { kind: 'todo' as const, text: 'Re-read the morning before the standup', done: true },
  { kind: 'todo' as const, text: 'Revise the lead paragraph', done: false },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      {/* Top nav */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
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
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            'text-sm font-semibold text-on-surface-variant',
          )}
        >
          <a href="#features" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/about" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/home"
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
                  'px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors',
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
        {/* Hero */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'mx-auto w-full max-w-7xl')}>
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
            <div className={cm.cn('lg:col-span-6')}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'inline-flex w-fit px-3 py-1 mb-6 rounded-full text-[11px] font-black uppercase tracking-widest',
                  'bg-primary/10 text-primary',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>edit_note</span>
                {t('landing.hero.eyebrow', {}, { defaultValue: 'A quiet writing surface' })}
              </span>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
                )}
                style={{
                  fontFamily:
                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
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
                  cm.sp('mt', 6),
                  'text-lg text-on-surface-variant max-w-xl leading-relaxed',
                )}
              >
                {t(
                  'landing.hero.subline',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a structured note-taking surface for knowledge workers and students. Block editor, nested notebooks, backlinks, and a knowledge graph — all behind a typography-first reading experience.',
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
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start your knowledge base' })}
                  <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'px-6 py-3 rounded-full text-on-surface text-base font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors',
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
            </div>

            {/* Sample editor preview — mirrors the auth'd editor */}
            <div className={cm.cn('lg:col-span-6')}>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_70px_-30px_rgba(59,95,192,0.55)]',
                  'bg-gradient-to-br from-primary via-primary to-primary-container',
                )}
              >
                <div
                  className={cm.cn(
                    'absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl pointer-events-none',
                  )}
                />
                <div
                  className={cm.cn(
                    'absolute -left-16 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl pointer-events-none',
                  )}
                />
                <div className={cm.cn('relative z-10')}>
                  <p
                    className={cm.cn(
                      'text-[10px] uppercase tracking-[0.32em] text-white/70 font-black mb-2',
                    )}
                  >
                    {t(
                      'landing.preview.notebook',
                      {},
                      { defaultValue: 'Knowledge · Writing process' },
                    )}
                  </p>
                  <h3
                    className={cm.cn('text-3xl font-extrabold tracking-tight mb-6')}
                    style={{
                      fontFamily:
                        'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                    }}
                  >
                    {t('landing.preview.title', {}, { defaultValue: 'On letting drafts breathe' })}
                  </h3>
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface/15 backdrop-blur-md text-white shadow-lg',
                    )}
                  >
                    <ol className={cm.cn('space-y-3 text-[14px] leading-relaxed font-medium')}>
                      {SAMPLE_OUTLINE.map((b, i) => (
                        <li key={i} className={cm.cn('flex items-start gap-3')}>
                          {b.kind === 'h1' ? (
                            <>
                              <span
                                className={cm.cn(
                                  'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-surface/20',
                                )}
                              >
                                H1
                              </span>
                              <span
                                className={cm.cn('flex-1 font-bold text-[16px]')}
                                style={{
                                  fontFamily:
                                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                                }}
                              >
                                {b.text}
                              </span>
                            </>
                          ) : b.kind === 'p' ? (
                            <>
                              <span
                                className={cm.cn(
                                  'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-surface/15 text-white/80',
                                )}
                              >
                                P
                              </span>
                              <span
                                className={cm.cn('flex-1 text-white/90')}
                                style={{
                                  fontFamily:
                                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                                }}
                              >
                                {b.text}
                              </span>
                            </>
                          ) : b.kind === 'callout' ? (
                            <>
                              <span
                                className={cm.cn(
                                  'material-symbols-outlined text-[16px] mt-1 text-amber-200',
                                )}
                              >
                                lightbulb
                              </span>
                              <span className={cm.cn('flex-1 italic text-amber-50')}>{b.text}</span>
                            </>
                          ) : (
                            <>
                              <span
                                className={cm.cn(
                                  'shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                                  b.done
                                    ? 'bg-emerald-300 border-emerald-300 text-primary'
                                    : 'border-surface/50 text-transparent',
                                )}
                              >
                                ✓
                              </span>
                              <span
                                className={cm.cn('flex-1', b.done && 'line-through opacity-70')}
                              >
                                {b.text}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div
                      className={cm.cn(
                        'mt-4 pt-4 border-t border-surface/15 flex items-center gap-2 text-[11px] font-semibold text-white/80',
                      )}
                    >
                      <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>
                        #writing
                      </span>
                      <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>
                        #process
                      </span>
                      <span className={cm.cn('ml-auto inline-flex items-center gap-1')}>
                        <span className={cm.cn('material-symbols-outlined text-[14px]')}>link</span>
                        3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'mx-auto w-full max-w-7xl')}
        >
          <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.32em] text-primary mb-3',
              )}
            >
              {t(
                'landing.features.eyebrow',
                {},
                { defaultValue: 'Every primitive your second brain needs' },
              )}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
              )}
              style={{
                fontFamily:
                  'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Built for the work, not the meta-work.' },
              )}
            </h2>
          </div>
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6')}>
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
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {feature.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}
                  style={{
                    fontFamily:
                      'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                  }}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(feature.bodyKey, { appName: APP_NAME }, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA card */}
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
                'absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-surface/15 blur-3xl pointer-events-none',
              )}
            />
            <div className={cm.cn('relative z-10')}>
              <h2
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4',
                )}
                style={{
                  fontFamily:
                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t('landing.cta.heading', {}, { defaultValue: "Open today's page." })}
              </h2>
              <p className={cm.cn('text-white/85 text-lg max-w-xl mx-auto mb-8')}>
                {t(
                  'landing.cta.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Free for personal use. Pro for teams. Bring your existing markdown or start fresh — {{appName}} meets you wherever your notes are.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3 rounded-full bg-surface text-primary text-base font-bold shadow-md hover:opacity-95 transition-opacity',
                )}
              >
                {t('landing.cta.button', {}, { defaultValue: 'Create my workspace' })}
                <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
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
          'border-t border-outline-variant/20 text-sm text-on-surface-variant',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn('font-bold text-on-surface')}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {APP_NAME}
          </span>
          <span>· {APP_TAGLINE}</span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'font-semibold')}>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/login" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
          </Link>
          <Link to="/about" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
