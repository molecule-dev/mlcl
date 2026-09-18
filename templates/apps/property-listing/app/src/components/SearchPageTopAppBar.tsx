import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface SearchPageTopAppBarProps {
  searchQuery?: string
  onSearchChange?: (value: string) => void
}

export default function SearchPageTopAppBar({
  searchQuery = '',
  onSearchChange,
}: SearchPageTopAppBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const isAuthenticated = useIsAuthenticated()
  const { logout } = useAuth()
  const cm = getClassMap()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.h(16),
        'fixed top-0 w-full z-50 bg-surface shadow-sm dark:shadow-none',
      )}
      data-mol-id="nav-main"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
        <span
          className={cm.cn(
            cm.textSize('2xl'),
            'font-extrabold text-success tracking-tighter font-headline',
          )}
        >
          {t('nav.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        {/* Desktop Search Bar Integration */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.roundedFull,
            cm.sp('px', 4),
            cm.w(96),
            'hidden lg:flex bg-surface-container-low py-1.5 group focus-within:ring-1 ring-primary-container transition-all',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-outline')}>search</span>
          <input
            className={cm.cn(
              cm.textSize('sm'),
              cm.w('full'),
              'bg-transparent border-none focus:ring-0 placeholder:text-outline-variant font-body',
            )}
            placeholder={t(
              'search.placeholder',
              {},
              { defaultValue: 'Search by city, neighborhood, or ZIP' },
            )}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      </div>
      <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
          <Link
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'text-emerald-700 dark:text-success border-b-2 border-emerald-700',
            )}
            data-mol-id="nav-search"
            to="/"
          >
            {t('common.search', {}, { defaultValue: 'Search' })}
          </Link>
          <Link
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'text-foreground-secondary hover:bg-surface-secondary dark:hover:bg-emerald-900/50 transition-colors rounded-lg',
            )}
            data-mol-id="nav-saved"
            to="/saved"
          >
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </Link>
          <Link
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'text-foreground-secondary hover:bg-surface-secondary dark:hover:bg-emerald-900/50 transition-colors rounded-lg',
            )}
            data-mol-id="nav-pricing"
            to="/pricing"
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated && (
            <Link
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'text-foreground-secondary hover:bg-surface-secondary dark:hover:bg-emerald-900/50 transition-colors rounded-lg',
              )}
              data-mol-id="nav-dashboard"
              to="/admin/dashboard"
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          )}
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          {isAuthenticated ? (
            <>
              <button
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'hidden md:block bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95',
                )}
                data-mol-id="btn-list-property"
                onClick={() => navigate('/admin/listings/new')}
              >
                {t('action.listProperty', {}, { defaultValue: 'List Property' })}
              </button>
              <div className={cm.cn('relative')} ref={notificationsRef}>
                <button
                  className={cm.cn(
                    cm.sp('p', 2),
                    cm.roundedFull,
                    'text-foreground-secondary hover:bg-surface-secondary',
                  )}
                  data-mol-id="btn-notifications"
                  onClick={() => setNotificationsOpen((v) => !v)}
                >
                  <span className={cm.cn('material-symbols-outlined')}>notifications</span>
                </button>
                {notificationsOpen && (
                  <div
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.sp('p', 4),
                      cm.w(80),
                      'absolute right-0 bg-surface shadow-lg rounded-lg border border-outline-variant z-50',
                    )}
                  >
                    <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
                      {t('notifications.empty', {}, { defaultValue: 'No new notifications' })}
                    </p>
                  </div>
                )}
              </div>
              <div className={cm.cn('relative')} ref={profileRef}>
                <button
                  type="button"
                  className={cm.cn(
                    cm.roundedFull,
                    cm.cursorPointer,
                    cm.w(8),
                    cm.h(8),
                    'overflow-hidden bg-surface-container-highest border border-outline-variant',
                  )}
                  data-mol-id="btn-profile"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-expanded={profileOpen}
                >
                  <img
                    alt={t('user.avatarAlt', {}, { defaultValue: 'User Avatar' })}
                    data-alt="professional portrait of a smiling realtor in a clean white studio setting with soft lighting"
                    src="https://picsum.photos/seed/SearchPageTopAppBar-1/1200/800"
                  />
                </button>
                {profileOpen && (
                  <div
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.sp('py', 2),
                      cm.w(48),
                      'absolute right-0 bg-surface shadow-lg rounded-lg border border-outline-variant z-50',
                    )}
                  >
                    <button
                      onClick={() => {
                        navigate('/saved')
                        setProfileOpen(false)
                      }}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.w('full'),
                        'text-left text-foreground hover:bg-surface-secondary dark:hover:bg-emerald-900',
                      )}
                    >
                      {t('nav.profile', {}, { defaultValue: 'Profile' })}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin/settings')
                        setProfileOpen(false)
                      }}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.w('full'),
                        'text-left text-foreground hover:bg-surface-secondary dark:hover:bg-emerald-900',
                      )}
                    >
                      {t('nav.settings', {}, { defaultValue: 'Settings' })}
                    </button>
                    <hr className={cm.cn(cm.sp('my', 1), 'border-outline-variant')} />
                    <button
                      onClick={async () => {
                        setProfileOpen(false)
                        try {
                          await logout()
                        } finally {
                          navigate('/')
                        }
                      }}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.w('full'),
                        'text-left text-error hover:bg-surface-secondary dark:hover:bg-emerald-900',
                      )}
                    >
                      {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-foreground-secondary hover:bg-surface-secondary dark:hover:bg-emerald-900/50 transition-colors rounded-lg',
                )}
                data-mol-id="nav-login"
                to="/login"
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <button
                type="button"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95',
                )}
                data-mol-id="nav-signup"
                onClick={() => navigate('/signup')}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
export { SearchPageTopAppBar }
