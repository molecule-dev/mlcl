import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function CartTopNavBar({ cartCount = 0 }: { cartCount?: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 bg-surface border-b border-border shadow-sm',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.h(16),
          cm.maxW('[1280px]'),
        )}
      >
        <Link
          className={cm.cn(cm.textSize('2xl'), 'font-black text-primary tracking-tight')}
          to="/"
        >
          {t('cartTopNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center' }), 'hidden md:flex gap-6')}>
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            to="/"
          >
            {t('cartTopNavBar.shop', {}, { defaultValue: 'Shop' })}
          </Link>
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            to="/search?q=all"
          >
            {t('cartTopNavBar.categories', {}, { defaultValue: 'Categories' })}
          </Link>
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            to="/search?q=sale"
          >
            {t('cartTopNavBar.deals', {}, { defaultValue: 'Deals' })}
          </Link>
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans text-foreground-secondary hover:text-success dark:hover:text-green-300 transition-colors',
            )}
            to="/search?q=new"
          >
            {t('cartTopNavBar.newArrivals', {}, { defaultValue: 'New Arrivals' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          <Link
            to="/wishlist"
            aria-label={t('cartTopNavBar.favoritesLabel', {}, { defaultValue: 'Favorites' })}
            className={cm.cn(
              'p-2 text-foreground-secondary hover:text-success transition-all active:opacity-80',
            )}
            data-mol-id="nav-favorite"
          >
            <span className={cm.cn('material-symbols-outlined')}>favorite</span>
          </Link>
          <Link
            to="/cart"
            aria-label={t('cartTopNavBar.cartLabel', {}, { defaultValue: 'Cart' })}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 2),
              'text-success border-b-2 border-green-600 transition-all active:opacity-80 gap-2',
            )}
            data-mol-id="nav-cart"
          >
            <span className={cm.cn('material-symbols-outlined')}>shopping_cart</span>
            {cartCount > 0 && (
              <span
                className={cm.cn(
                  'text-[10px]',
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  cm.h(5),
                  cm.w(5),
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-primary text-on-primary',
                )}
              >
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default CartTopNavBar
export { CartTopNavBar }
