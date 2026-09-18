import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface TermsSection {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: TermsSection[] = [
  {
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.section.account.body',
    bodyValues: { app: APP_NAME },
    bodyDefault: `You must be 18 or older to use ${APP_NAME}. You are responsible for keeping your password secret and for everything that happens under your account; tell us immediately if you suspect unauthorized access.`,
  },
  {
    id: 'bids',
    titleKey: 'terms.section.bids.heading',
    titleDefault: 'Bids are binding',
    bodyKey: 'terms.section.bids.body',
    bodyDefault:
      'A bid is a binding offer to buy at the bid price. If you win an auction, you must complete payment and shipping arrangements within 72 hours, or the lot may be relisted and your account may be suspended.',
  },
  {
    id: 'fees',
    titleKey: 'terms.section.fees.heading',
    titleDefault: 'Fees and payments',
    bodyKey: 'terms.section.fees.body',
    bodyValues: { app: APP_NAME },
    bodyDefault: `Bidders pay no buyer's premium. Sellers pay a flat 8% commission on the hammer price, inclusive of payment processing, deducted on settlement. ${APP_NAME} reserves the right to update the seller commission with 30 days' notice.`,
  },
  {
    id: 'lots',
    titleKey: 'terms.section.lots.heading',
    titleDefault: 'Lots and provenance',
    bodyKey: 'terms.section.lots.body',
    bodyValues: { app: APP_NAME },
    bodyDefault: `Sellers warrant that they own the lot, that the description is accurate, and that they have the right to ship it to the winning bidder. ${APP_NAME} curates listings but does not independently appraise every lot — see Privacy for what we do verify.`,
  },
  {
    id: 'disputes',
    titleKey: 'terms.section.disputes.heading',
    titleDefault: 'Disputes',
    bodyKey: 'terms.section.disputes.body',
    bodyDefault:
      'If a lot arrives misdescribed or damaged, file a dispute within 7 days of delivery. Escrowed funds will be held while we investigate. Claims unresolved after 30 days may be escalated to binding arbitration in the seller’s home jurisdiction.',
  },
  {
    id: 'changes',
    titleKey: 'terms.section.changes.heading',
    titleDefault: 'Changes to these terms',
    bodyKey: 'terms.section.changes.body',
    bodyDefault:
      'We may update these terms; material changes get 30 days’ in-app notice and an email. Continued use after the effective date counts as acceptance.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('terms.eyebrow', {}, { defaultValue: 'Terms of service' })}
      title={t('terms.title', {}, { defaultValue: 'The rules of the floor.' })}
      subtitle={t('terms.lastUpdated', {}, { defaultValue: 'Last updated 2026-05-09.' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
