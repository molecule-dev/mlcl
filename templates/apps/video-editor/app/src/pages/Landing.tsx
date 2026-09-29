import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { type ProjectSummary, ProjectThumbCard } from '../components/ProjectThumbCard.js'
import { PublicNav } from '../components/PublicNav.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { TimelinePreview } from '../components/TimelinePreview.js'

interface FeatureBlock {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureBlock[] = [
  {
    icon: 'auto_awesome_motion',
    titleKey: 'landing.feature1Title',
    defaultTitle: 'Frame-accurate timeline',
    defaultBody:
      'Drag-and-drop clips, magnetic ripple edits, and a 60fps playhead that scrubs in lockstep with the preview canvas.',
    bodyKey: 'landing.feature1Body',
  },
  {
    icon: 'tune',
    titleKey: 'landing.feature2Title',
    defaultTitle: 'Cinematic transitions',
    defaultBody:
      'Hand-tuned dissolves, swipes, and morphs. Apply a transition by dropping it between any two clips — preview the result before you commit.',
    bodyKey: 'landing.feature2Body',
  },
  {
    icon: 'cloud_download',
    titleKey: 'landing.feature3Title',
    defaultTitle: 'Render in the cloud',
    defaultBody:
      'Queue renders at any resolution while you keep editing. Stream the final cut, share a private link, or download the file.',
    bodyKey: 'landing.feature3Body',
  },
]

const SAMPLE_PROJECTS: ProjectSummary[] = [
  {
    id: 'sample-launch',
    name: 'Skyline · Launch Reel',
    client: 'Heliom Studio',
    duration: '00:02:18',
    lastEdited: '4h ago',
    status: 'ready',
    swatch: 'linear-gradient(135deg, var(--video-cta-from) 0%, var(--video-cta-to) 100%)',
    icon: 'rocket_launch',
    aspect: '16:9',
  },
  {
    id: 'sample-vertical',
    name: 'Vertical · Product Drop',
    client: 'Heliom Studio',
    duration: '00:00:45',
    lastEdited: '1d ago',
    status: 'rendering',
    swatch: 'linear-gradient(135deg, var(--video-cta-to) 0%, var(--mol-color-warning) 100%)',
    icon: 'smartphone',
    aspect: '9:16',
  },
  {
    id: 'sample-loop',
    name: 'Square · Logo Loop',
    client: 'Personal',
    duration: '00:00:12',
    lastEdited: '3d ago',
    status: 'shared',
    swatch: 'linear-gradient(135deg, var(--mol-color-info) 0%, var(--video-cta-from) 100%)',
    icon: 'crop_square',
    aspect: '1:1',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      /* The Stitch design is dark-only — pin the marketing surface to the dark
         NLE palette regardless of the app-wide mode toggle. */
      data-mol-mode="dark"
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body',
      )}
    >
      <PublicNav />

      <main>
        <section className={cm.cn(cm.sp('py', 20), cm.sp('px', 6), 'relative overflow-hidden')}>
          <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
            <div
              className={cm.cn(
                'absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full bg-[var(--video-cta-from)]/20 blur-[140px]',
              )}
            />
            <div
              className={cm.cn(
                'absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--video-link-hover)]/15 blur-[140px]',
              )}
            />
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              'max-w-[1100px] mx-auto relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 5),
                'font-mono uppercase tracking-widest text-[var(--video-link)]',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: '// browser-native cinema' })}
            </p>
            <h1
              className={cm.cn(
                cm.textCenter,
                'font-black tracking-tighter text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-[900px] pb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--video-cta-from)] via-[var(--video-link)] to-[var(--video-cta-to)]',
              )}
            >
              <span>{t('landing.headline.start', {}, { defaultValue: 'Cut. Create.' })}</span>{' '}
              <span>
                {t('landing.headline.brand', { brand: APP_NAME }, { defaultValue: 'Captivate.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 6),
                cm.textCenter,
                'text-[var(--video-text-muted-alt)] max-w-[640px]',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'A pro-grade, multi-track video editor that runs entirely in your browser. No installs, no transcodes, no waiting.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mt', 8))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 2 }),
                  'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
                )}
              >
                <span>{t('landing.ctaPrimary', {}, { defaultValue: 'Open the studio' })}</span>
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 6),
                'font-mono uppercase tracking-widest text-[var(--video-text-dim)]',
              )}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20), 'max-w-[1100px] mx-auto')}>
          <TimelinePreview
            caption={t(
              'landing.timelineCaption',
              {},
              {
                defaultValue:
                  'Four tracks · color-coded clips · frame-accurate playhead — your timeline at a glance.',
              },
            )}
          />
        </section>

        <section
          className={cm.cn(
            cm.sp('py', 16),
            cm.sp('px', 6),
            'bg-[var(--video-panel-bg)] border-y border-[var(--video-border-subtle)]',
          )}
        >
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 3),
                  'font-mono uppercase tracking-widest text-[var(--video-link)]',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: '// the toolkit' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-[var(--video-text-primary)]',
                )}
              >
                {t(
                  'landing.featuresTitle',
                  {},
                  { defaultValue: 'Everything you need on one timeline' },
                )}
              </h2>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl border border-[var(--video-border-subtle)] bg-[var(--video-input-bg)] hover:border-[var(--video-cta-from)]/40 transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'rounded-lg bg-gradient-to-br from-[var(--video-cta-from)]/25 to-[var(--video-cta-to)]/25 text-[var(--video-link)]',
                    )}
                  >
                    <span className="material-symbols-outlined">{f.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      cm.sp('mb', 2),
                      'text-[var(--video-text-primary)]',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-[var(--video-text-muted-alt)] leading-relaxed',
                    )}
                  >
                    {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'between', gap: 4 }),
                cm.sp('mb', 8),
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 2),
                    'font-mono uppercase tracking-widest text-[var(--video-link)]',
                  )}
                >
                  {t('landing.gallerySection', {}, { defaultValue: '// from the showcase' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-[var(--video-text-primary)]',
                  )}
                >
                  {t('landing.galleryTitle', {}, { defaultValue: 'Cuts our editors love' })}
                </h2>
              </div>
              <Link
                to="/signup"
                className={
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors'
                }
              >
                {t('landing.viewAll', {}, { defaultValue: 'See more →' })}
              </Link>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              {SAMPLE_PROJECTS.map((p) => (
                <ProjectThumbCard key={p.id} project={p} to="/signup" />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 10),
          cm.sp('px', 6),
          'border-t border-[var(--video-border-subtle)] bg-[var(--video-input-bg)]',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 4 }),
            'max-w-[1100px] mx-auto',
          )}
        >
          <BrandWordmark size="sm" as="span" footer />
          <div
            className={cm.cn(
              cm.flex({ gap: 6 }),
              'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
            )}
          >
            <Link to="/login" className={'hover:text-[var(--video-link-hover)] transition-colors'}>
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link to="/signup" className={'hover:text-[var(--video-link-hover)] transition-colors'}>
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn('hover:text-[var(--video-link-hover)] transition-colors')}
            >
              {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
            </Link>
          </div>
          <p className={cm.cn('font-mono text-[10px] text-[var(--video-text-dim)]')}>
            {t(
              'landing.footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Studio. Cinematic cuts in the browser.' },
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
      </footer>
    </div>
  )
}

export default Landing
