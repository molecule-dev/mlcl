import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import UserMenu from './UserMenu.js'
function BotDeployTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  return (
    <>
      {/* Top Navigation Bar */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 10),
          'fixed top-0 right-0 left-64 h-16 bg-background/70 backdrop-blur-xl z-40',
        )}
      >
        <div className={cm.cn(cm.flex1, cm.maxW('md'))}>
          <div className={cm.cn('relative')}>
            <input
              className={cm.cn(
                cm.input(),
                cm.w('full'),
                cm.sp('py', 2),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.textSize('sm'),
                'bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/60',
              )}
              placeholder={t(
                'botDeployTopBar.searchPlaceholder',
                {},
                { defaultValue: 'Search resources...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60',
              )}
            >
              search
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
          <div className={cm.cn(cm.flex(), 'gap-4')}>
            <Link
              className={cm.cn('text-on-background/70 hover:text-primary transition-colors')}
              to="/notifications"
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            </Link>
            <Link
              className={cm.cn('text-on-background/70 hover:text-primary transition-colors')}
              to="/help"
              aria-label={t('help.title', {}, { defaultValue: 'Help & support' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>help_outline</span>
            </Link>
          </div>
          <UserMenu />
        </div>
        <div
          className={cm.cn(
            'absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-surface-container-high to-transparent',
          )}
        ></div>
      </header>
    </>
  )
}

export default BotDeployTopBar
export { BotDeployTopBar }
