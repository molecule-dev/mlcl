import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { t } from '@molecule/app-i18n'
import { ContentPageShell } from '@molecule/app-legal-pages-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Public pricing page.
 *
 * Marketing surface — anyone can hit `/pricing` to see the tier ladder.
 * Heading + per-limit captions go through `t()` so the keys live in
 * `app/src/locales/en.ts`. The PricingPage component itself is wired
 * up via `@molecule/app-billing-react`; we only override the per-app
 * label rendering and the page title.
 */
export function Pricing() {
  return (
    <ContentPageShell bare containerSize="xl" footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-headline)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.maxCategories',
                { count: formatNum(read(limits, 'maxCategories')) },
                { defaultValue: '{{count}} categories' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxClips',
                { count: formatNum(read(limits, 'maxClips')) },
                { defaultValue: '{{count}} clips' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.maxPinned',
                { count: formatNum(read(limits, 'maxPinned')) },
                { defaultValue: '{{count}} pinned' },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
            </LimitsItem>
          </LimitsList>
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
