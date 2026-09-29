import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { CourseTileCard } from '../components/CourseTileCard.js'
import { LiveClassHeroCard } from '../components/LiveClassHeroCard.js'

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn('min-h-screen bg-background text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-30 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20',
        )}
      >
        <BrandWordmark withTagline />
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
          <a
            href="#features"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors hidden md:inline',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#schools"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors hidden md:inline',
            )}
          >
            {t('landing.navSchools', {}, { defaultValue: 'For schools' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors hidden md:inline',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              data-mol-id="nav-go-to-dashboard"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20',
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
                  'text-on-surface hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  'rounded-full bg-secondary text-on-secondary hover:bg-secondary-dark transition-colors shadow-sm',
                )}
              >
                {t('landing.navStart', {}, { defaultValue: 'Open a classroom' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className={cm.cn('relative overflow-hidden')}>
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -top-40 -right-32 h-[36rem] w-[36rem] rounded-full bg-primary/20 blur-3xl',
          )}
        ></div>
        <div
          aria-hidden="true"
          className={cm.cn(
            'pointer-events-none absolute -bottom-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-secondary/15 blur-3xl',
          )}
        ></div>
        <div
          className={cm.cn(
            cm.sp('px', 8),
            cm.sp('py', 16),
            cm.maxW('full'),
            'relative max-w-7xl mx-auto',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-center')}>
            <div className={cm.cn('col-span-12 lg:col-span-6', cm.stack(6))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'self-start rounded-full bg-primary-container text-on-primary-container uppercase tracking-widest',
                )}
              >
                <span
                  className={cm.cn('h-1.5 w-1.5 rounded-full bg-primary animate-pulse')}
                  aria-hidden="true"
                ></span>
                {t(
                  'landing.eyebrow',
                  {},
                  { defaultValue: 'Live · whiteboard · breakouts · grading' },
                )}
              </span>
              <h1
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  '[font-family:var(--font-headline)]',
                  'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] text-primary',
                )}
              >
                {t('landing.heroLine1', {}, { defaultValue: 'Where every classroom' })}{' '}
                {t('landing.heroLine2', {}, { defaultValue: 'feels in the room.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant leading-relaxed max-w-xl',
                )}
              >
                {t(
                  'landing.heroBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} brings live video, whiteboard, breakouts, chat, and assignments into one warm, scholarly home. Built for instructors who want fewer tabs and more attention.',
                  },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'flex-wrap')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.fontWeight('bold'),
                    'px-8 py-3.5 rounded-full bg-secondary text-on-secondary hover:bg-secondary-dark transition-colors shadow-md',
                  )}
                >
                  {t('landing.ctaPrimary', {}, { defaultValue: 'Start a free term' })}
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.fontWeight('semibold'),
                    'px-6 py-3.5 rounded-full text-primary hover:bg-primary/10 transition-colors',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                    play_circle
                  </span>
                  {t('landing.ctaSecondary', {}, { defaultValue: 'Watch a class tour' })}
                </Link>
              </div>
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('pt', 4), 'flex-wrap')}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')}>
                  {['Aiyana', 'Kenji', 'Priya', 'Liam'].map((seed, i) => (
                    <img
                      key={seed}
                      alt=""
                      src={`https://picsum.photos/seed/aula-landing-${i}/120/120`}
                      className={cm.cn('h-9 w-9 rounded-full border-2 border-surface object-cover')}
                    />
                  ))}
                </div>
                <div className={cm.cn(cm.stack(0))}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      'landing.socialProofTitle',
                      {},
                      { defaultValue: '14,200+ classes hosted this term' },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'landing.socialProofBody',
                      {},
                      {
                        defaultValue:
                          'Used by 380 schools, bootcamps, and corporate trainers worldwide.',
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className={cm.cn('col-span-12 lg:col-span-6')}>
              <LiveClassHeroCard
                courseTitle={t(
                  'landing.demoCourse',
                  {},
                  { defaultValue: 'World Literature · LIT 240' },
                )}
                classTitle={t(
                  'landing.demoTitle',
                  {},
                  { defaultValue: 'Magical realism — Borges & Murakami' },
                )}
                instructor={t('landing.demoInstructor', {}, { defaultValue: 'Prof. Imani Davies' })}
                participantCount={28}
                isLive
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'max-w-7xl mx-auto')}
      >
        <div className={cm.cn(cm.stack(2), cm.sp('mb', 10))}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
            {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for live' })}
          </span>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-3xl md:text-4xl tracking-tight leading-tight text-on-surface max-w-2xl',
            )}
          >
            {t(
              'landing.featuresTitle',
              {},
              { defaultValue: 'Everything a class needs, in one focused tab.' },
            )}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          {[
            {
              icon: 'video_call',
              title: t('landing.feat1Title', {}, { defaultValue: 'Cinematic video grid' }),
              body: t(
                'landing.feat1Body',
                {},
                {
                  defaultValue:
                    'Auto-laid spotlight + gallery, active-speaker accents, and a draggable picture-in-picture for instructors.',
                },
              ),
              tone: 'bg-primary-container text-on-primary-container',
            },
            {
              icon: 'edit_square',
              title: t('landing.feat2Title', {}, { defaultValue: 'Whiteboard that thinks aloud' }),
              body: t(
                'landing.feat2Body',
                {},
                {
                  defaultValue:
                    'Infinite canvas, laser pointer, eight-swatch palette, and persistent sessions per course.',
                },
              ),
              tone: 'bg-secondary/15 text-secondary-dark',
            },
            {
              icon: 'meeting_room',
              title: t('landing.feat3Title', {}, { defaultValue: 'Breakouts in two clicks' }),
              body: t(
                'landing.feat3Body',
                {},
                {
                  defaultValue:
                    'Auto-shuffle students into rooms, broadcast announcements, and pull everyone back with a tap.',
                },
              ),
              tone: 'bg-tertiary-container text-on-tertiary-container',
            },
            {
              icon: 'assignment',
              title: t('landing.feat4Title', {}, { defaultValue: 'Assignments + gradebook' }),
              body: t(
                'landing.feat4Body',
                {},
                {
                  defaultValue:
                    'Rubrics, file submissions, inline feedback, and a calm gradebook that keeps the parents informed.',
                },
              ),
              tone: 'bg-success/15 text-success',
            },
            {
              icon: 'forum',
              title: t('landing.feat5Title', {}, { defaultValue: 'Chat with class context' }),
              body: t(
                'landing.feat5Body',
                {},
                {
                  defaultValue:
                    'Threaded chat per class, pinned summaries, and instructor-only side channels for whisper coaching.',
                },
              ),
              tone: 'bg-primary-container text-on-primary-container',
            },
            {
              icon: 'shield_person',
              title: t('landing.feat6Title', {}, { defaultValue: 'Safe by default' }),
              body: t(
                'landing.feat6Body',
                {},
                {
                  defaultValue:
                    'SSO with district directories, age-appropriate moderation, and audit logs for every classroom.',
                },
              ),
              tone: 'bg-secondary/15 text-secondary-dark',
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 hover:shadow-md transition-shadow',
              )}
            >
              <div
                className={cm.cn(
                  'h-11 w-11 rounded-xl flex items-center justify-center',
                  feat.tone,
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[22px]')}>{feat.icon}</span>
              </div>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {feat.title}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {feat.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="schools" className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'max-w-7xl mx-auto')}>
        <div className={cm.cn(cm.stack(2), cm.sp('mb', 8))}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
            {t('landing.previewEyebrow', {}, { defaultValue: 'Tour the catalogue' })}
          </span>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-3xl md:text-4xl tracking-tight leading-tight text-on-surface',
            )}
          >
            {t(
              'landing.previewTitle',
              {},
              { defaultValue: 'Courses your students will actually open.' },
            )}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          <CourseTileCard
            id="prev-1"
            title={t('landing.previewCourse1', {}, { defaultValue: 'Modern Macroeconomics' })}
            code="ECN 312"
            instructor={t('landing.previewInstructor1', {}, { defaultValue: 'Dr. Idris Halloway' })}
            level="INTERMEDIATE"
            imageSeed="aula-prev-1"
            progressPercent={72}
            lessonsRemaining={3}
          />
          <CourseTileCard
            id="prev-2"
            title={t('landing.previewCourse2', {}, { defaultValue: 'Studio Painting II' })}
            code="ART 220"
            instructor={t('landing.previewInstructor2', {}, { defaultValue: 'Prof. Lila Marin' })}
            level="ADVANCED"
            imageSeed="aula-prev-2"
            progressPercent={45}
            lessonsRemaining={6}
          />
          <CourseTileCard
            id="prev-3"
            title={t('landing.previewCourse3', {}, { defaultValue: 'Intro to Data Ethics' })}
            code="CSC 140"
            instructor={t('landing.previewInstructor3', {}, { defaultValue: 'Dr. Naomi Wren' })}
            level="BEGINNER"
            imageSeed="aula-prev-3"
            progressPercent={20}
            lessonsRemaining={10}
            enrolled={false}
          />
        </div>
      </section>

      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'max-w-7xl mx-auto')}>
        <div
          className={cm.cn(
            'relative overflow-hidden rounded-[2rem] p-12 text-on-primary shadow-xl bg-gradient-to-br from-primary via-primary-dark to-tertiary',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-32 -top-32 h-80 w-80 rounded-full bg-secondary/40 blur-3xl',
            )}
          ></div>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -left-32 -bottom-32 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center', gap: 8 }),
              'relative z-10 flex-wrap',
            )}
          >
            <div className={cm.cn(cm.maxW('xl'), cm.stack(4))}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight leading-tight',
                )}
              >
                {t(
                  'landing.ctaTitle',
                  {},
                  { defaultValue: 'Open your first classroom in under three minutes.' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'opacity-90 leading-relaxed')}>
                {t(
                  'landing.ctaBody',
                  {},
                  {
                    defaultValue:
                      "We'll spin up a sample course, invite a co-teacher, and show you how to flip a class into breakouts before the bell rings.",
                  },
                )}
              </p>
            </div>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.fontWeight('bold'),
                cm.sp('py', 4),
                'px-7 rounded-2xl bg-surface text-primary text-sm shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Create your school' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className={cm.cn('border-t border-outline-variant/30 bg-surface-container-low')}>
        <div
          className={cm.cn('max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10')}
        >
          <div className={cm.cn(cm.stack(3))}>
            <BrandWordmark as="span" footer />
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xs')}>
              {t(
                'landing.footerCopy',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}}. Made with care for educators.' },
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
          <div className={cm.cn(cm.stack(3))}>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t('landing.footer.legalHeading', {}, { defaultValue: 'Legal' })}
            </h3>
            <nav className={cm.cn(cm.stack(2))}>
              <Link
                to="/privacy"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
              </Link>
              <Link
                to="/terms"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
              </Link>
            </nav>
          </div>
          <div className={cm.cn(cm.stack(3))}>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t('landing.footer.supportHeading', {}, { defaultValue: 'Support' })}
            </h3>
            <nav className={cm.cn(cm.stack(2))}>
              <Link
                to="/about"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
              </Link>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <a
                href="mailto:hello@aula.school"
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.contact', {}, { defaultValue: 'Contact' })}
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
