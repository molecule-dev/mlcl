import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function AdminSettingsTopNavBar() {
  const cm = getClassMap()
  const [search, setSearch] = useState('')
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header
      className={cm.cn(
        'bg-surface font-sans antialiased shadow-sm border-b border-border top-0 z-50 sticky',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.w('full'),
          cm.maxW('[1280px]'),
          cm.mxAuto,
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}>
          <Link className={cm.cn(cm.textSize('2xl'), 'font-black text-foreground')} to="/">
            {t(
              'adminSettingsTopNavBar.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </Link>
          <nav
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:flex items-center gap-6',
            )}
          >
            <Link
              className={cm.cn(
                'text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
              )}
              to="/"
            >
              {t('adminSettingsTopNavBar.navShop', {}, { defaultValue: 'Shop' })}
            </Link>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <div className={cm.cn(cm.w(64), 'relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
            >
              search
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 2),
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-full focus:ring-2 focus:ring-green-500 transition-all',
              )}
              placeholder={t(
                'adminSettingsTopNavBar.searchPlaceholder',
                {},
                { defaultValue: 'Search settings...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 text-foreground-secondary')}>
            <Link
              className={cm.cn(
                cm.h(8),
                cm.w(8),
                cm.roundedFull,
                cm.cursorPointer,
                'overflow-hidden border border-border',
              )}
              to="/settings"
            >
              <img
                alt={t(
                  'adminSettingsTopNavBar.adminProfileAlt',
                  {},
                  { defaultValue: 'Admin Profile' },
                )}
                className={cm.cn(cm.h('full'), cm.w('full'), 'object-cover')}
                src={avatarUrl(user?.name || user?.email)}
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminSettingsTopNavBar
export { AdminSettingsTopNavBar }
