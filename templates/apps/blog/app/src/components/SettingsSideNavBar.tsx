import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
function SettingsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const isSettings = location.pathname === '/settings'
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        cm.h('screen'),
        'fixed left-0 top-0 z-50 bg-surface-container-low hidden lg:flex w-[240px]',
      )}
    >
      <div className={cm.flex({ direction: 'col' })}>
        <div className={cm.cn(cm.sp('mb', 10))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-serif text-on-surface')}>
            {t(
              'settingsSideNavBar.workspaceTitle',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-sans')}>
            {t('settingsSideNavBar.userRole', {}, { defaultValue: 'Editorial Admin' })}
          </p>
        </div>
        <nav className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(1))}>
          <SafeLink
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'text-on-surface-variant py-2.5 hover:bg-surface-container-lowest transition-all duration-300 rounded-lg',
            )}
            to="/dashboard"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>dashboard</span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans uppercase tracking-wide',
              )}
            >
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </SafeLink>
          <SafeLink
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'text-on-surface-variant py-2.5 hover:bg-surface-container-lowest transition-all duration-300 rounded-lg',
            )}
            to="/posts"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
              auto_stories
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans uppercase tracking-wide',
              )}
            >
              {t('settingsSideNavBar.stories', {}, { defaultValue: 'Stories' })}
            </span>
          </SafeLink>
          <SafeLink
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'text-on-surface-variant py-2.5 hover:bg-surface-container-lowest transition-all duration-300 rounded-lg',
            )}
            to="/analytics"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>bar_chart</span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans uppercase tracking-wide',
              )}
            >
              {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
            </span>
          </SafeLink>
          <SafeLink
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              'text-on-surface-variant py-2.5 hover:bg-surface-container-lowest transition-all duration-300 rounded-lg',
            )}
            to="/tags"
          >
            <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>bookmarks</span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-sans uppercase tracking-wide',
              )}
            >
              {t('nav.library', {}, { defaultValue: 'Library' })}
            </span>
          </SafeLink>
        </nav>
      </div>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('pt', 4),
          'border-t border-outline-variant/50',
        )}
      >
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 hover:bg-surface-container-lowest transition-all duration-300 rounded-lg',
            isSettings ? 'bg-surface-container-lowest text-on-surface' : 'text-on-surface-variant',
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>settings</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-sans uppercase tracking-wide',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </SafeLink>
      </div>
    </aside>
  )
}

export default SettingsSideNavBar
export { SettingsSideNavBar }
