import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const FEATURES: { key: string; def: string }[] = [
  {
    key: 'about.featureQuotes',
    def: 'Quotes with real line items — parts and labor priced by quantity and rate, sent to the customer in one click and converted to a job the moment they say yes.',
  },
  {
    key: 'about.featureDispatch',
    def: 'A weekly dispatch board with technicians as rows and days as columns, so filling the schedule is a glance instead of a phone chain.',
  },
  {
    key: 'about.featureChecklists',
    def: 'Per-job checklists and a notes timeline that capture what the tech actually did on site — done flags, timestamps, and photos where it matters.',
  },
  {
    key: 'about.featureTechnicians',
    def: 'Technician records with trade tags and certifications, plus a live count of each tech’s open jobs before you book another one on them.',
  },
  {
    key: 'about.featureInvoicing',
    def: 'Invoices generated from completed jobs with the quote’s line items already copied in — send it, mark it paid, done.',
  },
  {
    key: 'about.featureCustomers',
    def: 'A customer book with service history per address, so anyone answering the phone knows the house before they roll a truck.',
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
                '{{appName}} is a field service management system built for the owner-operators and office dispatchers who quote, schedule, and invoice the work themselves. It carries a job from the first estimate to the deposited check — quotes, dispatch, checklists, and invoices in one place instead of five.',
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
                  'Blue-collar shops were sold “software” that turned quoting into data entry and dispatching into a whiteboard with a login. We believe a crew of six deserves the same calm tooling as a company of six hundred — every quote, job, and invoice in one place, so the office closes at five and the work still gets billed.',
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
                  'Have a question, found a bug, or want to run {{appName}} in your own shop? Reach the team from the Settings page once you are signed in — every message reaches a real person who works on the product.',
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
