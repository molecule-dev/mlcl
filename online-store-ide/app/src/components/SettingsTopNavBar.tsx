import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function SettingsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth() as { user?: { name?: string } }
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'sticky top-0 z-50 bg-surface border-b border-border shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.h(16),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}>
          <Link
            className={cm.cn(cm.textSize('2xl'), 'font-black text-foreground tracking-tight')}
            data-mol-id="nav-logo"
            to="/"
          >
            {t('settingsTopNavBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-shop"
              to="/"
            >
              {t('settingsTopNavBar.shop', {}, { defaultValue: 'Shop' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-categories"
              to="/search?q=all"
            >
              {t('settingsTopNavBar.categories', {}, { defaultValue: 'Categories' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-deals"
              to="/search?q=sale"
            >
              {t('settingsTopNavBar.deals', {}, { defaultValue: 'Deals' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-new-arrivals"
              to="/search?q=new"
            >
              {t('settingsTopNavBar.newArrivals', {}, { defaultValue: 'New Arrivals' })}
            </Link>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <div className={cm.cn('relative hidden sm:block')}>
            <span
              className={
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary'
              }
            >
              search
            </span>
            <input
              className={cm.cn(
                cm.sp('pl', 10),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.w(64),
                cm.roundedFull,
                'bg-surface-secondary border-none focus:ring-2 focus:ring-primary',
              )}
              data-mol-id="search-input"
              placeholder={t(
                'settingsTopNavBar.searchPlaceholder',
                {},
                { defaultValue: 'Search...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  navigate(`/search?q=${encodeURIComponent(search)}`)
                }
              }}
            />
          </div>
          <Link
            className={cm.cn(
              'relative text-foreground-secondary hover:text-success transition-colors',
            )}
            data-mol-id="nav-favorite"
            to="/wishlist"
          >
            <span className={cm.cn('material-symbols-outlined')}>favorite</span>
          </Link>
          <Link
            className={cm.cn(
              'relative text-foreground-secondary hover:text-success transition-colors',
            )}
            data-mol-id="nav-cart"
            to="/cart"
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.h(4),
                cm.w(4),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'absolute -top-2 -right-2 bg-primary text-white text-[10px]',
              )}
            >
              {t('settingsTopNavBar.cartCount', { count: 3 }, { defaultValue: '{{count}}' })}
            </span>
          </Link>
          <button
            type="button"
            className={cm.cn(
              cm.h(8),
              cm.w(8),
              cm.roundedFull,
              cm.cursorPointer,
              'bg-border overflow-hidden border border-primary/20',
            )}
            data-mol-id="nav-profile-avatar"
            onClick={() => navigate('/settings')}
          >
            <img
              alt={t(
                'settingsTopNavBar.profileImageAlt',
                { name: user?.name ?? 'Profile' },
                { defaultValue: '{{name}}' },
              )}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              src={avatarUrl(user?.name)}
            />
          </button>
        </div>
      </div>
    </header>
  )
}

export default SettingsTopNavBar
export { SettingsTopNavBar }
