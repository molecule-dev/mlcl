import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function SearchTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 bg-surface border-b border-border shadow-sm',
      )}
    >
      <nav
        className={cm.cn(
          cm.mxAuto,
          cm.flex({ align: 'center', justify: 'between' }),
          cm.h(16),
          cm.sp('px', 6),
          'max-w-[1280px]',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
          <Link
            className={cm.cn('text-2xl font-black text-primary tracking-tight')}
            data-mol-id="nav-logo"
            to="/"
          >
            {t('searchTopNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-shop"
              to="/"
            >
              {t('nav.shop', {}, { defaultValue: 'Shop' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-categories"
              to="/search?q=all"
            >
              {t('nav.categories', {}, { defaultValue: 'Categories' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-link-deals"
              to="/search?q=sale"
            >
              {t('nav.deals', {}, { defaultValue: 'Deals' })}
            </Link>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
            <button
              className={cm.cn(
                cm.sp('p', 2),
                'text-foreground-secondary hover:bg-surface-secondary transition-all active:scale-95',
              )}
              data-mol-id="nav-search-trigger"
              onClick={() => setSearchOpen((o) => !o)}
            >
              <span className={cm.cn('material-symbols-outlined')}>search</span>
            </button>
            {searchOpen && (
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cm.cn(
                  cm.sp('ml', 2),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  cm.roundedFull,
                  'bg-surface-secondary border-none focus:outline-none focus:ring-2 focus:ring-green-500',
                )}
                placeholder={t('nav.searchPlaceholder', {}, { defaultValue: 'Search…' })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false)
                  }
                  if (e.key === 'Enter') {
                    navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
                    setSearchOpen(false)
                  }
                }}
              />
            )}
            <Link
              to="/cart"
              className={cm.cn(
                'p-2 text-foreground-secondary hover:bg-surface-secondary transition-all active:scale-95 relative',
              )}
              data-mol-id="nav-cart"
            >
              <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
              <span
                className={cm.cn(
                  cm.w(2),
                  cm.h(2),
                  cm.roundedFull,
                  'absolute top-1 right-1 bg-accent border border-surface',
                )}
              ></span>
            </Link>
            <Link
              to="/wishlist"
              className={cm.cn(
                'p-2 text-foreground-secondary hover:bg-surface-secondary transition-all active:scale-95',
              )}
              data-mol-id="nav-wishlist"
            >
              <span className={cm.cn('material-symbols-outlined')}>favorite</span>
            </Link>
            <Link
              to="/settings"
              className={cm.cn(
                cm.sp('p', 2),
                'text-foreground-secondary hover:bg-surface-secondary transition-all active:scale-95',
              )}
              data-mol-id="nav-profile"
            >
              <span className={cm.cn('material-symbols-outlined')}>person</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default SearchTopNavBar
export { SearchTopNavBar }
