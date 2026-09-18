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
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.account',
    bodyDefault:
      'You must be 18+ and provide accurate information. You are responsible for safeguarding your password and any actions taken under your account.',
  },
  {
    id: 'coupons',
    titleKey: 'terms.couponsTitle',
    titleDefault: 'Saving and redeeming coupons',
    bodyKey: 'terms.coupons',
    bodyDefault:
      'A saved coupon is a non-transferable, single-use redemption code. Each coupon has an expiry — {{app}} is not responsible for coupons used after their expiry timestamp.',
  },
  {
    id: 'merchant',
    titleKey: 'terms.merchantTitle',
    titleDefault: 'Merchant honour',
    bodyKey: 'terms.merchant',
    bodyDefault:
      'Merchants commit to honour every {{app}} coupon scanned at point of sale. If a merchant refuses a valid, unredeemed coupon, contact support@snagr.app and we will mediate within 5 business days.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing',
    bodyDefault:
      'Pro and Team plans renew monthly. Cancel anytime from Settings — your plan stays active until the end of the paid period.',
  },
  {
    id: 'termination',
    titleKey: 'terms.terminationTitle',
    titleDefault: 'Termination',
    bodyKey: 'terms.termination',
    bodyDefault:
      'We may suspend accounts that abuse the service (mass redemption-code probing, fraudulent merchant claims, etc.). You may close your account at any time.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={
        <p className={cm.cn(cm.container({ size: 'md' }), cm.sp('px', 6), cm.sp('pt', 6))}>
          <Link to="/" data-mol-id="terms-back" className={cm.cn('text-primary hover:underline')}>
            {t('terms.back', { app: APP_NAME }, { defaultValue: '← Back to {{app}}' })}
          </Link>
        </p>
      }
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'These terms govern your use of {{app}}. By signing up you agree to them. Last updated 2026.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, { app: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
