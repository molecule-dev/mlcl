import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth<{ id?: string; name?: string; email?: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName =
    typeof user?.name === 'string' && user.name.trim().length > 0
      ? user.name
      : t('nav.profile', {}, { defaultValue: 'Profile' })

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/channels?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    setProfileMenuOpen(false)
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  return (
    <header
      data-mol-id="top-nav-bar"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.h(14),
        'sticky top-0 z-40 w-full glass-header shadow-[0_1px_0_0_rgba(0,0,0,0.05)]',
        // <768px the shared shell's drawer + TopBar own navigation; the
        // desktop utility bar would duplicate them and overflow 390px.
        'max-md:hidden',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        <form
          onSubmit={handleSubmitSearch}
          data-mol-id="top-nav-search-form"
          className={cm.cn(cm.flex({ align: 'center' }), 'relative')}
        >
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'material-symbols-outlined absolute left-3 text-on-surface-variant/50',
            )}
          >
            search
          </span>
          <input
            data-mol-id="top-nav-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cm.cn(
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.textSize('sm'),
              cm.w(80),
              'py-1.5 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/30 transition-all',
            )}
            placeholder={t('topNavBar.search', {}, { defaultValue: 'Search messages' })}
            type="text"
          />
        </form>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden lg:flex')}>
          <Link
            data-mol-id="top-nav-link-channels"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('py', 4),
              'text-primary border-b-2 border-primary',
            )}
            to="/"
          >
            {t('topNavBar.threads', {}, { defaultValue: 'Threads' })}
          </Link>
          <Link
            data-mol-id="top-nav-link-mentions"
            to="/notifications"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('py', 4),
              'text-foreground-secondary hover:text-foreground transition-colors',
            )}
          >
            {t('topNavBar.mentions', {}, { defaultValue: 'Mentions' })}
          </Link>
          <Link
            data-mol-id="top-nav-link-pricing"
            to="/pricing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('py', 4),
              'text-foreground-secondary hover:text-foreground transition-colors',
            )}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <Link
          data-mol-id="top-nav-notifications"
          to="/notifications"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-9 w-9 shrink-0 rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary',
          )}
        >
          {/* glyph is a child so the tile keeps its flex display — the icon font
              class sets display:inline-block and overrides utility displays on
              the same element (it loads after the utility stylesheet) */}
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </Link>
        <div
          ref={profileRef}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('pl', 4),
            cm.cursorPointer,
            'relative border-l border-outline-variant/20',
          )}
        >
          <button
            type="button"
            data-mol-id="top-nav-profile"
            onClick={() => setProfileMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'bg-transparent border-0 p-0')}
          >
            <span
              data-mol-id="top-nav-profile-name"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-foreground')}
            >
              {displayName}
            </span>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                'rounded-lg bg-primary text-on-primary text-sm font-bold',
              )}
            >
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </span>
          </button>
          {profileMenuOpen && (
            <div
              role="menu"
              data-mol-id="top-nav-profile-menu"
              className={cm.cn(
                cm.sp('p', 1),
                'absolute right-0 top-full mt-1 w-48 bg-surface border border-outline-variant/20 rounded-lg shadow-lg z-50',
              )}
            >
              <Link
                to="/settings"
                data-mol-id="top-nav-profile-settings"
                onClick={() => setProfileMenuOpen(false)}
                className={cm.cn(
                  'block px-3 py-2 text-sm rounded text-foreground hover:bg-surface-secondary',
                )}
              >
                {t('nav.settings', {}, { defaultValue: 'Settings' })}
              </Link>
              <button
                type="button"
                data-mol-id="top-nav-profile-logout"
                onClick={handleLogout}
                className={cm.cn(
                  'block w-full text-left px-3 py-2 text-sm rounded text-error hover:bg-error-light dark:hover:bg-red-950/30',
                )}
              >
                {t('common.logOut', {}, { defaultValue: 'Log out' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
export { TopNavBar }
