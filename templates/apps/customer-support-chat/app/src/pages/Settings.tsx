import { useEffect, useState } from 'react'

import { get, patch } from '@molecule/app-http'
import { useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { InboxLayout } from '../components/InboxLayout.js'

interface UserShape {
  id: string
  name: string | null
  email: string | null
}

interface UserResponseShape {
  props: {
    id: string
    name: string | null
    email: string | null
  }
}

interface WidgetAppearance {
  greeting: string
  brandColor: string
  position: string
}

const WIDGET_DEFAULTS: WidgetAppearance = {
  greeting: 'Hi there 👋  How can we help?',
  brandColor: '#635bff',
  position: 'Bottom right · 24px offset',
}

const WIDGET_STORAGE_KEY = 'csc.widget.appearance'

function loadWidgetAppearance(): WidgetAppearance {
  if (typeof window === 'undefined') return WIDGET_DEFAULTS
  try {
    const raw = window.localStorage.getItem(WIDGET_STORAGE_KEY)
    if (!raw) return WIDGET_DEFAULTS
    const parsed = JSON.parse(raw) as Partial<WidgetAppearance>
    return {
      greeting: parsed.greeting ?? WIDGET_DEFAULTS.greeting,
      brandColor: parsed.brandColor ?? WIDGET_DEFAULTS.brandColor,
      position: parsed.position ?? WIDGET_DEFAULTS.position,
    }
  } catch (_error) {
    // JSON.parse failed or localStorage unavailable — return defaults
    return WIDGET_DEFAULTS
  }
}

function saveWidgetAppearance(value: WidgetAppearance): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(value))
  } catch (_error) {
    // ignore storage errors (private mode, quota exceeded)
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 4 }),
        cm.sp('p', 6),
        'bg-surface rounded-xl border border-[color:var(--color-border)]',
      )}
    >
      <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingsBody() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const user = useUser<UserShape>()
  const [workspaceName, setWorkspaceName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [widget, setWidget] = useState<WidgetAppearance>(WIDGET_DEFAULTS)
  const [widgetSavedAt, setWidgetSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!user?.id) return undefined
    if (user?.name) setWorkspaceName(user.name)
    void get<UserResponseShape>(`/api/users/${user.id}`)
      .then((response) => {
        if (cancelled) return
        const fetched = response.data?.props?.name
        if (fetched) setWorkspaceName(fetched)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.name])

  useEffect(() => {
    setWidget(loadWidgetAppearance())
  }, [])

  const handleSaveWorkspace = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user?.id) return
    const trimmed = workspaceName.trim()
    if (!trimmed) {
      setSaveError(
        t('settings.account.nameRequired', {}, { defaultValue: 'Workspace name cannot be empty.' }),
      )
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await patch(`/api/users/${user.id}`, { name: trimmed })
      const verify = await get<UserResponseShape>(`/api/users/${user.id}`)
      const persisted = verify.data?.props?.name
      if (persisted) {
        setWorkspaceName(persisted)
      }
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workspace settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWidget = (event: React.FormEvent) => {
    event.preventDefault()
    saveWidgetAppearance(widget)
    setWidgetSavedAt(Date.now())
  }

  const updateWidgetField =
    (field: keyof WidgetAppearance) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setWidget((prev) => ({ ...prev, [field]: event.target.value }))
      setWidgetSavedAt(null)
    }

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </span>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            {
              defaultValue: 'Manage your account and customize the customer-facing chat widget.',
            },
          )}
        </p>
      </header>

      <Section title={t('settings.account', {}, { defaultValue: 'Account' })}>
        <form
          onSubmit={handleSaveWorkspace}
          className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}
        >
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.account.workspaceName', {}, { defaultValue: 'Workspace name' })}
            </span>
            <input
              type="text"
              name="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-shadow text-on-surface',
              )}
            />
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.account.workspaceNameHint',
                {},
                { defaultValue: 'Shown in the inbox header and in customer-facing emails.' },
              )}
            </span>
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {saveError ? (
                <span className="text-[color:var(--color-error)]" role="alert">
                  {saveError}
                </span>
              ) : savedAt ? (
                <span className="text-[color:var(--color-primary)]" role="status">
                  {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                </span>
              ) : (
                ''
              )}
            </span>
            <button
              type="submit"
              disabled={saving || !user?.id}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'rounded-lg bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.save', {}, { defaultValue: 'Save' })}
            </button>
          </div>
        </form>
      </Section>

      <Section title={t('footer.language', {}, { defaultValue: 'Language' })}>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </Section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
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
      <Section title={t('settings.widget.title', {}, { defaultValue: 'Widget appearance' })}>
        <form
          onSubmit={handleSaveWidget}
          className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-[1fr_320px]')}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.widget.greeting', {}, { defaultValue: 'Greeting' })}
              </span>
              <input
                type="text"
                name="widgetGreeting"
                value={widget.greeting}
                onChange={updateWidgetField('greeting')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
                )}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.widget.brandColor', {}, { defaultValue: 'Brand color (hex)' })}
              </span>
              <input
                type="text"
                name="widgetBrandColor"
                value={widget.brandColor}
                onChange={updateWidgetField('brandColor')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
                )}
              />
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.widget.brandHint',
                  {},
                  { defaultValue: 'Used for the launcher background and primary buttons.' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.widget.position', {}, { defaultValue: 'Position' })}
              </span>
              <input
                type="text"
                name="widgetPosition"
                value={widget.position}
                onChange={updateWidgetField('position')}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-md border border-[color:var(--color-border)] bg-surface-secondary focus:outline-none focus:border-primary text-on-surface',
                )}
              />
            </label>
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {widgetSavedAt ? (
                  <span className="text-[color:var(--color-primary)]" role="status">
                    {t(
                      'settings.widget.saved',
                      {},
                      { defaultValue: 'Widget settings saved locally.' },
                    )}
                  </span>
                ) : (
                  ''
                )}
              </span>
              <button
                type="submit"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-lg bg-primary text-on-primary',
                )}
              >
                {t('settings.widget.save', {}, { defaultValue: 'Save widget' })}
              </button>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 3 }),
              cm.sp('p', 5),
              'rounded-2xl text-white shadow-lg relative overflow-hidden',
            )}
            style={{
              background: `linear-gradient(135deg, ${widget.brandColor}, ${widget.brandColor}cc)`,
            }}
            aria-label={t('settings.widget.previewAria', {}, { defaultValue: 'Widget preview' })}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  'bg-white/20 backdrop-blur-md',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  forum
                </span>
              </div>
              <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>
                {user?.name || t('settings.widget.previewTitle', {}, { defaultValue: 'Support' })}
              </span>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{widget.greeting}</p>
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mt', 2))}
            >
              <input
                disabled
                placeholder={t(
                  'settings.widget.previewInput',
                  {},
                  { defaultValue: 'Send us a message…' },
                )}
                className={cm.cn(
                  cm.flex1,
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'rounded-md bg-white/20 placeholder:text-white/70 backdrop-blur-md',
                )}
              />
            </div>
          </div>
        </form>
      </Section>
    </div>
  )
}

function Settings() {
  return <InboxLayout main={<SettingsBody />} />
}

export default Settings
export { Settings, Settings as SettingsPage }
