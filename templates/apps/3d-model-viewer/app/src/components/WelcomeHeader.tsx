import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function WelcomeHeader({ name = 'Alex' }: { name?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header>
      <h2
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[2.75rem] font-headline text-tracking-tightest text-on-surface leading-tight',
        )}
      >
        {t('welcomeHeader.greeting', {}, { defaultValue: 'Welcome back, ' })}
        <span className={cm.cn(cm.textPrimary, cm.fontWeight('medium'))}>{name}</span>
      </h2>
      <p className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), 'text-on-surface-variant')}>
        {t(
          'welcomeHeader.statusMessage',
          {},
          { defaultValue: 'Your workspace is synced and ready.' },
        )}
      </p>
    </header>
  )
}

export default WelcomeHeader
export { WelcomeHeader }
