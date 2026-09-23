import { useState } from 'react'
import { Link, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { useWeightPreference } from '../lib/weight.js'
import { ForjaMobileNav } from './ForjaMobileNav.js'
import { ForjaSidebar } from './ForjaSidebar.js'

/**
 * Layout wrapper for Forja's signed-in routes.
 *
 * Desktop (≥768px): dark accent sidebar on the left and an offset main
 * canvas on the right (Outlet). Pages render their own ForjaTopBar inside
 * the canvas so each screen controls its own title and actions.
 *
 * Mobile (<768px): the sidebar is hidden, so the shell renders a sticky
 * top bar (hamburger + wordmark) and a slide-in drawer (ForjaMobileNav) —
 * without them a phone would have no navigation at all.
 *
 * Translated from calorie-counter's NoshAppShell.tsx.
 */
export function ForjaAppShell() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [navOpen, setNavOpen] = useState(false)
  // Load the weight-unit preference once for the whole signed-in tree; this
  // re-renders the pages when it resolves so kg/lbs displays pick it up.
  useWeightPreference()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <ForjaSidebar />
      {/* Sticky mobile top bar — the drawer trigger for <768px. */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          'sticky top-0 z-30 h-14 md:hidden bg-accent text-white items-center shadow-sm',
        )}
      >
        <button
          type="button"
          data-mol-id="mobile-nav-open"
          onClick={() => setNavOpen(true)}
          aria-label={t('nav.openMenu', {}, { defaultValue: 'Open navigation' })}
          aria-expanded={navOpen}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            '-ml-2 w-11 h-11 rounded-full text-white/90 hover:bg-surface/5',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
            menu
          </span>
        </button>
        <Link to="/dashboard" className={cm.cn('text-xl font-black text-primary tracking-tight')}>
          {APP_NAME}
        </Link>
      </header>
      <ForjaMobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 4),
          'md:ml-[260px] md:p-8 min-h-screen tabular-nums max-w-[1200px]',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
