import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

const HIGH_CONTRAST_KEY = 'civic.highContrastGrid'
const REDUCED_MOTION_KEY = 'civic.reducedMotion'

/** Apply the accessibility display switches to <html> immediately (they are
 * presentation-level, so they take effect live and persist in localStorage —
 * unlike theme/language, which round-trip through the API preferences). */
function applyDisplaySwitches(highContrast: boolean, reducedMotion: boolean): void {
  const root = document.documentElement
  if (highContrast) root.setAttribute('data-contrast-grid', 'on')
  else root.removeAttribute('data-contrast-grid')
  if (reducedMotion) root.setAttribute('data-reduced-motion', 'on')
  else root.removeAttribute('data-reduced-motion')
}

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
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem(HIGH_CONTRAST_KEY) === '1',
  )
  const [reducedMotion, setReducedMotion] = useState(
    () => localStorage.getItem(REDUCED_MOTION_KEY) === '1',
  )
  useEffect(() => {
    applyDisplaySwitches(highContrast, reducedMotion)
    localStorage.setItem(HIGH_CONTRAST_KEY, highContrast ? '1' : '0')
    localStorage.setItem(REDUCED_MOTION_KEY, reducedMotion ? '1' : '0')
  }, [highContrast, reducedMotion])
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
          {t(
            'settingsAppearance.sectionTitle',
            {},
            { defaultValue: 'Accessibility & Display Preferences' },
          )}
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
              cm.flex({ align: 'center', justify: 'between', gap: 3 }),
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
            {/* Shared accessible switch: role=switch + aria-checked, a 40px
                touch hit-area and a visible focus ring built in. The
                aria-label gives it its accessible name (the visible text
                block sits outside the control). */}
            <Switch
              data-mol-id="compact-mode-switch"
              checked={compactMode}
              onChange={(e) => setCompactMode((e.target as HTMLInputElement).checked)}
              size="md"
              aria-label={t(
                'settingsAppearance.compactModeLabel',
                {},
                { defaultValue: 'Compact Mode' },
              )}
            />
          </div>
        </div>
      </div>
      {/* Accessibility display switches (design: High-Contrast Road Grid +
          Reduced Motion & Animation). Presentation-level — they apply live
          via <html> data attributes and persist in localStorage. */}
      <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.sp('mt', 6))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 3 }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl',
          )}
        >
          <div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'block')}>
              {t(
                'settingsAppearance.highContrastLabel',
                {},
                { defaultValue: 'High-Contrast Road Grid' },
              )}
            </span>
            <span className={cm.cn('text-[10px] text-on-surface-variant')}>
              {t(
                'settingsAppearance.highContrastDescription',
                {},
                {
                  defaultValue: 'Darken map grid lines and borders for stronger visual separation.',
                },
              )}
            </span>
          </div>
          <Switch
            data-mol-id="high-contrast-switch"
            checked={highContrast}
            onChange={(e) => setHighContrast((e.target as HTMLInputElement).checked)}
            size="md"
            aria-label={t(
              'settingsAppearance.highContrastLabel',
              {},
              { defaultValue: 'High-Contrast Road Grid' },
            )}
          />
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 3 }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl',
          )}
        >
          <div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'block')}>
              {t(
                'settingsAppearance.reducedMotionLabel',
                {},
                { defaultValue: 'Reduced Motion & Animation' },
              )}
            </span>
            <span className={cm.cn('text-[10px] text-on-surface-variant')}>
              {t(
                'settingsAppearance.reducedMotionDescription',
                {},
                {
                  defaultValue: 'Minimize transitions and pulse effects across the app.',
                },
              )}
            </span>
          </div>
          <Switch
            data-mol-id="reduced-motion-switch"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion((e.target as HTMLInputElement).checked)}
            size="md"
            aria-label={t(
              'settingsAppearance.reducedMotionLabel',
              {},
              { defaultValue: 'Reduced Motion & Animation' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default SettingsAppearanceSection
export { SettingsAppearanceSection }
