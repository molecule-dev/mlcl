import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
interface HeaderProps {
  search: string
  onSearch: (q: string) => void
}
function ModelLibraryHeader({ search, onSearch }: HeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <header
      className={cm.cn(
        cm.h(20),
        cm.sp('px', 8),
        cm.flex({ align: 'center', justify: 'between' }),
        'z-30 sticky top-0 bg-surface/90 backdrop-blur-md',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('medium'),
            'text-on-surface-variant tracking-tight',
          )}
        >
          {t('nav.models', {}, { defaultValue: 'Models' })}
        </span>
        <span
          className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline-variant')}
        >
          chevron_right
        </span>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('semibold'),
            'text-on-surface tracking-tight',
          )}
        >
          {t('header.allModels', {}, { defaultValue: 'All Models' })}
        </span>
      </div>
      <div className={cm.flex({ align: 'center', gap: 6 })}>
        {/* Search Pill */}
        <div className={cm.cn(cm.w(80), 'relative hidden lg:block')}>
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.roundedFull,
              cm.sp('pl', 12),
              cm.sp('pr', 4),
              cm.textSize('sm'),
              'bg-surface-container-high py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 border-none placeholder-on-surface-variant/60 text-on-surface transition-all',
            )}
            aria-label={t('header.searchLabel', {}, { defaultValue: 'Search models' })}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <Link
            className={cm.cn(
              'w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors',
            )}
            to="/notifications"
            aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </Link>
          <Link
            className={cm.cn(
              'w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors',
            )}
            to="/settings"
            aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
          <Link
            className={cm.cn(
              'btn-gradient text-on-primary px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:shadow-[0_8px_20px_rgba(99,14,212,0.25)] active:scale-95 transition-all',
            )}
            to="/upload"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {t('header.uploadModel', {}, { defaultValue: 'Upload Model' })}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default ModelLibraryHeader
export { ModelLibraryHeader }
