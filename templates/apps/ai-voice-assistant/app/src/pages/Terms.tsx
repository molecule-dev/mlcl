/**
 * Public terms-of-service page. Real-content sections (intro, account
 * responsibility, acceptable use, billing, changes) so the page is not a
 * boilerplate stub. Every string flows through `t()`.
 *
 * @returns The rendered terms page.
 */
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for keeping your sign-in credentials secret. You can delete your account at any time from Settings; deletion purges every conversation, persona, and audio clip tied to that workspace.',
  },
  {
    id: 'usage',
    titleKey: 'terms.usage.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.usage.body',
    bodyValues: { app: APP_NAME },
    bodyDefault:
      'You agree not to use {{app}} to harass, deceive, or harm others, or to record people without their consent where local law requires it.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans are billed monthly or yearly via Stripe. You can cancel anytime; access continues through the end of the paid period.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changes.title',
    titleDefault: 'Changes',
    bodyKey: 'terms.changes.body',
    bodyDefault:
      'We will let you know in-app if these terms materially change; continued use after notice means you accept the updates.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms of service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'These terms govern your use of {{app}}. By creating an account you agree to them.',
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
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('terms.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
        <Link
          to="/"
          data-mol-id="terms-back-home"
          className={cm.cn(cm.fontWeight('bold'), 'text-primary')}
        >
          {t('nav.backToHome', {}, { defaultValue: '← Back to home' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
