import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collectTitle',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect',
    bodyDefault:
      'Account details (email, display name), the deals you save and redeem, lifetime savings totals, optional location for nearby-deal search, and notification preferences.',
  },
  {
    id: 'use',
    titleKey: 'privacy.useTitle',
    titleDefault: 'How we use your data',
    bodyKey: 'privacy.use',
    bodyDefault:
      'To show personalised hot-deal recommendations, expiry alerts for the coupons you save, redemption receipts, and savings statistics on your dashboard. We never sell your data.',
  },
  {
    id: 'share',
    titleKey: 'privacy.shareTitle',
    titleDefault: 'How we share',
    bodyKey: 'privacy.share',
    bodyDefault:
      'When you redeem a coupon at a merchant, the merchant sees the redemption code and timestamp — never your password or other coupons. Payments to upgrade to Pro are processed by Stripe under their terms.',
  },
  {
    id: 'control',
    titleKey: 'privacy.controlTitle',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.control',
    bodyDefault:
      'Update your profile or notification preferences from Settings at any time. Email support@snagr.app to delete your account; we purge associated data within 30 days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={
        <p className={cm.cn(cm.container({ size: 'md' }), cm.sp('px', 6), cm.sp('pt', 6))}>
          <Link to="/" data-mol-id="privacy-back" className={cm.cn('text-primary hover:underline')}>
            {t('privacy.back', { app: APP_NAME }, { defaultValue: '← Back to {{app}}' })}
          </Link>
        </p>
      }
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue:
            '{{app}} cares about your privacy. This page explains what we collect, how we use it, and the controls you have. Last updated: 2026.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
