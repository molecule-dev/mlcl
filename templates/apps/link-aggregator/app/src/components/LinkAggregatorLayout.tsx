/**
 * Two-column shell — left navigation rail with the brand wordmark, search,
 * and primary nav links; right column hosts the page Outlet inside a
 * width-constrained editorial canvas.
 *
 * Translated from blog/BlogLayout.tsx — rewritten in ClassMap with the
 * Digest purple palette and a navigation set tuned to link-aggregation
 * (Feed / Subs / Submit / Saved / Notifications / Profile / Settings).
 */
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface NavItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const NAV: NavItem[] = [
  { to: '/feed', icon: 'home', labelKey: 'feed', defaultLabel: 'Feed' },
  { to: '/subs', icon: 'group', labelKey: 'subs', defaultLabel: 'Subs' },
  { to: '/submit', icon: 'add_link', labelKey: 'submit', defaultLabel: 'Submit' },
  { to: '/saved', icon: 'bookmark', labelKey: 'saved', defaultLabel: 'Saved' },
  { to: '/notifications', icon: 'notifications', labelKey: 'notifications', defaultLabel: 'Inbox' },
]

export function LinkAggregatorLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const userRecord = user as Record<string, string | undefined> | null
  const userName = userRecord?.name || userRecord?.email || ''
  const userId = (userRecord && typeof userRecord.id === 'string' ? userRecord.id : '') || 'me'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          'sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-outline-variant/30',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <Link
            to="/feed"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
            aria-label={APP_NAME}
          >
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'bg-gradient-to-br from-primary to-[var(--color-primary-deep)] text-white',
              )}
              aria-hidden="true"
            >
              <span className={'material-symbols-outlined text-lg'}>terrain</span>
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {APP_NAME}
            </span>
          </Link>
        </div>
        <form
          onSubmit={handleSearch}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.roundedFull,
            'flex-1 max-w-xl bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface-container-lowest transition-colors',
          )}
        >
          <span className={'material-symbols-outlined text-base text-on-surface-variant'}>
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'linkAggregatorLayout.searchPlaceholder',
              {},
              { defaultValue: 'Search links, tags, users…' },
            )}
            className={cm.cn(
              cm.sp('py', 2),
              cm.textSize('sm'),
              'flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
            )}
            aria-label={t(
              'linkAggregatorLayout.searchAria',
              { appName: APP_NAME },
              { defaultValue: 'Search {{appName}}' },
            )}
          />
        </form>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <Link
            to="/submit"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary hover:bg-primary-hover transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'}>add_link</span>
            {t('common.submit', {}, { defaultValue: 'Submit' })}
          </Link>
          <Link
            to={`/users/${userId}`}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-secondary/15 text-secondary hover:bg-secondary/25 transition-colors',
            )}
            aria-label={t('nav.profile', {}, { defaultValue: 'Profile' })}
          >
            {(userName || 'A').slice(0, 1).toUpperCase()}
          </Link>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <div className={cm.cn(cm.flex({ gap: 'lg' }), 'flex-1 max-w-7xl w-full mx-auto')}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 6),
            'w-56 shrink-0 sticky top-16 self-start hidden md:flex',
          )}
        >
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('px', 3),
              cm.sp('mb', 1),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('linkAggregatorLayout.sectionFeeds', {}, { defaultValue: 'Feeds' })}
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary',
                )
              }
            >
              <span className={'material-symbols-outlined text-xl'}>{item.icon}</span>
              {t(`linkAggregatorLayout.${item.labelKey}`, {}, { defaultValue: item.defaultLabel })}
            </NavLink>
          ))}
          <hr className={'border-outline-variant/30 my-3'} />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary',
              )
            }
          >
            <span className={'material-symbols-outlined text-xl'}>settings</span>
            {t('linkAggregatorLayout.settings', {}, { defaultValue: 'Settings' })}
          </NavLink>
          <button
            type="button"
            onClick={() => logout()}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl text-on-surface-variant hover:bg-error/5 hover:text-error transition-colors text-left',
            )}
          >
            <span className={'material-symbols-outlined text-xl'}>logout</span>
            {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
          </button>
        </aside>
        <main
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('px', 4),
            cm.sp('py', 6),
            'flex-1 min-w-0 max-w-4xl',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default LinkAggregatorLayout
