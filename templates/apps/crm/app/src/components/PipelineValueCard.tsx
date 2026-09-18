import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function PipelineValueCard({ value = '$2.4M' }: { value?: string }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl border border-border border-t-4 border-t-secondary border-l-0 shadow-sm',
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
          {t('pipelineValueCard.title', {}, { defaultValue: 'Pipeline Value' })}
        </span>
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-secondary')}>
          trending_up
        </span>
      </div>
      <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline', gap: 'sm' }))}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-black text-on-surface')}>{value}</span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t('pipelineValueCard.currency', {}, { defaultValue: 'USD' })}
        </span>
      </div>
    </div>
  )
}

export default PipelineValueCard
export { PipelineValueCard }
