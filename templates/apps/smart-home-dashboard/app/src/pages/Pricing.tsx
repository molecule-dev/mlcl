import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import type { SmartHomeDashboardLimits } from '../types/tier-limits.js'

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const read = (limits: SmartHomeDashboardLimits, key: keyof SmartHomeDashboardLimits): unknown => {
  if (limits != null && typeof limits === 'object' && key in limits) {
    return (limits as unknown as Record<string, unknown>)[key as string]
  }
  return undefined
}

/**
 * Public Stripe-Checkout-backed pricing page. Renders the tier ladder
 * declared by the API's `tiers.ts` — free, pro, team — and starts a
 * real Stripe Checkout session when the user clicks Upgrade.
 */
export function Pricing(): React.ReactElement {
  const { t } = useTranslation()
  const yes = t('common.yes', {}, { defaultValue: '✓' })
  const no = t('common.no', {}, { defaultValue: '—' })

  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <PricingPage<SmartHomeDashboardLimits>
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
              {formatNum(Number(read(limits, 'maxDevices')) || 0)}{' '}
              {t('pricing.devicesLabel', {}, { defaultValue: 'devices' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(Number(read(limits, 'maxAutomations')) || 0)}{' '}
              {t('pricing.automationsLabel', {}, { defaultValue: 'automations' })}
            </LimitsItem>
            <LimitsItem>
              {formatNum(Number(read(limits, 'maxScenes')) || 0)}{' '}
              {t('pricing.scenesLabel', {}, { defaultValue: 'scenes' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.canExportLabel', {}, { defaultValue: 'Export history' })}:{' '}
              {read(limits, 'canExport') ? yes : no}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.retentionLabel',
                { days: Number(read(limits, 'retentionDays')) || 0 },
                { defaultValue: '{{days}} days history retained' },
              )}
            </LimitsItem>
          </LimitsList>
        )}
      />
    </ContentPageShell>
  )
}
