import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
      subtitle={t(
        'privacy.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            '{{appName}} LMS collects only the information needed to deliver your courses, evaluate assignments, and support your learning experience.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="privacy-data" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.dataTitle', {}, { defaultValue: 'What we collect' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.dataBody',
              {},
              {
                defaultValue:
                  'We may store profile details, enrollment information, assignment submissions, grades, and discussion activity.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="privacy-use" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.useTitle', {}, { defaultValue: 'How data is used' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.useBody',
              {},
              {
                defaultValue:
                  'Data is used to personalize learning, provide instructor feedback, and improve product quality and reliability.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="privacy-rights" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('privacy.rightsTitle', {}, { defaultValue: 'Your choices' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.rightsBody',
              {},
              {
                defaultValue:
                  'You can update profile information in Settings and contact your institution for account data requests.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
