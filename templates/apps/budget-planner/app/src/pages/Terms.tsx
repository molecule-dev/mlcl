import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('terms.title', {}, { defaultValue: 'Terms' })}
      subtitle={t(
        'terms.intro',
        {},
        {
          defaultValue: 'The conditions under which you may use this app.',
        },
      )}
    >
      <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
        {t(
          'terms.body',
          {},
          {
            defaultValue:
              'Use the app lawfully and keep your account credentials secure. The service is provided as-is; you are responsible for the accuracy of the budgets and transactions you enter. We may update these terms with notice; continued use constitutes acceptance.',
          },
        )}
      </p>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
