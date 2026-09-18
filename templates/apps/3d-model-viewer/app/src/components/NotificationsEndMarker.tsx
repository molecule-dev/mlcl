import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function NotificationsEndMarker() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.textCenter, cm.sp('pt', 8), cm.sp('pb', 12))}>
      <p
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 2 }),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'text-foreground-tertiary',
        )}
      >
        <span className={cm.cn(cm.w(8), 'h-px bg-border')}></span>

        {t('notificationsEndMarker.endOfList', {}, { defaultValue: "You've reached the end" })}

        <span className={cm.cn(cm.w(8), 'h-px bg-border')}></span>
      </p>
    </div>
  )
}

export default NotificationsEndMarker
export { NotificationsEndMarker }
