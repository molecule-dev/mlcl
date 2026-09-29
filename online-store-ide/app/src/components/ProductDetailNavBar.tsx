import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function ProductDetailNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }
  const [search, setSearch] = useState('')

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`)
    }
  }

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
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.mxAuto,
          'max-w-[1280px]',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-8')}>
          <Link
            className={cm.cn(cm.textSize('2xl'), 'font-black text-foreground')}
            data-mol-id="logo"
            to="/"
          >
            {t(
              'productDetailNavBar.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </Link>
          <nav className={cm.cn('hidden md:flex items-center gap-6')}>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-shop"
              to="/"
            >
              {t('productDetailNavBar.navShop', {}, { defaultValue: 'Shop' })}
            </Link>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-deals"
              to="/search?q=sale"
            >
              {t('productDetailNavBar.navDeals', {}, { defaultValue: 'Deals' })}
            </Link>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-new-arrivals"
              to="/search?q=new"
            >
              {t('productDetailNavBar.navNewArrivals', {}, { defaultValue: 'New Arrivals' })}
            </Link>
            <Link
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-foreground-secondary hover:text-success dark:hover:text-green-400 transition-colors',
              )}
              data-mol-id="nav-collections"
              to="/search?q=all"
            >
              {t('productDetailNavBar.navCollections', {}, { defaultValue: 'Collections' })}
            </Link>
          </nav>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.flex1,
            cm.maxW('md'),
            cm.sp('mx', 8),
            'gap-4',
          )}
        >
          <div className={cm.cn(cm.w('full'), 'relative')}>
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
                cm.sp('pr', 4),
                cm.textSize('sm'),
                cm.roundedFull,
                'pl-10 bg-surface-secondary border-none focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="search-input"
              placeholder={t(
                'productDetailNavBar.searchPlaceholder',
                {},
                { defaultValue: 'Search products...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-5')}>
          <Link
            className={cm.cn(
              'relative p-2 text-foreground-secondary hover:text-success transition-colors',
            )}
            data-mol-id="wishlist-btn"
            to="/wishlist"
          >
            <span className={cm.cn('material-symbols-outlined')}>favorite</span>
          </Link>
          <Link
            className={cm.cn(
              'relative p-2 text-foreground-secondary hover:text-success transition-colors',
            )}
            data-mol-id="cart-btn"
            to="/cart"
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
          </Link>
          <Link
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'overflow-hidden border border-border',
            )}
            data-mol-id="user-profile"
            to="/settings"
          >
            <img
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              alt={t('productDetailNavBar.profileAvatarAlt', {}, { defaultValue: 'Your profile' })}
              src={avatarUrl(user?.name || user?.email)}
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
export default ProductDetailNavBar
export { ProductDetailNavBar }
