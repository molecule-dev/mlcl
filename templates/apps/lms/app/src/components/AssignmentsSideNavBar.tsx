import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { planLabel } from '../lib/planLabel.js'

function AssignmentsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth<{ name?: string; email?: string; id?: string; planKey?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('assignmentsSideNavBar.guestUserName', {}, { defaultValue: 'Student' })
  const avatarSeed = user?.id || user?.email || 'student'
  const userPlanLabel = planLabel(user?.planKey)
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
    'text-violet-700 dark:text-violet-400 bg-surface dark:bg-violet-900/20 rounded-lg shadow-sm scale-95 transition-all duration-150',
  )
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        cm.shrink0,
        'w-[260px] h-screen bg-surface-secondary sticky top-0',
      )}
    >
      {/* Brand Logo */}
      <div className={cm.cn(cm.sp('mb', 10))}>
        <span
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tighter text-violet-700 dark:text-violet-400',
          )}
        >
          {t(
            'assignmentsSideNavBar.brandName',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          )}
        </span>
      </div>
      {/* User Profile Anchor */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          cm.sp('py', 4),
          cm.sp('mb', 8),
          'bg-surface-secondary rounded-xl',
        )}
      >
        <div className={cm.cn('relative')}>
          <img
            alt={t(
              'assignmentsSideNavBar.userAvatarAlt',
              { name: userName },
              { defaultValue: '{{name}}' },
            )}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
          />
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'font-sans antialiased text-foreground tracking-tight',
            )}
            data-mol-id="sidebar-user-name"
          >
            {userName}
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-wider text-foreground-secondary',
            )}
          >
            {t(
              'assignmentsSideNavBar.userPlanLabel',
              { plan: userPlanLabel },
              { defaultValue: '{{plan}} Plan' },
            )}
          </span>
        </div>
      </div>
      {/* Navigation Links */}
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
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        {/* My Courses */}
        <Link className={active.myCourses ? navActive : navInactive} to="/courses">
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="school"
            style={active.myCourses ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            school
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              active.myCourses ? undefined : cm.fontWeight('medium'),
            )}
          >
            {t('assignmentsSideNavBar.navMyCourses', {}, { defaultValue: 'My Courses' })}
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
            )}
          >
            {t('assignmentsSideNavBar.navAssignments', {}, { defaultValue: 'Assignments' })}
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
            )}
          >
            {t('assignmentsSideNavBar.navDiscussions', {}, { defaultValue: 'Discussions' })}
          </span>
        </Link>
        {/* Gradebook */}
        <Link
          className={cm.cn(active.gradebook ? navActive : navInactive, 'rounded-lg group')}
          to="/gradebook"
        >
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
            {t('assignmentsSideNavBar.navGradebook', {}, { defaultValue: 'Gradebook' })}
          </span>
        </Link>
        {/* Notifications */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            'py-2.5 text-foreground-secondary hover:text-foreground hover:bg-border/50 transition-colors duration-200 rounded-lg group',
          )}
          to="/notifications"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
            notifications
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), 'font-sans antialiased tracking-tight')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </span>
        </Link>
        {/* Settings */}
        <Link
          className={cm.cn(
            active.settings ? navActive : navInactive,
            cm.sp('mt', 10),
            'py-2.5 rounded-lg group',
          )}
          to="/settings"
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            data-icon="settings"
            style={active.settings ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            settings
          </span>
          <span
            className={cm.cn(
              active.settings ? undefined : cm.fontWeight('medium'),
              'font-sans antialiased tracking-tight',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
    </aside>
  )
}

export default AssignmentsSideNavBar
export { AssignmentsSideNavBar }
