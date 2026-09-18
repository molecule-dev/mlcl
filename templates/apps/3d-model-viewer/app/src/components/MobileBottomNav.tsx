import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function MobileBottomNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const navClass = (path: string) =>
    location.pathname === path
      ? cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 1 }), cm.textPrimary)
      : cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 1 }),
          'text-foreground-secondary hover:text-primary',
        )
  return (
    <>
      {/* Mobile Navigation (Bottom Bar Fallback - Hidden on MD+) */}
      <nav
        className={cm.cn(
          cm.flex({ justify: 'around' }),
          cm.sp('p', 3),
          cm.w('full'),
          'md:hidden fixed bottom-0 left-0 bg-surface border-t border-border z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]',
        )}
      >
        <Link className={navClass('/dashboard')} to="/dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] uppercase tracking-wider')}>
            {t('mobileNav.dashboard', {}, { defaultValue: 'Dash' })}
          </span>
        </Link>
        <Link className={navClass('/upload')} to="/upload">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            upload_file
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] uppercase tracking-wider')}>
            {t('common.upload', {}, { defaultValue: 'Upload' })}
          </span>
        </Link>
        <Link className={navClass('/models')} to="/models">
          <span className="material-symbols-outlined">inventory_2</span>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] uppercase tracking-wider')}>
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </span>
        </Link>
        <Link className={navClass('/settings')} to="/settings">
          <span className="material-symbols-outlined">account_circle</span>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] uppercase tracking-wider')}>
            {t('settings.account', {}, { defaultValue: 'Account' })}
          </span>
        </Link>
      </nav>
    </>
  )
}

export default MobileBottomNav
export { MobileBottomNav }
