import { PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl">
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t('pricing.heading', {}, { defaultValue: 'Choose your Bargain plan' })}
        renderLimits={(limits) => (
          <ul aria-label={t('pricing.limitsLabel', {}, { defaultValue: 'Plan limits' })}>
            <li>
              {t(
                'pricing.alerts',
                { count: formatNum(read(limits, 'maxAlerts')) },
                { defaultValue: '{{count}} alerts' },
              )}
            </li>
            <li>
              {t(
                'pricing.prices',
                { count: formatNum(read(limits, 'maxPrices')) },
                { defaultValue: '{{count}} prices' },
              )}
            </li>
            <li>
              {t(
                'pricing.products',
                { count: formatNum(read(limits, 'maxProducts')) },
                { defaultValue: '{{count}} products' },
              )}
            </li>
            <li>
              {t(
                'pricing.sources',
                { count: formatNum(read(limits, 'maxSources')) },
                { defaultValue: '{{count}} sources' },
              )}
            </li>
            <li>
              {t(
                'pricing.advanced',
                { value: read(limits, 'advancedFeatures') ? '✓' : '—' },
                { defaultValue: 'Advanced features: {{value}}' },
              )}
            </li>
            <li>
              {t(
                'pricing.export',
                { value: read(limits, 'canExport') ? '✓' : '—' },
                { defaultValue: 'Data export: {{value}}' },
              )}
            </li>
          </ul>
        )}
      />
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
