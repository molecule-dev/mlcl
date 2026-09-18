import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Feature {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const FEATURES: Feature[] = [
  {
    id: 'ocr',
    titleKey: 'about.feature.ocr.title',
    titleDefault: 'OCR for anything you scan',
    bodyKey: 'about.feature.ocr.body',
    bodyDefault:
      'Upload PDFs, scans, or phone photos. High-fidelity OCR reads invoices, receipts, contracts, and forms — even messy ones — with a confidence score on every field.',
  },
  {
    id: 'extract',
    titleKey: 'about.feature.extract.title',
    titleDefault: 'Structured extraction',
    bodyKey: 'about.feature.extract.body',
    bodyDefault:
      'Vendor, totals, tax, dates, line items — every relevant field is pulled into a clean schema you can review, correct, and export to CSV or your downstream systems.',
  },
  {
    id: 'classify',
    titleKey: 'about.feature.classify.title',
    titleDefault: 'Automatic classification & filing',
    bodyKey: 'about.feature.classify.body',
    bodyDefault:
      'Documents are classified by type and routed to the right folder by extraction rules that learn how your team files. No more manual sorting.',
  },
  {
    id: 'review',
    titleKey: 'about.feature.review.title',
    titleDefault: 'Reviewable on every step',
    bodyKey: 'about.feature.review.body',
    bodyDefault:
      'Per-page provenance, confidence colors, and a full audit history mean a teammate can verify any decision in seconds — so people only review what really needs a human.',
  },
]

/**
 * Public "About" page for the app. Mirrors the public chrome used by the
 * Pricing page (the shared {@link ContentPageShell} with the app's own
 * {@link Header} + {@link Footer}) and describes what the product does,
 * grounded in the app's real feature set.
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
      eyebrow={t('nav.about', {}, { defaultValue: 'About' })}
      title={t('about.title', { app: APP_NAME }, { defaultValue: 'About {{app}}' })}
      subtitle={t(
        'about.subtitle',
        {},
        {
          defaultValue:
            'OCR, AI extraction, classification, and automated filing for your documents.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} turns stacks of scanned documents and PDFs into structured, searchable, filed data. Drop in invoices, receipts, contracts, or forms and let AI read, extract, classify, and file them — with confidence colors so your team only reviews what really needs a human.',
            },
          )}
        </p>

        <section data-mol-id="about-mission" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.missionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Document busywork should not eat your team’s day. We believe every extracted value should be explainable and auditable — so you can trust automation without losing the paper trail. {{app}} is built to save hours per stack while keeping a human in the loop wherever it counts.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="about-features" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.whatYouGetTitle', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(4))}>
            {FEATURES.map((f) => (
              <li key={f.id} data-mol-id={`about-feature-${f.id}`} className={cm.cn(cm.stack(1))}>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              {},
              {
                defaultValue:
                  'Have a question, found a bug, or want a demo for your team? Reach out from your account settings — every message goes to a real person on the team.',
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
