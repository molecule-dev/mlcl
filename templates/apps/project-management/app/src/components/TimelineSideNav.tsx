import { Link, useNavigate, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function TimelineSideNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.sp('p', 6),
        cm.h('screen'),
        cm.w(72),
        'hidden md:flex fixed left-0 top-0 bg-indigo-50 z-50 transition-all duration-300 ease-out',
      )}
    >
      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'text-indigo-900 tracking-tight',
          )}
        >
          {t('timelineSideNav.title', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-foreground-secondary uppercase tracking-widest',
          )}
        >
          {t('timelineSideNav.subtitle', {}, { defaultValue: 'Project Manager' })}
        </span>
      </div>
      <nav className={cm.flex({ direction: 'col', gap: 'sm' })}>
        {/* Dashboard */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 2),
            'text-foreground-secondary hover:text-indigo-600 rounded-xl transition-colors',
          )}
          to="/"
        >
          <span className={cm.cn('material-symbols-outlined')}>dashboard</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </Link>
        {/* Projects */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 2),
            'text-foreground-secondary hover:text-indigo-600 rounded-xl transition-colors',
          )}
          to="/projects"
        >
          <span className={cm.cn('material-symbols-outlined')}>folder_open</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </span>
        </Link>
        {/* Calendar (ACTIVE) */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('semibold'),
            cm.sp('p', 2),
            'text-indigo-700 rounded-xl bg-indigo-100/50 before:w-1.5 before:h-1.5 before:bg-indigo-600 before:rounded-full',
          )}
          to={projectId ? `/projects/${projectId}/timeline` : '/projects'}
        >
          <span className={cm.cn('material-symbols-outlined')}>calendar_today</span>
          <span className={cm.fontWeight('medium')}>
            {t('timelineSideNav.calendar', {}, { defaultValue: 'Timeline' })}
          </span>
        </Link>
        {/* Settings */}
        <Link
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 2),
            'text-foreground-secondary hover:text-indigo-600 rounded-xl transition-colors',
          )}
          to="/settings"
        >
          <span className={cm.cn('material-symbols-outlined')}>settings</span>
          <span className={cm.fontWeight('medium')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </Link>
      </nav>
      <div className={cm.cn('mt-auto')}>
        <button
          onClick={() => navigate('/dashboard')}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            cm.fontWeight('semibold'),
            cm.w('full'),
            'bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>

          {t('timelineSideNav.newProject', {}, { defaultValue: 'New Project' })}
        </button>
      </div>
    </aside>
  )
}
export { TimelineSideNav }
