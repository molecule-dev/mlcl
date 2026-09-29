/**
 * LinkAggregatorLayout — authed page shell, composed from the shared
 * `ResponsiveAppShell` (the shell owns the breakpoint split, the drawer open
 * state, the APG dialog contract, and auto-close-on-navigation).
 *
 * Desktop (≥768px): a 240px left rail (`sidebarWidth="md"`) — brand row,
 * search, primary nav (Feed / Subs / Submit / Saved / Notifications /
 * Settings), and an identity footer (profile avatar, theme toggle, user
 * menu, sign out) — beside a centered editorial column pages fill via
 * `<Outlet />`.
 *
 * Mobile (<768px): the shell mounts the drawer instead — a sticky top bar
 * (44px menu trigger + brand + search / Submit shortcuts) opens a
 * full-dialog slide-over with the SAME nav element; only the mounted
 * breakpoint instantiates it.
 *
 * Previously a hand-rolled two-column shell with a mobile chip nav —
 * migrated to the shared shell family (fleet component-migration loop).
 */
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
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

  // Brand row — leads the desktop sidebar's nav children and the drawer's
  // header slot (the shared Sidebar has no header slot).
  const brandBlock = (
    <Link
      to="/feed"
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}
      aria-label={APP_NAME}
    >
      <BrandWordmark as="span" />
    </Link>
  )

  // Search — desktop rides the sidebar (the shared TopBar is mobile-only, so
  // the old inline header field has no desktop home there); mobile keeps the
  // /search icon link in the top bar's actions.
  const searchForm = (
    <form
      onSubmit={handleSearch}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 4),
        cm.roundedFull,
        'min-w-0 bg-surface-container-low border border-transparent focus-within:border-primary focus-within:bg-surface-container-lowest transition-colors',
      )}
    >
      <span className={'material-symbols-outlined text-base text-on-surface-variant'}>search</span>
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
          'flex-1 min-w-0 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant',
        )}
        aria-label={t(
          'linkAggregatorLayout.searchAria',
          { appName: APP_NAME },
          { defaultValue: 'Search {{appName}}' },
        )}
      />
    </form>
  )

  // ONE nav element for both breakpoints — the Sidebar and the Drawer receive
  // the same element and only the mounted breakpoint instantiates it; the
  // shell closes the drawer on navigation, so links carry no onClick close.
  // NavLink renders `aria-current="page"` on the active destination.
  const navList = (
    <>
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
    </>
  )

  // Identity + sign out — the footer of both the desktop sidebar and the
  // drawer (the shell provides the border + padding row).
  const userFooter = (
    <>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
        <Link
          to={`/users/${userId}`}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
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
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile top bar (<768px) — the shell renders the 44px menu trigger
          itself; search + Submit ride the actions slot. Desktop has no top
          bar: brand + search + identity live in the sidebar. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={brandBlock}
        actions={
          <>
            {/* Mobile search — collapses to an icon link on the small top bar. */}
            <Link
              to="/search"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors',
              )}
              aria-label={t(
                'linkAggregatorLayout.searchAria',
                { appName: APP_NAME },
                { defaultValue: 'Search {{appName}}' },
              )}
            >
              <span className={'material-symbols-outlined text-xl'}>search</span>
            </Link>
            <Link
              to="/submit"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                'sm:px-4',
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'bg-primary text-on-primary hover:bg-primary-hover transition-colors',
              )}
            >
              <span className={'material-symbols-outlined text-base'}>add_link</span>
              <span className={'hidden sm:inline'}>
                {t('common.submit', {}, { defaultValue: 'Submit' })}
              </span>
            </Link>
            <ThemeToggle />
            <UserMenu />
          </>
        }
      />

      {/* Desktop rail (≥768px) — brand + search lead the nav children (the
          shared Sidebar has no header slot). */}
      <ResponsiveAppShell.Sidebar
        className={cm.sp('p', 5)}
        footer={userFooter}
        navLabel={t('linkAggregatorLayout.mobileNav', {}, { defaultValue: 'Primary' })}
      >
        {brandBlock}
        <div className={cm.sp('mt', 2)}>{searchForm}</div>
        {navList}
      </ResponsiveAppShell.Sidebar>

      {/* Mobile drawer (<768px) — same nav element, full dialog contract
          (focus trap, Escape/backdrop close, body-scroll lock). */}
      <ResponsiveAppShell.Drawer
        className={cm.cn('h-full', cm.sp('p', 5))}
        header={brandBlock}
        footer={userFooter}
        navLabel={t('linkAggregatorLayout.mobileNav', {}, { defaultValue: 'Primary' })}
      >
        {navList}
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('px', 4),
          cm.sp('py', 6),
          'max-w-4xl',
        )}
      >
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default LinkAggregatorLayout
