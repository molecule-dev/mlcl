import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function DateSeparator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('mb', 8))}>
      <div className={cm.cn(cm.flex1, 'h-px', 'bg-border/50')}></div>
      <span
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('px', 3),
          'text-[11px] text-on-surface-variant uppercase tracking-[0.2em] bg-surface',
        )}
      >
        {t(
          'dateSeparator.date',
          { weekday: 'Tuesday', month: 'May', day: '23rd' },
          { defaultValue: '{{weekday}}, {{month}} {{day}}' },
        )}
      </span>
      <div className={cm.cn(cm.flex1, 'h-px', 'bg-border/50')}></div>
    </div>
  )
}
export { DateSeparator }
