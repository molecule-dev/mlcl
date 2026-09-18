import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'multiSource',
    defaultValue:
      'Every story stacked across the outlets covering it, so you can read the same headline through multiple framings side by side instead of trusting a single source.',
  },
  {
    key: 'bias',
    defaultValue:
      'A transparent left-to-right bias spectrum on every source, with factual-rating and ownership context — so you always know who you are reading.',
  },
  {
    key: 'topics',
    defaultValue:
      'AI-grouped topics — world, business, tech, science, sports, culture — that turn the day into one finite, finishable briefing instead of an infinite scroll.',
  },
  {
    key: 'summaries',
    defaultValue:
      'AI summaries that distill long pieces to the essentials, plus full-text search across every source and story.',
  },
  {
    key: 'personalization',
    defaultValue:
      'Follow the sources and topics you care about, bookmark stories into folders, and shape a feed that reflects your interests.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      containerSize="lg"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { appName: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(6))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { appName: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a curated, multi-source news reader. It gathers headlines from across the political spectrum, groups them by topic, and shows you how each story is being framed — so you understand not just what happened, but how it is being told.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-display',
            cm.sp('mt', 4),
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            { appName: APP_NAME },
            {
              defaultValue: `We believe a well-informed reader needs more than one outlet's version of events. ${APP_NAME} makes bias visible, surfaces every angle of a story, and replaces the algorithmic firehose with a finite, finishable briefing you can actually trust.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-display',
            cm.sp('mt', 4),
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(3), 'list-disc pl-6')}>
          {FEATURES.map((f) => (
            <li key={f.key} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(`about.feature.${f.key}`, {}, { defaultValue: f.defaultValue })}
            </li>
          ))}
        </ul>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'font-display',
            cm.sp('mt', 4),
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            { appName: APP_NAME },
            {
              defaultValue: `Have feedback, spotted a mis-rated source, or want to suggest a feed to add? We read every message — reach out and a real person on the ${APP_NAME} team will reply.`,
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
