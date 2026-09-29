import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CategoryAnnouncementBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('py', 2),
        cm.sp('px', 6),
        cm.textCenter,
        cm.textSize('sm'),
        cm.fontWeight('medium'),
        'bg-surface-secondary',
      )}
      data-mol-id="announcement-bar-01"
    >
      {t(
        'categoryAnnouncementBar.freeShipping',
        { minAmount: '$75' },
        { defaultValue: 'Free shipping on orders over {{minAmount}} — ' },
      )}
      <Link className={cm.cn('text-primary font-bold hover:underline')} to="/">
        {t('categoryAnnouncementBar.shopNow', {}, { defaultValue: 'Shop now' })}
      </Link>
    </div>
  )
}

export default CategoryAnnouncementBar
export { CategoryAnnouncementBar }
