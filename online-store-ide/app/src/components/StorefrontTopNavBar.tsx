/**
 * Thin shim around @molecule/app-storefront-chrome-react's
 * StorefrontTopNav. Wires the per-app cart count + auth state +
 * logout flow; shared package owns the brand + nav links + icon
 * actions + profile dropdown rendering.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { StorefrontTopNav } from '@molecule/app-storefront-chrome-react'

import { APP_NAME } from '../branding.js'
import { avatarUrl } from '../utils/avatar.js'
import { unpackCartPayload } from '../utils/httpUnpack.js'

function StorefrontTopNavBar() {
  const { t } = useTranslation()
  const [cartCount, setCartCount] = useState(0)
  const http = useHttpClient()
  const { isAuthenticated, logout, user } = useAuth<{ name?: string; email?: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      setCartCount(0)
      return
    }
    http
      .get('/api/cart')
      .then((res: unknown) => {
        const cart = unpackCartPayload(res)
        setCartCount(cart?.items.length ?? 0)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]) // http client is stable — adding it would cause spurious re-fetches

  const handleSignOut = (): void => {
    logout()
      .catch(() => {})
      .finally(() => navigate('/'))
  }

  const nav = (
    <StorefrontTopNav
      brand={t('nav.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      brandTo="/"
      links={[
        {
          to: '/',
          label: t('nav.shop', {}, { defaultValue: 'Shop' }),
          active: true,
          dataMolId: 'nav-link-shop',
        },
        {
          to: '/search?q=all',
          label: t('nav.categories', {}, { defaultValue: 'Categories' }),
          dataMolId: 'nav-link-categories',
        },
        {
          to: '/search?q=sale',
          label: t('nav.deals', {}, { defaultValue: 'Deals' }),
          dataMolId: 'nav-link-deals',
        },
        {
          to: '/search?q=new',
          label: t('nav.newArrivals', {}, { defaultValue: 'New Arrivals' }),
          dataMolId: 'nav-link-arrivals',
        },
      ]}
      actions={[
        {
          to: '/search',
          icon: 'search',
          ariaLabel: t('common.search', {}, { defaultValue: 'Search' }),
          dataMolId: 'search-btn-01',
        },
        {
          to: '/wishlist',
          icon: 'favorite',
          ariaLabel: t('nav.wishlistLabel', {}, { defaultValue: 'Wishlist' }),
          dataMolId: 'wishlist-btn-01',
        },
        {
          to: '/cart',
          icon: 'shopping_cart',
          ariaLabel: t('nav.cartLabel', {}, { defaultValue: 'Cart' }),
          dataMolId: 'cart-btn-01',
          badgeCount: cartCount,
        },
      ]}
      isAuthenticated={isAuthenticated}
      profileImageUrl={avatarUrl(isAuthenticated ? user?.name || user?.email : undefined)}
      profileImageAlt={t('nav.profileImageAlt', {}, { defaultValue: 'User profile' })}
      authedMenu={[
        {
          to: '/settings',
          label: t('nav.myAccount', {}, { defaultValue: 'My Account' }),
          dataMolId: 'profile-link-account',
        },
        {
          to: '/orders',
          label: t('nav.orders', {}, { defaultValue: 'Orders' }),
          dataMolId: 'profile-link-orders',
        },
        {
          to: '/wishlist',
          label: t('nav.wishlist', {}, { defaultValue: 'Wishlist' }),
          dataMolId: 'profile-link-wishlist',
        },
        {
          to: '/notifications',
          label: t('nav.notifications', {}, { defaultValue: 'Notifications' }),
          dataMolId: 'profile-link-notifications',
        },
      ]}
      unauthedMenu={[
        {
          to: '/login',
          label: t('auth.login.signInButton', {}, { defaultValue: 'Sign in' }),
          dataMolId: 'profile-link-signin',
        },
        {
          to: '/signup',
          label: t('auth.signup.createAccount', {}, { defaultValue: 'Create account' }),
          dataMolId: 'profile-link-signup',
        },
      ]}
      onSignOut={handleSignOut}
      signOutLabel={t('common.signOut', {}, { defaultValue: 'Sign Out' })}
    />
  )

  return (
    <>
      {nav}
      {/* Template-local mobile chip nav: the shared StorefrontTopNav hides
          its links below md with no hamburger, which would leave mobile
          shoppers no way to reach Categories / Deals / New Arrivals. A
          horizontally scrollable chip row below the sticky bar keeps those
          destinations one tap away without a drawer. Hidden ≥ md where the
          shared links render. */}
      <nav
        data-mol-id="mobile-chip-nav"
        aria-label={t('nav.browseCategories', {}, { defaultValue: 'Browse' })}
        className="storefront-chip-nav"
        style={{
          display: 'none',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          gap: '8px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
          backgroundColor: 'var(--color-surface, #ffffff)',
          scrollbarWidth: 'none',
          position: 'sticky',
          top: '64px',
          zIndex: 30,
        }}
      >
        {[
          { to: '/', label: t('nav.shop', {}, { defaultValue: 'Shop' }) },
          { to: '/search?q=all', label: t('nav.categories', {}, { defaultValue: 'Categories' }) },
          { to: '/search?q=sale', label: t('nav.deals', {}, { defaultValue: 'Deals' }) },
          { to: '/search?q=new', label: t('nav.newArrivals', {}, { defaultValue: 'New' }) },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-surface-secondary, #f8fafc)',
              color: 'var(--color-text, #0f172a)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              minHeight: '36px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <style>{`
        .storefront-chip-nav::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .storefront-chip-nav { display: flex !important; }
        }
      `}</style>
    </>
  )
}

export default StorefrontTopNavBar
export { StorefrontTopNavBar }
