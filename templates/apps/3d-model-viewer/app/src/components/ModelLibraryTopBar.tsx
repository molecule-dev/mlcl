import { useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function ModelLibraryTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
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
            cm.fontWeight('medium'),
            cm.textSize('lg'),
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
            cm.fontWeight('semibold'),
            cm.textSize('lg'),
            'text-on-surface tracking-tight',
          )}
        >
          {t('modelLibraryTopBar.pageTitle', {}, { defaultValue: 'All Models' })}
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
            aria-label={t('modelLibraryTopBar.searchLabel', {}, { defaultValue: 'Search models' })}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <Link
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors',
            )}
            to="/notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </Link>
          <Link
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors',
            )}
            to="/settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
          <Link
            className={cm.cn(
              cm.sp('px', 5),
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 2 }),
              'btn-gradient text-on-primary py-2.5 rounded-lg hover:shadow-[0_8px_20px_rgba(99,14,212,0.25)] active:scale-95 transition-all',
            )}
            to="/upload"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            {t('modelLibraryTopBar.uploadButton', {}, { defaultValue: 'Upload Model' })}
          </Link>
          <Link to="/settings" className={cm.cn(cm.roundedFull, cm.shrink0, 'block')}>
            <img
              alt={t('modelLibraryTopBar.userAvatarAlt', {}, { defaultValue: 'User Profile' })}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                'border border-outline-variant/30 object-cover hover:opacity-90 transition-opacity',
              )}
              data-alt="Portrait of a young woman with natural makeup, soft lighting, neutral background, professional headshot style"
              src="https://picsum.photos/seed/ModelLibraryTopBar-1/1200/800"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default ModelLibraryTopBar
export { ModelLibraryTopBar }
