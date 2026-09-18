import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function LiveSyncIndicator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        cm.roundedFull,
        'fixed bottom-8 right-8 bg-surface shadow-lg z-50',
      )}
    >
      <span className={cm.cn(cm.flex(), cm.h(2), cm.w(2), 'relative')}>
        <span
          className={cm.cn(
            cm.roundedFull,
            cm.h('full'),
            cm.w('full'),
            'animate-ping absolute inline-flex bg-primary opacity-75',
          )}
        ></span>
        <span
          className={cm.cn(cm.roundedFull, cm.h(2), cm.w(2), 'relative inline-flex bg-primary')}
        ></span>
      </span>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest text-success',
        )}
      >
        {t('liveSyncIndicator.label', {}, { defaultValue: 'Live Ledger Sync' })}
      </span>
    </div>
  )
}

export default LiveSyncIndicator
export { LiveSyncIndicator }
