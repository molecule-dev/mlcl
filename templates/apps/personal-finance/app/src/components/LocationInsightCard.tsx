import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Props {
  location?: string
}

function LocationInsightCard({ location }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (!location) return null
  const displayLocation = location

  function handleMapClick() {
    const query = encodeURIComponent(displayLocation)
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div
      className={cm.cn(
        cm.h(48),
        'relative rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          cm.w('full'),
          cm.h('full'),
          cm.flex({ align: 'center', justify: 'center' }),
          'bg-gradient-to-br from-primary to-primary-container transition-transform duration-700 group-hover:scale-110',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-white/30')}
          style={{ fontSize: '5rem' }}
        >
          map
        </span>
      </div>
      <div
        className={cm.cn('absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent')}
      ></div>
      <div className={cm.cn('absolute bottom-6 left-6 text-white')}>
        <div
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest opacity-80',
          )}
        >
          {t('locationInsightCard.merchantLocation', {}, { defaultValue: 'Merchant Location' })}
        </div>
        <div className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-headline')}>
          {displayLocation}
        </div>
      </div>
      <div className={cm.cn('absolute bottom-6 right-6')}>
        <button
          type="button"
          aria-label={t('locationInsightCard.openMap', {}, { defaultValue: 'Open map' })}
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.cursorPointer,
            'bg-surface/20 backdrop-blur-md text-white hover:bg-surface hover:text-primary transition-all',
          )}
          onClick={handleMapClick}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="map">
            map
          </span>
        </button>
      </div>
    </div>
  )
}

export default LocationInsightCard
export { LocationInsightCard }
