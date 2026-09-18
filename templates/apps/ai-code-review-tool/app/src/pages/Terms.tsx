import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'

/**
 * Boilerplate Terms page — exposed via footer + signup links. Default
 * copy is short but real (no stub markers); tenants override per i18n.
 */

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  withApp?: boolean
}

const SECTIONS: Section[] = [
  {
    id: 'use',
    titleKey: 'terms.useTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.usage',
    bodyDefault:
      'You agree not to use the service to violate applicable law, scan repositories you do not own, or submit content designed to evade rate limits or trick the AI reviewer.',
  },
  {
    id: 'changes',
    titleKey: 'terms.changesTitle',
    titleDefault: 'Changes to these terms',
    bodyKey: 'terms.changes',
    bodyDefault:
      'We may revise these terms as the service evolves. Material changes take effect on the date posted here, and your continued use after that date constitutes acceptance of the revised terms.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contact',
    bodyDefault: 'Questions, takedown requests, or terms updates: legal@example.com.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'By using {{app}} you agree to these terms. The service is provided as-is without warranty; you remain solely responsible for any code, secrets, or repository content you submit.',
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
              {t(s.bodyKey, s.withApp ? { app: APP_NAME } : {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
