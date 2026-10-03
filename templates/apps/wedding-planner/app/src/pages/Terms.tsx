import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Promise {
  key: string
  icon: string
  title: string
  body: string
}

/** The design's core promises — stated as commitments this product can
 *  actually keep. */
const PROMISES: Promise[] = [
  {
    key: 'sovereignty',
    icon: 'verified_user',
    title: 'Celebration Sovereignty',
    body: 'Your wedding data, seating plans, guest list, and contact details remain 100% yours forever. We never sell, monetize, or broker personal information.',
  },
  {
    key: 'uptime',
    icon: 'cloud_done',
    title: 'Uncompromised Uptime',
    body: 'We run {{app}} on redundant managed infrastructure and target the highest practical availability through your RSVP window and wedding weekend. If something ever interrupts your planning, status updates and support are one message away.',
  },
  {
    key: 'fees',
    icon: 'receipt_long',
    title: 'Transparent Escrow & Fees',
    body: 'Zero hidden surcharges, surprise card renewals, or locked vendor kickbacks. One clear subscription price, cancellable at any time, processed directly by our payment provider.',
  },
  {
    key: 'archival',
    icon: 'auto_stories',
    title: 'Right to Peaceful Archival',
    body: 'Never lose your vows, seating chart, or heartfelt guestbook letters. Your workspace stays available after the wedding — an ad-free home for your memories for as long as you keep it.',
  },
]

interface Section {
  key: string
  title: string
  body: string
}

const SECTIONS: Section[] = [
  {
    key: 'acceptance',
    title: 'Acceptance of Terms & The {{app}} Covenant',
    body: 'By creating an account or responding to an invitation, you agree to these terms. They are written in plain English on purpose: a contract for your celebration should be as calm and readable as everything else here. If you are a guest, you are covered by the guest-privacy commitments below without needing an account at all.',
  },
  {
    key: 'workspace',
    title: 'The {{app}} Workspace & Account Co-Ownership',
    body: 'Each wedding suite belongs to the couple who created it. You are responsible for the content you enter and for collecting consent from the people you invite. You may correct, export, or erase your suite at any time, and you own your RSVP code and everything guests share through it.',
  },
  {
    key: 'guest',
    title: 'Guest Privacy & Frictionless RSVP Dignity',
    body: 'As the account creators, you act as the controller of your wedding directory; {{app}} acts as your custodian, storing and rendering what you and your guests enter and nothing more. You represent that you have appropriate permission from attendees to collect their meal selections, contact details, and accessibility requests.',
  },
  {
    key: 'vendor',
    title: 'Vendor Collective & Escrow Retainers',
    body: 'Vendors in your pipeline are entries you manage — {{app}} never shares your data with them, takes referral fees, or acts as an agent in your contracts. Any deposits or payment schedules you track are records for your planning; money changes hands directly between you and your vendors.',
  },
  {
    key: 'ip',
    title: 'Intellectual Property & Bespoke Keepsakes',
    body: 'Your content — names, notes, seating plans, messages — is yours. The {{app}} service, its design, and its code remain ours. You may export and keep everything you create here; we claim no license over your memories beyond what is needed to run your planner.',
  },
  {
    key: 'postponement',
    title: 'Celebration Postponement Grace & Refund Policy',
    body: 'Weddings move — we plan for it. You may cancel a paid subscription at any time and keep access through the period you have paid for. If life upends your date, contact us: we will help you pause, update, or wind down your suite without penalty.',
  },
  {
    key: 'archival',
    title: 'Archival Keepsake Mode & Lifetime Preservation',
    body: 'Your workspace does not expire after the celebration. Keep it as a read-only keepsake for as long as you like, or ask us to archive it or erase it completely — the choice, and the data, stay yours.',
  },
  {
    key: 'liability',
    title: 'Limitation of Liability & Graceful Arbitration',
    body: '{{app}} provides the service “as is” and, to the extent the law allows, is not liable for indirect or consequential losses arising from its use. Our total liability is limited to the amounts you paid us in the twelve months before a claim. If a dispute arises, we will first try to resolve it in good-faith conversation — court proceedings are the last resort, not the first.',
  },
]

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('terms.eyebrow', {}, { defaultValue: 'Terms of service' })}
      title={t(
        'terms.title',
        { app: APP_NAME },
        {
          defaultValue: 'A calm, transparent covenant between your celebration and {{app}}.',
        },
      )}
      subtitle={t(
        'terms.subtitle',
        {},
        {
          defaultValue:
            'Clear, plain-English terms honoring your wedding memories, guest privacy, financial integrity, and uninterrupted peace of mind.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        {/* Core promises */}
        <section data-mol-id="terms-promises" className={cm.cn(cm.stack(4))}>
          <p
            className={cm.cn('text-xs font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-accent)' }}
          >
            {t(
              'terms.promisesEyebrow',
              {},
              { defaultValue: 'Our core promises to every engaged couple' },
            )}
          </p>
          <ul className={cm.cn('grid gap-5 sm:grid-cols-2')}>
            {PROMISES.map((promise) => (
              <li
                key={promise.key}
                data-mol-id={`terms-promise-${promise.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl bg-primary-fixed/40 text-primary mb-3',
                  )}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    {promise.icon}
                  </span>
                </span>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                  {t(`terms.promise.${promise.key}.title`, {}, { defaultValue: promise.title })}
                </h2>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(
                    `terms.promise.${promise.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: promise.body },
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* The couple's plain-English bill of rights */}
        <section data-mol-id="terms-bill-of-rights" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t(
              'terms.billTitle',
              {},
              { defaultValue: 'The couple’s plain-English bill of rights' },
            )}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
            {(
              [
                'Export or erase your entire suite at any time.',
                'Guest responses are never sold, brokered, or fed to advertisers.',
                'Cancel your plan whenever you like — data stays intact and readable.',
                'A real person answers support and privacy requests.',
              ] as const
            ).map((item) => (
              <li key={item} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t('terms.billItem', { item }, { defaultValue: item })}
              </li>
            ))}
          </ul>
        </section>

        {/* Numbered sections */}
        <div className={cm.cn(cm.stack(8))}>
          {SECTIONS.map((section) => (
            <section
              key={section.key}
              data-mol-id={`terms-${section.key}`}
              className={cm.cn(cm.stack(2))}
            >
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                {t(
                  `terms.section.${section.key}.title`,
                  { app: APP_NAME },
                  { defaultValue: section.title },
                )}
              </h2>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(
                  `terms.section.${section.key}.body`,
                  { app: APP_NAME },
                  { defaultValue: section.body },
                )}
              </p>
            </section>
          ))}
        </div>

        {/* Legal desk note (from the design) */}
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'terms.deskNote',
            {},
            {
              defaultValue:
                'Need clarification on wedding date postponements, vendor contracts, or guest list portability? Our celebration support desk is at your service from your account settings.',
            },
          )}
        </p>

        {/* Closing */}
        <section
          data-mol-id="terms-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl bg-surface-container-low border border-outline-variant/40 text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'mb-3')}>
            {t(
              'terms.ctaTitle',
              {},
              { defaultValue: 'Ready to plan your wedding with complete peace of mind?' },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant mb-5')}>
            {t(
              'terms.ctaBody',
              {},
              {
                defaultValue:
                  'Join thousands of couples creating timeless memories with transparent terms, uninterrupted privacy, and effortless editorial elegance.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="terms-cta-button"
            className={cm.cn(
              'inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white shadow-md',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            }}
          >
            {t('terms.ctaButton', {}, { defaultValue: 'Start planning free' })}
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
