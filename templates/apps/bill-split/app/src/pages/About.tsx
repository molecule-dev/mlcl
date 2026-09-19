import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t('about.pageTitle', { app: APP_NAME }, { defaultValue: `About ${APP_NAME}` })}
      subtitle={t('about.tagline', {}, { defaultValue: APP_TAGLINE })}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p data-mol-id="about-intro">
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is a group expense splitter for friends, flatmates, and trip crews. Add what was paid, split it however is fair, and keep the running balances — without the shared spreadsheet ceremony.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p data-mol-id="about-mission">
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Shared money should stay friendly. We built {{app}} so everyone sees the same balances, every share adds up to the cent, and settling up takes the fewest transfers possible — never a chase.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <ul data-mol-id="about-features" className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
          <li>
            {t(
              'about.featureSplits',
              {},
              {
                defaultValue:
                  'Splits the way real life works — equal, exact amounts, or weighted shares for couples and roommates.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureBalances',
              {},
              {
                defaultValue:
                  'Balances that always add up: every group nets to exactly zero, and your dashboard totals what you owe and what you are owed.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureSettle',
              {},
              {
                defaultValue:
                  'Simplified settle-up — the fewest transfers that zero a group out, recorded in one tap when the money moves.',
              },
            )}
          </li>
          <li>
            {t(
              'about.featureActivity',
              {},
              {
                defaultValue:
                  'A chronological activity feed so nobody has to ask "wait, what was that charge for?" again.',
              },
            )}
          </li>
        </ul>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), cm.sp('mt', 8))}>
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p data-mol-id="about-contact">
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions, feedback, or a feature request? Reach the {{app}} team from Settings, or write to us any time — every message goes to a real human.',
            },
          )}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
