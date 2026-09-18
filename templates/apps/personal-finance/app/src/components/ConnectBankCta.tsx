import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ConnectBankCta() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 8),
        'bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl relative overflow-hidden group',
      )}
      data-mol-id="upgrade-cta"
    >
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.w(40),
          cm.h(40),
          'absolute -right-8 -top-8 bg-surface/10 blur-3xl group-hover:scale-150 transition-transform duration-500',
        )}
      ></div>
      <div className={cm.cn('relative z-10')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-emerald-400 font-label uppercase tracking-widest',
          )}
        >
          {t('connectBankCta.premiumBadge', {}, { defaultValue: 'Premium Feature' })}
        </span>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            'font-headline leading-tight',
          )}
        >
          {t('connectBankCta.headline', {}, { defaultValue: 'Connect Global Institutions' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-emerald-100/60')}>
          {t(
            'connectBankCta.description',
            { bankCount: '15,000+' },
            {
              defaultValue:
                'Automate syncing for {{bankCount}} banks worldwide with 256-bit encryption.',
            },
          )}
        </p>
      </div>
      <button
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 8),
          cm.sp('py', 4),
          'relative z-10 w-full bg-surface text-success rounded-xl hover:bg-success-light transition-colors',
        )}
        data-mol-id="connect-bank-btn"
        onClick={() => navigate('/connect-bank')}
      >
        {t('connectBankCta.ctaButton', {}, { defaultValue: 'Connect New Bank' })}
      </button>
    </div>
  )
}

export default ConnectBankCta
export { ConnectBankCta }
