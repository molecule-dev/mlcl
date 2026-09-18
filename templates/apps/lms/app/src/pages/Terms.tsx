import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('nav.terms', {}, { defaultValue: 'Terms' })}
      subtitle={t(
        'terms.intro',
        { appName: APP_NAME },
        {
          defaultValue:
            'By using {{appName}} LMS, you agree to use the platform for lawful educational activity and respect course and institution policies.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <section data-mol-id="terms-account" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.accountTitle', {}, { defaultValue: 'Account responsibilities' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.accountBody',
              {},
              {
                defaultValue:
                  'Keep your login credentials secure and do not share your account. You are responsible for activity performed through your account.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="terms-content" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.contentTitle', {}, { defaultValue: 'Course content and submissions' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.contentBody',
              {},
              {
                defaultValue:
                  'Course materials are provided for enrolled learners. Assignment submissions and discussion contributions must comply with academic integrity and community guidelines.',
              },
            )}
          </p>
        </section>
        <section data-mol-id="terms-availability" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('terms.availabilityTitle', {}, { defaultValue: 'Service availability' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.availabilityBody',
              {},
              {
                defaultValue:
                  'We work to keep the LMS available and reliable, but maintenance windows and temporary outages may occur.',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
