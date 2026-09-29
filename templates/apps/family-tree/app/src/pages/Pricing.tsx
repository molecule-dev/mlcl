import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { LimitsItem, LimitsList, PricingPage } from '@molecule/app-billing-react'
import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

interface PricingTierLimits {
  maxPeople: number
  advancedFeatures: boolean
  canExport: boolean
}

interface PricingTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string }>
  limits: PricingTierLimits
}

/**
 * Public pricing page.
 *
 * @returns The rendered pricing page.
 */
export function Pricing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tiers, setTiers] = useState<PricingTier[]>([])

  // The comparison table reads the same public payload the cards above do,
  // so the two can never drift apart.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/billing/tiers')
      .then((res) => {
        if (cancelled) return
        const data = (res as { data?: PricingTier[] }).data
        if (Array.isArray(data)) setTiers(data)
      })
      .catch(() => {
        // comparison table stays empty; the plan cards above still render
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const limitRows: Array<{
    key: string
    label: string
    value: (l: PricingTierLimits) => string
  }> = [
    {
      key: 'people',
      label: t('pricing.compare.people', {}, { defaultValue: 'People on your tree' }),
      value: (l) => formatNum(l.maxPeople),
    },
    {
      key: 'features',
      label: t('pricing.compare.features', {}, { defaultValue: 'Advanced archival features' }),
      value: (l) => (l.advancedFeatures ? '✓' : '—'),
    },
    {
      key: 'export',
      label: t('pricing.compare.export', {}, { defaultValue: 'Complete data export' }),
      value: (l) => (l.canExport ? '✓' : '—'),
    },
  ]

  return (
    <ContentPageShell bare containerSize="xl" header={<AuthBrandHeader />} footer={<Footer />}>
      <PricingPage
        period="month"
        headlineFontFamily="var(--font-display)"
        headingDefault={t(
          'pricing.heading',
          { app: APP_NAME },
          { defaultValue: 'Invest in memory that endures for generations.' },
        )}
        subheadingDefault={t(
          'pricing.subheading',
          {},
          {
            defaultValue:
              'Every plan keeps your archive private — the tiers only decide how far your branches reach.',
          },
        )}
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>
              {formatNum(read(limits, 'maxPeople'))}{' '}
              {t('pricing.people', undefined, { defaultValue: 'people on your tree' })}
            </LimitsItem>
            <LimitsItem>
              {t('common.advancedFeatures', undefined, { defaultValue: 'Advanced features' })}:{' '}
              {read(limits, 'advancedFeatures') ? '✓' : '—'}
            </LimitsItem>
            <LimitsItem>
              {t('common.dataExport', undefined, { defaultValue: 'Data export' })}:{' '}
              {read(limits, 'canExport') ? '✓' : '—'}
            </LimitsItem>
          </LimitsList>
        )}
      />

      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 16))}>
        {/* Archival promise */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 8),
          )}
          data-mol-id="pricing-promise"
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
            {t('pricing.promiseTitle', {}, { defaultValue: 'The Branches Archival Promise' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'pricing.promiseBody',
              {},
              {
                defaultValue:
                  'On every tier: your records stay private to your account, are never sold or indexed, and remain yours to export or delete at any time.',
              },
            )}
          </p>
        </section>

        {/* Comparison table — live from /api/billing/tiers */}
        <section className={cm.cn(cm.sp('mb', 8))} data-mol-id="pricing-compare">
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-display',
              cm.sp('mb', 4),
            )}
          >
            {t('pricing.compareTitle', {}, { defaultValue: 'Compare Archival Standards' })}
          </h3>
          <div className="overflow-x-auto">
            <table
              className={cm.cn(
                cm.w('full'),
                cm.textSize('sm'),
                'bg-surface-container-lowest rounded-2xl shadow-sm border-collapse',
              )}
            >
              <thead>
                <tr>
                  <th className={cm.cn('text-left', cm.sp('p', 4))}>
                    <span className="sr-only">
                      {t('pricing.compare.feature', {}, { defaultValue: 'Standard' })}
                    </span>
                  </th>
                  {tiers.map((tier) => (
                    <th
                      key={tier.key}
                      className={cm.cn('text-left', cm.sp('p', 4), cm.fontWeight('bold'))}
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {limitRows.map((row) => (
                  <tr key={row.key} className="border-t border-outline-variant/30">
                    <td className={cm.cn(cm.sp('p', 4), 'text-on-surface-variant')}>{row.label}</td>
                    {tiers.map((tier) => (
                      <td
                        key={tier.key}
                        className={cm.cn(cm.sp('p', 4), cm.fontWeight('semibold'))}
                      >
                        {row.value(tier.limits)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Plan & custody inquiries */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm',
            cm.sp('mb', 8),
          )}
          data-mol-id="pricing-inquiries"
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
            {t('pricing.inquiriesTitle', {}, { defaultValue: 'Archival Inquiries & Custody' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'pricing.inquiriesBody',
              {},
              {
                defaultValue:
                  'Questions about tiers, billing, or how your records are kept? Read how we handle your data or reach the team — every inquiry lands with a real person.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 4))}>
            <Link
              to="/about"
              data-mol-id="pricing-link-about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
              )}
            >
              {t('pricing.inquiriesAbout', {}, { defaultValue: 'About the archive' })}
            </Link>
            <Link
              to="/privacy"
              data-mol-id="pricing-link-privacy"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
              )}
            >
              {t('pricing.inquiriesPrivacy', {}, { defaultValue: 'Privacy covenant' })}
            </Link>
          </div>
        </section>

        {/* Closing line */}
        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-center')}
          style={{
            background: 'color-mix(in srgb, var(--color-forest) 92%, transparent)',
          }}
          data-mol-id="pricing-cta"
        >
          <h3
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display text-white')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t(
              'pricing.ctaTitle',
              {},
              {
                defaultValue:
                  'Every generation has a story. Ensure yours is never forgotten or sold.',
              },
            )}
          </h3>
          <Link
            to="/signup"
            data-mol-id="pricing-cta-start"
            className={cm.cn(
              'inline-block rounded-xl text-white font-bold transition-all hover:shadow-lg',
              cm.textSize('sm'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 5),
            )}
            style={{ backgroundColor: 'var(--mol-color-primary)' }}
          >
            {t('pricing.ctaButton', {}, { defaultValue: 'Plant your first leaf' })}
          </Link>
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
