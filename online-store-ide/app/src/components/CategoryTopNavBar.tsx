import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function CategoryTopNavBar() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'sticky top-0 z-50 bg-surface shadow-sm border-b border-border',
      )}
      data-mol-id="nav-shell-01"
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.h(16),
          cm.sp('px', 6),
          cm.maxW('[1280px]'),
          cm.mxAuto,
          'font-sans antialiased',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 8 })}>
          <Link className={cm.cn(cm.textSize('2xl'), 'font-black text-foreground')} to="/">
            {t('nav.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </Link>
          <nav className={cm.cn(cm.flex({ gap: 6 }), 'hidden md:flex')}>
            {/* Categories is Active based on Route /category/electronics */}
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
              )}
              to="/"
            >
              {t('nav.shop', {}, { defaultValue: 'Shop' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
              )}
              to="/search?q=all"
            >
              {t('nav.categories', {}, { defaultValue: 'Categories' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
              )}
              to="/search?q=sale"
            >
              {t('nav.deals', {}, { defaultValue: 'Deals' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
              )}
              to="/search?q=new"
            >
              {t('nav.newArrivals', {}, { defaultValue: 'New Arrivals' })}
            </Link>
          </nav>
        </div>
        <div className={cm.flex({ align: 'center', gap: 4 })}>
          <div className={cm.cn('relative hidden lg:block')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
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
                'bg-surface-secondary border-none focus:ring-2 focus:ring-green-500',
              )}
              placeholder={t('nav.searchPlaceholder', {}, { defaultValue: 'Search products...' })}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim())
                  navigate(`/search?q=${encodeURIComponent(search.trim())}`)
              }}
            />
          </div>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success transition-all active:opacity-80 active:scale-95',
            )}
            to="/wishlist"
          >
            <span className={cm.cn('material-symbols-outlined')}>favorite</span>
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success transition-all active:opacity-80 active:scale-95 relative',
            )}
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
                'absolute -top-2 -right-2 bg-sale text-white text-[10px]',
              )}
            >
              {t('nav.cartCount', { count: 3 }, { defaultValue: '{{count}}' })}
            </span>
          </Link>
          <Link
            className={cm.cn(
              'text-foreground-secondary hover:text-success transition-all active:opacity-80 active:scale-95',
            )}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')}>person</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default CategoryTopNavBar
export { CategoryTopNavBar }
