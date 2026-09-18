import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const INACTIVE_CLS =
  'px-[16px] py-[10px] text-on-surface-variant rounded-lg transition-colors border-l-[3px] border-transparent text-left'

export default function SettingsSubNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const ACTIVE_CLS = cm.cn(
    cm.textPrimary,
    cm.fontWeight('medium'),
    'px-[16px] py-[10px] bg-primary/5 border-l-[3px] border-primary rounded-r-lg text-left',
  )
  return (
    <aside
      className={cm.cn(
        cm.sp('py', 8),
        cm.sp('pl', 8),
        cm.sp('pr', 4),
        'w-[240px] bg-surface-container-low h-full overflow-y-auto',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 4),
          cm.sp('pl', 4),
          'font-headline text-outline-variant uppercase tracking-widest',
        )}
      >
        {t('settingsSubNav.personalSection', {}, { defaultValue: 'Personal' })}
      </h3>
      <nav
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 1 }),
          cm.sp('mb', 8),
          cm.textSize('sm'),
          'font-body',
        )}
      >
        {/* Only the Profile tab is wired to the form on the right; other
            settings panels are intentionally hidden until they ship so we
            don't display dead-end nav items. */}
        <span data-mol-id="settings-subnav-profile" className={ACTIVE_CLS}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </span>
        <span
          data-mol-id="settings-subnav-account"
          className={cm.cn(INACTIVE_CLS, 'opacity-50 cursor-not-allowed')}
          aria-disabled="true"
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
          <span className={cm.cn(cm.textSize('xs'), cm.sp('ml', 2), 'text-outline-variant')}>
            {t('common.comingSoon', {}, { defaultValue: 'Coming soon' })}
          </span>
        </span>
      </nav>
    </aside>
  )
}
export { SettingsSubNav }
