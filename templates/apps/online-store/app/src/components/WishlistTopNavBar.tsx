import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'

function WishlistTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim())
      navigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 bg-surface shadow-sm border-b border-border',
      )}
      data-mol-id="wishlist-nav-shell-01"
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.mxAuto,
          'max-w-[1280px] font-sans',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 8 }))}>
          <Link
            className={cm.cn(cm.textSize('2xl'), 'font-black text-success')}
            data-mol-id="brand-logo-01"
            to="/"
          >
            {t(
              'wishlistTopNavBar.brandName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}>
            <Link
              className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
              to="/"
            >
              {t('wishlistTopNavBar.navShop', {}, { defaultValue: 'Shop' })}
            </Link>
            <Link
              className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
              to="/search"
            >
              {t('wishlistTopNavBar.navCategories', {}, { defaultValue: 'Categories' })}
            </Link>
            <Link
              className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
              to="/search"
            >
              {t('wishlistTopNavBar.navDeals', {}, { defaultValue: 'Deals' })}
            </Link>
            <Link
              className={cm.cn('text-foreground-secondary hover:text-success transition-colors')}
              to="/search"
            >
              {t('wishlistTopNavBar.navNewArrivals', {}, { defaultValue: 'New Arrivals' })}
            </Link>
            <NavLink
              className={({ isActive }) =>
                cm.cn(
                  'transition-colors border-b-2 pb-0.5',
                  isActive
                    ? 'text-success border-green-600 font-semibold'
                    : 'text-foreground-secondary border-transparent hover:text-success',
                )
              }
              to="/wishlist"
            >
              {t('wishlistTopNavBar.navWishlist', {}, { defaultValue: 'Wishlist' })}
            </NavLink>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
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
                'bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-green-600 border-none',
              )}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder={t(
                'wishlistTopNavBar.searchPlaceholder',
                {},
                { defaultValue: 'Search curated goods...' },
              )}
              type="text"
              value={search}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <Link
              className={cm.cn(
                cm.sp('p', 2),
                'relative scale-95 active:scale-100 transition-transform',
              )}
              to="/wishlist"
            >
              <span
                className={cm.cn('material-symbols-outlined text-success')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </Link>
            <Link
              className={cm.cn(
                cm.sp('p', 2),
                'relative scale-95 active:scale-100 transition-transform',
              )}
              to="/cart"
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-secondary')}>
                shopping_cart
              </span>
              <span
                className={cm.cn(
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'absolute -top-2 -right-2 bg-primary text-on-primary text-[10px] px-1.5 py-0.5',
                )}
              >
                {t('wishlistTopNavBar.cartCount', { count: 3 }, { defaultValue: '{{count}}' })}
              </span>
            </Link>
            <button
              type="button"
              aria-label={t('nav.accountMenu', {}, { defaultValue: 'Account menu' })}
              onClick={() => navigate('/settings')}
              className={cm.cn(
                cm.roundedFull,
                'scale-95 active:scale-100 transition-transform focus:outline-none focus:ring-2 focus:ring-green-600',
              )}
            >
              <img
                alt={t('wishlistTopNavBar.userAvatarAlt', {}, { defaultValue: 'User Avatar' })}
                className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'object-cover')}
                src={avatarUrl(user?.name || user?.email)}
              />
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default WishlistTopNavBar
export { WishlistTopNavBar }
