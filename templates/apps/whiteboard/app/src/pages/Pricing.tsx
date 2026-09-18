import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const { t } = useTranslation()
  return (
    <ContentPageShell bare containerSize="xl" header={<Header />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'common.advancedFeatures',
          { name: APP_NAME },
          {
            defaultValue: `Choose your ${APP_NAME} plan`,
          },
        )!}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {t(
                'pricing.limits.boards',
                { count: formatNum(read(limits, 'maxBoards')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxBoards'))} boards`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.collaborators',
                { count: formatNum(read(limits, 'maxCollaborators')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxCollaborators'))} collaborators`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t(
                'pricing.limits.elements',
                { count: formatNum(read(limits, 'maxElements')) },
                {
                  defaultValue: `${formatNum(read(limits, 'maxElements'))} elements`,
                },
              )}
            </LimitsItem>
            <LimitsItem>
              {t('pricing.limits.advanced', undefined, { defaultValue: 'Advanced features' })}
              {`: ${read(limits, 'advancedFeatures') ? '✓' : '—'}`}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', undefined, { defaultValue: 'Data export' })}
              {`: ${read(limits, 'canExport') ? '✓' : '—'}`}
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
