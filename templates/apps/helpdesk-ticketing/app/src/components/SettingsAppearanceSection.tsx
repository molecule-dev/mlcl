import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

interface SettingsAppearanceSectionProps {
  theme: 'light' | 'dark' | 'system'
  setTheme: (v: 'light' | 'dark' | 'system') => void
  language: string
  setLanguage: (v: string) => void
  compactMode: boolean
  setCompactMode: (v: boolean) => void
  saving: boolean
  onSave: () => void
}

function SettingsAppearanceSection({
  theme,
  setTheme,
  language: _language,
  setLanguage,
  compactMode,
  setCompactMode,
  saving,
  onSave,
}: SettingsAppearanceSectionProps) {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(19,27,46,0.04),0_12px_40px_-8px_rgba(19,27,46,0.08)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 4, wrap: 'wrap' }),
          cm.sp('mb', 8),
        )}
      >
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h3>
        <button
          onClick={onSave}
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl shadow-lg transition-transform active:scale-95',
          )}
        >
          {saving
            ? t('common.saving', {}, { defaultValue: 'Saving...' })
            : t('common.save', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'md:grid-cols-3')}>
        <div className={cm.stack(3)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {t('settingsAppearance.themeLabel', {}, { defaultValue: 'Interface Theme' })}
          </label>
          <div className={cm.grid({ cols: 3, gap: 'sm' })}>
            <button
              onClick={() => setTheme('light')}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 2 }),
                cm.sp('p', 2),
                'rounded-lg',
                theme === 'light'
                  ? 'bg-surface-container-high ring-2 ring-primary'
                  : 'bg-surface-container-low',
              )}
            >
              <div
                className={cm.cn(
                  cm.w('full'),
                  'aspect-video bg-white rounded border-2 border-primary/20',
                )}
              ></div>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px]')}>
                {t('settingsAppearance.themeLight', {}, { defaultValue: 'Light' })}
              </span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 2 }),
                cm.sp('p', 2),
                'rounded-lg',
                theme === 'dark'
                  ? 'bg-surface-container-high ring-2 ring-primary'
                  : 'bg-surface-container-low',
              )}
            >
              <div className={cm.cn(cm.w('full'), 'aspect-video bg-slate-900 rounded')}></div>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px]')}>
                {t('settingsAppearance.themeDark', {}, { defaultValue: 'Dark' })}
              </span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', gap: 2 }),
                cm.sp('p', 2),
                'rounded-lg',
                theme === 'system'
                  ? 'bg-surface-container-high ring-2 ring-primary'
                  : 'bg-surface-container-low',
              )}
            >
              <div
                className={cm.cn(
                  cm.w('full'),
                  'aspect-video bg-gradient-to-br from-white to-slate-900 rounded',
                )}
              ></div>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px]')}>
                {t('settingsAppearance.themeSystem', {}, { defaultValue: 'System' })}
              </span>
            </button>
          </div>
        </div>
        <div className={cm.stack(3)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {t('settingsAppearance.languageLabel', {}, { defaultValue: 'System Language' })}
          </label>
          <select
            data-mol-id="language-picker-select"
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              'bg-surface-container-low border-none rounded-lg',
            )}
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value)
              setLanguage(e.target.value)
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
        </div>
        <div
          className={cm.cn(cm.flex({ direction: 'col', justify: 'end', gap: 3 }), cm.sp('pb', 2))}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'bg-surface-container-low rounded-xl',
            )}
          >
            <div>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'block')}>
                {t('settingsAppearance.compactModeLabel', {}, { defaultValue: 'Compact Mode' })}
              </span>
              <span className={cm.cn('text-[10px] text-on-surface-variant')}>
                {t(
                  'settingsAppearance.compactModeDescription',
                  {},
                  { defaultValue: 'Maximize information density' },
                )}
              </span>
            </div>
            <Switch
              checked={compactMode}
              onChange={(e) => setCompactMode((e.target as HTMLInputElement).checked)}
              aria-label={t(
                'settingsAppearance.compactModeLabel',
                {},
                { defaultValue: 'Compact Mode' },
              )}
              data-mol-id="compact-mode-switch"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default SettingsAppearanceSection
export { SettingsAppearanceSection }
