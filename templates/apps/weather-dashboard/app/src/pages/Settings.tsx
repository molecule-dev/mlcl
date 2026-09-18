import { useEffect, useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

/**
 * Map a Settings appearance.theme choice (Auto / Dark / Light) onto the
 * molecule theme bond's theme name. "Auto" follows
 * `prefers-color-scheme: dark` and updates if the OS preference flips.
 */
function resolveThemeChoice(choice: string): 'light' | 'dark' {
  if (choice === 'Light') return 'light'
  if (choice === 'Dark') return 'dark'
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

const SECTIONS = [
  {
    key: 'units',
    defaultLabel: 'Units',
    icon: 'straighten',
    options: [
      {
        key: 'temperature',
        defaultLabel: 'Temperature',
        choices: ['Fahrenheit', 'Celsius'],
        defaultValue: 'Fahrenheit',
      },
      {
        key: 'wind',
        defaultLabel: 'Wind speed',
        choices: ['mph', 'km/h', 'knots', 'm/s'],
        defaultValue: 'mph',
      },
      {
        key: 'pressure',
        defaultLabel: 'Pressure',
        choices: ['hPa', 'inHg'],
        defaultValue: 'hPa',
      },
      {
        key: 'distance',
        defaultLabel: 'Distance',
        choices: ['Miles', 'Kilometers'],
        defaultValue: 'Miles',
      },
    ],
  },
  {
    key: 'notifications',
    defaultLabel: 'Notifications',
    icon: 'notifications_active',
    toggles: [
      { key: 'severeWarning', defaultLabel: 'Severe weather warnings', defaultValue: true },
      { key: 'dailyDigest', defaultLabel: 'Daily morning digest', defaultValue: true },
      { key: 'precipNudge', defaultLabel: 'Precipitation in the next hour', defaultValue: false },
    ],
  },
  {
    key: 'appearance',
    defaultLabel: 'Appearance',
    icon: 'palette',
    options: [
      {
        key: 'theme',
        defaultLabel: 'Theme',
        choices: ['Auto', 'Dark', 'Light'],
        defaultValue: 'Dark',
      },
      {
        key: 'background',
        defaultLabel: 'Background imagery',
        choices: ['Atmospheric gradient', 'Live satellite', 'Solid'],
        defaultValue: 'Atmospheric gradient',
      },
    ],
  },
  {
    key: 'data',
    defaultLabel: 'Data sources',
    icon: 'cloud',
    options: [
      {
        key: 'forecastSource',
        defaultLabel: 'Forecast provider',
        choices: ['Open-Meteo', 'NOAA', 'OpenWeather'],
        defaultValue: 'Open-Meteo',
      },
      {
        key: 'updateInterval',
        defaultLabel: 'Refresh interval',
        choices: ['5 min', '15 min', '30 min', '1 hour'],
        defaultValue: '30 min',
      },
    ],
  },
] as const

type SectionLike = {
  key: string
  defaultLabel: string
  icon: string
  options?: ReadonlyArray<{
    key: string
    defaultLabel: string
    choices: ReadonlyArray<string>
    defaultValue: string
  }>
  toggles?: ReadonlyArray<{ key: string; defaultLabel: string; defaultValue: boolean }>
}

const STORAGE_KEY = 'weather-dashboard.settings.v1'

interface PersistedSettings {
  options: Record<string, string>
  toggles: Record<string, boolean>
}

function loadSettings(): PersistedSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { options: {}, toggles: {} }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { options: {}, toggles: {} }
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      options: parsed.options ?? {},
      toggles: parsed.toggles ?? {},
    }
  } catch (_error) {
    // JSON.parse failed (corrupted storage value) — fall back to empty defaults
    return { options: {}, toggles: {} }
  }
}

function persistSettings(state: PersistedSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_error) {
    // localStorage may be unavailable (private mode, quota); fail silent
  }
}

function defaultsFromSections(): PersistedSettings {
  const opts: Record<string, string> = {}
  const toggles: Record<string, boolean> = {}
  for (const section of SECTIONS as ReadonlyArray<SectionLike>) {
    for (const option of section.options ?? []) {
      opts[`${section.key}.${option.key}`] = option.defaultValue
    }
    for (const toggle of section.toggles ?? []) {
      toggles[`${section.key}.${toggle.key}`] = toggle.defaultValue
    }
  }
  return { options: opts, toggles }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<string>('units')
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() => {
    const defaults = defaultsFromSections()
    const stored = loadSettings()
    return { ...defaults.options, ...stored.options }
  })
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>(() => {
    const defaults = defaultsFromSections()
    const stored = loadSettings()
    return { ...defaults.toggles, ...stored.toggles }
  })

  useEffect(() => {
    persistSettings({ options: optionValues, toggles: toggleValues })
  }, [optionValues, toggleValues])

  // Wire the "Appearance → Theme" choice through to the molecule theme bond
  // so picking Auto/Dark/Light actually flips data-mol-theme and re-applies
  // the theme tokens. Without this, the choice would be write-only state.
  const { setTheme } = useTheme()
  useEffect(() => {
    const choice = optionValues['appearance.theme'] ?? 'Dark'
    setTheme(resolveThemeChoice(choice))
    if (choice === 'Auto' && typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = (e: MediaQueryListEvent): void => {
        setTheme(e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', onChange)
      return (): void => mq.removeEventListener('change', onChange)
    }
    return undefined
  }, [optionValues, setTheme])

  const sections: ReadonlyArray<SectionLike> = SECTIONS
  const active = sections.find((s) => s.key === activeSection) || sections[0]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.heading', {}, { defaultValue: 'Tune your dashboard' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.persistNote',
            {},
            {
              defaultValue:
                'Display preferences are remembered on this device and survive page reloads.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <nav
          className={cm.cn(
            'lg:col-span-4 bg-surface-container-lowest rounded-2xl',
            cm.sp('p', 3),
            cm.stack(1),
          )}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {sections.map((section) => {
            const isActive = section.key === active.key
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 3),
                  'rounded-xl',
                  'transition-colors text-left w-full',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-l-primary'
                    : 'border-l-4 border-l-transparent hover:bg-surface-container-low',
                )}
                aria-pressed={isActive}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                  aria-hidden="true"
                >
                  {section.icon}
                </span>
                <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                  {t(
                    `settings.section.${section.key}.label`,
                    {},
                    { defaultValue: section.defaultLabel },
                  )}
                </span>
              </button>
            )
          })}
        </nav>

        <div
          className={cm.cn(
            'lg:col-span-8 bg-surface-container-lowest rounded-2xl',
            cm.sp('p', 6),
            cm.stack(6),
          )}
        >
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t(`settings.section.${active.key}.label`, {}, { defaultValue: active.defaultLabel })}
          </h2>

          {active.options && active.options.length > 0 ? (
            <div className={cm.stack(4)}>
              {active.options.map((option) => {
                const valueKey = `${active.key}.${option.key}`
                return (
                  <div key={option.key} className={cm.cn(cm.stack(2))}>
                    <p
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(
                        `settings.option.${active.key}.${option.key}.label`,
                        {},
                        { defaultValue: option.defaultLabel },
                      )}
                    </p>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
                      {option.choices.map((choice) => {
                        const selected = optionValues[valueKey] === choice
                        return (
                          <button
                            key={choice}
                            type="button"
                            data-setting-key={valueKey}
                            data-setting-value={choice}
                            onClick={() =>
                              setOptionValues((current) => ({ ...current, [valueKey]: choice }))
                            }
                            className={cm.cn(
                              cm.sp('px', 4),
                              cm.sp('py', 2),
                              cm.roundedFull,
                              cm.fontWeight('semibold'),
                              cm.textSize('sm'),
                              'transition-colors',
                              selected
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
                            )}
                            aria-pressed={selected}
                          >
                            {choice}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {active.key === 'appearance' ? (
            <div className={cm.cn(cm.stack(2))}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.language.label', {}, { defaultValue: 'Language' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          ) : null}

          {active.toggles && active.toggles.length > 0 ? (
            <div className={cm.stack(2)}>
              {active.toggles.map((toggle) => {
                const valueKey = `${active.key}.${toggle.key}`
                const enabled = toggleValues[valueKey]
                return (
                  <button
                    key={toggle.key}
                    type="button"
                    data-setting-key={valueKey}
                    data-setting-enabled={enabled ? 'true' : 'false'}
                    onClick={() =>
                      setToggleValues((current) => ({ ...current, [valueKey]: !enabled }))
                    }
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('p', 4),
                      'rounded-xl',
                      'bg-surface-container hover:bg-surface-container-low transition-colors w-full',
                    )}
                    aria-pressed={enabled}
                  >
                    <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                      {t(
                        `settings.toggle.${active.key}.${toggle.key}.label`,
                        {},
                        { defaultValue: toggle.defaultLabel },
                      )}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full',
                        enabled
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface text-on-surface-variant',
                      )}
                    >
                      {enabled
                        ? t('settings.on', {}, { defaultValue: 'On' })
                        : t('status.off', {}, { defaultValue: 'Off' })}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
