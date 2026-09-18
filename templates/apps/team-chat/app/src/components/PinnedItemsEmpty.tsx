import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function PinnedItemsEmpty() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="pinned-items-empty"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.textCenter,
        'rounded-2xl border-2 border-dashed border-outline-variant/30',
      )}
    >
      <span
        className={cm.cn(
          cm.textSize('4xl'),
          cm.sp('mb', 2),
          'material-symbols-outlined text-on-surface-variant/20',
        )}
      >
        push_pin
      </span>
      <p
        className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-on-surface-variant/50')}
      >
        {t('pinnedItemsEmpty.title', {}, { defaultValue: 'No items pinned yet.' })}
        <br />
        {t('pinnedItemsEmpty.description', {}, { defaultValue: 'Pin important messages here.' })}
      </p>
    </div>
  )
}
export { PinnedItemsEmpty }
