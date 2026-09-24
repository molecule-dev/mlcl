import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsTopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMailOpen, setIsMailOpen] = useState(false)
  return (
    <>
      {/* Top AppBar Shell */}
      <header
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('pr', 12),
          cm.sp('py', 6),
          // Anchored to the content column (left-64 = the shell sidebar's
          // 256px) so the fixed bar never overlays the sidebar — the old
          // z-50 sidebar used to paint over its left 256px.
          'fixed top-0 right-0 left-64 z-30 bg-background/80 backdrop-blur-xl hidden md:flex',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline',
              )}
            >
              search
            </span>
            <input
              className={cm.cn(
                cm.sp('pl', 12),
                cm.sp('pr', 6),
                cm.sp('py', 3),
                cm.w(80),
                cm.textSize('sm'),
                'bg-surface-container-low border-none rounded-xl focus:ring-1 focus:ring-surface-tint/20',
              )}
              placeholder={t('settingsTopAppBar.search', {}, { defaultValue: 'Search portal...' })}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <button
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            aria-expanded={isNotificationsOpen}
            className={cm.cn('text-foreground-secondary hover:opacity-70 transition-opacity')}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
            <span className={cm.cn('material-symbols-outlined')}>notifications</span>
          </button>
          <button
            aria-label={t('nav.messages', {}, { defaultValue: 'Messages' })}
            aria-expanded={isMailOpen}
            className={cm.cn('text-foreground-secondary hover:opacity-70 transition-opacity')}
            onClick={() => setIsMailOpen(!isMailOpen)}
          >
            <span className={cm.cn('material-symbols-outlined')}>mail</span>
          </button>
        </div>
      </header>
    </>
  )
}

export { SettingsTopAppBar }
export default SettingsTopAppBar
