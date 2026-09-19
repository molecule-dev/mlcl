import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface SettingsAppearanceSectionProps {
  theme: 'light' | 'dark'
  fontSize: 'small' | 'medium' | 'large'
  onThemeChange: (theme: 'light' | 'dark') => void
  onFontSizeChange: (size: 'small' | 'medium' | 'large') => void
}
function SettingsAppearanceSection({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
}: SettingsAppearanceSectionProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.grid({ cols: 1, gap: 'none' }),
        'md:grid-cols-12 items-start gap-x-10 gap-y-6',
      )}
    >
      <div className={cm.fvf71e6921}>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'font-headline')}>
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant font-label')}
        >
          {t(
            'settingsAppearanceSection.description',
            { appName: APP_NAME },
            { defaultValue: 'Customize how {{appName}} looks in your browser.' },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(6),
          'md:col-span-8 bg-surface-container-lowest rounded-xl editorial-shadow',
        )}
      >
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <button
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 4),
              'rounded-xl border-2 transition-all text-left',
              `${theme === 'light' ? 'border-primary bg-surface' : 'border-transparent hover:border-outline-variant/40 bg-inverse-surface'}`,
            )}
            data-mol-id="mode-light"
            onClick={() => onThemeChange('light')}
            aria-pressed={theme === 'light'}
          >
            <div
              className={cm.cn(
                cm.h(20),
                cm.sp('p', 2),
                'w-full bg-surface-container-low rounded-lg border border-outline-variant/20 overflow-hidden',
              )}
            >
              <div className={cm.cn(cm.h(2), cm.sp('mb', 2), 'w-3/4 bg-stone-300 rounded')}></div>
              <div className={cm.cn(cm.h(2), 'w-1/2 bg-stone-200 rounded')}></div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.textPrimary,
                'font-label',
              )}
            >
              {t('settingsAppearanceSection.lightMode', {}, { defaultValue: 'Light Mode' })}
            </span>
          </button>
          <button
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.sp('p', 4),
              'rounded-xl border-2 transition-all text-left',
              `${theme === 'dark' ? 'border-primary bg-inverse-surface' : 'border-transparent hover:border-outline-variant/40 bg-surface'}`,
            )}
            data-mol-id="mode-dark"
            onClick={() => onThemeChange('dark')}
            aria-pressed={theme === 'dark'}
          >
            <div
              className={cm.cn(
                cm.h(20),
                cm.sp('p', 2),
                'w-full bg-stone-800 rounded-lg border border-stone-700 overflow-hidden',
              )}
            >
              <div className={cm.cn(cm.h(2), cm.sp('mb', 2), 'w-3/4 bg-stone-600 rounded')}></div>
              <div className={cm.cn(cm.h(2), 'w-1/2 bg-stone-700 rounded')}></div>
            </div>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'font-label text-stone-400',
              )}
            >
              {t('settingsAppearanceSection.darkMode', {}, { defaultValue: 'Dark Mode' })}
            </span>
          </button>
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'block font-label uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'settingsAppearanceSection.readingFontSize',
              {},
              { defaultValue: 'Reading Font Size' },
            )}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 2),
              cm.roundedFull,
              'bg-surface-container-low',
            )}
          >
            <button
              className={cm.cn(
                cm.flex1,
                cm.sp('py', 2),
                cm.textSize('xs'),
                'font-label transition-colors',
                `${fontSize === 'small' ? `${cm.fontWeight('bold')} text-on-primary bg-primary ${cm.roundedFull} shadow-sm` : 'text-on-surface-variant hover:text-on-surface'}`,
              )}
              data-mol-id="font-small"
              onClick={() => onFontSizeChange('small')}
              aria-pressed={fontSize === 'small'}
            >
              {t('common.small', {}, { defaultValue: 'Small' })}
            </button>
            <button
              className={cm.cn(
                cm.flex1,
                cm.sp('py', 2),
                cm.textSize('sm'),
                'font-label transition-colors',
                `${fontSize === 'medium' ? `${cm.fontWeight('bold')} text-on-primary bg-primary ${cm.roundedFull} shadow-sm` : 'text-on-surface-variant hover:text-on-surface'}`,
              )}
              data-mol-id="font-medium"
              onClick={() => onFontSizeChange('medium')}
              aria-pressed={fontSize === 'medium'}
            >
              {t('common.medium', {}, { defaultValue: 'Medium' })}
            </button>
            <button
              className={cm.cn(
                cm.flex1,
                cm.sp('py', 2),
                cm.textSize('base'),
                'font-label transition-colors',
                `${fontSize === 'large' ? `${cm.fontWeight('bold')} text-on-primary bg-primary ${cm.roundedFull} shadow-sm` : 'text-on-surface-variant hover:text-on-surface'}`,
              )}
              data-mol-id="font-large"
              onClick={() => onFontSizeChange('large')}
              aria-pressed={fontSize === 'large'}
            >
              {t('common.large', {}, { defaultValue: 'Large' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SettingsAppearanceSection
export { SettingsAppearanceSection }
