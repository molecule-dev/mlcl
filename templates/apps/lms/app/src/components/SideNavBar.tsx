import { Link, useLocation } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { planLabel } from '../lib/planLabel.js'
import { useDashboardStats } from '../lib/useDashboardStats.js'

export function SideNavBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { pathname } = useLocation()
  const { user } = useAuth<{ name?: string; email?: string; id?: string; planKey?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('sideNavBar.guestUserName', {}, { defaultValue: 'Student' })
  const avatarSeed = user?.id || user?.email || 'student'
  const userPlanLabel = planLabel(user?.planKey)
  const { stats } = useDashboardStats()
  const totalLessons = stats?.totalLessons ?? 0
  const completedLessons = stats?.completedLessons ?? 0
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

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
    'text-violet-700 dark:text-violet-400 bg-surface rounded-lg shadow-sm transition-all scale-[0.98]',
  )

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        'fixed inset-y-0 left-0 z-30 w-[260px] overflow-y-auto bg-surface-secondary border-r border-border/70',
      )}
    >
      <div
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 10),
          'text-primary dark:text-[#a78bfa]',
        )}
      >
        {t('sideNavBar.brandName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={active.dashboard ? navActive : navInactive}
          data-mol-id="nav-dashboard"
          to="/dashboard"
        >
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
        <Link
          className={active.myCourses ? navActive : navInactive}
          data-mol-id="nav-my-courses"
          to="/courses"
        >
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
            {t('sideNavBar.myCourses', {}, { defaultValue: 'My Courses' })}
          </span>
        </Link>
        <Link
          className={active.assignments ? navActive : navInactive}
          data-mol-id="nav-assignments"
          to="/assignments"
        >
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
            {t('sideNavBar.assignments', {}, { defaultValue: 'Assignments' })}
          </span>
        </Link>
        <Link
          className={active.discussions ? navActive : navInactive}
          data-mol-id="nav-discussions"
          to="/discussions"
        >
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
            {t('sideNavBar.discussions', {}, { defaultValue: 'Discussions' })}
          </span>
        </Link>
        <Link
          className={active.gradebook ? navActive : navInactive}
          data-mol-id="nav-gradebook"
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
            )}
          >
            {t('sideNavBar.gradebook', {}, { defaultValue: 'Gradebook' })}
          </span>
        </Link>
        <button
          type="button"
          disabled
          title={t(
            'sideNavBar.calendarUnavailable',
            {},
            { defaultValue: 'Calendar integration is coming soon' },
          )}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.w('full'),
            'text-foreground-tertiary cursor-not-allowed opacity-70 text-left',
          )}
          data-mol-id="nav-calendar"
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="calendar_today">
            calendar_today
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('sideNavBar.calendar', {}, { defaultValue: 'Calendar' })}
          </span>
        </button>
        <Link
          className={active.settings ? navActive : navInactive}
          data-mol-id="nav-settings"
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
              cm.textSize('sm'),
              active.settings ? undefined : cm.fontWeight('medium'),
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }), cm.sp('pt', 6), 'mt-auto')}>
        <div
          className={cm.cn(cm.sp('p', 4), 'bg-surface rounded-xl shadow-sm')}
          data-mol-id="sidebar-progress"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-foreground-secondary uppercase tracking-wider',
              )}
            >
              {t('sideNavBar.overallProgress', {}, { defaultValue: 'Overall Progress' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-primary dark:text-primary-container',
              )}
            >
              {t(
                'sideNavBar.completionPercent',
                { percent: progressPercent },
                { defaultValue: '{{percent}}%' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.roundedFull,
              'bg-surface-secondary h-1.5 overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-primary-container')}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('px', 2))}
          data-mol-id="sidebar-user-card"
        >
          <img
            alt={t('sideNavBar.userAvatarAlt', { name: userName }, { defaultValue: '{{name}}' })}
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
            src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
          />
          <div className={cm.flex({ direction: 'col' })}>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
              data-mol-id="sidebar-user-name"
            >
              {userName}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t('sideNavBar.userPlan', { plan: userPlanLabel }, { defaultValue: '{{plan}} Plan' })}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
export default SideNavBar
