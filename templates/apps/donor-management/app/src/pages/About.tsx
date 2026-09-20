import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featureDonors',
    def: 'Donor profiles with lifetime giving, first and last gift dates, and tags like monthly-donor, major-donor, volunteer, and board-member — the whole relationship on one page.',
  },
  {
    key: 'about.featureGifts',
    def: 'Gift entry that takes seconds: amount, date, method (check, card, cash, ACH), fund designation, and the campaign it counts toward.',
  },
  {
    key: 'about.featureCampaigns',
    def: 'Campaigns with goals and live raised-to-date, so progress updates itself as gifts arrive instead of waiting for the next spreadsheet refresh.',
  },
  {
    key: 'about.featureReceipts',
    def: 'Year-end tax receipts with deterministic numbers and one line per gift, generated per donor per year and printable straight from the browser.',
  },
  {
    key: 'about.featureNotes',
    def: 'A notes timeline per donor — preferences, relationships, grant deadlines — so institutional memory survives staff turnover.',
  },
  {
    key: 'about.featureTiers',
    def: 'Stripe-backed subscription tiers that grow with the organization: start free, upgrade when the donor book outgrows the free limits.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
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
              defaultValue:
                '{{appName}} is a donor management system built for the small fundraising teams who know every supporter by name. It carries a relationship from the first gift to the year-end receipt — donors, gifts, campaigns, and tax receipts in one place instead of five.',
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
              {},
              {
                defaultValue:
                  'Nonprofits were sold “software” that turned gratitude into data entry and year-end into a spreadsheet marathon. We believe a two-person development team deserves the same calm tooling as a national charity — every donor, gift, and receipt in one place, so January starts with thank-yous instead of panic.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {FEATURES.map((f) => (
              <li key={f.key} className={'text-on-surface-variant'}>
                {t(f.key, {}, { defaultValue: f.def })}
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Have a question, found a bug, or want to run {{appName}} for your own organization? Reach the team from the Settings page once you are signed in — every message reaches a real person who works on the product.',
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
