import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { QuillonStudioHero } from '../components/QuillonStudioHero.js'
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

const PROOF = [
  { key: 'editorial', defaultLabel: 'Editorial Studios' },
  { key: 'authors', defaultLabel: 'Long-form Authors' },
  { key: 'agencies', defaultLabel: 'Content Agencies' },
  { key: 'newsrooms', defaultLabel: 'Independent Newsrooms' },
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
              cm.fontWeight('extrabold'),
              'tracking-tight text-on-surface',
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
                  cm.fontWeight('semibold'),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
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
                    cm.fontWeight('semibold'),
                    'inline-flex min-h-[36px] items-center text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Open the studio' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute -left-32 top-40 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-3xl',
            )}
          />

          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.sp('px', 6),
              cm.sp('pt', 24),
              cm.sp('pb', 16),
              'mx-auto',
            )}
          >
            <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-center')}>
              <div className={cm.cn('col-span-12 lg:col-span-7')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('extrabold'),
                    'inline-flex rounded-full bg-secondary/15 text-[10px] uppercase tracking-widest text-secondary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'For writers, editors, and teams' })}
                </span>
                <h1
                  className={cm.cn(
                    cm.sp('mt', 5),
                    cm.fontWeight('extrabold'),
                    'text-5xl tracking-tight text-on-surface md:text-6xl lg:text-7xl leading-[0.95]',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Think together. Write forever.' })}
                </h1>
                <p
                  className={cm.cn(
                    cm.sp('mt', 6),
                    cm.textSize('xl'),
                    cm.maxW('2xl'),
                    'italic leading-relaxed text-on-surface-variant',
                  )}
                  style={{ fontFamily: 'Charter, Georgia, serif' }}
                >
                  {t(
                    'landing.heroSubtitle',
                    { tagline: APP_TAGLINE },
                    {
                      defaultValue:
                        'A distraction-free editor with ambient presence. Real-time cursors, threaded comments, version history, and a serif page that reads like the page itself.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(
                    cm.sp('mt', 8),
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  )}
                >
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('extrabold'),
                      'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start writing' })}
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline text-on-surface hover:bg-surface-container',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                <div className={cm.cn(cm.sp('mt', 10))}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('extrabold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'landing.proofHeading',
                      {},
                      { defaultValue: 'Trusted by people who care about the page' },
                    )}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 4), cm.flex({ wrap: 'wrap', gap: 'md' }))}>
                    {PROOF.map((p) => (
                      <li
                        key={p.key}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'rounded-full bg-surface-container text-on-surface-variant',
                        )}
                      >
                        {t(`landing.proof.${p.key}`, {}, { defaultValue: p.defaultLabel })}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={cm.cn('col-span-12 lg:col-span-5')}>
                <QuillonStudioHero wordsToday={2840} documentsToday={6} activeCollaborators={4} />
              </div>
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
                  'uppercase tracking-widest text-secondary',
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
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('lg'),
                  'italic text-on-surface-variant',
                )}
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
                      'material-symbols-outlined inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white',
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
              className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'italic text-on-surface-variant')}
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
                  cm.fontWeight('extrabold'),
                  'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg transition-transform hover:-translate-y-0.5',
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
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '\u00a9 {{year}} {{app}}. Built with Molecule.' },
            )}
          </p>
          <nav className={cm.cn(cm.flex({ gap: 'md', align: 'center' }), cm.textSize('sm'))}>
            <LegalModalLinks
              linkClassName={'text-on-surface-variant hover:text-on-surface'}
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
