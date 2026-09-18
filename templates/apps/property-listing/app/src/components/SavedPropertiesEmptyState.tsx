import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SavedPropertiesEmptyState() {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <section
      className={cm.cn(cm.textCenter, 'py-24 bg-surface-container-low rounded-[2rem]')}
      data-mol-id="empty-state-01"
    >
      <div className={cm.cn(cm.maxW('md'), cm.mxAuto, cm.sp('px', 6))}>
        <div
          className={cm.cn(
            cm.w(24),
            cm.h(24),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.mxAuto,
            cm.sp('mb', 8),
            cm.surface,
            'shadow-sm',
          )}
        >
          <span className={cm.cn('text-5xl', 'material-symbols-outlined text-outline-variant')}>
            favorite
          </span>
        </div>
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'font-headline text-on-surface',
          )}
        >
          {t('saved.emptyTitle', {}, { defaultValue: 'Start saving properties' })}
        </h2>
        <p className={cm.cn(cm.sp('mb', 10), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'saved.emptyDescription',
            {},
            {
              defaultValue:
                'Keep track of the homes you love. Click the heart icon on any listing to save it here for later.',
            },
          )}
        </p>
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('px', 10),
            cm.sp('py', 4),
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            cm.roundedFull,
            'inline-flex bg-gradient-to-br from-primary to-primary-container text-on-primary transition-all duration-200 hover:opacity-90 active:scale-95 shadow-lg shadow-primary/10',
          )}
          style={{ textDecoration: 'none' }}
        >
          {t('saved.browseListings', {}, { defaultValue: 'Browse Properties' })}
        </Link>
      </div>
    </section>
  )
}

export { SavedPropertiesEmptyState }
export default SavedPropertiesEmptyState
