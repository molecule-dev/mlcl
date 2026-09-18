import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface TaxSettings {
  automaticTax: boolean
  taxRate: number
  taxRegion: string
}
function AdminTaxSettingsCard({
  tax,
  onChange,
}: {
  tax: TaxSettings
  onChange: (t: TaxSettings) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>
          account_balance_wallet
        </span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('adminTaxSettingsCard.title', {}, { defaultValue: 'Tax Settings' })}
        </h2>
      </div>
      <div className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ direction: 'col' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'adminTaxSettingsCard.automaticTaxLabel',
                {},
                { defaultValue: 'Automatic Tax Calculation' },
              )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'adminTaxSettingsCard.automaticTaxDescription',
                {},
                { defaultValue: 'Calculate taxes based on region' },
              )}
            </span>
          </div>
          <button
            role="switch"
            aria-checked={tax.automaticTax}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="toggle-auto-tax"
            style={{
              backgroundColor: tax.automaticTax
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() => onChange({ ...tax, automaticTax: !tax.automaticTax })}
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: tax.automaticTax ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('adminTaxSettingsCard.taxRateLabel', {}, { defaultValue: 'Tax Rate (%)' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500 tabular-nums',
              )}
              data-mol-id="input-tax-rate"
              type="text"
              value={tax.taxRate}
              onChange={(e) => onChange({ ...tax, taxRate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'block text-foreground-secondary uppercase tracking-wider mb-1.5',
              )}
            >
              {t('adminTaxSettingsCard.taxRegionLabel', {}, { defaultValue: 'Tax Region' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
              )}
              data-mol-id="input-tax-region"
              type="text"
              value={tax.taxRegion}
              onChange={(e) => onChange({ ...tax, taxRegion: e.target.value })}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminTaxSettingsCard
export { AdminTaxSettingsCard }
