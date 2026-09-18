import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.h(16),
        cm.w('full'),
        'fixed top-0 right-0 left-[260px] bg-surface-container-lowest/80 backdrop-blur-xl z-40',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'text-on-surface-variant font-headline',
        )}
      >
        <span className="text-primary">{t('nav.settings', {}, { defaultValue: 'Settings' })}</span>
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}>
          chevron_right
        </span>
        <span className="text-on-surface">{t('nav.profile', {}, { defaultValue: 'Profile' })}</span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'text-on-surface-variant')}>
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.sp('ml', 2),
            'bg-surface-container-highest overflow-hidden border border-outline-variant/15',
          )}
        >
          <img
            alt={t('settingsTopBar.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            data-alt="professional headshot of a young woman with soft natural lighting against a dark neutral background"
            src="https://picsum.photos/seed/SettingsTopBar-1/1200/800"
          />
        </div>
      </div>
    </header>
  )
}

export default SettingsTopBar
export { SettingsTopBar }
