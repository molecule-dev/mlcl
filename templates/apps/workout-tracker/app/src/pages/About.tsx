import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'

interface FeatureItem {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: FeatureItem[] = [
  {
    id: 'logging',
    titleKey: 'about.feature.logging.title',
    titleDefault: 'Set-by-set logging',
    bodyKey: 'about.feature.logging.body',
    bodyDefault:
      'Log every working set — weight, reps, and RPE — during the workout, with auto-suggested targets pulled from your last session so progressive overload is the default, not an afterthought.',
  },
  {
    id: 'progress',
    titleKey: 'about.feature.progress.title',
    titleDefault: 'Progress charts & PRs',
    bodyKey: 'about.feature.progress.body',
    bodyDefault:
      'Per-exercise progression charts, estimated 1RMs, and an automatic personal-records log show exactly where you are getting stronger — no spreadsheets required.',
  },
  {
    id: 'templates',
    titleKey: 'about.feature.templates.title',
    titleDefault: 'Routines that adapt',
    bodyKey: 'about.feature.templates.body',
    bodyDefault:
      'Build Push/Pull/Legs, Upper/Lower, or fully custom splits with per-set rep schemes, then reuse them week after week and edit on the fly.',
  },
  {
    id: 'body',
    titleKey: 'about.feature.body.title',
    titleDefault: 'Body & measurement tracking',
    bodyKey: 'about.feature.body.body',
    bodyDefault:
      'Record body weight, body-fat percentage, and tape measurements alongside your training so you can correlate the work with the results.',
  },
  {
    id: 'export',
    titleKey: 'about.feature.export.title',
    titleDefault: 'Your data, exportable',
    bodyKey: 'about.feature.export.body',
    bodyDefault:
      'Free forever for up to five templates. Pro unlocks 500 routines, longer history retention, and CSV export of every set you have ever logged.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', { tagline: APP_TAGLINE }, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a purpose-built strength-training tracker for lifters who care about progressive overload. Log every set, see every PR, and never lose track of where you left off — all in one focused app instead of a tangle of notes and spreadsheets.`,
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'We believe getting stronger should be measurable, repeatable, and motivating. ' +
                  `${APP_NAME} turns each session into clean data — sets, reps, weight, and trends — so the next workout is always a little harder than the last, and progress is something you can actually see.`,
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Found a bug, missing an exercise, or want a feature on the roadmap? We read every message — reach out from your account settings and a real person on the team will get back to you.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
