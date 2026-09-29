import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page: live tier cards (from GET /api/billing/tiers) plus
 * the design's comparison matrix, FAQ, and closing CTA.
 */

interface FaqEntry {
  icon: string
  qKey: string
  qDefault: string
  aKey: string
  aDefault: string
}

const FAQS: FaqEntry[] = [
  {
    icon: 'help',
    qKey: 'pricing.faqSeatTaxQ',
    qDefault: 'Do we get charged for end-users who vote or submit ideas?',
    aKey: 'pricing.faqSeatTaxA',
    aDefault:
      'Never. We adhere strictly to a zero-seat-tax philosophy. All plans — including the free Starter tier — support unlimited end-user voters, commenters, and feedback submitters. You pay for staff-side capacity, never for customer voices.',
  },
  {
    icon: 'sync',
    qKey: 'pricing.faqSyncQ',
    qDefault: 'How does the bi-directional Linear and Jira sync work?',
    aKey: 'pricing.faqSyncA',
    aDefault:
      'When an admin moves a post to "In Progress" or links an existing tracker issue, any state transition — merging a PR, marking an issue Done — instantly updates the public roadmap card and notifies every subscribed voter in under a second.',
  },
  {
    icon: 'dataset',
    qKey: 'pricing.faqWarehouseQ',
    qDefault: 'Can we export raw telemetry into Snowflake or BigQuery?',
    aKey: 'pricing.faqWarehouseA',
    aDefault:
      'Yes. The Enterprise tier includes native data warehouse event pipes: continuously stream raw vote payloads, user attributes, ARR scores, and comment sentiment directly into your warehouse for BI and attribution.',
  },
  {
    icon: 'schedule',
    qKey: 'pricing.faqTrialQ',
    qDefault: 'What happens after our 14-day Pro trial ends?',
    aKey: 'pricing.faqTrialA',
    aDefault:
      'You can enter payment details to continue on Pro, or your workspace smoothly downgrades to the free Starter tier. You never lose your history — boards, posts, and votes are kept either way.',
  },
]

interface MatrixRow {
  featureKey: string
  featureDefault: string
  cells: Array<'yes' | 'no' | string>
}

const MATRIX: MatrixRow[] = [
  {
    featureKey: 'pricing.matrixVoters',
    featureDefault: 'Unlimited voters & feedback submitters (zero seat-tax)',
    cells: ['yes', 'yes', 'yes'],
  },
  {
    featureKey: 'pricing.matrixBoards',
    featureDefault: 'Public feedback boards',
    cells: ['2', '10', 'Unlimited'],
  },
  {
    featureKey: 'pricing.matrixStatus',
    featureDefault: 'Full status workflow & official responses',
    cells: ['yes', 'yes', 'yes'],
  },
  {
    featureKey: 'pricing.matrixMerge',
    featureDefault: 'Duplicate merging with pooled votes',
    cells: ['no', 'yes', 'yes'],
  },
  {
    featureKey: 'pricing.matrixCsv',
    featureDefault: 'CSV data export',
    cells: ['no', 'yes', 'yes'],
  },
  {
    featureKey: 'pricing.matrixWarehouse',
    featureDefault: 'Warehouse streaming (Snowflake / BigQuery)',
    cells: ['no', 'no', 'yes'],
  },
  {
    featureKey: 'pricing.matrixSso',
    featureDefault: 'SAML SSO & SCIM provisioning',
    cells: ['no', 'no', 'yes'],
  },
  {
    featureKey: 'pricing.matrixDomain',
    featureDefault: 'Custom domain (CNAME) & SSL',
    cells: ['no', 'no', 'yes'],
  },
]

export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const cell = (value: 'yes' | 'no' | string): string => {
    if (value === 'yes') return t('pricing.matrixIncluded', {}, { defaultValue: 'Included' })
    if (value === 'no') return t('pricing.matrixNotIncluded', {}, { defaultValue: '—' })
    return value
  }

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))}>
        <header
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            'text-center max-w-3xl mx-auto',
          )}
        >
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-3xl md:text-4xl tracking-tight text-on-surface',
            )}
          >
            {t(
              'pricing.heroTitle',
              {},
              { defaultValue: 'Simple, transparent pricing for customer-driven engineering.' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t(
              'pricing.heroBody',
              {},
              {
                defaultValue:
                  'Collect feedback, connect backlog sprints, and close the loop with customers. Never pay per voter, reviewer, or viewer.',
              },
            )}
          </p>
        </header>

        <PricingPage
          period="month"
          headlineFontFamily="var(--font-display)"
          headingDefault={t(
            'pricing.heading',
            { appName: APP_NAME },
            { defaultValue: `Choose your ${APP_NAME} plan` },
          )}
          renderLimits={(limits) => (
            <LimitsList>
              <LimitsItem>
                {t(
                  'pricing.limits.boards',
                  { count: formatNum(read(limits, 'maxBoards')) },
                  { defaultValue: '{{count}} boards' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.limits.posts',
                  { count: formatNum(read(limits, 'maxPosts')) },
                  { defaultValue: '{{count}} feedback posts' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t(
                  'pricing.limits.votes',
                  { count: formatNum(read(limits, 'maxVotes')) },
                  { defaultValue: '{{count}} votes' },
                )}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.limits.advancedFeatures', {}, { defaultValue: 'Advanced features:' })}{' '}
                {read(limits, 'advancedFeatures') ? '✓' : '—'}
              </LimitsItem>
              <LimitsItem>
                {t('pricing.limits.export', {}, { defaultValue: 'Data export:' })}{' '}
                {read(limits, 'canExport') ? '✓' : '—'}
              </LimitsItem>
            </LimitsList>
          )}
        />

        <section
          aria-labelledby="pricing-social-proof"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('py', 4),
            'text-center border-t border-b border-outline-variant/40',
          )}
        >
          <h3
            id="pricing-social-proof"
            className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t(
              'pricing.socialProofTitle',
              {},
              { defaultValue: 'Trusted by 450+ product-led engineering teams' },
            )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'pricing.socialProofBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'From Series A developer tools to pre-IPO infrastructure companies, {{appName}} connects user pain directly to commit logs.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="pricing-matrix"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <h2
              id="pricing-matrix"
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-on-surface')}
            >
              {t('pricing.matrixTitle', {}, { defaultValue: 'Compare full feature availability' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'pricing.matrixBody',
                {},
                { defaultValue: 'Every capability engineered down to the pixel and API payload.' },
              )}
            </p>
          </div>
          <div className={cm.cn('overflow-x-auto rounded-xl border border-outline-variant/40')}>
            <table data-mol-id="pricing-matrix-table" className={cm.cn('w-full text-left')}>
              <caption className="sr-only">
                {t(
                  'pricing.matrixCaption',
                  {},
                  { defaultValue: 'Feature availability by plan tier' },
                )}
              </caption>
              <thead
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                <tr>
                  <th scope="col" className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {t('pricing.matrixFeatureCol', {}, { defaultValue: 'Feature' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {t('pricing.matrixStarter', {}, { defaultValue: 'Starter' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {t('pricing.matrixPro', {}, { defaultValue: 'Pro' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    {t('pricing.matrixEnterprise', {}, { defaultValue: 'Enterprise' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn(cm.textSize('sm'), 'divide-y divide-outline-variant/40')}>
                {MATRIX.map((row) => (
                  <tr key={row.featureKey}>
                    <th
                      scope="row"
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'text-on-surface',
                      )}
                    >
                      {t(row.featureKey, {}, { defaultValue: row.featureDefault })}
                    </th>
                    {row.cells.map((value, i) => (
                      <td
                        key={i}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 3),
                          value === 'yes' ? cm.fontWeight('semibold') : 'text-on-surface-variant',
                        )}
                        style={
                          value === 'yes' ? { color: 'var(--color-status-shipped)' } : undefined
                        }
                      >
                        {cell(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-labelledby="pricing-faq"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="pricing-faq"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-on-surface')}
          >
            {t('pricing.faqTitle', {}, { defaultValue: 'Frequently asked questions' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {FAQS.map((faq) => (
              <div
                key={faq.qKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
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
                    <span className={cm.cn('material-symbols-outlined text-sm')}>{faq.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('base'),
                      'text-on-surface',
                    )}
                  >
                    {t(faq.qKey, {}, { defaultValue: faq.qDefault })}
                  </h3>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(faq.aKey, {}, { defaultValue: faq.aDefault })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm', align: 'center' }),
            cm.sp('p', 8),
            'rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-on-primary text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t(
              'pricing.ctaTitle',
              {},
              { defaultValue: 'Stop guessing. Start building what moves the needle.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-primary/90 max-w-xl')}>
            {t(
              'pricing.ctaBody',
              {},
              {
                defaultValue:
                  'Join hundreds of engineering-led organizations eliminating feedback chaos and shipping what matters most.',
              },
            )}
          </p>
          <a
            href="/signup"
            data-mol-id="pricing-cta"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full bg-surface text-primary hover:-translate-y-0.5 transition-transform',
            )}
          >
            {t('pricing.ctaButton', {}, { defaultValue: 'Start free trial' })}
          </a>
        </section>
      </div>
    </ContentPageShell>
  )
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: unknown, key: string): never => {
  if (limits != null && typeof limits === 'object' && key in (limits as Record<string, unknown>)) {
    return (limits as Record<string, unknown>)[key] as never
  }
  return 0 as never
}
