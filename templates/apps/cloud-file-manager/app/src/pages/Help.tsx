import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-help"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('help.eyebrow', {}, { defaultValue: 'Support' })}
      title={t('help.title', {}, { defaultValue: 'Help & Support' })}
      subtitle={t(
        'help.subtitle',
        { appName: APP_NAME },
        { defaultValue: 'Answers to common {{appName}} questions.' },
      )}
    >
      <div className={cm.cn(cm.prose, cm.stack(4))}>
        <p>
          {t(
            'help.intro',
            {},
            {
              defaultValue:
                'Most answers live one click away. Drag files into the upload tray to add them, click Share on any row to mint a link, and visit Trash to restore anything you removed in the last 30 days.',
            },
          )}
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 6))}>
          {t('help.contactTitle', {}, { defaultValue: 'Need a person?' })}
        </h2>
        <p>
          {t(
            'help.contactBody',
            {},
            {
              defaultValue:
                'Email support@nimbus.example and we will reply within one business day. Pro and Team plans get priority routing.',
            },
          )}
        </p>
      </div>
      <p className={cm.cn(cm.sp('mt', 8))}>
        <Link
          to="/"
          data-mol-id="help-back-home"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          {t(
            'help.backHome',
            { appName: APP_NAME },
            { defaultValue: '← Back to {{appName}} home' },
          )}
        </Link>
      </p>
    </ContentPageShell>
  )
}

export default Help
export { Help as HelpPage }
