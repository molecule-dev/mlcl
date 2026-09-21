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
        'px-4 md:px-8',
        cm.h(16),
        cm.w('full'),
        // Full-width below md — matches SettingsSideNavBar's hidden-below-md.
        'fixed top-0 right-0 md:w-[calc(100%-240px)] z-50 glass-nav shadow-[0px_12px_32px_rgba(27,28,28,0.04)] md:ml-[240px]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
        <span className={cm.cn(cm.textSize('2xl'), 'font-serif italic text-foreground')}>
          {t('settingsTopNavBar.brandName', {}, { defaultValue: 'Account Settings' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        {/* (A "/notifications" bell used to sit here, but no /notifications
            route exists — it bounced every click to the Landing fallback.) */}
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
