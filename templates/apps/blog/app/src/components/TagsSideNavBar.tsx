import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'
export default function TagsSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 6),
        cm.h('screen'),
        'w-[240px]',
        'fixed left-0 top-0 bg-surface-container-low overflow-y-auto z-50',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 10), cm.flex({ align: 'center', gap: 'sm' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(8),
            cm.h(8),
            'rounded-lg bg-primary-container text-on-primary-container shadow-sm',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            edit_square
          </span>
        </div>
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), 'font-black text-foreground leading-tight')}>
            {t('tagsSideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('tagsSideNavBar.appTagline', {}, { defaultValue: 'Editorial Admin' })}
          </p>
        </div>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/dashboard"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>dashboard</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/posts"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>description</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('tagsSideNavBar.myPosts', {}, { defaultValue: 'My Posts' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/posts/new"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>edit</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('tagsSideNavBar.newPost', {}, { defaultValue: 'New Post' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/analytics"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>insights</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/comments"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>forum</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('tagsSideNavBar.comments', {}, { defaultValue: 'Comments' })}
          </span>
        </SafeLink>
        {/* Active Tab: Tags */}
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 bg-surface-container-lowest text-on-surface transition-all duration-300 rounded-lg shadow-sm',
          )}
          to="/tags"
        >
          <span
            className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            sell
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 text-on-surface-variant hover:bg-border/50 transition-all duration-300 rounded-lg',
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>settings</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'uppercase tracking-wider',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </SafeLink>
      </nav>
      <div className={cm.cn(cm.sp('pt', 4), 'mt-auto border-t border-border')}>
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            cm.w('full'),
            'py-2.5 text-foreground-secondary hover:text-foreground transition-colors rounded-lg',
          )}
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>logout</span>
          {t('tagsSideNavBar.logout', {}, { defaultValue: 'Logout' })}
        </button>
      </div>
    </aside>
  )
}
export { TagsSideNavBar }
