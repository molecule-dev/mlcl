import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
function SideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const activeClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.flex({ align: 'center', gap: 3 }),
    'rounded-lg border-l-[3px] border-primary text-on-surface font-bold bg-primary/10 scale-98 transition-transform duration-150',
  )
  const inactiveClass = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.flex({ align: 'center', gap: 3 }),
    'rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-colors duration-200',
  )
  const navClass = (path: string) => {
    const prefix = path.split('/:')[0]
    return location.pathname === prefix || location.pathname.startsWith(prefix + '/')
      ? activeClass
      : inactiveClass
  }
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('full'),
        'fixed w-[260px] left-0 top-0 overflow-y-auto bg-surface-container-lowest shadow-[0_12px_40px_rgba(15,15,35,0.06)] z-50',
      )}
    >
      {/* Header */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.flex({ align: 'center', gap: 4 }))}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.shrink0,
            'rounded-xl bg-gradient-to-br from-primary to-primary-container',
          )}
        >
          <span
            className="material-symbols-outlined text-on-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            view_in_ar
          </span>
        </div>
        <div>
          <h1 className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tighter text-on-surface')}>
            {t('sideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'text-foreground-tertiary uppercase tracking-widest',
            )}
          >
            {t('sideNavBar.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
          </p>
        </div>
      </div>
      {/* Navigation Tabs */}
      <nav
        className={cm.cn(
          cm.flex1,
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          cm.flex({ direction: 'col', gap: 1 }),
          "font-['Inter'] tracking-tight",
        )}
      >
        {/* Active Tab: Dashboard */}
        <Link className={navClass('/dashboard')} to="/dashboard">
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dashboard
          </span>
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </Link>
        {/* Inactive Tabs */}
        <Link className={navClass('/models')} to="/models">
          <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </Link>
        <Link className={navClass('/upload')} to="/upload">
          <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
          {t('common.upload', {}, { defaultValue: 'Upload' })}
        </Link>
        {/* Embed is a per-model feature — the real route is /models/:id/embed.
        Send clicks to /models (the Library) so users can pick a model
        first; the active-state check uses '/embed' (never matches today)
        to avoid the prior bug where Embed false-highlighted on every
        /models* page alongside the real Library link. */}
        <Link className={navClass('/embed')} to="/models">
          <span className="material-symbols-outlined text-[20px]">code</span>
          {t('sideNavBar.embed', {}, { defaultValue: 'Embed' })}
        </Link>
        <Link className={navClass('/notifications')} to="/notifications">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </Link>
        <Link className={cm.cn(navClass('/settings'), 'mt-auto', cm.sp('mb', 4))} to="/settings">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </Link>
      </nav>
    </aside>
  )
}

export default SideNavBar
export { SideNavBar }
