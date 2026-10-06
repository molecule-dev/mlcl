import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: 'Choose your {{app}} plan' },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.maxFollows',
                { count: formatNum(read(limits, 'maxFollows')) },
                { defaultValue: '{{count}} follows' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxPosts',
                { count: formatNum(read(limits, 'maxPosts')) },
                { defaultValue: '{{count}} posts' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.maxStories',
                { count: formatNum(read(limits, 'maxStories')) },
                { defaultValue: '{{count}} stories' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.advancedFeatures',
                { yes: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{yes}}' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.canExport',
                { yes: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{yes}}' },
              )}
            </LimitsItem>
          </LimitsList>
        )}
      />
      <section data-mol-id="pricing-faq" className={cm.stack(10)}>
        <h2
          className={cm.cn(
            'text-2xl md:text-3xl font-extrabold tracking-tight text-center',
            'text-on-surface',
          )}
        >
          {t('pricing.faq.heading', {}, { defaultValue: 'Frequently Asked Questions' })}
        </h2>
        <div className={cm.cn(cm.stack(3), 'max-w-3xl mx-auto w-full')}>
          {(
            [
              {
                key: 'switchPlans',
                q: t('pricing.faq.q1', {}, { defaultValue: 'Can I switch plans later?' }),
                a: t(
                  'pricing.faq.a1',
                  {},
                  {
                    defaultValue:
                      'Yes — upgrade or downgrade any time and the change is prorated on your next bill.',
                  },
                ),
              },
              {
                key: 'freeLimit',
                q: t(
                  'pricing.faq.q2',
                  {},
                  { defaultValue: 'What happens if I hit my limit on the Free plan?' },
                ),
                a: t(
                  'pricing.faq.a2',
                  {},
                  {
                    defaultValue:
                      'Nothing you have already posted is lost — new posts and stories pause until your cycle resets or you upgrade.',
                  },
                ),
              },
              {
                key: 'trial',
                q: t('pricing.faq.q3', {}, { defaultValue: 'Is there a free trial for Pro?' }),
                a: t(
                  'pricing.faq.a3',
                  {},
                  {
                    defaultValue:
                      'Yes — every new account can try the paid features free for 14 days, no card required.',
                  },
                ),
              },
            ] as const
          ).map((item) => (
            <details
              key={item.key}
              data-mol-id={`pricing-faq-${item.key}`}
              className={cm.cn(
                'group rounded-2xl border border-outline-variant/40 bg-surface-container-lowest',
                'open:bg-surface-container-low transition-colors',
              )}
            >
              <summary
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('p', 5),
                  cm.fontWeight('semibold'),
                  'cursor-pointer select-none text-on-surface',
                )}
              >
                {item.q}
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180',
                  )}
                >
                  expand_more
                </span>
              </summary>
              <p
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('pb', 5),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>
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
