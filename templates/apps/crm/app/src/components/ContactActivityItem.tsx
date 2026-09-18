import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ContactActivityItem() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex(),
        cm.sp('p', 4),
        'gap-4 hover:bg-surface-container-low transition-colors rounded-xl group',
      )}
    >
      <img
        className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
        alt=""
        data-alt="professional woman portrait with subtle smile"
        src="https://picsum.photos/seed/ContactActivityItem-1/1200/800"
      />
      <div className={cm.flex1}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className={cm.fontWeight('bold')}>Sarah Miller</span>
          {t('contactActivityItem.addedContact', {}, { defaultValue: ' added a new contact ' })}
          <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>David Foster</span>
          {t('contactActivityItem.from', {}, { defaultValue: ' from ' })}
          <span className={cm.fontWeight('semibold')}>Global Logistics</span>
        </p>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          Yesterday, 4:15 PM
        </span>
      </div>
    </div>
  )
}

export default ContactActivityItem
export { ContactActivityItem }
