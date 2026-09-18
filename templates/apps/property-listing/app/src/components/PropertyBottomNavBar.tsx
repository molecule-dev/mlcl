import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function PropertyBottomNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  const getNavItemClass = (path: string) => {
    const isActive = location.pathname === path
    return cm.cn(
      cm.flex({ direction: 'col', align: 'center' }),
      isActive
        ? cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-success bg-success-light rounded-xl',
          )
        : 'text-foreground-secondary',
    )
  }
  return (
    <nav
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'around' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.sp('pb', 6),
        'md:hidden fixed bottom-0 left-0 w-full bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50',
      )}
      data-mol-id="bottom-nav"
    >
      <Link className={getNavItemClass('/')} to="/">
        <span className={cm.cn('material-symbols-outlined')}>search</span>
        <span className={cm.cn("font-['Inter'] text-[10px] uppercase tracking-wider")}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </span>
      </Link>
      <Link className={getNavItemClass('/saved')} to="/saved">
        <span className={cm.cn('material-symbols-outlined')}>favorite</span>
        <span className={cm.cn("font-['Inter'] text-[10px] uppercase tracking-wider")}>
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </span>
      </Link>
    </nav>
  )
}
export { PropertyBottomNavBar }
