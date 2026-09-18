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
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collectTitle',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.intro',
    bodyDefault:
      'We collect the minimum information needed to operate {{appName}}: your account email, the files you upload, and the metadata required to render and search them. We never sell your data.',
  },
  {
    id: 'security',
    titleKey: 'privacy.securityTitle',
    titleDefault: 'Security',
    bodyKey: 'privacy.encryption',
    bodyDefault:
      'Files are encrypted at rest with AES-256 and in transit via TLS 1.2+. Share links can be revoked at any time and expire automatically after the period you choose.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.retentionTitle',
    titleDefault: 'Retention',
    bodyKey: 'privacy.retention',
    bodyDefault:
      'Deleted files spend 30 days in Trash before permanent removal. Account closures purge all data within 14 days. Email support@nimbus.example for export requests.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
      subtitle={t(
        'privacy.subtitle',
        { appName: APP_NAME },
        { defaultValue: 'How {{appName}} handles your files and personal information.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, { appName: APP_NAME }, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <nav data-mol-id="privacy-back-home" />
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
