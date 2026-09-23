import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { MobileNav } from './MobileNav.js'

function DiscussionsSideNavBar({ onNewThread }: { onNewThread?: () => void } = {}) {
  const cm = getClassMap()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const active = {
    dashboard: pathname === '/' || pathname === '/dashboard',
    myCourses: pathname === '/courses' || pathname.startsWith('/course/'),
    assignments: pathname.startsWith('/assignments'),
    discussions: pathname.startsWith('/discussions'),
    gradebook: pathname.startsWith('/gradebook'),
    settings: pathname.startsWith('/settings'),
  }
  const navInactive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'text-foreground-secondary hover:text-foreground hover:bg-border/50 transition-colors duration-200',
  )
  const navActive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('semibold'),
    'text-violet-700 dark:text-violet-400 bg-surface rounded-lg shadow-sm scale-95 duration-150',
  )
  return (
    <>
      {/* Mobile chrome (below md): sticky top bar + drawer; the drawer also
          carries the New-thread action that otherwise lives only here. */}
      <MobileNav
        action={
          onNewThread
            ? {
                label: t('discussionsSideNavBar.newThread', {}, { defaultValue: 'New Thread' }),
                icon: 'edit',
                onClick: onNewThread,
              }
            : undefined
        }
      />
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 6),
          'w-[260px] shrink-0 bg-surface-secondary border-r-0 hidden md:flex',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.sp('mb', 10))}>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-violet-700 dark:text-violet-400',
            )}
          >
            {t(
              'discussionsSideNavBar.appName',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </span>
        </div>
        <nav className={cm.cn(cm.flex1, cm.stack(1))}>
          {/* Dashboard */}
          <Link className={active.dashboard ? navActive : navInactive} to="/dashboard">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="dashboard"
              style={active.dashboard ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              dashboard
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.dashboard ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </Link>
          {/* Lessons */}
          <Link className={active.myCourses ? navActive : navInactive} to="/courses">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="menu_book"
              style={active.myCourses ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              menu_book
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.myCourses ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('discussionsSideNavBar.myCourses', {}, { defaultValue: 'My Courses' })}
            </span>
          </Link>
          {/* Assignments */}
          <Link className={active.assignments ? navActive : navInactive} to="/assignments">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="assignment"
              style={active.assignments ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              assignment
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.assignments ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('nav.assignments', {}, { defaultValue: 'Assignments' })}
            </span>
          </Link>
          {/* Discussions */}
          <Link className={active.discussions ? navActive : navInactive} to="/discussions">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="forum"
              style={active.discussions ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              forum
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.discussions ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('discussionsSideNavBar.discussions', {}, { defaultValue: 'Discussions' })}
            </span>
          </Link>
          {/* Gradebook */}
          <Link className={active.gradebook ? navActive : navInactive} to="/gradebook">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="grade"
              style={active.gradebook ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              grade
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.gradebook ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('discussionsSideNavBar.gradebook', {}, { defaultValue: 'Gradebook' })}
            </span>
          </Link>
          {/* Settings */}
          <Link className={active.settings ? navActive : navInactive} to="/settings">
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="settings"
              style={active.settings ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              settings
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                active.settings ? undefined : cm.fontWeight('medium'),
                'font-sans antialiased tracking-tight',
              )}
            >
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
          </Link>
        </nav>
        {onNewThread ? (
          <div className={cm.cn(cm.sp('pt', 6), 'mt-auto')}>
            <button
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2 }),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.w('full'),
                'bg-primary hover:bg-primary-container text-on-primary rounded-xl shadow-lg shadow-primary/20 transition-all',
              )}
              data-mol-id="btn-new-thread"
              onClick={onNewThread}
            >
              <span
                className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
                data-icon="add"
              >
                add
              </span>
              {t('discussionsSideNavBar.newThread', {}, { defaultValue: 'New Thread' })}
            </button>
          </div>
        ) : null}
      </aside>
    </>
  )
}

export default DiscussionsSideNavBar
export { DiscussionsSideNavBar }
