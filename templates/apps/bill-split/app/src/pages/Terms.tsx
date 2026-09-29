import type { ReactNode } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/* Stitch terms design — the three highlight cards at the top of the page. */
const HIGHLIGHTS = [
  {
    icon: 'account_balance_wallet',
    title: 'Non-Custodial Service',
    body: '{{app}} is an expense-tracking and debt-minimization platform. We calculate balances mathematically but never hold, escrow, or route your actual cash funds.',
    clause: 'Read clause 03',
  },
  {
    icon: 'handshake',
    title: 'Fair & Honest Use',
    body: 'Built for genuine roommates, trips, friends, and split circles. No commercial invoicing fraud, spam debt creation, or predatory collection activity.',
    clause: 'Read clause 05',
  },
  {
    icon: 'lock_reset',
    title: 'You Own Your Data',
    body: 'Export full ledgers anytime as CSV/JSON, or permanently wipe your split history and active groups on request with one-click self-serve erasure.',
    clause: 'Read clause 08',
  },
] as const

const DOES_FOR_YOU = [
  'Maintains exact mathematical split ledgers for roommate groups, shared trips, and couples.',
  'Minimizes transaction overhead by reducing multiple multi-party debts into optimized pairs.',
  'Provides direct deep-links to launch settlement payments via external peer-to-peer rails.',
] as const

const IS_NOT = [
  'We are not a chartered bank, money transmitter, escrow company, or depository institution.',
  'We never hold, touch, transmit, or custody real fiat currencies or bank funds.',
  'We do not act as an automated debt collection agency or legal enforcer of informal loans.',
] as const

const CONDUCT = [
  'Fabricate deceptive receipts, manipulate scanned itemizations, or assign fictional liabilities to unaware third parties.',
  'Use automated bots or repetitive settlement notifications to harass, spam, or intimidate fellow participants.',
  'Track commercial transactions involving illicit goods, unauthorized gambling, money laundering, or sanctions-restricted entities.',
] as const

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sectionTitle = cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')
  const clauseLabel = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-primary',
  )

  const highlightCard = (c: (typeof HIGHLIGHTS)[number]): ReactNode => (
    <article
      key={c.title}
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-low border border-outline-variant/40',
        cm.stack(2),
      )}
    >
      <span
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.w(10),
          cm.h(10),
          'rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
        )}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-xl')}>{c.icon}</span>
      </span>
      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
        {t(`terms.highlight.${c.title}`, {}, { defaultValue: c.title })}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
        {t(`terms.highlightBody.${c.title}`, { app: APP_NAME }, { defaultValue: c.body })}
      </p>
    </article>
  )

  const proseCard = (key: string, icon: string, title: string, body: string): ReactNode => (
    <article
      key={key}
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-low border border-outline-variant/40',
        cm.stack(2),
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.flex({ align: 'center', gap: 2 }),
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-lg text-primary')}
          aria-hidden="true"
        >
          {icon}
        </span>
        {t(`terms.card.${title}`, {}, { defaultValue: title })}
      </h3>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
        {t(`terms.cardBody.${title}`, { app: APP_NAME }, { defaultValue: body })}
      </p>
    </article>
  )

  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('terms.eyebrow', {}, { defaultValue: 'Legal & Transparency' })}
      title={t('terms.pageTitle', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.subtitle',
        { app: APP_NAME },
        { defaultValue: 'Simple agreements for fair splits.' },
      )}
      containerSize="lg"
    >
      <div className={cm.stack(10)}>
        {/* Hero statement — Stitch "Terms of Service: Simple agreements for fair splits." */}
        <section className={cm.stack(4)} data-mol-id="terms-intro">
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
            {t(
              'terms.introTitle',
              {},
              { defaultValue: 'Terms of Service: Simple agreements for fair splits.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.introBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is designed to keep shared expenses simple, transparent, and drama-free. These terms outline how our platform operates, our non-custodial debt-minimization calculations, and what we expect from our community.',
              },
            )}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6" data-mol-id="terms-highlights">
          {HIGHLIGHTS.map((c) => highlightCard(c))}
        </section>

        {/* 01 Plain English Summary */}
        <section className={cm.stack(4)} data-mol-id="terms-summary">
          <span className={clauseLabel}>
            {t('terms.section.summary', {}, { defaultValue: '01 · Summary' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.summaryTitle', {}, { defaultValue: 'Plain English Summary' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.summaryBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Legal documents are notoriously difficult to digest. We want you to be fully informed about what {{app}} does and does not do before you link expenses with friends and housemates.',
              },
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={cm.cn(cm.sp('p', 5), 'rounded-2xl bg-primary-container/40', cm.stack(3))}
            >
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 2 }),
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-lg text-primary')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t(
                  'terms.doesTitle',
                  { app: APP_NAME },
                  { defaultValue: 'What {{app}} does for you' },
                )}
              </h3>
              <ul className={cm.stack(2)}>
                {DOES_FOR_YOU.map((row, i) => (
                  <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                      aria-hidden="true"
                    >
                      done
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                      {t(`terms.does.${i}`, {}, { defaultValue: row })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={cm.cn(cm.sp('p', 5), 'rounded-2xl bg-error-container/30', cm.stack(3))}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.flex({ align: 'center', gap: 2 }),
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-lg text-error')}
                  aria-hidden="true"
                >
                  cancel
                </span>
                {t('terms.isNotTitle', { app: APP_NAME }, { defaultValue: 'What {{app}} is not' })}
              </h3>
              <ul className={cm.stack(2)}>
                {IS_NOT.map((row, i) => (
                  <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-error')}
                      aria-hidden="true"
                    >
                      close
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                      {t(`terms.isNot.${i}`, {}, { defaultValue: row })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 02 Eligibility & Account Creation */}
        <section className={cm.stack(4)} data-mol-id="terms-eligibility">
          <span className={clauseLabel}>
            {t('terms.section.eligibility', {}, { defaultValue: '02 · Eligibility' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.eligibilityTitle', {}, { defaultValue: 'Eligibility & Account Creation' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.eligibilityBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'To use {{app}}, you must be at least 18 years of age or the age of legal majority in your applicable jurisdiction. By creating an account, you represent and warrant that you possess the full capacity to enter into these terms, that your registration information is true and current, and that you will keep it up to date. Impersonating another person or creating dummy accounts to skew group accountability is strictly prohibited.',
              },
            )}
          </p>
          {proseCard(
            'account-security',
            'shield',
            'Account Security',
            'You are solely responsible for safeguarding any passwords, biometric tokens, or magic links issued to access {{app}}. Notify our security team immediately if you suspect unauthorized access.',
          )}
        </section>

        {/* 03 Nature of Service & Calculations */}
        <section className={cm.stack(4)} data-mol-id="terms-nature">
          <span className={clauseLabel}>
            {t('terms.section.nature', {}, { defaultValue: '03 · Nature of service' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.natureTitle', {}, { defaultValue: 'Nature of Service & Calculations' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.natureBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} provides algorithmic calculation tools to assist users in tracking communal spending, splitting bills according to custom formulas (equal, percentage, shares, or itemized sub-receipts), and minimizing mutual balance transfers.',
              },
            )}
          </p>
          <ul className={cm.stack(2)}>
            {[
              'Calculations are rounded to the nearest integer cent based on the currency configured by the group creator.',
              'Debt minimization operates with user consent within the group; users may disable simplification at any time to preserve direct one-to-one IOUs.',
              'Ledgers represent informal social accounting records, not negotiable instruments, promissory notes, or legal security interests.',
            ].map((row, i) => (
              <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-primary')}
                  aria-hidden="true"
                >
                  calculate
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                  {t(`terms.naturePoint.${i}`, {}, { defaultValue: row })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 04 Third-Party Payment Integrations */}
        <section className={cm.stack(4)} data-mol-id="terms-integrations">
          <span className={clauseLabel}>
            {t('terms.section.integrations', {}, { defaultValue: '04 · Integrations' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.integrationsTitle', {}, { defaultValue: 'Third-Party Payment Integrations' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.integrationsBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} lets you link your external peer-to-peer identifiers (Venmo usernames, Cash App $cashtags, PayPal.me links, and Zelle contacts) solely to help group members send money to you. Clicking a settle action generates an OS deep link that opens your installed app with pre-filled payment metadata — a 0.00% fee on settlements, and your payment occurs directly between your wallet and the recipient.',
              },
            )}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'terms.affiliationNotice',
              { app: APP_NAME },
              {
                defaultValue:
                  'Notice: {{app}} is not affiliated with, sponsored by, or endorsed by PayPal Inc., Venmo, Block Inc. (Cash App), or Early Warning Services LLC (Zelle).',
              },
            )}
          </p>
        </section>

        {/* 05 User Conduct & Acceptable Ledger Use */}
        <section className={cm.stack(4)} data-mol-id="terms-conduct">
          <span className={clauseLabel}>
            {t('terms.section.conduct', {}, { defaultValue: '05 · Conduct' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.conductTitle', {}, { defaultValue: 'User Conduct & Acceptable Ledger Use' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'terms.conductBody',
              {},
              {
                defaultValue:
                  'We maintain a high standard of respect, integrity, and safety across all shared groups. You agree that you will not under any circumstance:',
              },
            )}
          </p>
          <ul className={cm.stack(2)}>
            {CONDUCT.map((row, i) => (
              <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-error')}
                  aria-hidden="true"
                >
                  block
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                  {t(`terms.conductRule.${i}`, {}, { defaultValue: row })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 06 Shared Group Responsibility & Disputes */}
        <section className={cm.stack(4)} data-mol-id="terms-disputes">
          <span className={clauseLabel}>
            {t('terms.section.disputes', {}, { defaultValue: '06 · Disputes' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'terms.disputesTitle',
              {},
              { defaultValue: 'Shared Group Responsibility & Disputes' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.disputesBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} operates as a neutral ledger calculator. All expenses logged, accepted, or settled within a group are entered at the mutual discretion of the group members. If a dispute arises over whether a bill was shared fairly, the participants must resolve it among themselves — our support team does not arbitrate informal social disagreements or refund money transferred outside the platform.',
              },
            )}
          </p>
        </section>

        {/* 07 Service Fees, Tipping & Monetization */}
        <section className={cm.stack(4)} data-mol-id="terms-fees">
          <span className={clauseLabel}>
            {t('terms.section.fees', {}, { defaultValue: '07 · Fees' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.feesTitle', {}, { defaultValue: 'Service Fees, Tipping & Monetization' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.feesBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Personal use is free forever: basic split features, debt minimization, and unlimited personal groups cost nothing, with zero advertisements. Optional paid subscriptions may add conveniences such as multi-currency auto-conversion, unlimited archival storage, and priority support; subscriptions auto-renew unless cancelled at least 24 hours before the end of the billing period.',
              },
            )}
          </p>
        </section>

        {/* 08 Account Termination & Ledger Deletion */}
        <section className={cm.stack(4)} data-mol-id="terms-termination">
          <span className={clauseLabel}>
            {t('terms.section.termination', {}, { defaultValue: '08 · Termination' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'terms.terminationTitle',
              {},
              { defaultValue: 'Account Termination & Ledger Deletion' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.terminationBody',
              {},
              {
                defaultValue:
                  'You have the right to terminate your account at any time. When you close your account:',
              },
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proseCard(
              'portability',
              'file_download',
              'Immediate Data Portability',
              'You can download an export of all your split history, receipts, and balance audits in machine-readable JSON or CSV format with one click in account settings.',
            )}
            {proseCard(
              'erasure',
              'delete_forever',
              'Confirmed Erasure',
              'Upon confirmed account deletion, personally identifiable information is permanently stripped within 30 days pursuant to our Privacy Policy and applicable regulations.',
            )}
          </div>
        </section>

        {/* 09 Disclaimers & Limitation of Liability */}
        <section className={cm.stack(4)} data-mol-id="terms-liability">
          <span className={clauseLabel}>
            {t('terms.section.liability', {}, { defaultValue: '09 · Disclaimers' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'terms.liabilityTitle',
              {},
              { defaultValue: 'Disclaimers & Limitation of Liability' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.liabilityBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Please read this section carefully as it limits the liability of {{app}} to the maximum extent permitted by applicable law. The service is provided on an “as is” and “as available” basis without warranties of any kind, either express or implied. We do not guarantee that calculations will be free of delays, or that group members will honor social settlement commitments. To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the service.',
              },
            )}
          </p>
        </section>

        {/* 10 Contact & Governing Law */}
        <section className={cm.stack(4)} data-mol-id="terms-contact">
          <span className={clauseLabel}>
            {t('terms.section.contact', {}, { defaultValue: '10 · Contact & governing law' })}
          </span>
          <h2 className={sectionTitle}>
            {t('terms.contactTitle', {}, { defaultValue: 'Contact & Governing Law' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'terms.contactBody',
              {},
              {
                defaultValue:
                  'These Terms and any action related thereto are governed by the laws of the State of California, without regard to its conflict-of-law provisions. Questions about these terms: legal@evenly.app · Privacy office: privacy@evenly.app · General help: support@evenly.app.',
              },
            )}
          </p>
        </section>

        {/* Final CTA — Stitch "Ready to split expenses with total peace of mind?" */}
        <section
          data-mol-id="terms-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl bg-gradient-to-br from-primary to-[color:var(--color-surface-tint)] text-on-primary text-center shadow-xl',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
            {t(
              'terms.ctaTitle',
              {},
              { defaultValue: 'Ready to split expenses with total peace of mind?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-primary-container', cm.sp('mt', 2))}>
            {t(
              'terms.ctaBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Join the roommates, travelers, and friends saving time with {{app}} — fair math, no awkwardness.',
              },
            )}
          </p>
          <a
            href="/signup"
            data-mol-id="terms-cta-signup"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'mt-6 rounded-xl bg-on-primary text-primary shadow-lg inline-flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]',
            )}
          >
            {t('common.startFree', {}, { defaultValue: 'Get Started Free' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </a>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
