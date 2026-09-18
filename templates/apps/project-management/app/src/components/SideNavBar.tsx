import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
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
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 8),
        cm.sp('px', 4),
        cm.h('screen'),
        "w-[280px] fixed left-0 top-0 bg-surface-container-low font-['Inter'] antialiased tracking-tight z-50",
      )}
    >
      <div className={cm.cn(cm.sp('mb', 10), cm.sp('px', 4))}>
        <h1
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            'tracking-tighter text-on-background',
          )}
        >
          {t('sideNav.productName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.sp('mt', 1),
            'text-on-surface-variant uppercase tracking-widest',
          )}
        >
          {t('sideNav.tagline', {}, { defaultValue: 'Project Manager' })}
        </p>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200 group',
          )}
          to="/"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>dashboard</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200 group',
          )}
          to="/my-tasks"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
            assignment_turned_in
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('sideNav.myTasks', {}, { defaultValue: 'My Tasks' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200 group',
          )}
          to="/calendar"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
            calendar_today
          </span>
          <span className={cm.fontWeight('medium')}>
            {t('sideNav.calendar', {}, { defaultValue: 'Calendar' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200 group',
          )}
          to="/projects"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>folder</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </span>
        </Link>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            "text-primary relative after:content-[''] after:absolute after:right-4 after:w-2 after:h-2 after:bg-primary after:rounded-full",
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>settings</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn(cm.sp('pt', 4), cm.stack(1), 'mt-auto border-t-0')}>
        <button
          onClick={() => __navigate('/dashboard')}
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.sp('mb', 6),
            'indigo-gradient text-on-primary rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-transform',
          )}
        >
          {t('sideNav.newProject', {}, { defaultValue: 'New Project' })}
        </button>
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200',
          )}
          to="/help"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>help</span>
          <span className={cm.fontWeight('medium')}>
            {t('common.help', {}, { defaultValue: 'Help' })}
          </span>
        </Link>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'text-on-surface-variant hover:bg-background/50 rounded-lg transition-all duration-200',
          )}
          onClick={handleLogout}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>logout</span>
          <span className={cm.fontWeight('medium')}>
            {t('common.logout', {}, { defaultValue: 'Logout' })}
          </span>
        </button>
      </div>
    </aside>
  )
}
export default SideNavBar
