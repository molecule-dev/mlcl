import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function OrDivider() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mt', 8), cm.sp('mb', 6), cm.w('full'), 'relative')}>
      <div aria-hidden="true" className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}>
        <div className={cm.cn(cm.w('full'), 'border-t border-outline-variant/30')}></div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'center' }),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'relative',
        )}
      >
        <span
          className={cm.cn(
            cm.sp('px', 4),
            cm.roundedFull,
            cm.textSize('xs'),
            'bg-surface text-on-surface-variant shadow-sm',
          )}
        >
          {t('orDivider.continueWith', {}, { defaultValue: 'or continue with' })}
        </span>
      </div>
    </div>
  )
}

export default OrDivider
export { OrDivider }
