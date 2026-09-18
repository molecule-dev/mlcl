import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

interface Preferences {
  lowStockThreshold: number
  autoAllocateRush: boolean
  defaultCarrier: 'usps' | 'ups' | 'fedex' | 'dhl'
  notifyShipments: boolean
  notifyLowStock: boolean
}

const DEFAULTS: Preferences = {
  lowStockThreshold: 10,
  autoAllocateRush: true,
  defaultCarrier: 'usps',
  notifyShipments: true,
  notifyLowStock: true,
}

interface UserWithBlob {
  id: string
  oauthData?: Record<string, unknown> | null
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<UserWithBlob>()
  const userId = auth.user?.id ?? null
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<{
          props?: { oauthData?: { warehousePrefs?: Partial<Preferences> } }
        }>(`/users/${userId}`)
        if (cancelled) return
        const oauthData = res?.data?.props?.oauthData ?? {}
        const stored = oauthData.warehousePrefs ?? {}
        setPrefs({ ...DEFAULTS, ...stored })
      } catch (_error) {
        if (!cancelled)
          setError(t('settings.loadError', {}, { defaultValue: 'Could not load settings.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, userId, t])

  async function save() {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      await http.patch(`/users/${userId}`, {
        oauthData: { warehousePrefs: prefs },
      })
      // Refresh the cached auth user so consumers (e.g. the new-shipment carrier default) pick up
      // the saved prefs without a re-login.
      if (auth.user) {
        auth.setUser({
          ...auth.user,
          oauthData: { ...(auth.user.oauthData ?? {}), warehousePrefs: prefs },
        })
      }
      setSavedAt(new Date())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save settings.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="settings-page">
      <header className={cm.stack(1)}>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('settings.eyebrow', {}, { defaultValue: 'Configuration' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.title', {}, { defaultValue: 'Warehouse settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Defaults that apply across orders, inventory, and shipments.' },
          )}
        </p>
      </header>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(5),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
        data-testid="settings-form"
      >
        {loading ? (
          <p className={cm.textMuted}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <>
            <div className={cm.stack(2)}>
              <label
                htmlFor="set-low-stock"
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t(
                  'settings.lowStockThreshold',
                  {},
                  { defaultValue: 'Low-stock alert threshold (units)' },
                )}
              </label>
              <input
                id="set-low-stock"
                type="number"
                min={0}
                max={1000}
                value={prefs.lowStockThreshold}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, lowStockThreshold: Number(e.target.value) }))
                }
                data-testid="settings-low-stock"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-32 rounded-lg border border-outline-variant bg-surface text-on-surface',
                )}
              />
            </div>

            <div className={cm.stack(2)}>
              <label
                htmlFor="set-carrier"
                className={cm.cn(
                  'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t('settings.defaultCarrier', {}, { defaultValue: 'Default carrier' })}
              </label>
              <select
                id="set-carrier"
                value={prefs.defaultCarrier}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    defaultCarrier: e.target.value as Preferences['defaultCarrier'],
                  }))
                }
                data-testid="settings-carrier"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant bg-surface text-on-surface w-40',
                )}
              >
                <option value="usps">USPS</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="dhl">DHL</option>
              </select>
            </div>

            <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2))}>
              <input
                type="checkbox"
                checked={prefs.autoAllocateRush}
                onChange={(e) => setPrefs((p) => ({ ...p, autoAllocateRush: e.target.checked }))}
                data-testid="settings-auto-allocate"
              />
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                {t(
                  'settings.autoAllocate',
                  {},
                  { defaultValue: 'Auto-assign rush orders to next available picker' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2))}>
              <input
                type="checkbox"
                checked={prefs.notifyShipments}
                onChange={(e) => setPrefs((p) => ({ ...p, notifyShipments: e.target.checked }))}
                data-testid="settings-notify-shipments"
              />
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                {t(
                  'settings.notifyShipments',
                  {},
                  { defaultValue: 'Notify me when shipments clear' },
                )}
              </span>
            </label>
            <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2))}>
              <input
                type="checkbox"
                checked={prefs.notifyLowStock}
                onChange={(e) => setPrefs((p) => ({ ...p, notifyLowStock: e.target.checked }))}
                data-testid="settings-notify-low-stock"
              />
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                {t('settings.notifyLowStock', {}, { defaultValue: 'Notify me on low-stock SKUs' })}
              </span>
            </label>

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                data-testid="settings-save"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('settings.save', {}, { defaultValue: 'Save settings' })}
              </button>
              {savedAt && (
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-stock-in')}
                  data-testid="settings-saved"
                >
                  {t(
                    'common.savedAt',
                    { time: savedAt.toLocaleTimeString() },
                    { defaultValue: 'Saved at {{time}}' },
                  )}
                </span>
              )}
              {error && (
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-error')}
                  data-testid="settings-error"
                >
                  {error}
                </span>
              )}
            </div>
          </>
        )}
      </article>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
        data-testid="settings-language"
      >
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
        >
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </article>
      <article
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(3),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
        )}
        data-testid="settings-appearance"
      >
        <h2
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
        >
          {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t('common.toggleLightDark', {}, { defaultValue: 'Toggle between light and dark mode.' })}
        </p>
        <ThemeToggle />
      </article>
    </div>
  )
}

export default Settings
