import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import { UserMenu } from './UserMenu.js'

function TopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Mounted for symmetric lifecycle with the pages that render this bar.
    return () => undefined
  }, [pathname])

  const title =
    pathname === '/issues' || pathname.startsWith('/issues/')
      ? t('sideNavBar.issues', {}, { defaultValue: 'Issues' })
      : pathname === '/subscribers'
        ? t('sideNavBar.subscribers', {}, { defaultValue: 'Subscribers' })
        : pathname === '/settings'
          ? t('nav.settings', {}, { defaultValue: 'Settings' })
          : t('nav.dashboard', {}, { defaultValue: 'Dashboard' })

  const useEditorialHeader = pathname === '/dashboard'

  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 w-[calc(100%-240px)] z-50 bg-surface/80 backdrop-blur-md ml-[240px]',
      )}
    >
      {useEditorialHeader ? (
        <>
          <div
            className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, cm.sp('mr', 6), 'max-w-xl')}
          >
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                "font-['Newsreader'] italic tracking-tight text-on-background",
              )}
            >
              {title}
            </h2>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            <UserMenu dataMolId="topnav-account" />
          </div>
        </>
      ) : (
        <>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                "font-['Newsreader'] italic tracking-tight text-on-background",
              )}
            >
              {title}
            </h2>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <button
              type="button"
              onClick={() => navigate('/issues/new')}
              aria-label={t('issues.newIssue', {}, { defaultValue: 'New issue' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary uppercase tracking-widest hover:bg-primary-container transition-all',
              )}
              data-mol-id="topnav-new-issue"
            >
              {t('issues.newIssue', {}, { defaultValue: 'New issue' })}
            </button>
            <UserMenu dataMolId="topnav-account" />
          </div>
        </>
      )}
      <div
        className={cm.cn(cm.w('full'), 'bg-surface-container h-[1px] absolute bottom-0 left-0')}
      ></div>
    </header>
  )
}
export default TopNavBar
export { TopNavBar }
