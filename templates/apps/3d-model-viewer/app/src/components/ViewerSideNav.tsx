import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
export default function ViewerSideNav() {
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [activeNav, setActiveNav] = useState('export')
  const [publishing, setPublishing] = useState(false)
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <nav
      className={cm.cn(
        cm.h('screen'),
        cm.w(64),
        cm.sp('py', 4),
        cm.shrink0,
        'hidden md:flex flex-col docked left-0 bg-surface-container-lowest shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20',
      )}
    >
      {/* Brand / Header */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pb', 8))}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded bg-gradient-to-br from-primary-container to-secondary-container',
            )}
          >
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'material-symbols-outlined text-on-primary-container',
              )}
              data-icon="hexagon"
            >
              hexagon
            </span>
          </div>
          <div>
            <h1
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
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
              {t('viewerSideNav.projectType', {}, { defaultValue: '3D Configurator' })}
            </p>
          </div>
        </div>
      </div>
      {/* CTA */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('mb', 8))}>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.h(10),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', justify: 'center', gap: 2 }),
            'rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container hover:opacity-90 transition-opacity',
          )}
          disabled={publishing || !id}
          onClick={async () => {
            if (!id) return
            setPublishing(true)
            try {
              await http.post(`/api/models/${id}/publish`)
            } finally {
              setPublishing(false)
            }
          }}
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="cloud_upload">
            cloud_upload
          </span>
          {t('viewerSideNav.publishModel', {}, { defaultValue: 'Publish Model' })}
        </button>
      </div>
      {/* Navigation Tabs */}
      <ul
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 1 }),
          cm.sp('px', 3),
          cm.textSize('sm'),
          "flex-grow font-['JetBrains_Mono']",
        )}
      >
        <li>
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground-secondary hover:bg-surface/5 transition-all duration-200',
            )}
            to="/dashboard"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="grid_view">
              grid_view
            </span>
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </Link>
        </li>
        <li>
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${activeNav === 'telemetry' ? 'bg-primary/20 text-on-primary-container border-r-2 border-primary' : 'text-on-surface-variant hover:bg-surface/10'}`,
            )}
            onClick={() => {
              setActiveNav('telemetry')
              navigate('/dashboard')
            }}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="query_stats">
              query_stats
            </span>
            {t('viewerSideNav.telemetry', {}, { defaultValue: 'Telemetry' })}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${activeNav === 'shaders' ? 'bg-primary/20 text-on-primary-container border-r-2 border-primary' : 'text-on-surface-variant hover:bg-surface/10'}`,
            )}
            onClick={() => {
              setActiveNav('shaders')
              navigate('/models')
            }}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="texture">
              texture
            </span>
            {t('viewerSideNav.shaders', {}, { defaultValue: 'Shaders' })}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${activeNav === 'lighting' ? 'bg-primary/20 text-on-primary-container border-r-2 border-primary' : 'text-on-surface-variant hover:bg-surface/10'}`,
            )}
            onClick={() => {
              setActiveNav('lighting')
              navigate('/models')
            }}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="light_mode">
              light_mode
            </span>
            {t('viewerSideNav.lighting', {}, { defaultValue: 'Lighting' })}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${activeNav === 'export' ? 'bg-primary/20 text-on-primary-container border-r-2 border-primary' : 'text-on-surface-variant hover:bg-surface/10'}`,
            )}
            onClick={() => {
              setActiveNav('export')
              navigate('/models')
            }}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="code">
              code
            </span>
            {t('common.export', {}, { defaultValue: 'Export' })}
          </button>
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
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('px', 3),
              'py-2.5 rounded-lg text-foreground-secondary hover:bg-surface/5 transition-all duration-200 text-left',
            )}
            onClick={() => navigate('/about')}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="help_outline">
              help_outline
            </span>
            {t('common.help', {}, { defaultValue: 'Help' })}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={cm.cn(
              cm.w('full'),
              cm.flex({ align: 'center', gap: 3 }),
              cm.sp('px', 3),
              'py-2.5 rounded-lg text-foreground-secondary hover:bg-surface/5 transition-all duration-200 text-left',
            )}
            onClick={() => navigate('/about')}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="menu_book">
              menu_book
            </span>
            {t('viewerSideNav.documentation', {}, { defaultValue: 'Documentation' })}
          </button>
        </li>
      </ul>
    </nav>
  )
}
export { ViewerSideNav }
