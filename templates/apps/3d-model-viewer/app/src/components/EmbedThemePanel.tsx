import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EmbedThemePanelProps {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
}

function EmbedThemePanel({ theme, setTheme }: EmbedThemePanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const themes: Array<{ key: 'light' | 'dark'; label: string }> = [
    { key: 'dark', label: t('embedThemePanel.dark', {}, { defaultValue: 'Dark' }) },
    { key: 'light', label: t('embedThemePanel.light', {}, { defaultValue: 'Light' }) },
  ]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-high rounded-xl border border-outline-variant/10',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
        <h3
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.textSize('base'),
            cm.flex({ align: 'center', gap: 2 }),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[20px]', cm.textPrimary)}
            data-icon="palette"
          >
            palette
          </span>
          {t('nav.theme', {}, { defaultValue: 'Theme' })}
        </h3>
        <div
          className={cm.cn(
            cm.flex({}),
            cm.sp('p', 1),
            'bg-surface-container-lowest rounded-lg border border-outline-variant/10',
          )}
        >
          {themes.map(({ key, label }) => (
            <button
              key={key}
              data-mol-id={`embed-theme-${key}`}
              className={
                theme === key
                  ? cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded bg-surface-variant text-on-surface shadow-sm',
                    )
                  : cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded text-on-surface-variant hover:text-on-surface',
                    )
              }
              onClick={() => setTheme(key)}
              aria-pressed={theme === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EmbedThemePanel
export { EmbedThemePanel }
