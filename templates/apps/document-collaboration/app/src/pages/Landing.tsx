import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'realtime',
    icon: 'edit_note',
    defaultTitle: 'Real-time co-writing',
    defaultBody:
      'See cursors and selections from every collaborator. No saving, no collisions, no lost paragraphs.',
  },
  {
    key: 'comments',
    icon: 'forum',
    defaultTitle: 'Threads in the margin',
    defaultBody:
      'Resolve, reopen, or @mention. Inline conversations live where the prose actually lives.',
  },
  {
    key: 'history',
    icon: 'history',
    defaultTitle: 'A history you can trust',
    defaultBody:
      'Every revision saved, named, and diffed. Restore, branch, or just rest knowing nothing is gone.',
  },
  {
    key: 'sharing',
    icon: 'group',
    defaultTitle: 'Permissions that respect drafts',
    defaultBody:
      'Public, restricted, or private — fine-grained roles for editors, commenters, and viewers.',
  },
] as const

/* Social-proof wordmarks — grayscale publication names, mixed serif/sans
   per the design's logo band. */
const PROOF = [
  { key: 'editorial', defaultLabel: 'The Chronicle', className: 'font-serif font-bold' },
  {
    key: 'authors',
    defaultLabel: 'Atelier Press',
    className: 'font-sans font-bold tracking-tight',
  },
  { key: 'agencies', defaultLabel: 'Novella', className: 'font-serif italic font-bold' },
  { key: 'newsrooms', defaultLabel: 'Folio', className: 'font-sans font-bold uppercase' },
  { key: 'quarterly', defaultLabel: 'Quarterly', className: 'font-serif font-bold' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant bg-surface/90 backdrop-blur',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'mx-auto',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tighter text-primary',
            )}
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-xl bg-primary text-on-primary shadow-sm hover:bg-primary-hover transition-colors',
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
                    'inline-flex min-h-[36px] items-center text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-xl bg-primary text-on-primary shadow-sm hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start writing' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — centered, live-badge + gradient headline. */}
        <section className={cm.cn(cm.sp('pt', 24), cm.sp('pb', 16), cm.sp('px', 6))}>
          <div className={cm.cn(cm.maxW('4xl'), 'mx-auto text-center')}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mb', 8),
                'inline-flex items-center gap-2 rounded-full bg-primary-light text-primary-dark',
              )}
            >
              <span className={cm.cn('relative flex h-2 w-2')} aria-hidden="true">
                <span
                  className={cm.cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75',
                  )}
                />
                <span className={cm.cn('relative inline-flex rounded-full h-2 w-2 bg-primary')} />
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Used by 50k+ writers' })}
            </span>
            <h1
              className={cm.cn(
                cm.sp('mt', 8),
                cm.fontWeight('extrabold'),
                cm.sp('mb', 6),
                'text-5xl md:text-7xl tracking-tight text-on-surface max-w-4xl mx-auto leading-tight',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Think together,' })}{' '}
              <span className="bg-gradient-to-r from-primary to-accent-cyan bg-clip-text text-transparent">
                {t('landing.heroTitleAccent', {}, { defaultValue: 'write forever' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.sp('mb', 10),
                cm.textSize('xl'),
                cm.maxW('2xl'),
                'mx-auto leading-relaxed text-on-surface-variant',
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'A thoughtful, collaborative workspace designed for literary precision. Write, edit, and refine in real-time without losing focus.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
                'flex-col sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  'w-full sm:w-auto rounded-xl bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start writing free' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  cm.textSize('lg'),
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  'w-full sm:w-auto rounded-xl bg-surface text-on-surface border border-outline-variant hover:bg-surface-container transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                  play_circle
                </span>
                {t('landing.watchDemo', {}, { defaultValue: 'Watch demo' })}
              </Link>
            </div>
          </div>
        </section>

        {/* Editor preview — a live manuscript with collaborator cursors. */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 24))}>
          <div className={cm.cn('relative max-w-[900px] mx-auto')}>
            <div
              className={cm.cn(
                cm.sp('pt', 12),
                cm.sp('px', 8),
                'md:p-16 md:pt-12 relative bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden min-h-[500px]',
              )}
            >
              {/* Mac window dots */}
              <div
                className={cm.cn(cm.flex({ gap: 2 }), 'absolute top-4 left-4')}
                aria-hidden="true"
              >
                <span className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
                <span className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
                <span className={cm.cn('w-3 h-3 rounded-full bg-surface-container-high')} />
              </div>
              <div
                className={cm.cn(
                  'font-editor relative text-lg md:text-xl leading-relaxed text-on-surface',
                )}
              >
                <h2
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 8),
                    'md:text-4xl',
                  )}
                >
                  {t(
                    'landing.preview.docTitle',
                    {},
                    { defaultValue: 'The Nature of Collaboration' },
                  )}
                </h2>
                <div className={cm.stack(6)}>
                  <p>
                    {t(
                      'landing.preview.p1a',
                      {},
                      {
                        defaultValue:
                          'When we write together, we are not merely appending words to a document. We are interweaving thoughts, blending distinct voices into a unified narrative. ',
                      },
                    )}
                    <span className="relative">
                      {t(
                        'landing.preview.p1Cursor',
                        {},
                        { defaultValue: 'The process requires both solitude for deep reflection' },
                      )}
                      <span
                        aria-hidden="true"
                        className={cm.cn(
                          'absolute -right-1 -top-1 w-0.5 h-6 bg-primary animate-pulse',
                        )}
                      />
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'absolute -top-7 -right-2 bg-primary text-on-primary px-1.5 py-0.5 rounded shadow-sm',
                        )}
                      >
                        {t('landing.preview.editor1', {}, { defaultValue: 'Sarah' })}
                      </span>
                    </span>
                    {t(
                      'landing.preview.p1b',
                      {},
                      { defaultValue: ' and communion for refinement.' },
                    )}
                  </p>
                  <p>
                    {t(
                      'landing.preview.p2a',
                      {},
                      {
                        defaultValue:
                          'Consider the architecture of a great essay. It stands on the foundation of iterative drafts. ',
                      },
                    )}
                    <span className="relative">
                      <span className="bg-accent-cyan/10 border-b border-accent-cyan/60">
                        {t(
                          'landing.preview.p2Highlight',
                          {},
                          { defaultValue: 'Every marginal note, every structural shift' },
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cm.cn('absolute -left-0.5 -top-1 w-0.5 h-6 bg-accent-cyan')}
                      />
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'absolute -top-7 -left-1 bg-accent-cyan text-on-primary px-1.5 py-0.5 rounded shadow-sm',
                        )}
                      >
                        {t('landing.preview.editor2', {}, { defaultValue: 'Marcus' })}
                      </span>
                    </span>
                    {t(
                      'landing.preview.p2b',
                      {},
                      { defaultValue: ', contributes to the clarity of the final piece.' },
                    )}
                  </p>
                </div>
              </div>
              {/* Comment pin */}
              <aside
                className={cm.cn(
                  cm.sp('p', 3),
                  'absolute top-36 right-4 md:right-8 lg:right-14 bg-surface rounded-xl shadow-lg border border-outline-variant w-48',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 2))}>
                  <span
                    className={cm.cn(
                      cm.w(6),
                      cm.h(6),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      cm.roundedFull,
                      'bg-primary-light text-primary-dark',
                    )}
                    aria-hidden="true"
                  >
                    S
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('landing.preview.editor1', {}, { defaultValue: 'Sarah' })}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'landing.preview.commentBody',
                    {},
                    {
                      defaultValue:
                        'Perhaps we could expand on this metaphor in the next paragraph?',
                    },
                  )}
                </p>
              </aside>
            </div>
          </div>
        </section>

        {/* Social proof — grayscale publication wordmarks. */}
        <section
          className={cm.cn(
            'border-y border-outline-variant bg-surface-container-low',
            cm.sp('py', 10),
            cm.sp('mb', 24),
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), 'mx-auto text-center')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mb', 6),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('landing.proofHeading', {}, { defaultValue: 'Trusted by editorial teams at' })}
            </p>
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', justify: 'center', gap: 'lg' }),
                'md:gap-16 opacity-50 grayscale',
              )}
            >
              {PROOF.map((p) => (
                <span
                  key={p.key}
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), p.className)}
                >
                  {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), 'mx-auto')}>
            <div className={cm.cn(cm.maxW('2xl'), 'mx-auto text-center')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('extrabold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: 'What you get' })}
              </p>
              <h2
                className={cm.cn(
                  cm.sp('mt', 3),
                  cm.textSize('4xl'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.featuresHeading',
                  {},
                  { defaultValue: 'A studio for the long-form draft.' },
                )}
              </h2>
              <p
                className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}
                style={{ fontFamily: 'Charter, Georgia, serif' }}
              >
                {t(
                  'landing.featuresSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is built around the manuscript — not the meeting, not the inbox.',
                  },
                )}
              </p>
            </div>

            <div className={cm.cn(cm.sp('mt', 12), cm.grid({ cols: 4, gap: 'md' }))}>
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant transition-transform hover:-translate-y-1 hover:shadow-lg',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary',
                    )}
                    aria-hidden="true"
                    style={{ fontSize: '1.5rem' }}
                  >
                    {f.icon}
                  </span>
                  <h3
                    className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), cm.fontWeight('extrabold'))}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      'leading-relaxed text-on-surface-variant',
                    )}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant')}>
          <div
            className={cm.cn(
              cm.maxW('5xl'),
              cm.sp('px', 6),
              cm.sp('py', 20),
              'mx-auto text-center',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Open the page. Let the cursor begin.' },
              )}
            </h2>
            <p
              className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'text-on-surface-variant')}
              style={{ fontFamily: 'Charter, Georgia, serif' }}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for solo writers. Studio plans for teams of editors, ghostwriters, and reviewers.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/25 hover:bg-primary-hover transition-colors',
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Open a studio' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={cm.cn('border-t border-outline-variant bg-surface-container-low')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            'mx-auto',
          )}
        >
          <p className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}>
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-primary')}>
              {APP_NAME}
            </span>
            <span className="text-on-surface-variant">
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '\u00a9 {{year}} {{app}}. Think together, write forever.' },
              )}
            </span>
          </p>
          <nav className={cm.cn(cm.flex({ gap: 'md', align: 'center' }), cm.textSize('sm'))}>
            <LegalModalLinks
              linkClassName={
                'text-on-surface-variant hover:text-primary underline underline-offset-4'
              }
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
