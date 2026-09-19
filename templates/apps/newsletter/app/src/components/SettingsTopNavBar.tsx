import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
interface SettingsTopNavBarProps {
  onSave: () => void
  loading: boolean
}
function SettingsTopNavBar({ onSave, loading }: SettingsTopNavBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'fixed top-0 right-0 lg:w-[calc(100%-240px)] z-50 glass-nav shadow-[0px_12px_32px_rgba(27,28,28,0.04)] lg:ml-[240px]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
        <span className={cm.cn(cm.textSize('2xl'), 'font-serif italic text-foreground')}>
          {t('settingsTopNavBar.brandName', {}, { defaultValue: 'Account Settings' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <Link
          to="/notifications"
          className={cm.fv0581ce11}
          data-mol-id="nav-notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className={cm.fv5b245ffa}>notifications</span>
        </Link>
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary font-label uppercase tracking-widest hover:scale-95 active:scale-90 transition-transform',
          )}
          data-mol-id="save-settings-top"
          onClick={onSave}
          disabled={loading}
        >
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}

export default SettingsTopNavBar
export { SettingsTopNavBar }
