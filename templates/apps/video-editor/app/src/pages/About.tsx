import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

interface FeatureItem {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureItem[] = [
  {
    icon: 'auto_awesome_motion',
    titleKey: 'about.feature1Title',
    defaultTitle: 'Multi-track timeline',
    bodyKey: 'about.feature1Body',
    defaultBody:
      'Frame-accurate editing with drag-and-drop clips, magnetic ripple edits, and a 60fps playhead — all running natively in the browser, no installs.',
  },
  {
    icon: 'tune',
    titleKey: 'about.feature2Title',
    defaultTitle: 'Cinematic transitions & effects',
    bodyKey: 'about.feature2Body',
    defaultBody:
      'Hand-tuned dissolves, swipes, and morphs you drop between any two clips, plus per-clip effects you can preview before you commit.',
  },
  {
    icon: 'video_library',
    titleKey: 'about.feature3Title',
    defaultTitle: 'Assets & templates',
    bodyKey: 'about.feature3Body',
    defaultBody:
      'A searchable asset library for footage, audio, and images, plus ready-made project templates so you can start from a polished cut.',
  },
  {
    icon: 'cloud_download',
    titleKey: 'about.feature4Title',
    defaultTitle: 'Render & export in the cloud',
    bodyKey: 'about.feature4Body',
    defaultBody:
      'Queue exports at any resolution while you keep editing. Track each job, stream the final cut, share a private link, or download the file.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body',
      )}
    >
      <PublicNav />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.mxAuto, 'max-w-[860px] w-full', cm.sp('px', 6), cm.sp('py', 16))}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mb', 4),
            'font-mono uppercase tracking-widest text-[var(--video-link)]',
          )}
        >
          {t('about.eyebrow', {}, { defaultValue: '// the studio behind the cut' })}
        </p>
        <h1 className={cm.cn('font-extrabold tracking-tight text-4xl md:text-5xl leading-[1.0]')}>
          {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mt', 6),
            'text-[var(--video-text-muted-alt)] leading-relaxed',
          )}
          data-mol-id="about-intro"
        >
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} is a pro-grade, multi-track video editor that runs entirely in your browser. Cut footage on a frame-accurate timeline, drop in transitions and effects, and render finished videos in the cloud — no downloads, no transcodes, no waiting.',
            },
          )}
        </p>

        <section className={cm.cn(cm.sp('mt', 12))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            className={cm.cn('text-[var(--video-text-muted-alt)] leading-relaxed')}
            data-mol-id="about-mission"
          >
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Editing video has always meant heavy installs, slow exports, and tools locked to one machine. {{appName}} exists to make cinematic editing instant and collaborative: the full power of a non-linear editor, available from any browser, so creators can go from raw footage to a shared cut in a single sitting.',
              },
            )}
          </p>
        </section>

        <section className={cm.cn(cm.sp('mt', 12))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <div
            data-mol-id="about-features"
            className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}
          >
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl border border-[var(--video-border-subtle)] bg-[var(--video-panel-bg)]',
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
        </section>

        <section className={cm.cn(cm.sp('mt', 12))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            className={cm.cn('text-[var(--video-text-muted-alt)] leading-relaxed')}
            data-mol-id="about-contact"
          >
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Found a bug, have a feature request, or want to tell us about the film you cut? Every message reaches a real person on the team — reach out any time from your account settings.',
              },
            )}
          </p>
        </section>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mt', 12))}>
          <Link
            to="/signup"
            data-mol-id="about-cta"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity',
            )}
          >
            {t('landing.ctaPrimary', {}, { defaultValue: 'Open the studio' })}
          </Link>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono uppercase tracking-widest text-[var(--video-text-dim)]',
            )}
          >
            {APP_TAGLINE}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
export { About as AboutPage }
