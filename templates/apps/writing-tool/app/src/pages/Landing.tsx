import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const FEATURES = [
  {
    icon: 'radio_button_checked',
    titleKey: 'landing.features.editor.title',
    titleDefault: 'Distraction-free editor',
    bodyKey: 'landing.features.editor.body',
    bodyDefault:
      "Noto Serif body, 18px / 1.8 line-height, no toolbars in the way. Markdown when you want it; out of the way when you don't.",
  },
  {
    icon: 'track_changes',
    titleKey: 'landing.features.goals.title',
    titleDefault: 'Smart word goals',
    bodyKey: 'landing.features.goals.body',
    bodyDefault:
      "Set a daily goal. {{appName}} counts in the margin so you don't have to stop reading the line you're on. Watch the progress bar fill.",
  },
  {
    icon: 'center_focus_strong',
    titleKey: 'landing.features.focus.title',
    titleDefault: 'Focus mode',
    bodyKey: 'landing.features.focus.body',
    bodyDefault:
      'Press ⌘⇧F. Everything else disappears. A subtle vignette dims the edges of your screen, keeping your eyes anchored to the text.',
  },
  {
    icon: 'ios_share',
    titleKey: 'landing.features.library.title',
    titleDefault: 'Export anywhere',
    bodyKey: 'landing.features.library.body',
    bodyDefault:
      'Group manuscripts into collections, tag drafts by chapter, and export as Markdown / HTML / plain text. The library reads like a bookshelf, not a list.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-surface text-on-surface')}>
      {/* Top navigation */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            'h-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto',
          )}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex items-center gap-8')}
          >
            <Link
              to="/"
              className="text-2xl font-serif italic font-bold text-primary tracking-tight"
            >
              {APP_NAME}
            </Link>
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                'hidden md:flex items-center gap-6 text-sm text-on-surface-variant',
              )}
            >
              <a href="#features" className="hover:text-primary transition-colors">
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link to="/pricing" className="hover:text-primary transition-colors">
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <Link to="/about" className="hover:text-primary transition-colors">
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </nav>
          </div>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex items-center gap-4')}
          >
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/library"
                className="bg-primary text-on-primary px-4 py-2 rounded font-medium hover:bg-primary-dark transition-colors"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden md:block text-on-surface-variant hover:text-primary transition-colors"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log in' })}
                </Link>
                <Link
                  to="/signup"
                  className="bg-primary text-on-primary px-4 py-2 rounded font-medium hover:bg-primary-dark transition-colors"
                >
                  {t('landing.nav.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, 'flex flex-col pt-16')}>
        {/* Hero — centered headline over the editor page */}
        <section
          className={cm.cn(
            cm.sp('px', 6),
            'pt-24 pb-20 md:px-12 max-w-7xl mx-auto w-full text-center',
          )}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-on-surface">
            {t('landing.hero.headlineLeading', {}, { defaultValue: 'Write' })}{' '}
            <span className="font-serif italic font-normal text-on-surface-variant">
              {t('landing.hero.headlineAccentWord', {}, { defaultValue: 'without' })}
            </span>{' '}
            {t('landing.hero.headlineTail', {}, { defaultValue: 'walls.' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant max-w-2xl mx-auto mb-12')}
          >
            {t(
              'landing.hero.subline',
              { appName: APP_NAME },
              {
                defaultValue:
                  'A quiet, literary space for focused thought. Leave the noise behind and find your flow.',
              },
            )}
          </p>

          {/* Editor page mockup — the design's signature */}
          <div
            className="max-w-[680px] mx-auto bg-surface rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/40 p-8 md:p-12 text-left vignette relative overflow-hidden h-[400px]"
            data-mol-id="landing-hero-editor"
          >
            <div className="editor-text text-on-surface">
              <p className="mb-6">
                {t(
                  'landing.mock.p1',
                  {},
                  {
                    defaultValue:
                      'The cursor blinked steadily, a quiet heartbeat on the blank canvas. Outside, the city hummed with its usual frantic energy, but in here, there was only the gentle cadence of thought translating into form.',
                  },
                )}
              </p>
              <p>
                {t(
                  'landing.mock.p2',
                  {},
                  {
                    defaultValue:
                      'She placed her hands on the keys, took a breath, and began to type. The words flowed not as a trickle, but as a sudden, clear stream, untethered by the distractions that usually plagued her mind.',
                  },
                )}
                <span
                  className="inline-block w-[2px] h-[20px] bg-primary align-middle animate-pulse ml-1"
                  aria-hidden="true"
                />
              </p>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent"
              aria-hidden="true"
            />
          </div>

          <div
            className={cm.cn(
              cm.flex({ justify: 'center', gap: 'md' }),
              'flex flex-wrap items-center justify-center gap-4 mt-10',
            )}
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3 rounded bg-primary text-on-primary text-base font-medium hover:bg-primary-dark transition-colors"
            >
              {t('landing.hero.primaryCta', {}, { defaultValue: 'Start a manuscript' })}
              <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded text-on-surface text-base font-medium border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              {t('landing.hero.secondaryCta', {}, { defaultValue: 'I already write here' })}
            </Link>
          </div>
        </section>

        {/* The page is the app */}
        <section className="py-24 bg-background-secondary">
          <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/3">
              <h2 className="text-3xl font-bold mb-4">
                {t('landing.canvas.heading', {}, { defaultValue: 'The page is the app.' })}
              </h2>
              <p className="text-on-surface-variant mb-6 leading-relaxed">
                {t(
                  'landing.canvas.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'No chrome, no ribbons, no pop-ups. Just you and the words. {{appName}} fades into the background so your ideas can take center stage.',
                  },
                )}
              </p>
            </div>
            <div className="md:w-2/3 w-full">
              <div className="bg-surface rounded border border-outline-variant/40 overflow-hidden shadow-sm">
                <div className="h-64 p-8 overflow-hidden vignette">
                  <div className="editor-text text-on-surface">
                    <p className="mb-4">
                      {t(
                        'landing.mock.p3',
                        {},
                        {
                          defaultValue:
                            'It was a curious sensation, this sudden clarity. For weeks she had struggled to assemble the fragments of the narrative, moving pieces around like a puzzle that refused to resolve.',
                        },
                      )}
                    </p>
                    <p>
                      {t(
                        'landing.mock.p4',
                        {},
                        {
                          defaultValue:
                            'Now, however, the structure seemed evident. It was as if she had stepped back far enough to finally see the whole picture, the distinct shapes emerging from the chaotic scribbles of her earlier drafts.',
                        },
                      )}
                    </p>
                  </div>
                </div>
                {/* Word-count bottom bar */}
                <div className="bg-surface-container-low border-t border-outline-variant/30 p-3 flex justify-between items-center text-xs text-on-surface-variant">
                  <div className={cm.cn(cm.flex({ gap: 'md' }), 'flex gap-4')}>
                    <span>{t('landing.canvas.words', {}, { defaultValue: '1,240 words' })}</span>
                    <span>{t('landing.canvas.readTime', {}, { defaultValue: '5 min read' })}</span>
                  </div>
                  <div
                    className="w-32 h-1 bg-surface-container-highest rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={67}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t(
                      'landing.canvas.goalProgress',
                      {},
                      { defaultValue: 'Daily goal progress' },
                    )}
                  >
                    <div className="h-full bg-primary w-[67%] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'md:px-12 max-w-7xl mx-auto w-full')}
        >
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-lg bg-surface border border-outline-variant/40 shadow-sm',
                )}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {feature.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), 'font-semibold mb-2')}>
                  {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, { appName: APP_NAME }, { defaultValue: feature.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 20), 'mx-auto w-full max-w-5xl')}>
          <div
            className={cm.cn(
              cm.sp('p', 12),
              'relative overflow-hidden rounded-xl text-center',
              'bg-background-secondary border border-outline-variant/40',
            )}
          >
            <div className={cm.cn('relative z-10')}>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4 text-on-surface">
                {t('landing.cta.heading', {}, { defaultValue: 'Open the page.' })}
              </h2>
              <p className="text-on-surface-variant text-lg max-w-xl mx-auto mb-8">
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
                className="inline-flex items-center gap-2 px-7 py-3 rounded bg-primary text-on-primary text-base font-medium hover:bg-primary-dark transition-colors"
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

      {/* Footer */}
      <footer className="w-full py-12 md:py-20 bg-surface-container-low border-t border-outline-variant/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6 md:px-12 max-w-7xl mx-auto text-sm">
          <div className="flex flex-col gap-3 col-span-2 md:col-span-1">
            <span className="font-serif italic text-lg text-on-surface">{APP_NAME}</span>
            <p className="text-on-surface-variant mt-4">
              {t(
                'landing.footer.tagline',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}}. A space for focused thought.' },
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
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <a
              href="#features"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/about"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/login"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span>{APP_TAGLINE}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
