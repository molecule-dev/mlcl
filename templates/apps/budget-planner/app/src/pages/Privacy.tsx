import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy' })}
      subtitle={t(
        'privacy.intro',
        {},
        {
          defaultValue: 'How we collect, use, and protect your information when you use this app.',
        },
      )}
    >
      <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
        {t(
          'privacy.body',
          {},
          {
            defaultValue:
              'We store the account details you provide and the budgets, transactions, and goals you create, solely to operate the app for you. We never sell personal data. You can export or delete your data at any time from the settings page.',
          },
        )}
      </p>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
