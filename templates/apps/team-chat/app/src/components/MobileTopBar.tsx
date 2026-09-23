import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { closeMobileNav, toggleMobileNav, useMobileNavOpen } from '../lib/mobile-nav.js'

/**
 * Sticky top bar shown ONLY below the 768px breakpoint. It carries the
 * hamburger that opens the SideNavBar drawer plus the workspace identity —
 * the fleet-wide "shared sidebar has no mobile collapse" pattern, applied
 * template-locally. On ≥768px this renders nothing and the pages fall back
 * to the fixed 260px sidebar + TopNavBar chrome.
 *
 * Pages include this as the first row of their main column; everything below
 * stacks under it in normal flow.
 */
export default function MobileTopBar() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const navOpen = useMobileNavOpen()

  // Escape closes the drawer (the overlay click closes it too).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileNav()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header
      data-mol-id="mobile-top-bar"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        'sticky top-0 z-30 h-12 w-full shrink-0 items-center border-b border-border bg-surface md:hidden',
      )}
    >
      <button
        type="button"
        data-mol-id="button-mobile-nav"
        aria-label={t('nav.toggleSidebar', {}, { defaultValue: 'Toggle navigation' })}
        aria-expanded={navOpen}
        onClick={toggleMobileNav}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-10 w-10 shrink-0 rounded-md border-none bg-transparent text-foreground hover:bg-border/60',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[22px]')}>menu</span>
      </button>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'truncate text-[15px] tracking-tight text-foreground',
        )}
      >
        {t('nav.appTitle', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
    </header>
  )
}
