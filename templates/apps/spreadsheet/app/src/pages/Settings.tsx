import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

const STORAGE_KEY = 'calcite.settings.v1'

const SECTIONS = [
  { id: 'general', icon: 'tune', label: 'General' },
  { id: 'sharing', icon: 'share', label: 'Sharing defaults' },
  { id: 'appearance', icon: 'palette', label: 'Appearance' },
  { id: 'language', icon: 'translate', label: 'Language' },
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  { id: 'security', icon: 'lock', label: 'Security' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface ToggleSpec {
  id: string
  section: SectionId
  label: string
  desc: string
  defaultValue: boolean
}

const TOGGLES: ToggleSpec[] = [
  {
    id: 'tabular_nums',
    section: 'general',
    label: 'Tabular numerals everywhere',
    desc: 'Render every numeric cell with monospaced figures.',
    defaultValue: true,
  },
  {
    id: 'thousands',
    section: 'general',
    label: 'Thousands separators',
    desc: 'Use locale-aware thousands separators in the grid.',
    defaultValue: true,
  },
  {
    id: 'auto_save',
    section: 'general',
    label: 'Auto-save every change',
    desc: 'Persist edits within 250ms of the last keystroke.',
    defaultValue: true,
  },
  {
    id: 'public_share',
    section: 'sharing',
    label: 'Allow public share links',
    desc: 'Members can publish read-only links to the public web.',
    defaultValue: false,
  },
  {
    id: 'default_role',
    section: 'sharing',
    label: 'New collaborators get Editor',
    desc: 'Defaults to Viewer otherwise.',
    defaultValue: false,
  },
  {
    id: 'compact',
    section: 'appearance',
    label: 'Compact row height',
    desc: 'Default row height switches from 32px to 24px.',
    defaultValue: false,
  },
  {
    id: 'cmt_emails',
    section: 'notifications',
    label: 'Email me on @mentions',
    desc: 'Comment threads with your name go to your inbox.',
    defaultValue: true,
  },
  {
    id: 'auto_alerts',
    section: 'notifications',
    label: 'Automation completion alerts',
    desc: 'Ping in app + email when a scheduled run finishes.',
    defaultValue: true,
  },
  {
    id: 'twofa',
    section: 'security',
    label: 'Require 2FA for owners',
    desc: 'Workspace owners must enroll a TOTP authenticator.',
    defaultValue: false,
  },
]

function defaultsState(): Record<string, boolean> {
  return Object.fromEntries(TOGGLES.map((tg) => [tg.id, tg.defaultValue]))
}

function loadState(): Record<string, boolean> {
  if (typeof window === 'undefined') return defaultsState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultsState()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const merged = defaultsState()
    for (const k of Object.keys(merged)) {
      if (typeof parsed[k] === 'boolean') merged[k] = parsed[k] as boolean
    }
    return merged
  } catch (_error) {
    // JSON.parse failed (corrupted storage); fall back to defaults
    return defaultsState()
  }
}

function saveState(state: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_error) {
    // localStorage full or disabled; settings persist only for this session
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<SectionId>('general')
  const [state, setState] = useState<Record<string, boolean>>(loadState)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  function toggle(id: string) {
    setState((s) => {
      const next = { ...s, [id]: !s[id] }
      setSavedAt(Date.now())
      return next
    })
  }

  const visible = TOGGLES.filter((tg) => tg.section === activeSection)

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'settings.subhead',
              {},
              { defaultValue: 'Workspace preferences. Saved on this device automatically.' },
            )}
          </p>
        </div>
        {savedAt && (
          <p
            className={
              'text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400'
            }
            role="status"
            aria-live="polite"
            data-testid="settings-saved"
          >
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </p>
        )}
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <nav
          className={cm.cn('col-span-12 lg:col-span-3', cm.stack(1))}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl text-left transition-colors',
                activeSection === s.id
                  ? 'bg-primary-fixed text-primary font-bold border-l-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {s.icon}
              </span>
              <span>{t(`settings.section.${s.id}`, {}, { defaultValue: s.label })}</span>
            </button>
          ))}
        </nav>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-9 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(cm.sp('px', 6), cm.sp('py', 4), 'border-b border-outline-variant/40')}
          >
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
              {t('settings.section.eyebrow', {}, { defaultValue: 'Workspace preference' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                'font-extrabold tracking-tight text-on-surface mt-1',
              )}
            >
              {t(
                `settings.section.${activeSection}.headline`,
                {},
                {
                  defaultValue: SECTIONS.find((x) => x.id === activeSection)?.label || 'Section',
                },
              )}
            </h2>
          </header>
          {activeSection === 'language' ? (
            <div className={cm.cn(cm.sp('p', 6), cm.stack(4))}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.language.description',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/40">
              {visible.map((tg) => (
                <li
                  key={tg.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                  )}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
                    <p className="font-bold text-on-surface">
                      {t(`settings.toggle.${tg.id}.label`, {}, { defaultValue: tg.label })}
                    </p>
                    <p className={'text-sm text-on-surface-variant'}>
                      {t(`settings.toggle.${tg.id}.desc`, {}, { defaultValue: tg.desc })}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state[tg.id]}
                    aria-label={tg.label}
                    data-testid={`toggle-${tg.id}`}
                    onClick={() => toggle(tg.id)}
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      'relative w-11 h-7 rounded-full transition-colors shrink-0',
                      "after:content-[''] after:absolute after:-inset-2 after:rounded-full",
                      state[tg.id] ? 'bg-primary' : 'bg-surface-container-high',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform',
                        state[tg.id] ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className={cm.cn('col-span-12', cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}
        >
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </div>
    </WorkbenchLayout>
  )
}

export default Settings
