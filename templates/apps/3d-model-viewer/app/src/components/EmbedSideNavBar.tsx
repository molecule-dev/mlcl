import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function EmbedSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const inactiveClass = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    'py-3 rounded-lg text-foreground-secondary hover:bg-surface/5 font-medium transition-all duration-200',
  )
  const activeClass = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    'py-3 rounded-lg bg-primary/20 text-on-primary-container border-r-2 border-primary font-bold transition-all duration-200',
  )

  return (
    <nav
      className={cm.cn(
        cm.sp('py', 4),
        cm.shrink0,
        cm.w(64),
        cm.h('screen'),
        'hidden md:flex flex-col docked left-0 bg-surface-container-lowest shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20',
      )}
    >
      {/* Brand / Header */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pb', 8))}>
        <Link to="/dashboard" className={cm.flex({ align: 'center', gap: 3 })}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              'rounded bg-gradient-to-br from-primary-container to-secondary-container',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'material-symbols-outlined text-on-primary-container',
              )}
              data-icon="view_in_ar"
            >
              view_in_ar
            </span>
          </div>
          <div>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'text-primary tracking-tight leading-tight',
              )}
            >
              {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                "text-foreground-secondary font-['JetBrains_Mono'] uppercase tracking-wider",
              )}
            >
              {t('nav.appSubtitle', {}, { defaultValue: '3D Design Studio' })}
            </p>
          </div>
        </Link>
      </div>
      {/* Navigation — real routes only. The former Telemetry / Shaders /
      Lighting tabs and the "Publish Model" CTA were design placeholders
      (the CTA even posted to an endpoint that doesn't exist). */}
      <ul
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 1 }),
          cm.sp('px', 3),
          cm.textSize('sm'),
          "flex-grow font-['JetBrains_Mono']",
        )}
      >
        <li>
          <Link className={inactiveClass} to="/dashboard">
            <span className="material-symbols-outlined text-[20px]" data-icon="grid_view">
              grid_view
            </span>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
        </li>
        <li>
          <Link className={activeClass} to="/models" aria-current="page">
            <span className="material-symbols-outlined text-[20px]" data-icon="view_in_ar">
              view_in_ar
            </span>
            {t('nav.models', {}, { defaultValue: 'Models' })}
          </Link>
        </li>
        <li>
          <Link className={inactiveClass} to="/upload">
            <span className="material-symbols-outlined text-[20px]" data-icon="cloud_upload">
              cloud_upload
            </span>
            {t('common.upload', {}, { defaultValue: 'Upload' })}
          </Link>
        </li>
      </ul>
      {/* Footer Tabs */}
      <ul
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 1 }),
          cm.sp('px', 3),
          cm.sp('pt', 4),
          cm.textSize('sm'),
          "mt-auto font-['JetBrains_Mono'] border-t border-surface/5",
        )}
      >
        <li>
          <Link className={inactiveClass} to="/about">
            <span className="material-symbols-outlined text-[20px]" data-icon="help_outline">
              help_outline
            </span>
            {t('uploadSideNavBar.support', {}, { defaultValue: 'Support' })}
          </Link>
        </li>
        <li>
          <Link className={inactiveClass} to="/settings">
            <span className="material-symbols-outlined text-[20px]" data-icon="settings">
              settings
            </span>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default EmbedSideNavBar
export { EmbedSideNavBar }
