import { Outlet } from 'react-router'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function PublicListingLayout() {
  const { t } = useTranslation()
  const { mode, toggleTheme } = useTheme()
  const cm = getClassMap()

  return (
    <div
      data-mol-id="public-listing-layout"
      className={cm.cn(cm.page, cm.w('full'))}
      style={{
        minHeight: '100vh',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <header data-mol-id="nav-01" className={cm.cn(cm.headerBar, cm.headerFixed)}>
        <div className={cm.cn(cm.headerInner, cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.logoText}>
            {t('common.siteName', {}, { defaultValue: 'PropertyList' })}
          </span>
          <button
            type="button"
            className={cm.cn(cm.button({ variant: 'ghost' }), cm.sp('px', 3), cm.sp('py', 2))}
            onClick={toggleTheme}
            aria-label={t('theme.toggle', {}, { defaultValue: 'Toggle theme' })}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {mode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Main content area - always renders children, never null */}
      <main
        className={cm.cn(
          cm.container({ size: 'full' }),
          cm.sp('pt', 16),
          cm.sp('pb', 12),
          cm.sp('px', 4),
        )}
      >
        <Outlet />
      </main>

      <footer data-mol-id="footer-01" className={cm.footerBar}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('common.siteName', {}, { defaultValue: 'PropertyList' })}
          </span>
        </div>
      </footer>
    </div>
  )
}
