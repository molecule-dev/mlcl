import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { deriveInitials } from '../lib/api.js'
import { UserMenu } from './UserMenu.js'

interface MeridianTopBarProps {
  /** Right-side avatar initials override (default: derived from auth user). */
  avatarInitials?: string
  /**
   * When provided (mobile), a hamburger button renders before the brand
   * that opens the mail navigation drawer.
   */
  onMenuClick?: () => void
}

interface AuthUser {
  id?: string
  name?: string | null
  email?: string | null
}

/**
 * In-app sticky top bar — brand wordmark + centered search pill + right
 * actions. Used on every signed-in page (Inbox / Drafts / Starred /
 * ThreadView / Compose / Settings).
 *
 * The search pill is wired via `?search=<query>` on `/inbox`. Submitting
 * navigates to `/inbox?search=<value>`; clearing removes the param. The
 * Inbox page reads the param and asks the API to filter, so the search
 * actually matches what the user types — never a placeholder.
 *
 * The avatar initials default to the signed-in user's initials, derived
 * from `useAuth()`. Callers can pass `avatarInitials` to override.
 */
export function MeridianTopBar({ avatarInitials, onMenuClick }: MeridianTopBarProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user } = useAuth<AuthUser>()
  const initials = avatarInitials ?? deriveInitials(user?.name?.trim() || user?.email || 'M C')

  const initialQuery = params.get('search') ?? ''
  const [query, setQuery] = useState(initialQuery)
  useEffect(() => {
    setQuery(params.get('search') ?? '')
  }, [params])

  const submitSearch = (value: string): void => {
    const trimmed = value.trim()
    const target = trimmed
      ? `/inbox?search=${encodeURIComponent(trimmed)}`
      : location.pathname.startsWith('/inbox')
        ? '/inbox'
        : location.pathname + location.search
    navigate(target)
  }

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 4),
        'sticky top-0 z-40 h-[56px] bg-surface/95 backdrop-blur-md border-b border-outline-variant/40',
      )}
    >
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          data-mol-id="topbar-menu"
          aria-label={t('meridian.topBar.openMenu', {}, { defaultValue: 'Open navigation menu' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 2),
            cm.cursorPointer,
            'w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            menu
          </span>
        </button>
      )}
      <Link
        to="/inbox"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          'min-w-0 sm:min-w-[200px] shrink-0',
        )}
      >
        <span
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-xl bg-gradient-to-br from-primary to-secondary text-white',
          )}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            mail
          </span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'text-primary tracking-tight hidden sm:inline',
          )}
        >
          {t('meridian.topBar.appName', {}, { defaultValue: APP_NAME })}
        </span>
      </Link>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('px', 2),
          'min-w-0 md:px-4 max-w-[640px]',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.w('full'),
            cm.sp('px', 4),
            'h-10 max-w-[520px] bg-surface-container-low rounded-full border border-transparent focus-within:border-primary/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/20 transition-all',
          )}
        >
          <span
            className={cm.cn(cm.sp('mr', 3), 'material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            className={cm.cn(
              cm.flex1,
              cm.sp('p', 0),
              cm.textSize('sm'),
              'bg-transparent border-none outline-none placeholder:text-on-surface-variant focus:ring-0',
            )}
            placeholder={t(
              'meridian.topBar.searchPlaceholder',
              {},
              { defaultValue: 'Search mail' },
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitSearch(query)
              } else if (e.key === 'Escape') {
                setQuery('')
                submitSearch('')
              }
            }}
            onBlur={() => {
              if (query !== initialQuery) submitSearch(query)
            }}
            aria-label={t('meridian.topBar.searchLabel', {}, { defaultValue: 'Search mail' })}
            data-mol-id="topbar-search"
          />
        </div>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'min-w-0 md:min-w-[200px] justify-end shrink-0',
        )}
      >
        <div className="text-on-surface-variant hover:text-on-surface transition-colors">
          <UserMenu />
        </div>
        <Link
          to="/settings"
          aria-label={t('settings.account', {}, { defaultValue: 'Account' })}
          data-mol-id="topbar-avatar"
          className={cm.cn(
            cm.w(9),
            cm.h(9),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('ml', 2),
            cm.cursorPointer,
            'hidden md:inline-flex rounded-full bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 transition-colors',
          )}
        >
          {initials}
        </Link>
      </div>
    </header>
  )
}
