import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function SearchAnnouncementBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ justify: 'center', align: 'center' }),
        cm.sp('py', 2),
        cm.sp('px', 6),
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        'bg-primary text-white',
      )}
    >
      <span>
        {t(
          'searchAnnouncementBar.promotion',
          { threshold: '$50', code: 'BAZAAR24' },
          { defaultValue: 'Free shipping on all orders over {{threshold}}. Use code {{code}}' },
        )}
      </span>
    </div>
  )
}
export { SearchAnnouncementBar }
