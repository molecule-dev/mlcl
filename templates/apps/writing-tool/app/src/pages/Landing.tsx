import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'menu_book',
    titleKey: 'landing.features.editor.title',
    titleDefault: 'Distraction-free editor',
    bodyKey: 'landing.features.editor.body',
    bodyDefault:
      "Charter-Georgia serif body, 18px / 1.8 line-height, no toolbars in the way. Markdown when you want it; out of the way when you don't.",
  },
  {
    icon: 'center_focus_strong',
    titleKey: 'landing.features.focus.title',
    titleDefault: 'Typewriter focus mode',
    bodyKey: 'landing.features.focus.body',
    bodyDefault:
      'Press ⌘⇧F. The chrome disappears, the active line stays centered, and a soft vignette frames the page like a writing room at dusk.',
  },
  {
    icon: 'flag',
    titleKey: 'landing.features.goals.title',
    titleDefault: 'Word goals + streaks',
    bodyKey: 'landing.features.goals.body',
    bodyDefault:
      "Set a daily goal. {{appName}} counts in the margin so you don't have to stop reading the line you're on. Streaks keep you honest.",
  },
  {
    icon: 'auto_stories',
    titleKey: 'landing.features.library.title',
    titleDefault: 'A library, not an inbox',
    bodyKey: 'landing.features.library.body',
    bodyDefault:
      'Group manuscripts into collections, tag drafts by chapter, and export as Markdown / HTML / plain text. The library reads like a bookshelf, not a list.',
  },
] as const

const SAMPLE_LINES = [
  { kind: 'h1' as const, text: 'Chapter Three' },
  {
    kind: 'p' as const,
    text: 'The kettle finally settled, and the words came in the order they had been waiting for.',
  },
  {
    kind: 'p' as const,
    text: 'She set the page down once, twice — then trusted the line and let it stand.',
  },
  { kind: 'callout' as const, text: "Don't look at the word count. Look at the cursor." },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'flex-wrap gap-y-3 px-4 py-3 sm:px-6 sm:py-5',
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
              draw
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            style={{
              fontFamily:
                'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav
          className={cm.cn(
            cm.flex({ align: 'center' }),
            'flex-wrap gap-x-2 gap-y-2 sm:gap-x-6 text-sm font-semibold text-on-surface-variant',
          )}
        >
          <a
            href="#features"
            className={cm.cn('hidden sm:inline hover:text-on-surface transition-colors')}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link
            to="/about"
            className={cm.cn('hidden sm:inline hover:text-on-surface transition-colors')}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/library"
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
                {t('landing.nav.getStarted', {}, { defaultValue: 'Start writing' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className={cm.cn(cm.flex1, 'flex flex-col')}>
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
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  edit_note
                </span>
                {t(
                  'landing.hero.eyebrow',
                  {},
                  { defaultValue: 'A writing room you can keep in your pocket' },
                )}
              </span>
              <h1
                className={cm.cn(
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
                )}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t('landing.hero.headlineLeading', {}, { defaultValue: 'Write' })}
                <br />
                <span
                  className={cm.cn(
                    'bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent',
                  )}
                >
                  {t('landing.hero.headlineAccent', {}, { defaultValue: 'without walls.' })}
                </span>
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 6),
                  'text-lg text-on-surface-variant max-w-xl leading-relaxed',
                )}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t(
                  'landing.hero.subline',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a calm long-form editor for novelists, essayists, and journalists. Typewriter scroll, gentle word goals, and a sparing but well-thought-out document library — so the page is the only thing on the screen.',
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
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start a manuscript' })}
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'px-6 py-3 rounded-full text-on-surface text-base font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('landing.hero.secondaryCta', {}, { defaultValue: 'I already write here' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.sp('mt', 8),
                  'flex items-center gap-4 text-sm text-on-surface-variant',
                )}
              >
                <div className={cm.cn('flex -space-x-2')}>
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-full ring-2 ring-background bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary text-xs font-bold',
                    )}
                  >
                    JM
                  </span>
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-full ring-2 ring-background bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-on-primary text-xs font-bold',
                    )}
                  >
                    AK
                  </span>
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-full ring-2 ring-background bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-on-primary-container text-xs font-bold',
                    )}
                  >
                    RP
                  </span>
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-full ring-2 ring-background bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-on-primary text-xs font-bold',
                    )}
                  >
                    EH
                  </span>
                </div>
                <span className={cm.cn('font-semibold')}>
                  {t(
                    'landing.hero.socialProof',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '8,400+ novelists, essayists, and working journalists draft in {{appName}}',
                    },
                  )}
                </span>
              </div>
            </div>

            <div className={cm.cn('lg:col-span-6')}>
              <div
                className={cm.cn(
                  cm.sp('p', 8),
                  'relative overflow-hidden rounded-[2rem] text-white shadow-[0_30px_70px_-30px_rgba(124,58,237,0.55)]',
                  'bg-gradient-to-br from-primary via-primary to-primary-container',
                )}
              >
                <div
                  className={cm.cn(
                    'absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl pointer-events-none',
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cm.cn(
                    'absolute -left-16 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl pointer-events-none',
                  )}
                  aria-hidden="true"
                />
                <div className={cm.cn('relative z-10')}>
                  <p
                    className={cm.cn(
                      'text-[10px] uppercase tracking-[0.32em] text-white/70 font-black mb-2',
                    )}
                  >
                    {t('landing.preview.collection', {}, { defaultValue: 'Manuscript · Draft 7' })}
                  </p>
                  <h3
                    className={cm.cn('text-3xl font-extrabold tracking-tight mb-6')}
                    style={{
                      fontFamily:
                        'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                    }}
                  >
                    {t(
                      'landing.preview.title',
                      {},
                      { defaultValue: 'A Quiet Hour Before Sunrise' },
                    )}
                  </h3>
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface/15 backdrop-blur-md text-white shadow-lg',
                    )}
                  >
                    <ol className={cm.cn('space-y-3 text-[14px] leading-relaxed font-medium')}>
                      {SAMPLE_LINES.map((line, i) => (
                        <li key={i} className={cm.cn('flex items-start gap-3')}>
                          {line.kind === 'h1' ? (
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
                                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                                }}
                              >
                                {line.text}
                              </span>
                            </>
                          ) : line.kind === 'p' ? (
                            <>
                              <span
                                className={cm.cn(
                                  'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-surface/15 text-white/80',
                                )}
                              >
                                P
                              </span>
                              <span
                                className={cm.cn('flex-1 text-white/95')}
                                style={{
                                  fontFamily:
                                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                                }}
                              >
                                {line.text}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                className={cm.cn(
                                  'material-symbols-outlined text-[16px] mt-1 text-amber-200',
                                )}
                                aria-hidden="true"
                              >
                                lightbulb
                              </span>
                              <span
                                className={cm.cn('flex-1 italic text-amber-50')}
                                style={{
                                  fontFamily:
                                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                                }}
                              >
                                {line.text}
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
                        #novel
                      </span>
                      <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>
                        #chapter-3
                      </span>
                      <span className={cm.cn('ml-auto inline-flex items-center gap-1')}>
                        <span
                          className={cm.cn('material-symbols-outlined text-[14px]')}
                          aria-hidden="true"
                        >
                          edit_note
                        </span>
                        248 words
                      </span>
                    </div>
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
          <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
            <p
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-[0.32em] text-primary mb-3',
              )}
            >
              {t(
                'landing.features.eyebrow',
                {},
                { defaultValue: 'Every primitive a long-form writer needs' },
              )}
            </p>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface',
              )}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
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
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </span>
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}
                  style={{
                    fontFamily:
                      'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
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
              aria-hidden="true"
            />
            <div className={cm.cn('relative z-10')}>
              <h2
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4',
                )}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t('landing.cta.heading', {}, { defaultValue: 'Open the page.' })}
              </h2>
              <p className={cm.cn('text-white/85 text-lg max-w-xl mx-auto mb-8')}>
                {t(
                  'landing.cta.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Free for personal use. Pro for serious drafts. Bring your existing markdown or start fresh — {{appName}} meets you wherever the manuscript lives.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-7 py-3 rounded-full bg-surface text-primary text-base font-bold shadow-md hover:opacity-95 transition-opacity',
                )}
              >
                {t('landing.cta.button', {}, { defaultValue: 'Start a manuscript' })}
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  arrow_forward
                </span>
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
              fontFamily:
                'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
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
