import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

const FEATURES = [
  {
    key: 'liveResults',
    defaultValue:
      'Live results that tally as ballots arrive — animated bars, exact percentages, and quorum-met indicators that keep the whole room oriented.',
  },
  {
    key: 'quorum',
    defaultValue:
      'Defensible quorum: eligibility rolls, weighted votes, and immutable audit logs so every outcome holds up to scrutiny.',
  },
  {
    key: 'audienceQa',
    defaultValue:
      'Audience Q&A sorted by upvotes — promote a question to the projector, mark it answered, and keep the agenda moving.',
  },
  {
    key: 'presenter',
    defaultValue:
      'Presenter mode for the big screen, plus voting analytics that turn participation and turnout into clear, exportable reports.',
  },
] as const

/**
 * Public About page describing what {@link APP_NAME} is and who it serves.
 *
 * @returns The rendered About page.
 */
export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
    >
      <div className={cm.cn(cm.stack(4))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a moderation console for live polls, board votes, and audience Q&A — Mentimeter-like polling with the rigor a real decision needs. Run a ballot, watch results tally in real time, and walk away with a result you can defend.`,
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.missionBody',
            {},
            {
              defaultValue:
                'Every voice deserves to be counted — and every count deserves to be trusted. We build for the people who run the room: moderators, organizers, and clerks who need transparent, audited outcomes, not a show of hands nobody can verify later.',
            },
          )}
        </p>

        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
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
            cm.sp('mt', 8),
            'font-display',
          )}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue: `Running an election, an AGM, or a conference and want ${APP_NAME} to handle the vote? Reach out from your dashboard — every message goes to a real person on the team.`,
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
