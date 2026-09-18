import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsAnnouncementBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.textCenter,
        cm.sp('py', 2),
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'bg-foreground text-white tracking-wide uppercase',
      )}
    >
      {t(
        'settingsAnnouncementBar.freeShippingOffer',
        { threshold: '$75' },
        { defaultValue: 'Free shipping over {{threshold}}' },
      )}
    </div>
  )
}

export default SettingsAnnouncementBar
export { SettingsAnnouncementBar }
