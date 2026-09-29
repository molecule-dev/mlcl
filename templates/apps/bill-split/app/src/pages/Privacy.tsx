import type { ReactNode } from 'react'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/* Stitch privacy design — the three trust cards at the top of the page. */
const TRUST_CARDS = [
  {
    icon: 'block',
    title: 'Zero Advertising or Data Brokering',
    body: 'We do not monetize your dinner tabs, grocery lists, or peer debts. No third-party ad networks will ever profile your spending through {{app}}.',
    point: 'Zero third-party trackers',
  },
  {
    icon: 'lock',
    title: 'Bank-Grade Encryption',
    body: 'AES-256 data encryption at rest, TLS 1.3 in transit, and immutable cryptographic ledger logs protect all calculations from unauthorized tampering.',
    point: '256-bit ledger signatures',
  },
  {
    icon: 'verified',
    title: 'SOC 2 Type II Certified',
    body: 'Rigorous independent third-party audits verify our operational controls, strict confidential handling, and financial infrastructure reliability.',
    point: 'Independently audited controls',
  },
] as const

const WE_COLLECT = [
  {
    icon: 'badge',
    title: 'Account Essentials',
    body: 'Your preferred name, email address, and optional profile avatar — plus a phone number only if you choose SMS settlement alerts.',
    tag: 'User-provided',
  },
  {
    icon: 'receipt_long',
    title: 'Shared Expense Records',
    body: 'Bill titles, currency denominations, split ratios, custom percentage splits, and tags within that specific group.',
    tag: 'Ledger core',
  },
  {
    icon: 'smartphone',
    title: 'Technical & Diagnostics Data',
    body: 'Client operating system version, device model identifiers, crash stack traces, and API response latency for system stability.',
    tag: 'Aggregated',
  },
] as const

const WE_DO = [
  'Compute exact balances between trusted members in your created groups.',
  'Encrypt expense receipts, timestamps, and itemized amounts using AES-256.',
  'Provide instant one-tap data exports and complete ledger wiping upon request.',
  'Transmit only payment metadata via local OS deep links to your payment apps.',
] as const

const WE_NEVER = [
  'Never sell or rent your itemized purchase habits to marketing brokers or ad networks.',
  'Never track continuous background GPS or infer physical locations outside expense context.',
  'Never store unencrypted bank account credentials or credit card numbers.',
  'Never hold custody of funds or route your settlement money into our accounts.',
] as const

const YOUR_RIGHTS = [
  'Right to access stored records',
  'Right to rectification & correction',
  'Right to erasure (“Right to be Forgotten”)',
  'Right to non-discrimination for opting out',
] as const

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sectionTitle = cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')
  const clauseLabel = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-primary',
  )

  const card = (
    key: string,
    icon: string,
    title: string,
    body: string,
    point?: string,
  ): ReactNode => (
    <article
      key={key}
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
        <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
      </span>
      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
        {t(`privacy.card.${title}`, {}, { defaultValue: title })}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
        {t(`privacy.cardBody.${title}`, { app: APP_NAME }, { defaultValue: body })}
      </p>
      {point ? (
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-primary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            task_alt
          </span>
          {t(`privacy.cardPoint.${title}`, {}, { defaultValue: point })}
        </p>
      ) : null}
    </article>
  )

  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('privacy.eyebrow', {}, { defaultValue: 'Legal & Transparency' })}
      title={t('privacy.pageTitle', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.subtitle',
        { app: APP_NAME },
        { defaultValue: 'How {{app}} handles your data — in plain English.' },
      )}
      containerSize="lg"
    >
      <div className={cm.stack(10)}>
        {/* Promise — Stitch hero statement */}
        <section className={cm.stack(4)} data-mol-id="privacy-promise">
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
            {t(
              'privacy.promiseTitle',
              {},
              { defaultValue: 'Our Privacy Promise: Your finances are your business.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.promiseBody',
              { app: APP_NAME },
              {
                defaultValue:
                  '{{app}} is built for social harmony, not data harvesting. We never sell your dining habits, location trails, or split amounts. Here is exactly how we handle your information with bank-grade integrity and human clarity.',
              },
            )}
          </p>
        </section>

        <section
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          data-mol-id="privacy-trust-cards"
        >
          {TRUST_CARDS.map((c) => card(c.title, c.icon, c.title, c.body, c.point))}
        </section>

        {/* 01 Plain English Executive Summary */}
        <section className={cm.stack(4)} data-mol-id="privacy-summary">
          <span className={clauseLabel}>
            {t('privacy.section.summary', {}, { defaultValue: '01 · Summary' })}
          </span>
          <h2 className={sectionTitle}>
            {t('privacy.summaryTitle', {}, { defaultValue: 'Plain English Executive Summary' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.summaryBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Most privacy policies are deliberately opaque legal shields. We believe legal clarity is a direct extension of financial fairness. Below is an unambiguous breakdown of what {{app}} does — and will never do — with your personal data.',
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
                {t('privacy.weDoTitle', {}, { defaultValue: 'What we do' })}
              </h3>
              <ul className={cm.stack(2)}>
                {WE_DO.map((row, i) => (
                  <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-primary')}
                      aria-hidden="true"
                    >
                      done
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                      {t(`privacy.weDo.${i}`, {}, { defaultValue: row })}
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
                {t('privacy.weNeverTitle', {}, { defaultValue: 'What we will never do' })}
              </h3>
              <ul className={cm.stack(2)}>
                {WE_NEVER.map((row, i) => (
                  <li key={row} className={cm.flex({ align: 'start', gap: 2 })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base text-error')}
                      aria-hidden="true"
                    >
                      close
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                      {t(`privacy.weNever.${i}`, {}, { defaultValue: row })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 02 Information We Collect */}
        <section className={cm.stack(4)} data-mol-id="privacy-collection">
          <span className={clauseLabel}>
            {t('privacy.section.collection', {}, { defaultValue: '02 · Collection' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'privacy.collectionTitle',
              {},
              { defaultValue: "Information We Collect (And What We Don't)" },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.collectionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'We collect the absolute minimum amount of personal data required to calculate balanced math between friends and maintain ledger synchronization across devices.',
              },
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WE_COLLECT.map((c) => card(c.title, c.icon, c.title, c.body))}
          </div>
          <aside
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-warning-container/30',
              cm.flex({ align: 'start', gap: 3 }),
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-xl text-on-warning-container')}
              aria-hidden="true"
            >
              warning
            </span>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface leading-relaxed')}>
              <strong className={cm.fontWeight('bold')}>
                {t(
                  'privacy.nonCollectionTitle',
                  {},
                  { defaultValue: 'Strict non-collection mandate: ' },
                )}
              </strong>
              {t(
                'privacy.nonCollectionBody',
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} deliberately does NOT collect or possess your card primary account numbers, CVVs, online-banking master credentials, or government identifiers. Bank connections, when you choose to use them, are tokenized directly with the provider.',
                },
              )}
            </p>
          </aside>
        </section>

        {/* 03 How We Use Shared Ledger Data */}
        <section className={cm.stack(4)} data-mol-id="privacy-ledger-use">
          <span className={clauseLabel}>
            {t('privacy.section.ledgerUse', {}, { defaultValue: '03 · Ledger use' })}
          </span>
          <h2 className={sectionTitle}>
            {t('privacy.ledgerUseTitle', {}, { defaultValue: 'How We Use Shared Ledger Data' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {card(
              'Isolated Group Boundaries',
              'group_work',
              'Isolated Group Boundaries',
              "Ledger records created inside one group cannot be inspected, inferred, or linked to another group's ledger. Your cabin trip and your rent split never mix.",
            )}
            {card(
              'Cryptographic Checksums',
              'fingerprint',
              'Cryptographic Checksums',
              'When balances are settled, a hash stamp binds the payout event, preventing retroactive disputes or unauthorized transaction injection.',
            )}
          </div>
        </section>

        {/* 04 Debt Minimization & Algorithm Privacy */}
        <section className={cm.stack(4)} data-mol-id="privacy-algorithm">
          <span className={clauseLabel}>
            {t('privacy.section.algorithm', {}, { defaultValue: '04 · Algorithm privacy' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'privacy.algorithmTitle',
              {},
              { defaultValue: 'Debt Minimization & Algorithm Privacy' },
            )}
          </h2>
          {card(
            'Deterministic Graph Execution',
            'hub',
            'Deterministic Graph Execution',
            'When debt minimization is triggered, computation runs strictly in transient server memory within isolated worker containers. The matrix simplification does not correlate external financial wealth or historical liquidity between participants, and temporary matrix states are unmapped as soon as the consolidated edges are yielded.',
          )}
        </section>

        {/* 05 Payment Rails */}
        <section className={cm.stack(4)} data-mol-id="privacy-payment-rails">
          <span className={clauseLabel}>
            {t('privacy.section.rails', {}, { defaultValue: '05 · Payment rails' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'privacy.railsTitle',
              {},
              { defaultValue: 'Payment Rails (Venmo, Cash App, Zelle)' },
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {card(
              'Client-Side Deep Links',
              'link',
              'Client-Side Deep Links',
              'Tapping “settle via your payment app” generates an explicit URL scheme on your own device — the handoff never touches our servers.',
            )}
            {card(
              'Zero Custody Risk',
              'account_balance',
              'Zero Custody Risk',
              'We never touch, escrow, hold, or route your actual funds. All monetary transfers happen entirely inside regulated partner rails.',
            )}
            {card(
              'Prefilled Integrity',
              'pin',
              'Prefilled Integrity',
              'Only the verified exact split total and destination handle are pre-filled, preventing mis-keyed payments.',
            )}
          </div>
        </section>

        {/* 06 Receipt Scanner & OCR */}
        <section className={cm.stack(4)} data-mol-id="privacy-ocr">
          <span className={clauseLabel}>
            {t('privacy.section.ocr', {}, { defaultValue: '06 · Receipt scanning' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'privacy.ocrTitle',
              {},
              { defaultValue: 'Receipt Scanner & Optical Character Recognition' },
            )}
          </h2>
          {card(
            'Ephemeral Buffer Policy',
            'document_scanner',
            'Ephemeral Buffer Policy',
            'Receipt photos are transmitted across TLS 1.3 encrypted streams to our OCR processing service. The extracted item text, price floats, and merchant tax lines are kept with the expense; the raw image is retained only until the expense creator confirms the line assignments, after which it is deleted.',
          )}
        </section>

        {/* 07 Data Retention, Portability & Deletion */}
        <section className={cm.stack(4)} data-mol-id="privacy-retention">
          <span className={clauseLabel}>
            {t('privacy.section.retention', {}, { defaultValue: '07 · Retention & deletion' })}
          </span>
          <h2 className={sectionTitle}>
            {t(
              'privacy.retentionTitle',
              {},
              { defaultValue: 'Data Retention, Portability & Deletion' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'privacy.retentionBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'You maintain absolute sovereignty over your financial history on {{app}}.',
              },
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {card(
              'Permanent Account & Ledger Erasure',
              'delete_forever',
              'Permanent Account & Ledger Erasure',
              'Triggering account deletion in your security preferences irrevocably cascades across our database: your associations, split histories, files, and cached session keys are purged permanently within 30 days.',
            )}
            {card(
              'JSON & CSV Universal Export',
              'ios_share',
              'JSON & CSV Universal Export',
              'You can export a standards-compliant archive of every split, settlement receipt, and group history with one click.',
            )}
          </div>
        </section>

        {/* 08 Cookies & Minimal Telemetry */}
        <section className={cm.stack(4)} data-mol-id="privacy-cookies">
          <span className={clauseLabel}>
            {t('privacy.section.cookies', {}, { defaultValue: '08 · Cookies' })}
          </span>
          <h2 className={sectionTitle}>
            {t('privacy.cookiesTitle', {}, { defaultValue: 'Cookies & Minimal Telemetry' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.cookiesBody',
              {},
              {
                defaultValue:
                  'We use strictly necessary functional session cookies to remember authentication tokens across app sessions and security challenge flags. We do NOT use advertising tracking beacons, remarketing tags, or cross-site profiling pixels.',
              },
            )}
          </p>
        </section>

        {/* 09 Your Rights & Contacting our DPO */}
        <section className={cm.stack(4)} data-mol-id="privacy-rights">
          <span className={clauseLabel}>
            {t('privacy.section.rights', {}, { defaultValue: '09 · Your rights' })}
          </span>
          <h2 className={sectionTitle}>
            {t('privacy.rightsTitle', {}, { defaultValue: 'Your Rights & Contacting our DPO' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'privacy.rightsBody',
              {},
              {
                defaultValue:
                  'Under GDPR (EU/UK), CCPA/CPRA (California), and modern privacy frameworks worldwide, you possess enforceable legal rights regarding your personal financial data:',
              },
            )}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {YOUR_RIGHTS.map((right) => (
              <li key={right} className={cm.flex({ align: 'center', gap: 2 })}>
                <span
                  className={cm.cn('material-symbols-outlined text-lg text-primary')}
                  aria-hidden="true"
                >
                  check
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  {t(`privacy.right.${right}`, {}, { defaultValue: right })}
                </span>
              </li>
            ))}
          </ul>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'privacy.dpoContact',
              { app: APP_NAME },
              {
                defaultValue:
                  'Data protection inquiries: privacy@evenly.app — every message reaches a human on the {{app}} team, not a ticket queue.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
