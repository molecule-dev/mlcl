import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function WonKpiCard({ value = '$340K' }: { value?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', justify: 'between' }),
        'bg-surface-container-lowest rounded-3xl border border-border border-t-4 border-t-green-500 border-l-0 shadow-sm',
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'start' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-on-surface-variant tracking-wider uppercase',
          )}
        >
          {t('wonKpiCard.label', {}, { defaultValue: 'Won' })}
        </span>
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-success')}>
          payments
        </span>
      </div>
      <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline' }), 'gap-2')}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-black text-success')}>{value}</span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t('wonKpiCard.period', {}, { defaultValue: 'this month' })}
        </span>
      </div>
    </div>
  )
}
export { WonKpiCard }
