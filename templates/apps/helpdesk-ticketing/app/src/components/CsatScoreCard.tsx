import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CsatScoreCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('csatScoreCard.title', {}, { defaultValue: 'CSAT Score' })}
        </span>
        <span className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}>star_rate</span>
      </div>
      <div className={cm.flex({ direction: 'col', gap: 1 })}>
        <span
          className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tighter text-on-surface')}
        >
          {t('csatScoreCard.score', { score: 4.6 }, { defaultValue: '{{score}}' })}
          <span
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t('csatScoreCard.outOf', { max: 5 }, { defaultValue: '/{{max}}' })}
          </span>
        </span>
        <div className={cm.cn(cm.flex(), 'text-warning')}>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>star_half</span>
        </div>
      </div>
    </div>
  )
}

export default CsatScoreCard
export { CsatScoreCard }
