import { useEffect, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AppearanceSettingsSection() {
  const cm = getClassMap()
  const { mode, setTheme } = useTheme()
  const { t, locale, setLocale, locales } = useTranslation()
  const [language, setLanguage] = useState(locale || 'en')
  useEffect(() => {
    setLanguage(locale || 'en')
  }, [locale])

  return (
    <section className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'md:flex-row')}>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-1/3')}>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-background tracking-tight',
            )}
          >
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'appearanceSettingsSection.description',
              {},
              { defaultValue: 'Customize the visual interface of your workspace.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.w('full'), cm.stack(8), 'md:w-2/3')}>
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
            <button
              onClick={() => setTheme('light')}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', align: 'start', gap: 'md' }),
                'rounded-xl bg-surface-container-low',
                mode === 'light' ? 'ring-2 ring-primary' : '',
              )}
            >
              <div
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 2),
                  cm.stack(2),
                  'aspect-video bg-surface rounded-lg shadow-sm overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(cm.h(2), cm.w('1/2'), cm.roundedFull, 'bg-surface-container')}
                ></div>
                <div
                  className={cm.cn(
                    cm.h(2),
                    cm.w('full'),
                    cm.roundedFull,
                    'bg-surface-container-low',
                  )}
                ></div>
                <div
                  className={cm.cn(
                    cm.h(2),
                    cm.w('2/3'),
                    cm.roundedFull,
                    'bg-surface-container-low',
                  )}
                ></div>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-on-background',
                )}
              >
                {t('appearanceSettingsSection.lightMode', {}, { defaultValue: 'Light Mode' })}
              </span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cm.cn(
                cm.sp('p', 4),
                cm.flex({ direction: 'col', align: 'start', gap: 'md' }),
                'rounded-xl bg-foreground',
                mode === 'dark' ? 'ring-2 ring-primary' : '',
              )}
            >
              <div
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('p', 2),
                  cm.stack(2),
                  'aspect-video bg-foreground rounded-lg shadow-sm overflow-hidden',
                )}
              >
                <div className={cm.cn(cm.h(2), cm.w('1/2'), cm.roundedFull, 'bg-foreground')}></div>
                <div
                  className={cm.cn(cm.h(2), cm.w('full'), cm.roundedFull, 'bg-foreground')}
                ></div>
                <div className={cm.cn(cm.h(2), cm.w('2/3'), cm.roundedFull, 'bg-foreground')}></div>
              </div>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-white')}>
                {t('appearanceSettingsSection.darkMode', {}, { defaultValue: 'Dark Mode' })}
              </span>
            </button>
          </div>
          <div className={cm.cn(cm.stack(2))}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[0.68rem] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'appearanceSettingsSection.languageLabel',
                {},
                { defaultValue: 'Interface Language' },
              )}
            </label>
            <select
              data-mol-id="language-picker-select"
              value={language}
              onChange={(e) => {
                const v = e.target.value
                setLanguage(v)
                setLocale(v)
              }}
              className={cm.cn(
                cm.w('full'),
                cm.h(12),
                cm.sp('px', 4),
                'rounded-lg bg-surface-container-low border-none focus:bg-surface focus:ring-1 focus:ring-primary-container/20 transition-all outline-none appearance-none',
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
        </div>
      </div>
    </section>
  )
}

export default AppearanceSettingsSection
export { AppearanceSettingsSection }
