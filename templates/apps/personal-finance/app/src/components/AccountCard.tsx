import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function AccountCard() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
      )}
      data-mol-id="card-checking"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(cm.sp('p', 3), 'bg-success-light text-success rounded-xl')}
          data-mol-id="checking-icon"
        >
          <span className={cm.cn('material-symbols-outlined')}>account_balance</span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'bg-success-light text-success text-[10px] uppercase tracking-wider',
          )}
          data-mol-id="badge-checking"
        >
          {t('accountCard.badge', {}, { defaultValue: 'Bank' })}
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.textSize('lg'),
          'font-headline text-on-surface-variant group-hover:text-primary transition-colors',
        )}
      >
        {t('accountCard.title', {}, { defaultValue: 'Checking' })}
      </h3>
      <p
        className={cm.cn(
          cm.textSize('3xl'),
          cm.sp('mt', 1),
          'font-headline font-extrabold tracking-tight',
        )}
        data-mol-id="val-checking"
      >
        {t('accountCard.balance', { amount: '$12,450.20' }, { defaultValue: '{{amount}}' })}
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
          className={cm.cn(cm.w('full'), cm.h('full'), 'stroke-primary stroke-2 fill-none')}
          preserveAspectRatio="none"
          viewBox="0 0 100 40"
        >
          <path d="M0 35 Q 20 10, 40 25 T 100 5" strokeLinecap="round"></path>
        </svg>
      </div>
      <div className={cm.cn(cm.sp('pt', 4), 'border-t border-surface-container-high')}>
        <p
          className={cm.cn('text-[11px] text-foreground-tertiary uppercase tracking-tighter')}
          data-mol-id="label-checking-last"
        >
          {t('accountCard.lastTransactionLabel', {}, { defaultValue: 'Last Transaction' })}
        </p>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-foreground-secondary mt-0.5',
          )}
          data-mol-id="val-checking-last"
        >
          {t(
            'accountCard.lastTransaction',
            { amount: '-$82.50' },
            { defaultValue: '{{amount}} today' },
          )}
        </p>
      </div>
    </div>
  )
}
export default AccountCard
