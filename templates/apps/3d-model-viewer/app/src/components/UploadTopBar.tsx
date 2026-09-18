import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function UploadTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.h(16),
        cm.sp('px', 8),
        cm.flex({ align: 'center', justify: 'between' }),
        'border-b border-border bg-surface sticky top-0 z-30',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-foreground-secondary',
        )}
      >
        <Link className={cm.cn('hover:text-primary transition-colors')} to="/models">
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <span className={cm.cn(cm.sp('mx', 1), 'material-symbols-outlined text-[16px]')}>
          chevron_right
        </span>
        <span className="text-foreground">
          {t('common.upload', {}, { defaultValue: 'Upload' })}
        </span>
      </div>
      {/* Global Actions */}
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <Link
          className={cm.cn('text-foreground-tertiary hover:text-primary transition-colors')}
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          <span className="material-symbols-outlined">notifications</span>
        </Link>
        <UserMenu />
      </div>
    </header>
  )
}

export default UploadTopBar
export { UploadTopBar }
