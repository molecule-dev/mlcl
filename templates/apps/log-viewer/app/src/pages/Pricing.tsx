import { Link } from 'react-router'

import { PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface LogViewerLimits {
  maxLogs?: number
  maxSavedSearches?: number
  maxSources?: number
  retentionDays?: number
  advancedFeatures?: boolean
  canExport?: boolean
}

const formatNum = (n: number | undefined): string => {
  if (n == null) return '—'
  if (n >= 999_999) return '∞'
  return n.toLocaleString()
}

const readLimits = (limits: unknown): LogViewerLimits => {
  if (limits != null && typeof limits === 'object') return limits as LogViewerLimits
  return {}
}

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
          { appName: APP_NAME },
          { defaultValue: `Choose your ${APP_NAME} plan` },
        )}
        renderLimits={(limits) => {
          const l = readLimits(limits)
          return (
            <ul className={cm.cn('space-y-1 text-sm text-on-surface-variant')}>
              <li>
                {formatNum(l.maxLogs)}{' '}
                {t('pricing.feature.logs', {}, { defaultValue: 'log lines' })}
              </li>
              <li>
                {formatNum(l.maxSources)}{' '}
                {t('pricing.feature.streams', {}, { defaultValue: 'streams' })}
              </li>
              <li>
                {formatNum(l.maxSavedSearches)}{' '}
                {t('pricing.feature.saved', {}, { defaultValue: 'saved searches' })}
              </li>
              <li>
                {t('pricing.feature.retention', {}, { defaultValue: 'Retention' })}:{' '}
                {l.retentionDays == null
                  ? '—'
                  : l.retentionDays === 0
                    ? t('pricing.feature.retentionUnlimited', {}, { defaultValue: 'unlimited' })
                    : `${l.retentionDays} ${t('pricing.feature.days', {}, { defaultValue: 'days' })}`}
              </li>
              <li>
                {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}:{' '}
                {l.advancedFeatures ? '✓' : '—'}
              </li>
              <li>
                {t('common.dataExport', {}, { defaultValue: 'Data export' })}:{' '}
                {l.canExport ? '✓' : '—'}
              </li>
            </ul>
          )
        }}
      />
      <div className={cm.cn(cm.textCenter, cm.sp('mt', 8))}>
        <Link
          to="/dashboard"
          data-mol-id="pricing-dashboard-link"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          {t('pricing.dashboardLink', {}, { defaultValue: 'Open dashboard →' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}
