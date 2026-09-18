import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CreditCardCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Link
      to="/accounts"
      className={cm.cn(
        cm.sp('p', 6),
        'block bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group no-underline text-inherit',
      )}
      data-mol-id="card-credit"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.sp('p', 3), 'bg-error-light text-error rounded-xl')}
          data-mol-id="credit-icon"
        >
          <span className={cm.cn('material-symbols-outlined')}>credit_card</span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-error-light text-error text-[10px] uppercase tracking-wider',
          )}
          data-mol-id="badge-credit"
        >
          {t('creditCardCard.badge', {}, { defaultValue: 'Debt' })}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          'font-headline text-on-surface-variant group-hover:text-tertiary transition-colors',
        )}
      >
        {t('creditCardCard.title', {}, { defaultValue: 'Credit Card' })}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mt', 1),
          'font-headline font-extrabold tracking-tight text-tertiary',
        )}
        data-mol-id="val-credit"
      >
        {t('creditCardCard.balance', { amount: '-$3,200.45' }, { defaultValue: '{{amount}}' })}
      </p>
      <div
        className={cm.cn(
          cm.sp('my', 6),
          cm.h(12),
          cm.w('full'),
          'opacity-60 group-hover:opacity-100 transition-opacity',
        )}
      >
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'), 'stroke-tertiary stroke-2 fill-none')}
          preserveAspectRatio="none"
          viewBox="0 0 100 40"
        >
          <path d="M0 10 Q 30 40, 60 15 T 100 35" strokeLinecap="round"></path>
        </svg>
      </div>
      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-surface-container-high')}>
        <p
          className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}
          data-mol-id="label-credit-last"
        >
          {t('creditCardCard.lastTransaction', {}, { defaultValue: 'Last Transaction' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-foreground-secondary mt-0.5',
          )}
          data-mol-id="val-credit-last"
        >
          {t(
            'creditCardCard.recentTransaction',
            {
              amount: '-$42.12',
              relativeTime: t('common.yesterday', {}, { defaultValue: 'yesterday' }),
            },
            { defaultValue: '{{amount}} {{relativeTime}}' },
          )}
        </p>
      </div>
    </Link>
  )
}

export default CreditCardCard
export { CreditCardCard }
