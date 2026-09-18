import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const SECTIONS = ['organization', 'api', 'notifications', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface Preferences {
  email_on_delivered: boolean
  email_on_exception: boolean
  push_on_status_change: boolean
}

interface UserOrgFields {
  organization_name?: string | null
  timezone?: string | null
  business_hours?: string | null
}

const DEFAULT_PREFS: Preferences = {
  email_on_delivered: true,
  email_on_exception: true,
  push_on_status_change: false,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('organization')

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSavedAt, setPrefsSavedAt] = useState<string | null>(null)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: Preferences } | Preferences>('/api/notifications/preferences')
      .then((res) => {
        if (cancelled) return
        const data = (res?.data ?? {}) as Partial<Preferences> & { data?: Partial<Preferences> }
        const d = (data.data ?? data) as Partial<Preferences>
        setPrefs({
          email_on_delivered: d.email_on_delivered ?? true,
          email_on_exception: d.email_on_exception ?? true,
          push_on_status_change: d.push_on_status_change ?? false,
        })
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [http])

  async function togglePref<K extends keyof Preferences>(key: K, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSavingPrefs(true)
    setPrefsError(null)
    setPrefsSavedAt(null)
    try {
      await http.put('/api/notifications/preferences', next)
      setPrefsSavedAt(new Date().toISOString())
    } catch (err) {
      setPrefsError(
        (err as Error)?.message ??
          t(
            'settings.notifications.saveFailed',
            {},
            { defaultValue: 'Could not save preferences.' },
          ),
      )
      setPrefs(prefs)
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Organization, API keys, and notification rules.' },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={'space-y-1'}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  data-mol-id={`button-section-${s}`}
                  onClick={() => setSection(s)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(
                          'text-on-surface-variant',
                          'hover:bg-surface-container hover:text-on-surface',
                        ),
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={'col-span-12 md:col-span-9 space-y-4'}>
          {section === 'organization' && <OrganizationPanel http={http} t={t} />}

          {section === 'api' && <ApiPanel http={http} t={t} />}

          {section === 'notifications' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.notifications.heading', {}, { defaultValue: 'Notifications' })}
              </h2>
              <PrefToggle
                dataId="toggle-email-exception"
                label={t(
                  'settings.notifications.exceptions',
                  {},
                  { defaultValue: 'Email me when a shipment exception occurs' },
                )}
                checked={prefs.email_on_exception}
                onChange={(v) => togglePref('email_on_exception', v)}
              />
              <PrefToggle
                dataId="toggle-email-delivered"
                label={t(
                  'settings.notifications.delivered',
                  {},
                  { defaultValue: 'Email me when a shipment is delivered' },
                )}
                checked={prefs.email_on_delivered}
                onChange={(v) => togglePref('email_on_delivered', v)}
              />
              <PrefToggle
                dataId="toggle-push-status"
                label={t(
                  'settings.notifications.pushStatus',
                  {},
                  { defaultValue: 'Push notification on status change' },
                )}
                checked={prefs.push_on_status_change}
                onChange={(v) => togglePref('push_on_status_change', v)}
              />
              {prefsError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{prefsError}</p>
              ) : null}
              {prefsSavedAt ? (
                <p
                  className={cm.cn(cm.textSize('xs'), 'text-success')}
                  data-mol-id="prefs-saved-pill"
                >
                  {savingPrefs
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t(
                        'common.savedAt',
                        { time: new Date(prefsSavedAt).toLocaleTimeString() },
                        { defaultValue: 'Saved at {{time}}' },
                      )}
                </p>
              ) : null}
            </section>
          )}

          {section === 'language' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </section>
          )}
        </main>
      </div>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settings.appearance.description',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  )
}

interface PanelProps {
  http: ReturnType<typeof useHttpClient>
  t: ReturnType<typeof useTranslation>['t']
}

function OrganizationPanel({ http, t }: PanelProps) {
  const cm = getClassMap()
  const [draft, setDraft] = useState({
    organization_name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    business_hours: '9:00am - 6:00pm Mon-Fri',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: UserOrgFields } | UserOrgFields>('/api/settings/organization')
      .then((res) => {
        if (cancelled) return
        const data = (res?.data ?? {}) as Partial<UserOrgFields> & { data?: Partial<UserOrgFields> }
        const d = (data.data ?? data) as Partial<UserOrgFields>
        if (d) {
          setDraft((prev) => ({
            organization_name: d.organization_name ?? prev.organization_name,
            timezone: d.timezone ?? prev.timezone,
            business_hours: d.business_hours ?? prev.business_hours,
          }))
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [http])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSavedAt(null)
    try {
      await http.put('/api/settings/organization', draft)
      setSavedAt(new Date().toISOString())
    } catch (err) {
      setSaveError(
        (err as Error)?.message ??
          t(
            'settings.organization.saveFailed',
            {},
            { defaultValue: 'Could not save organization settings.' },
          ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={save}
      data-mol-id="form-organization"
      className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('form.organization', {}, { defaultValue: 'Organization' })}
      </h2>
      <Field
        label={t('settings.organization.name', {}, { defaultValue: 'Organization name' })}
        dataId="input-org-name"
        value={draft.organization_name}
        onChange={(v) => setDraft((d) => ({ ...d, organization_name: v }))}
      />
      <Field
        label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
        dataId="input-org-tz"
        value={draft.timezone}
        onChange={(v) => setDraft((d) => ({ ...d, timezone: v }))}
      />
      <Field
        label={t('settings.organization.businessHours', {}, { defaultValue: 'Business hours' })}
        dataId="input-org-hours"
        value={draft.business_hours}
        onChange={(v) => setDraft((d) => ({ ...d, business_hours: v }))}
      />
      {saveError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{saveError}</p> : null}
      {savedAt ? (
        <p className={cm.cn(cm.textSize('xs'), 'text-success')} data-mol-id="org-saved-pill">
          {t(
            'common.savedAt',
            { time: new Date(savedAt).toLocaleTimeString() },
            { defaultValue: 'Saved at {{time}}' },
          )}
        </p>
      ) : null}
      <div className={cm.flex({ justify: 'end' })}>
        <button
          type="submit"
          data-mol-id="button-save-org"
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </div>
    </form>
  )
}

interface ApiKeyResp {
  publicKey?: string
  secretKey?: string
  webhookSecret?: string
  secretKeyMasked?: string
  webhookSecretMasked?: string
}

function ApiPanel({ http, t }: PanelProps) {
  const cm = getClassMap()
  const [keys, setKeys] = useState<ApiKeyResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    return http
      .get<ApiKeyResp>('/api/settings/api-keys')
      .then((res) => setKeys((res?.data ?? null) as ApiKeyResp | null))
      .catch(() =>
        setError(t('settings.api.loadFailed', {}, { defaultValue: 'Could not load API keys.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void load() /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [http])

  async function rotate() {
    setRotating(true)
    setError(null)
    try {
      const res = await http.post<ApiKeyResp>('/api/settings/api-keys/rotate', {})
      const data = (res?.data ?? null) as ApiKeyResp | null
      setRevealedSecret(data?.secretKey ?? null)
      await load()
    } catch (err) {
      setError(
        (err as Error)?.message ??
          t('settings.api.rotateFailed', {}, { defaultValue: 'Could not rotate API keys.' }),
      )
    } finally {
      setRotating(false)
    }
  }

  return (
    <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('settings.api.heading', {}, { defaultValue: 'API access' })}
      </h2>
      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <>
          <ReadOnlyField
            label={t('settings.api.publicKey', {}, { defaultValue: 'Public key' })}
            value={keys?.publicKey ?? ''}
            dataId="field-public-key"
          />
          <ReadOnlyField
            label={t('settings.api.secretKey', {}, { defaultValue: 'Secret key' })}
            value={revealedSecret ?? keys?.secretKeyMasked ?? '••••••••'}
            dataId="field-secret-key"
            mono
          />
          <ReadOnlyField
            label={t('settings.api.webhookSecret', {}, { defaultValue: 'Webhook signing secret' })}
            value={keys?.webhookSecretMasked ?? '••••••••'}
            dataId="field-webhook-secret"
            mono
          />
          {revealedSecret ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-warning')} data-mol-id="api-secret-shown">
              {t(
                'settings.api.secretShownOnce',
                {},
                { defaultValue: 'Save this secret — it will not be shown again.' },
              )}
            </p>
          ) : null}
          {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
          <div className={cm.flex({ gap: 'sm' })}>
            <button
              type="button"
              data-mol-id="button-rotate-keys"
              disabled={rotating}
              onClick={rotate}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'border border-outline-variant rounded-md disabled:opacity-50',
              )}
            >
              {rotating
                ? t('settings.api.rotating', {}, { defaultValue: 'Rotating…' })
                : t('settings.api.rotate', {}, { defaultValue: 'Rotate keys' })}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function Field({
  label,
  value,
  dataId,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  dataId?: string
  type?: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        data-mol-id={dataId}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface text-on-surface',
        )}
      />
    </label>
  )
}

function ReadOnlyField({
  label,
  value,
  dataId,
  mono,
}: {
  label: string
  value: string
  dataId?: string
  mono?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="text"
        readOnly
        value={value}
        data-mol-id={dataId}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface text-on-surface',
          mono ? 'font-mono' : '',
        )}
      />
    </label>
  )
}

function PrefToggle({
  label,
  dataId,
  checked,
  onChange,
}: {
  label: string
  dataId: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        data-mol-id={dataId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
