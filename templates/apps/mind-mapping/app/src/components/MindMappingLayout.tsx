import type { ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DendriteSideNav } from './DendriteSideNav.js'
import { UserMenu } from './UserMenu.js'

/**
 * Shell for all authenticated Dendrite screens — DendriteSideNav on the left,
 * sticky brand strip with search + UserMenu on top, scrollable canvas main.
 *
 * Translated from project-management's Dashboard top-level shell layout.
 */
export interface MindMappingLayoutProps {
  children?: ReactNode
}

export function MindMappingLayout({ children }: MindMappingLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-surface text-on-surface antialiased')}
    >
      <DendriteSideNav />
      <main className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0 overflow-y-auto')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            cm.sp('py', 4),
            "sticky top-0 z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30 font-['Inter']",
          )}
        >
          <div className={cm.cn(cm.flex1, 'max-w-2xl')}>
            <div className={cm.cn(cm.w('full'), 'relative')}>
              <span
                className={cm.cn(
                  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60',
                )}
              >
                search
              </span>
              <input
                type="search"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('pl', 10),
                  cm.sp('pr', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/30 outline-none transition-all',
                )}
                placeholder={t(
                  'layout.searchPlaceholder',
                  {},
                  { defaultValue: 'Search maps, templates, or nodes…' },
                )}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
              )}
              aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            >
              <span className={cm.cn('material-symbols-outlined')}>notifications</span>
            </button>
            <UserMenu />
          </div>
        </header>
        <div
          className={cm.cn(cm.flex1, cm.sp('p', 8), cm.stack(8), 'max-w-[1440px] w-full mx-auto')}
        >
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  )
}

export default MindMappingLayout
