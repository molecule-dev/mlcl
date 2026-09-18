import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface MortgageResult {
  monthly_payment: number
  principal_and_interest: number
  property_tax: number
  insurance: number
}
interface MortgageInputs {
  down_payment_percent: number
  interest_rate: number
  loan_term_years: number
}
interface MortgageProps {
  mortgage?: MortgageResult | null
  mortgageInputs?: MortgageInputs
  onInputChange?: (v: MortgageInputs) => void
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}
export default function PropertyMortgageCalculator({
  mortgage,
  mortgageInputs,
  onInputChange,
}: MortgageProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showCustomize, setShowCustomize] = useState(false)
  const monthly = mortgage?.monthly_payment ?? 2480
  const pi = mortgage?.principal_and_interest ?? 1850
  const tax = mortgage?.property_tax ?? 420
  const ins = mortgage?.insurance ?? 210
  const piPct = Math.round((pi / monthly) * 100)
  return (
    <div
      className={cm.cn(cm.surface, cm.sp('p', 6), 'rounded-3xl border border-outline-variant/20')}
    >
      <h3 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-on-surface')}>
        {t(
          'propertyMortgageCalculator.estimatedPayment',
          {},
          { defaultValue: 'Estimated Payment' },
        )}
      </h3>
      <div
        className={cm.cn(
          cm.textSize('3xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'text-on-surface',
        )}
      >
        {fmtUSD(monthly)}
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('propertyMortgageCalculator.perMonth', {}, { defaultValue: ' /mo' })}
        </span>
      </div>
      <div className={cm.stack(3)}>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}>
          <span className={cm.cn('text-on-surface-variant')}>
            {t(
              'propertyMortgageCalculator.principalAndInterest',
              {},
              { defaultValue: 'Principal & Interest' },
            )}
          </span>
          <span className={cm.fontWeight('semibold')}>{fmtUSD(pi)}</span>
        </div>
        <div
          className={cm.cn(
            cm.w('full'),
            cm.h(1),
            cm.roundedFull,
            'bg-surface-container-highest overflow-hidden',
          )}
        >
          <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: `${piPct}%` }}></div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('propertyMortgageCalculator.propertyTaxes', {}, { defaultValue: 'Property Taxes' })}
          </span>
          <span className={cm.fontWeight('semibold')}>{fmtUSD(tax)}</span>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}>
          <span className={cm.cn('text-on-surface-variant')}>
            {t('propertyMortgageCalculator.homeInsurance', {}, { defaultValue: 'Home Insurance' })}
          </span>
          <span className={cm.fontWeight('semibold')}>{fmtUSD(ins)}</span>
        </div>
      </div>
      {showCustomize && onInputChange && mortgageInputs && (
        <div
          className={cm.cn(
            cm.sp('mt', 4),
            cm.stack(3),
            cm.sp('pt', 4),
            'border-t border-outline-variant/20',
          )}
        >
          <div>
            <label className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'propertyMortgageCalculator.downPaymentLabel',
                { percent: mortgageInputs.down_payment_percent },
                { defaultValue: 'Down Payment ({{percent}}%)' },
              )}
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={mortgageInputs.down_payment_percent}
              onChange={(e) =>
                onInputChange({ ...mortgageInputs, down_payment_percent: Number(e.target.value) })
              }
              className={cm.cn(cm.w('full'), 'accent-primary')}
              aria-label={t(
                'propertyMortgageCalculator.downPaymentAriaLabel',
                {},
                { defaultValue: 'Down payment' },
              )}
            />
          </div>
          <div>
            <label className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'propertyMortgageCalculator.interestRateLabel',
                { rate: mortgageInputs.interest_rate },
                { defaultValue: 'Interest Rate ({{rate}}%)' },
              )}
            </label>
            <input
              type="range"
              min={2}
              max={12}
              step={0.1}
              value={mortgageInputs.interest_rate}
              onChange={(e) =>
                onInputChange({ ...mortgageInputs, interest_rate: Number(e.target.value) })
              }
              className={cm.cn(cm.w('full'), 'accent-primary')}
              aria-label={t(
                'propertyMortgageCalculator.interestRateAriaLabel',
                {},
                { defaultValue: 'Interest rate' },
              )}
            />
          </div>
          <div>
            <label className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'propertyMortgageCalculator.loanTermLabel',
                { years: mortgageInputs.loan_term_years },
                { defaultValue: 'Loan Term ({{years}} yrs)' },
              )}
            </label>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={mortgageInputs.loan_term_years}
              onChange={(e) =>
                onInputChange({ ...mortgageInputs, loan_term_years: Number(e.target.value) })
              }
              className={cm.cn(cm.w('full'), 'accent-primary')}
              aria-label={t(
                'propertyMortgageCalculator.loanTermAriaLabel',
                {},
                { defaultValue: 'Loan term' },
              )}
            />
          </div>
        </div>
      )}
      <button
        onClick={() => setShowCustomize((s) => !s)}
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 6),
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
          cm.textPrimary,
          'hover:underline',
        )}
      >
        {showCustomize
          ? t('propertyMortgageCalculator.hideDetails', {}, { defaultValue: 'Hide details' })
          : t(
              'propertyMortgageCalculator.customizeDetails',
              {},
              { defaultValue: 'Customize details' },
            )}
        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
          {showCustomize ? 'expand_less' : 'chevron_right'}
        </span>
      </button>
    </div>
  )
}
export { PropertyMortgageCalculator }
