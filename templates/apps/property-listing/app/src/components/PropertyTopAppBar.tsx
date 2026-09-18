import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export default function PropertyTopAppBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sold'>('buy')
  const [isFavorite, setIsFavorite] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.w('full'),
        'fixed top-0 z-50 bg-surface/70 backdrop-blur-md shadow-sm dark:shadow-none',
      )}
      data-mol-id="top-app-bar"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'max-w-7xl',
          cm.mxAuto,
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              "text-success tracking-tight font-['Manrope']",
            )}
          >
            {t('propertyTopAppBar.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </span>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <button
              type="button"
              className={cm.cn(
                "font-['Manrope'] tracking-tight hover:text-success dark:hover:text-emerald-300 transition-colors",
                activeTab === 'buy'
                  ? 'text-success border-b-2 border-emerald-900 pb-1'
                  : 'text-foreground-secondary font-medium',
              )}
              onClick={() => setActiveTab('buy')}
            >
              {t('propertyTopAppBar.buy', {}, { defaultValue: 'Buy' })}
            </button>
            <button
              type="button"
              className={cm.cn(
                "font-['Manrope'] tracking-tight hover:text-success dark:hover:text-emerald-300 transition-colors",
                activeTab === 'rent'
                  ? 'text-success border-b-2 border-emerald-900 pb-1'
                  : 'text-foreground-secondary font-medium',
              )}
              onClick={() => setActiveTab('rent')}
            >
              {t('propertyTopAppBar.rent', {}, { defaultValue: 'Rent' })}
            </button>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <button
            aria-label={
              isFavorite
                ? t(
                    'propertyTopAppBar.removeFavorite',
                    {},
                    { defaultValue: 'Remove from favorites' },
                  )
                : t('propertyTopAppBar.addFavorite', {}, { defaultValue: 'Save to favorites' })
            }
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-secondary hover:text-success transition-colors',
            )}
            onClick={() => setIsFavorite((v) => !v)}
          >
            <span className={cm.cn('material-symbols-outlined')}>
              {isFavorite ? 'favorite' : 'favorite_border'}
            </span>
          </button>
          <button
            aria-label={t('propertyTopAppBar.share', {}, { defaultValue: 'Share property' })}
            className={cm.cn(
              cm.sp('p', 2),
              'text-foreground-secondary hover:text-success transition-colors',
            )}
            onClick={() => navigator.share?.({ url: window.location.href }).catch(() => {})}
          >
            <span className={cm.cn('material-symbols-outlined')}>share</span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.cursorPointer,
              'bg-border overflow-hidden',
            )}
            onClick={() => navigate('/saved')}
          >
            <img
              alt={t('propertyTopAppBar.userProfileAlt', {}, { defaultValue: 'User profile' })}
              data-alt="professional headshot of a smiling young male executive with clean haircut in a soft-lit office environment"
              src="https://picsum.photos/seed/PropertyTopAppBar-1/1200/800"
            />
          </button>
        </div>
      </div>
    </header>
  )
}
export { PropertyTopAppBar }
