import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function NetWorthCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'font-headline uppercase tracking-widest text-primary-fixed/80',
          )}
        >
          {t('netWorthCard.title', {}, { defaultValue: 'Total Net Worth' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>
            {t('netWorthCard.total', { amount: '$47,250.00' }, { defaultValue: '{{amount}}' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              trending_up
            </span>
            {t('netWorthCard.change', { amount: '$2,340' }, { defaultValue: '+{{amount}}' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.sp('mt', 12),
          cm.h(24),
          cm.w('full'),
          cm.flex({ align: 'end', gap: 'sm' }),
          'relative z-10',
        )}
      >
        {/* Mock Area Chart Shapes */}
        <div className={cm.cn(cm.h('full'), 'flex-grow opacity-30')}>
          <svg className={cm.cn(cm.w('full'), cm.h('full'), 'preserve-3xl')} viewBox="0 0 400 100">
            <path
              d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z"
              fill="white"
            ></path>
            <path
              d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10"
              fill="none"
              stroke="white"
              strokeWidth="3"
            ></path>
          </svg>
        </div>
      </div>
      {/* Abstract background elements */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
      ></div>
    </div>
  )
}
export { NetWorthCard }
