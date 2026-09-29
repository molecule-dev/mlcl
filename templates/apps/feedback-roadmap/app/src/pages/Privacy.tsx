import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Privacy — the data governance charter: what we collect (and what we
 * deliberately don't), the zero-LLM-training guarantee, voter anonymity,
 * subprocessors, the cryptographic deletion timeline, and data-subject
 * rights.
 */

interface CollectionItem {
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const COLLECTED: CollectionItem[] = [
  {
    icon: 'badge',
    titleKey: 'privacy.collectEmailTitle',
    titleDefault: 'Work Email & Name',
    bodyKey: 'privacy.collectEmailBody',
    bodyDefault:
      'Collected via corporate SSO or email signup. Used solely for workspace role-based authorization and voter notification pings.',
  },
  {
    icon: 'feedback',
    titleKey: 'privacy.collectSubmissionsTitle',
    titleDefault: 'Feedback Submissions',
    bodyKey: 'privacy.collectSubmissionsBody',
    bodyDefault:
      'Feature request titles, issue descriptions, inline tags, upvotes, and customer comments submitted via the portal or embedded widgets.',
  },
  {
    icon: 'trending_up',
    titleKey: 'privacy.collectTelemetryTitle',
    titleDefault: 'Upvote Telemetry & ARR Tags',
    bodyKey: 'privacy.collectTelemetryBody',
    bodyDefault:
      'Aggregated vote velocity, voter company domain mappings, and customer revenue weighting tags synced through authenticated CRM or warehouse connections.',
  },
  {
    icon: 'webhook',
    titleKey: 'privacy.collectWebhooksTitle',
    titleDefault: 'Integration Webhook Payloads',
    bodyKey: 'privacy.collectWebhooksBody',
    bodyDefault:
      'Ephemerally processed ticket sync metadata from connected trackers, bound directly to your configured roadmap boards.',
  },
]

const DELETION_TIMELINE = [
  {
    whenKey: 'privacy.deleteT1When',
    whenDefault: 'Hour 0',
    whatKey: 'privacy.deleteT1What',
    whatDefault: 'Tenant immediately de-indexed; portal rendered offline to public voters.',
  },
  {
    whenKey: 'privacy.deleteT2When',
    whenDefault: 'Hour 1',
    whatKey: 'privacy.deleteT2What',
    whatDefault: 'Search indexes purged; cached snapshots and CDN objects invalidated.',
  },
  {
    whenKey: 'privacy.deleteT3When',
    whenDefault: 'Day 30',
    whatKey: 'privacy.deleteT3What',
    whatDefault: 'Production stores wiped; encryption keys for the tenant destroyed.',
  },
  {
    whenKey: 'privacy.deleteT4When',
    whenDefault: 'Day 90',
    whatKey: 'privacy.deleteT4What',
    whatDefault: 'Encrypted backups aged out — cryptographic erasure complete.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('privacy.eyebrow', {}, { defaultValue: 'Legal' })}
      title={t(
        'privacy.title',
        { appName: APP_NAME },
        { defaultValue: '{{appName}} Privacy & Data Governance Charter' },
      )}
      subtitle={t(
        'privacy.subtitle',
        {},
        {
          defaultValue:
            'Verifiable telemetry commitments, zero LLM model training on customer data, transparent data residency, and cryptographic deletion guarantees.',
        },
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <p
          data-mol-id="privacy-intro"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'privacy.intro',
            { appName: APP_NAME },
            {
              defaultValue:
                'This privacy charter governs every surface of {{appName}} — the public portal, the admin tooling, and the integration pipelines — and is binding on how we build, not just how we sell.',
            },
          )}
        </p>
        <section
          aria-labelledby="privacy-minimization"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="privacy-minimization"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.minimizationTitle',
              {},
              { defaultValue: 'Data Minimization & Collection Policy' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.minimizationBody',
              {},
              {
                defaultValue:
                  'We collect only what is strictly required to attribute product feedback, verify corporate domain identity via SSO, and route automated status notifications. We operate zero keystroke logging, zero session recording, and no behavioral advertising trackers anywhere in the product.',
              },
            )}
          </p>
          <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
            {COLLECTED.map((item) => (
              <div
                key={item.titleKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(7),
                      cm.h(7),
                      'rounded-lg shrink-0',
                    )}
                    style={{
                      backgroundColor: 'var(--color-primary-container)',
                      color: 'var(--color-primary)',
                    }}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')}>{item.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {t(item.titleKey, {}, { defaultValue: item.titleDefault })}
                  </h3>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(item.bodyKey, {}, { defaultValue: item.bodyDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="privacy-llm"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-llm"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.llmTitle',
              {},
              { defaultValue: 'Zero LLM Training & Model Isolation Guarantee' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.llmBody',
              {},
              {
                defaultValue:
                  'We covenant never to use customer proprietary feedback, bug reports, feature requests, backlog descriptions, or user comments to train, fine-tune, or calibrate public or proprietary models. Any assisted-triage features run on isolated, per-workspace contexts that are discarded after the request completes.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="privacy-anonymity"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-anonymity"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.anonymityTitle',
              {},
              { defaultValue: 'Voter Anonymity & PII Masking Controls' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.anonymityBody',
              {},
              {
                defaultValue:
                  'End-users and product teams control masking per board: voter names can be reduced to initials, restricted to a company domain, or fully anonymized on public boards — while the aggregate vote count and your own audit log stay verifiable.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="privacy-pipeline"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-pipeline"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.pipelineTitle',
              {},
              { defaultValue: 'Enterprise Pipeline & Telemetry Ingestion' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.pipelineBody',
              {},
              {
                defaultValue:
                  'The platform connects natively with mission-critical developer systems — trackers, chat, and data warehouses. We enforce strict segregation during ingestion: integration credentials are scoped per workspace, payloads are processed ephemerally, and warehouse streams are customer-owned from the first hop.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="privacy-subprocessors"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-subprocessors"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.subprocessorsTitle',
              {},
              { defaultValue: 'Subprocessors & Cloud Boundaries' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.subprocessorsBody',
              {},
              {
                defaultValue:
                  'We maintain a minimal subprocessor footprint. Every vendor is bound by formal DPAs incorporating standard contractual clauses, hosted in your selected cloud region, and listed in the workspace admin console with 14 days\u2019 notice before any addition. We never sell data to brokers or behavioral advertisers.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="privacy-deletion"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="privacy-deletion"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.deletionTitle',
              {},
              { defaultValue: 'Right to Deletion & Cryptographic Erasure' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.deletionBody',
              {},
              {
                defaultValue:
                  'Workspace administrators retain the self-serve right to export the complete workspace ledger — raw vote logs, feedback payloads, user commentary, and telemetry — then trigger deletion. Erasure is cryptographic, not just logical: destroying the tenant\u2019s keys renders every residual copy unrecoverable.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <h3
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'text-on-surface',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(6),
                  cm.h(6),
                  'rounded-md shrink-0',
                )}
                style={{
                  backgroundColor: 'var(--color-error-container)',
                  color: 'var(--color-on-error-container)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-sm')}>auto_delete</span>
              </span>
              {t(
                'privacy.shreddingTitle',
                {},
                { defaultValue: 'Cryptographic Shredding Pipeline Timeline' },
              )}
            </h3>
            <ol
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('p', 4),
                cm.sp('ml', 2),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
              )}
            >
              {DELETION_TIMELINE.map((step) => (
                <li
                  key={step.whenKey}
                  className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.sp('py', 1))}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest shrink-0',
                    )}
                    style={{ color: 'var(--color-primary)', minWidth: '4.5rem' }}
                  >
                    {t(step.whenKey, {}, { defaultValue: step.whenDefault })}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(step.whatKey, {}, { defaultValue: step.whatDefault })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="privacy-dsr"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-dsr"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('privacy.dsrTitle', {}, { defaultValue: 'Data Subject Rights & DPO Office' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.dsrBody',
              {},
              {
                defaultValue:
                  'A data protection office is appointed to oversee impact assessments, audit-log verification, and supervisory-authority relations. Access, portability, rectification, and erasure requests are answerable from the workspace Settings and answered within 30 days.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="privacy-changelog"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="privacy-changelog"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'privacy.changelogTitle',
              {},
              { defaultValue: 'Git-Tracked Policy Changelog (v2.3 → v2.4)' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'privacy.changelogBody',
              {},
              {
                defaultValue:
                  'In accordance with our transparency mandate, every modification to this charter is versioned: each revision lands as a signed, dated diff — the previous wording stays inspectable, so you can always see exactly what changed, when, and why.',
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
