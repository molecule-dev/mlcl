import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Dropdown language switcher.
 *
 * Reads available locales from the i18n provider, calls setLocale() on change,
 * and persists the selection via the storage bond so the choice survives reload.
 *
 * useTranslation() comes from @molecule/app-react (the framework binding layer).
 * The `locales` array is populated by whatever packageLocales were registered in
 * the app bond (app/bonds/i18n-react-i18next.ts).
 */
function LanguageSwitcher() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const [selected, setSelected] = useState(locale ?? 'en')

  useEffect(() => {
    setSelected(locale ?? 'en')
  }, [locale])

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const code = e.target.value
    setSelected(code)
    setLocale(code)
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
      <label
        htmlFor="language-switcher"
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
      >
        {t('languageSwitcher.label', {}, { defaultValue: 'Language' })}
      </label>
      <select
        id="language-switcher"
        data-mol-id="language-switcher-select"
        value={selected}
        onChange={handleChange}
        aria-label={t('languageSwitcher.ariaLabel', {}, { defaultValue: 'Select language' })}
        className={cm.cn(
          cm.sp('px', 3),
          cm.h(9),
          cm.textSize('sm'),
          'rounded-lg bg-surface-container-low border-none focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer',
        )}
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
  )
}

export default LanguageSwitcher
export { LanguageSwitcher }
