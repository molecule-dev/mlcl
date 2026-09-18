import { useCallback, useEffect, useMemo, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const SECTIONS = ['profile', 'hours', 'preferences', 'appearance', 'language'] as const
type Section = (typeof SECTIONS)[number]

const DEFAULT_HOURS = [
  { day: 'Monday', open: '17:00', close: '22:00' },
  { day: 'Tuesday', open: '17:00', close: '22:00' },
  { day: 'Wednesday', open: '17:00', close: '22:00' },
  { day: 'Thursday', open: '17:00', close: '22:30' },
  { day: 'Friday', open: '17:00', close: '23:00' },
  { day: 'Saturday', open: '11:00', close: '23:00' },
  { day: 'Sunday', open: '11:00', close: '21:00' },
]

interface RestaurantPreferences {
  restaurantName?: string
  restaurantPhone?: string
  restaurantAddress?: string
  restaurantCuisine?: string
  serviceHours?: Array<{ day: string; open: string; close: string }>
  prefAutoRush?: boolean
  prefBellSound?: boolean
  prefEmailReceipts?: boolean
  prefQrOrdering?: boolean
}

interface User {
  id: string
  oauthData?: { preferences?: RestaurantPreferences }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<User>()
  const [section, setSection] = useState<Section>('profile')

  const initialPrefs = useMemo<RestaurantPreferences>(
    () => user?.oauthData?.preferences ?? {},
    [user],
  )

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [hours, setHours] =
    useState<Array<{ day: string; open: string; close: string }>>(DEFAULT_HOURS)
  const [prefAutoRush, setPrefAutoRush] = useState(true)
  const [prefBellSound, setPrefBellSound] = useState(true)
  const [prefEmailReceipts, setPrefEmailReceipts] = useState(false)
  const [prefQrOrdering, setPrefQrOrdering] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setName(initialPrefs.restaurantName ?? '')
    setPhone(initialPrefs.restaurantPhone ?? '')
    setAddress(initialPrefs.restaurantAddress ?? '')
    setCuisine(initialPrefs.restaurantCuisine ?? '')
    setHours(initialPrefs.serviceHours ?? DEFAULT_HOURS)
    setPrefAutoRush(initialPrefs.prefAutoRush ?? true)
    setPrefBellSound(initialPrefs.prefBellSound ?? true)
    setPrefEmailReceipts(initialPrefs.prefEmailReceipts ?? false)
    setPrefQrOrdering(initialPrefs.prefQrOrdering ?? true)
  }, [initialPrefs])

  const handleSave = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const updatedPrefs: RestaurantPreferences = {
        ...(user.oauthData?.preferences ?? {}),
        restaurantName: name,
        restaurantPhone: phone,
        restaurantAddress: address,
        restaurantCuisine: cuisine,
        serviceHours: hours,
        prefAutoRush,
        prefBellSound,
        prefEmailReceipts,
        prefQrOrdering,
      }
      await http.patch(`/api/users/${user.id}`, {
        oauthData: { ...(user.oauthData ?? {}), preferences: updatedPrefs },
      })
      setStatus(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
    } catch (error) {
      logError('settings.save', error)
      setError(t('settings.saveError', {}, { defaultValue: 'Could not save settings.' }))
    } finally {
      setSaving(false)
    }
  }, [
    http,
    user,
    name,
    phone,
    address,
    cuisine,
    hours,
    prefAutoRush,
    prefBellSound,
    prefEmailReceipts,
    prefQrOrdering,
    t,
  ])

  const updateHours = useCallback((idx: number, field: 'open' | 'close', value: string) => {
    setHours((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }, [])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Restaurant settings' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight font-display')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Profile, hours, and service preferences.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-12')}>
        <aside className={cm.cn('col-span-12 md:col-span-3')}>
          <nav
            className={cm.cn('space-y-1')}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const active = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  data-testid={`settings-nav-${s}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'block w-full text-left rounded-xl transition-colors',
                    active
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.replace(/^./, (c) => c.toUpperCase()) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={cm.cn('col-span-12 md:col-span-9', cm.stack(4))}>
          {section === 'profile' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(5),
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
                {t('settings.profile.heading', {}, { defaultValue: 'Restaurant profile' })}
              </h2>
              <Field
                id="r-name"
                label={t('settings.profile.name', {}, { defaultValue: 'Restaurant name' })}
                value={name}
                onChange={setName}
              />
              <Field
                id="r-phone"
                label={t('form.phone', {}, { defaultValue: 'Phone' })}
                value={phone}
                onChange={setPhone}
              />
              <Field
                id="r-address"
                label={t('form.address', {}, { defaultValue: 'Address' })}
                value={address}
                onChange={setAddress}
              />
              <Field
                id="r-cuisine"
                label={t('settings.profile.cuisine', {}, { defaultValue: 'Cuisine' })}
                value={cuisine}
                onChange={setCuisine}
              />
            </section>
          )}

          {section === 'hours' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(3),
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
                {t('settings.hours.heading', {}, { defaultValue: 'Hours of service' })}
              </h2>
              <ul className={cm.stack(2)}>
                {hours.map((h, i) => (
                  <li
                    key={h.day}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('py', 3),
                      'border-b border-outline-variant/40 last:border-0',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.w(28))}>
                      {h.day}
                    </span>
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => updateHours(i, 'open', e.target.value)}
                      data-testid={`settings-hours-${h.day.toLowerCase()}-open`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0 tabular-nums font-mono text-sm',
                      )}
                    />
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>–</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => updateHours(i, 'close', e.target.value)}
                      data-testid={`settings-hours-${h.day.toLowerCase()}-close`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0 tabular-nums font-mono text-sm',
                      )}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {section === 'preferences' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(4),
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
                {t('settings.preferences.heading', {}, { defaultValue: 'Service preferences' })}
              </h2>
              <Toggle
                id="auto-rush"
                label={t(
                  'settings.preferences.autoRush',
                  {},
                  { defaultValue: 'Auto-flag rush after 10 min' },
                )}
                checked={prefAutoRush}
                onChange={setPrefAutoRush}
              />
              <Toggle
                id="bell"
                label={t(
                  'settings.preferences.bellSound',
                  {},
                  { defaultValue: 'Audible bell on Ready' },
                )}
                checked={prefBellSound}
                onChange={setPrefBellSound}
              />
              <Toggle
                id="receipts"
                label={t(
                  'settings.preferences.emailReceipts',
                  {},
                  { defaultValue: 'Email receipts to guests' },
                )}
                checked={prefEmailReceipts}
                onChange={setPrefEmailReceipts}
              />
              <Toggle
                id="qr"
                label={t(
                  'settings.preferences.qrOrdering',
                  {},
                  { defaultValue: 'Enable table-side QR ordering' },
                )}
                checked={prefQrOrdering}
                onChange={setPrefQrOrdering}
              />
            </section>
          )}

          {section === 'appearance' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(4),
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
                {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.appearance.description',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </section>
          )}

          {section === 'language' && (
            <section
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm',
                cm.stack(4),
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold font-display')}>
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

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
              cm.sp('p', 4),
              'bg-surface-container-low rounded-2xl',
            )}
          >
            <div>
              {error ? (
                <p data-testid="settings-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
                  {error}
                </p>
              ) : null}
              {status ? (
                <p
                  data-testid="settings-success"
                  className={cm.cn(cm.textSize('sm'), 'text-primary')}
                >
                  {status}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !user?.id}
              data-testid="settings-save"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.save', {}, { defaultValue: 'Save settings' })}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}

function Field({ id, label, value, onChange }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-1.5')}>
      <label
        htmlFor={id}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={id}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          'bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-0',
        )}
      />
    </div>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'cursor-pointer')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
      <input
        type="checkbox"
        id={id}
        data-testid={`settings-toggle-${id}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn('sr-only peer')}
      />
      <span
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-outline-variant peer-checked:bg-primary',
        )}
        aria-hidden="true"
      >
        <span
          className={cm.cn(
            'absolute left-1 inline-block h-4 w-4 rounded-full bg-on-primary transition-transform peer-checked:translate-x-5',
          )}
        />
      </span>
    </label>
  )
}
