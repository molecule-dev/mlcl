import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotsListEmptyStateDivider() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('py', 8), 'relative')}>
      <div aria-hidden="true" className={cm.cn(cm.flex({ align: 'center' }), 'absolute inset-0')}>
        <div className={cm.cn(cm.w('full'), 'border-t border-outline-variant/20')}></div>
      </div>
      <div className={cm.cn(cm.flex({ justify: 'center' }), 'relative')}>
        <span
          className={cm.cn(
            cm.sp('px', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'bg-background text-outline-variant tracking-widest uppercase',
          )}
        >
          {t(
            'botsListEmptyStateDivider.label',
            {},
            { defaultValue: 'Development Preview: Empty State' },
          )}
        </span>
      </div>
    </div>
  )
}

export default BotsListEmptyStateDivider
export { BotsListEmptyStateDivider }
