import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

function SettingsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [, setNotificationsOpen] = useState(false)

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        'top-0 sticky z-40 bg-background w-full border-b border-outline-variant/15',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <BrandWordmark size="sm" />
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            cm.w(64),
            'bg-surface-container-low py-1.5 rounded-lg',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mr', 2),
              'material-symbols-outlined text-on-background/40',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('p', 0),
              cm.w('full'),
              'bg-transparent border-none focus:ring-0 placeholder-on-background/40',
            )}
            placeholder={t('settingsTopBar.searchPlaceholder', {}, { defaultValue: 'Search...' })}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 text-on-background/60')}>
        <button
          type="button"
          className={cm.cn(
            cm.cursorPointer,
            cm.sp('p', 2),
            'material-symbols-outlined hover:bg-surface-container-low rounded transition-colors',
          )}
          data-icon="notifications"
          onClick={() => setNotificationsOpen((o) => !o)}
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        >
          notifications
        </button>
        <span
          className={cm.cn(
            cm.cursorPointer,
            cm.sp('p', 2),
            'material-symbols-outlined hover:bg-surface-container-low rounded transition-colors',
          )}
          data-icon="help_outline"
        >
          help_outline
        </span>
      </div>
    </header>
  )
}

export default SettingsTopBar
export { SettingsTopBar }
