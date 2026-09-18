import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function BotDeployPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.sp('mb', 12)}>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.textPrimary,
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'gap-3',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>rocket_launch</span>
        <span className={cm.cn('tracking-widest uppercase')}>
          {t('botDeployPageHeader.eyebrow', {}, { defaultValue: 'Go Live' })}
        </span>
      </div>
      <h1
        className={cm.cn(
          'text-5xl',
          cm.sp('mb', 4),
          'font-headline font-extrabold text-on-surface tracking-tight',
        )}
      >
        {t('botDeployPageHeader.heading', {}, { defaultValue: 'Deploy Your Bot' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), cm.maxW('2xl'), 'text-on-surface-variant/70')}>
        {t(
          'botDeployPageHeader.description',
          { appName: APP_NAME },
          {
            defaultValue:
              'Connect your {{appName}} AI to your website, applications, or social channels in seconds. Choose your preferred distribution method below.',
          },
        )}
      </p>
    </div>
  )
}

export default BotDeployPageHeader
export { BotDeployPageHeader }
