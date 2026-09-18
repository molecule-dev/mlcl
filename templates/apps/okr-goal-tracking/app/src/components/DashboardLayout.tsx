import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AscentSideNav } from './AscentSideNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Dashboard shell — sidebar (260px) + sticky topbar (search + actions) +
 * scrollable content. Used for all auth-gated routes via App.tsx.
 * Translated from project-management/AppLayout.tsx + crm/CrmLayout.tsx;
 * the AscentSideNav handles the persistent left rail. Submitting the
 * topbar search routes to /objectives?q=… (the Objectives page reads ?q).
 */
export function DashboardLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/objectives?q=${encodeURIComponent(q)}` : '/objectives')
  }

  return (
    <div className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-bg-secondary text-on-surface')}>
      <AscentSideNav />
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'min-w-0')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            cm.sp('py', 4),
            'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
          )}
        >
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'max-w-md relative')}
          >
            <span
              aria-hidden
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t(
                'dashboardLayout.searchAria',
                {},
                { defaultValue: 'Search objectives' },
              )}
              placeholder={t(
                'dashboardLayout.searchPlaceholder',
                {},
                { defaultValue: 'Search objectives, KRs, people...' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'pl-10 pr-4 bg-surface-container-low rounded-xl border-none focus:ring-2 focus:ring-primary/30 outline-none transition-all',
              )}
            />
          </form>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.flex1, cm.sp('p', 8), 'overflow-x-hidden')}>
          <div className="max-w-[1360px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
