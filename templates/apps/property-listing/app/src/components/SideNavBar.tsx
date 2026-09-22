import React from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function SideNavBar() {
  const cm = getClassMap()
  const { logout } = useAuth()
  const { t } = useTranslation()
  const __navigate = useNavigate()
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await logout()
    } finally {
      __navigate('/login')
    }
  }
  return (
    <>
      {/* SideNavBar Component */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          cm.w(64),
          'fixed left-0 top-0 bg-background z-50 hidden md:flex',
        )}
      >
        <div
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('px', 6),
            cm.sp('py', 8),
            'text-primary dark:text-primary-fixed font-headline tracking-tight',
          )}
        >
          {t('sideNav.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </div>
        <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1, cm.sp('py', 4))}>
          {/* Dashboard */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-all duration-300 font-headline tracking-tight',
            )}
            to="/admin/dashboard"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
              dashboard
            </span>

            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
          {/* Listings */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-all duration-300 font-headline tracking-tight',
            )}
            to="/admin/listings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="real_estate_agent">
              real_estate_agent
            </span>

            {t('sideNav.listings', {}, { defaultValue: 'Listings' })}
          </Link>
          {/* Leads (ACTIVE) */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-primary dark:text-primary-fixed bg-on-error dark:bg-surface/5 rounded-l-none rounded-r-full font-headline tracking-tight',
            )}
            to="/admin/leads"
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="group"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              group
            </span>

            {t('sideNav.leads', {}, { defaultValue: 'Leads' })}
          </Link>
          {/* Showings */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-all duration-300 font-headline tracking-tight',
            )}
            to="/admin/showings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="calendar_today">
              calendar_today
            </span>

            {t('sideNav.showings', {}, { defaultValue: 'Showings' })}
          </Link>
          {/* Analytics */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-all duration-300 font-headline tracking-tight',
            )}
            to="/admin/analytics"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="analytics">
              analytics
            </span>

            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </Link>
          {/* Settings */}
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-all duration-300 font-headline tracking-tight',
            )}
            to="/admin/settings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
              settings
            </span>

            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'mt-auto')}>
          <button
            onClick={() => __navigate('/admin/listings/new')}
            className={cm.cn(
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.w('full'),
              'bg-primary-container text-on-primary-container rounded-lg font-headline hover:opacity-90 transition-all active:opacity-80',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')} data-icon="add">
              add
            </span>

            {t('sideNav.newListing', {}, { defaultValue: 'New Listing' })}
          </button>
        </div>
        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.sp('pb', 8),
            cm.flex({ direction: 'col' }),
            'border-t border-transparent',
          )}
        >
          <Link
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-colors duration-300 font-headline',
            )}
            to="/help"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="help_outline">
              help_outline
            </span>

            {t('sideNav.support', {}, { defaultValue: 'Support' })}
          </Link>
          <a
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              'text-foreground-secondary hover:text-primary transition-colors duration-300 font-headline',
            )}
            href="/login"
            onClick={handleLogout}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="logout">
              logout
            </span>

            {t('common.signOut', {}, { defaultValue: 'Sign Out' })}
          </a>
        </div>
      </aside>
    </>
  )
}

export default SideNavBar
export { SideNavBar }
