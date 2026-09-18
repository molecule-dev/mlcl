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
  bodyDefault: string
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'acceptable',
    titleKey: 'terms.useHeading',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.useBody',
    bodyDefault:
      'Build minutes are intended for compiling, testing, packaging, and deploying your own software. Crypto mining, distributed brute-force, and malware compilation are not acceptable workloads and will result in immediate suspension.',
  },
  {
    id: 'sla',
    titleKey: 'terms.slaHeading',
    titleDefault: 'Service level',
    bodyKey: 'terms.slaBody',
    bodyDefault:
      'Pro and Team plans target 99.95% monthly uptime for the API and runner pool. The Free plan is provided as-is. Outages are reported on status.conduit.dev and credited per the formula in your invoice.',
  },
  {
    id: 'termination',
    titleKey: 'terms.terminationHeading',
    titleDefault: 'Termination',
    bodyKey: 'terms.terminationBody',
    bodyDefault:
      'You can delete your account at any time from Settings — every artifact, log, and secret is removed within 24 hours. We can suspend accounts that violate the acceptable-use policy with 7 days notice (or immediately for abuse threatening other tenants).',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contact',
    bodyDefault: 'Questions? Email legal@conduit.dev.',
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
            'By creating a {{app}} account you agree to these terms. They cover acceptable use of the build runners, the boundaries of our SLA, and the conditions under which we can suspend or terminate your account for abusive workloads.',
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
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
