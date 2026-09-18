import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RegionalPreferencesSectionProps = {
  locale?: string
  onLocaleChange?: (locale: string) => void
}

function RegionalPreferencesSection({
  locale: localeProp,
  onLocaleChange,
}: RegionalPreferencesSectionProps = {}) {
  const cm = getClassMap()
  const { t, locale: bondLocale, setLocale: bondSetLocale, locales } = useTranslation()
  const [currency, setCurrency] = useState('USD ($) - US Dollar')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const locale = localeProp ?? bondLocale
  const setLocale = (code: string) => {
    onLocaleChange?.(code)
    bondSetLocale(code)
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'text-success')}
      >
        {t('regionalPreferences.title', {}, { defaultValue: 'Regional Preferences' })}
      </h2>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 1),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t(
              'regionalPreferences.primaryCurrencyLabel',
              {},
              { defaultValue: 'Primary Currency' },
            )}
          </label>
          <select
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary appearance-none transition-all',
            )}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD ($) - US Dollar">
              {t('regionalPreferences.currencyUsd', {}, { defaultValue: 'USD ($) - US Dollar' })}
            </option>
            <option value="EUR (€) - Euro">
              {t('regionalPreferences.currencyEur', {}, { defaultValue: 'EUR (€) - Euro' })}
            </option>
            <option value="GBP (£) - British Pound">
              {t(
                'regionalPreferences.currencyGbp',
                {},
                { defaultValue: 'GBP (£) - British Pound' },
              )}
            </option>
          </select>
        </div>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 1),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('regionalPreferences.dateFormatLabel', {}, { defaultValue: 'Date Format' })}
          </label>
          <select
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary appearance-none transition-all',
            )}
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option value="MM/DD/YYYY">
              {t('regionalPreferences.dateFormatMdy', {}, { defaultValue: 'MM/DD/YYYY' })}
            </option>
            <option value="DD/MM/YYYY">
              {t('regionalPreferences.dateFormatDmy', {}, { defaultValue: 'DD/MM/YYYY' })}
            </option>
            <option value="YYYY-MM-DD">
              {t('regionalPreferences.dateFormatIso', {}, { defaultValue: 'YYYY-MM-DD' })}
            </option>
          </select>
        </div>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 1),
              'text-[10px] uppercase tracking-widest text-foreground-tertiary',
            )}
          >
            {t('regionalPreferences.systemLanguageLabel', {}, { defaultValue: 'System Language' })}
          </label>
          <select
            data-mol-id="language-picker-select"
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 3),
              cm.sp('px', 4),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary appearance-none transition-all',
            )}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {[...locales]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </section>
  )
}

export default RegionalPreferencesSection
export { RegionalPreferencesSection }
