import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AppearanceSettingsCardProps {
  theme: 'light' | 'dark' | 'system'
  setTheme: (v: 'light' | 'dark' | 'system') => void
  language: string
  setLanguage: (v: string) => void
}
function AppearanceSettingsCard({
  theme,
  setTheme,
  language,
  setLanguage,
}: AppearanceSettingsCardProps) {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  // The `language` prop persists to the backend preferences API; `locale`
  // drives the live UI swap via the i18n bond. Seed the <select>'s value
  // from the i18n bond so it reflects what the user actually sees, but
  // continue to call both setters so user-saved preferences keep working.
  const selectedLanguage = locale || language
  return (
    <section
      className={cm.cn(
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10',
        cm.sp('p', 6),
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          cm.flex({ align: 'center', gap: 2 }),
          'font-headline',
        )}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textPrimary)} data-icon="palette">
          palette
        </span>
        {t('appearanceSettings.title', {}, { defaultValue: 'Visual Appearance' })}
      </h3>
      <div className={cm.stack(6)}>
        <div className={cm.cn(cm.grid({ cols: 3, gap: 3 }))}>
          <button
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 3 }),
              cm.sp('p', 4),
              `rounded-xl border-2 transition-colors ${theme === 'light' ? 'border-primary bg-primary-container/30' : 'border-transparent hover:bg-surface-container-low'}`,
            )}
            onClick={() => setTheme('light')}
            type="button"
          >
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(12),
                cm.flex({ direction: 'col' }),
                cm.sp('p', 2),
                'bg-surface rounded shadow-sm gap-1.5',
              )}
            >
              <div className={cm.cn(cm.w('1/2'), cm.roundedFull, 'h-1.5 bg-border')}></div>
              <div
                className={cm.cn(cm.w('full'), cm.roundedFull, 'h-1.5 bg-surface-secondary')}
              ></div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                `uppercase tracking-wider ${theme === 'light' ? 'text-primary' : 'text-on-surface-variant'}`,
              )}
            >
              {t('appearanceSettings.themeLight', {}, { defaultValue: 'Light' })}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 3 }),
              cm.sp('p', 4),
              `rounded-xl border-2 transition-colors ${theme === 'dark' ? 'border-primary bg-primary-container/30' : 'border-transparent hover:bg-surface-container-low'}`,
            )}
            onClick={() => setTheme('dark')}
            type="button"
          >
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(12),
                cm.flex({ direction: 'col' }),
                cm.sp('p', 2),
                'bg-foreground rounded shadow-sm gap-1.5',
              )}
            >
              <div className={cm.cn(cm.w('1/2'), cm.roundedFull, 'h-1.5 bg-foreground')}></div>
              <div className={cm.cn(cm.w('full'), cm.roundedFull, 'h-1.5 bg-foreground')}></div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                `uppercase tracking-wider ${theme === 'dark' ? 'text-primary' : 'text-on-surface-variant'}`,
              )}
            >
              {t('appearanceSettings.themeDark', {}, { defaultValue: 'Dark' })}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 3 }),
              cm.sp('p', 4),
              `rounded-xl border-2 transition-colors ${theme === 'system' ? 'border-primary bg-primary-container/30' : 'border-transparent hover:bg-surface-container-low'}`,
            )}
            onClick={() => setTheme('system')}
            type="button"
          >
            <div
              className={cm.cn(
                cm.w('full'),
                cm.h(12),
                cm.flex({ direction: 'row' }),
                'bg-surface-secondary rounded shadow-sm overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.w('1/2'),
                  cm.h('full'),
                  cm.flex({ direction: 'col' }),
                  cm.sp('p', 2),
                  'bg-surface gap-1.5',
                )}
              >
                <div className={cm.cn(cm.w('full'), cm.roundedFull, 'h-1.5 bg-border')}></div>
              </div>
              <div
                className={cm.cn(
                  cm.w('1/2'),
                  cm.h('full'),
                  cm.flex({ direction: 'col' }),
                  cm.sp('p', 2),
                  'bg-foreground gap-1.5',
                )}
              >
                <div className={cm.cn(cm.w('full'), cm.roundedFull, 'h-1.5 bg-foreground')}></div>
              </div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                `uppercase tracking-wider ${theme === 'system' ? 'text-primary' : 'text-on-surface-variant'}`,
              )}
            >
              {t('appearanceSettings.themeSystem', {}, { defaultValue: 'System' })}
            </span>
          </button>
        </div>
        <div className={cm.stack(2)}>
          <label
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.sp('ml', 1),
              'text-[0.75rem] text-foreground-secondary uppercase tracking-wider',
            )}
          >
            {t('appearanceSettings.languageLabel', {}, { defaultValue: 'Interface Language' })}
          </label>
          <div className={cm.cn('relative')}>
            <select
              data-mol-id="language-picker-select"
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                'bg-surface-container-low border-none rounded-xl appearance-none focus:ring-2 focus:ring-primary/20 text-on-surface font-body outline-none',
              )}
              value={selectedLanguage}
              onChange={(e) => {
                const next = e.target.value
                void setLocale(next)
                setLanguage(next)
              }}
            >
              {[...locales]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
            </select>
            <div
              className={cm.cn(
                'absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-tertiary',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')} data-icon="expand_more">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AppearanceSettingsCard
export { AppearanceSettingsCard }
