import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNav } from '../components/PublicNav.js'

interface FeatureRow {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureRow[] = [
  {
    icon: 'tune',
    titleKey: 'about.feature.adjustTitle',
    defaultTitle: 'Precision adjustments',
    bodyKey: 'about.feature.adjustBody',
    defaultBody:
      'Per-channel curves, parametric HSL, exposure, contrast, and white balance — every slider is keyboard-bindable and shows its exact numeric value.',
  },
  {
    icon: 'crop',
    titleKey: 'about.feature.cropTitle',
    defaultTitle: 'Crop & compose',
    bodyKey: 'about.feature.cropBody',
    defaultBody:
      'Aspect-locked crops, straighten, and rule-of-thirds overlays so you can recompose without ever leaving the canvas.',
  },
  {
    icon: 'auto_fix_high',
    titleKey: 'about.feature.filtersTitle',
    defaultTitle: 'Filters & preset packs',
    bodyKey: 'about.feature.filtersBody',
    defaultBody:
      'Hand-tuned LUTs across mood, cinema, studio, and street — or roll your own and export preset packs ready for clients.',
  },
  {
    icon: 'layers',
    titleKey: 'about.feature.layersTitle',
    defaultTitle: 'Non-destructive layers',
    bodyKey: 'about.feature.layersBody',
    defaultBody:
      'Stack adjustments, masks, and filters without touching the original frame. Walk back any edit, any session, any year.',
  },
  {
    icon: 'photo_library',
    titleKey: 'about.feature.libraryTitle',
    defaultTitle: 'Albums & library',
    bodyKey: 'about.feature.libraryBody',
    defaultBody:
      'Organize shoots into albums, tag and search across your catalog, and keep every revision safely versioned in the cloud.',
  },
  {
    icon: 'download',
    titleKey: 'about.feature.exportTitle',
    defaultTitle: 'Export anywhere',
    bodyKey: 'about.feature.exportBody',
    defaultBody:
      'Render to JPEG, PNG, or WebP at any size and quality, with color-profile conversion handled on the way out.',
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
        'bg-[var(--photo-background)] text-[var(--photo-text)] font-body',
      )}
    >
      <PublicNav />

      <main data-mol-id="page-about" className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 16))}>
        <div className={cm.cn('max-w-3xl mx-auto')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 4),
              'font-mono uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
            )}
          >
            {t('about.eyebrow', { appName: APP_NAME }, { defaultValue: '// about {{appName}}' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mb', 6),
              'tracking-tight text-[var(--photo-text)]',
            )}
          >
            {t('about.pageTitle', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </h1>

          <p
            data-mol-id="about-intro"
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mb', 6),
              'text-[var(--photo-text-muted)] leading-relaxed',
            )}
          >
            {t(
              'about.intro',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a keyboard-first photo editor for creators who care about the third decimal. Filters, crop, parametric adjustments, masks, and non-destructive layers live in a dark chrome that never color-casts the canvas — from RAW to delivery without leaving the browser.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 10),
              cm.sp('mb', 3),
              'tracking-tight text-[var(--photo-text)]',
            )}
          >
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p
            data-mol-id="about-mission"
            className={cm.cn(cm.sp('mb', 6), 'text-[var(--photo-text-muted)] leading-relaxed')}
          >
            {t(
              'about.missionBody',
              {},
              {
                defaultValue:
                  'We believe professional-grade editing should be fast, reversible, and color-correct — not locked behind heavyweight desktop suites. Every adjustment is undoable, every original is preserved, and every look you build is yours to reuse and share.',
              },
            )}
          </p>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 10),
              cm.sp('mb', 5),
              'tracking-tight text-[var(--photo-text)]',
            )}
          >
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul
            data-mol-id="about-features"
            className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}
          >
            {FEATURES.map((f) => (
              <li
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl border border-[var(--photo-border)] bg-[var(--photo-surface)]',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 3),
                    'rounded-lg bg-gradient-to-br from-[var(--photo-accent)]/25 to-[var(--photo-danger)]/25 text-[var(--photo-panel-text-accent)]',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('base'),
                    cm.sp('mb', 1),
                    'text-[var(--photo-text)]',
                  )}
                >
                  {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-[var(--photo-text-muted)] leading-relaxed',
                  )}
                >
                  {t(f.bodyKey, {}, { defaultValue: f.defaultBody })}
                </p>
              </li>
            ))}
          </ul>

          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 10),
              cm.sp('mb', 3),
              'tracking-tight text-[var(--photo-text)]',
            )}
          >
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p
            data-mol-id="about-contact"
            className={cm.cn('text-[var(--photo-text-muted)] leading-relaxed')}
          >
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Found a bug, have a feature request, or want a custom preset pack? Reach the team from the Settings page — every message goes to a real human who shoots and edits too.',
              },
            )}
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
