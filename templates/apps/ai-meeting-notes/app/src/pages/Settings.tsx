import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import {
  Alert,
  Button,
  ConfirmButton,
  Input,
  LanguagePicker,
  Modal,
  Switch,
  ThemeToggle,
} from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

const SECTIONS = ['transcription', 'sharing', 'retention', 'language', 'account'] as const
type Section = (typeof SECTIONS)[number]

interface AccountUserProfile {
  id?: string
  oauthServer?: string | null
}

interface DeviceRow {
  id: string
  name?: string | null
  platform?: string | null
  isCurrent?: boolean
}

const TRANSCRIPTION_LANGUAGES = [
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Japanese',
]
const TRANSCRIPTION_SPEAKERS = ['Auto', 'Single speaker', 'Multi speaker (manual)']
const TRANSCRIPTION_PROFANITY = ['Off', 'Mask', 'Remove']

const SHARING_SCOPES = ['Private', 'Team', 'Public link']
const SHARING_FORMATS = ['Markdown', 'Plain text', 'PDF', 'JSON']

const RETENTION_AUDIO = ['7 days', '30 days', '90 days', '180 days', 'Forever']
const RETENTION_TRANSCRIPT = ['30 days', '90 days', '1 year', 'Forever']

interface AppSettings {
  transcription: {
    language: string
    speakers: string
    profanity: string
  }
  sharing: {
    scope: string
    exportFormat: string
  }
  retention: {
    audio: string
    transcript: string
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  transcription: { language: 'English (US)', speakers: 'Auto', profanity: 'Off' },
  sharing: { scope: 'Team', exportFormat: 'Markdown' },
  retention: { audio: '90 days', transcript: 'Forever' },
}

/**
 * Server-side settings channel (`/api/settings/me`). The platform user
 * resource never returns `oauthData` on reads, so persisted settings MUST
 * round-trip through this channel — GET/PATCH against /api/users/:id would
 * silently reset to defaults.
 */
interface SettingsMeResponse {
  id: string
  settings?: Partial<AppSettings>
}

function mergeSettings(stored?: Partial<AppSettings>): AppSettings {
  return {
    transcription: { ...DEFAULT_SETTINGS.transcription, ...stored?.transcription },
    sharing: { ...DEFAULT_SETTINGS.sharing, ...stored?.sharing },
    retention: { ...DEFAULT_SETTINGS.retention, ...stored?.retention },
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [section, setSection] = useState<Section>('transcription')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [savedSettings, setSavedSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<SettingsMeResponse>('/api/settings/me')
      const merged = mergeSettings(res.data?.settings)
      setSettings(merged)
      setSavedSettings(merged)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  )

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveStatus('idle')
    try {
      await http.patch<SettingsMeResponse>('/api/settings/me', { settings })
      setSavedSettings(settings)
      setSaveStatus('saved')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Save failed.' }),
      )
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setSettings(savedSettings)
    setSaveStatus('idle')
    setError(null)
  }

  return (
    <div
      data-mol-id="settings-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}
    >
      <aside className={'col-span-12 md:col-span-3'}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
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
                data-mol-id={`settings-section-${s}`}
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
        {loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <>
            {section === 'transcription' && (
              <section
                data-mol-id="settings-section-transcription-panel"
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.transcription.heading', {}, { defaultValue: 'Transcription' })}
                </h2>
                <SelectField
                  molId="settings-transcription-language"
                  label={t('footer.language', {}, { defaultValue: 'Language' })}
                  options={TRANSCRIPTION_LANGUAGES}
                  value={settings.transcription.language}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      transcription: { ...settings.transcription, language: v },
                    })
                  }
                />
                <SelectField
                  molId="settings-transcription-speakers"
                  label={t(
                    'settings.transcription.speakers',
                    {},
                    { defaultValue: 'Speaker diarization' },
                  )}
                  options={TRANSCRIPTION_SPEAKERS}
                  value={settings.transcription.speakers}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      transcription: { ...settings.transcription, speakers: v },
                    })
                  }
                />
                <SelectField
                  molId="settings-transcription-profanity"
                  label={t(
                    'settings.transcription.profanity',
                    {},
                    { defaultValue: 'Profanity filter' },
                  )}
                  options={TRANSCRIPTION_PROFANITY}
                  value={settings.transcription.profanity}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      transcription: { ...settings.transcription, profanity: v },
                    })
                  }
                />
              </section>
            )}

            {section === 'sharing' && (
              <section
                data-mol-id="settings-section-sharing-panel"
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.sharing.heading', {}, { defaultValue: 'Sharing defaults' })}
                </h2>
                <SelectField
                  molId="settings-sharing-scope"
                  label={t('settings.sharing.scope', {}, { defaultValue: 'Default share scope' })}
                  options={SHARING_SCOPES}
                  value={settings.sharing.scope}
                  onChange={(v) =>
                    setSettings({ ...settings, sharing: { ...settings.sharing, scope: v } })
                  }
                />
                <SelectField
                  molId="settings-sharing-exportFormat"
                  label={t('settings.sharing.exportFormat', {}, { defaultValue: 'Export format' })}
                  options={SHARING_FORMATS}
                  value={settings.sharing.exportFormat}
                  onChange={(v) =>
                    setSettings({ ...settings, sharing: { ...settings.sharing, exportFormat: v } })
                  }
                />
              </section>
            )}

            {section === 'retention' && (
              <section
                data-mol-id="settings-section-retention-panel"
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.retention.heading', {}, { defaultValue: 'Retention' })}
                </h2>
                <SelectField
                  molId="settings-retention-audio"
                  label={t('settings.retention.audio', {}, { defaultValue: 'Keep audio for' })}
                  options={RETENTION_AUDIO}
                  value={settings.retention.audio}
                  onChange={(v) =>
                    setSettings({ ...settings, retention: { ...settings.retention, audio: v } })
                  }
                />
                <SelectField
                  molId="settings-retention-transcript"
                  label={t(
                    'settings.retention.transcript',
                    {},
                    { defaultValue: 'Keep transcripts for' },
                  )}
                  options={RETENTION_TRANSCRIPT}
                  value={settings.retention.transcript}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      retention: { ...settings.retention, transcript: v },
                    })
                  }
                />
              </section>
            )}

            {section === 'language' && (
              <section
                data-mol-id="settings-section-language-panel"
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.language.heading', {}, { defaultValue: 'App language' })}
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

            {section === 'account' && <AccountManagementSection />}

            {error ? (
              <p
                data-mol-id="settings-error"
                role="alert"
                className={cm.cn(cm.textSize('sm'), 'text-error')}
              >
                {error}
              </p>
            ) : null}
            {saveStatus === 'saved' && !dirty ? (
              <p
                data-mol-id="settings-saved"
                role="status"
                className={cm.cn(cm.textSize('sm'), 'text-success')}
              >
                {t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' })}
              </p>
            ) : null}

            <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                data-mol-id="settings-cancel"
                onClick={handleCancel}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant hover:bg-surface-container rounded-md transition-colors disabled:opacity-50',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="settings-save"
                onClick={handleSave}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </>
        )}
      </main>
      <section
        className={cm.cn('col-span-12', cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}
      >
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

function SelectField({
  label,
  options,
  value,
  onChange,
  molId,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <select
        data-mol-id={molId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'w-full border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30',
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function AccountManagementSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { user, logout } = useAuth<AccountUserProfile>()
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetPasswordState,
  } = useChangePassword()
  const { permission, requestPermission, register, unregister } = usePush()

  const isOAuthUser = Boolean(user?.oauthServer)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')
  const [pushBusy, setPushBusy] = useState(false)

  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // The devices endpoint is optional; render an empty list when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const revokeDevice = async (id: string) => {
    try {
      await http.delete(`/api/devices/${id}`)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPasswordState()
    } catch (_error) {
      // The error is surfaced via `pwError` from the hook; keep the modal open.
    }
  }

  const handleTogglePush = async (next: boolean) => {
    setPushBusy(true)
    try {
      if (next) {
        await requestPermission()
        await register()
        setPushEnabled(true)
      } else {
        await unregister()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Permission denied or service worker unavailable — the switch stays put.
    } finally {
      setPushBusy(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const cardClass = cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')
  const headingClass = cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))
  const fieldLabelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))

  return (
    <div data-mol-id="settings-section-account-panel" className="space-y-4">
      {!isOAuthUser && (
        <section data-mol-id="settings-account-security" className={cardClass}>
          <div>
            <h2 className={headingClass}>
              {t('settings.authentication', {}, { defaultValue: 'Sign-in & security' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'settings.security.subheading',
                {},
                { defaultValue: 'Update the password you use to sign in.' },
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
            data-mol-id="account-change-password"
          >
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </section>
      )}

      <section data-mol-id="settings-account-push" className={cardClass}>
        <div>
          <h2 className={headingClass}>
            {t('settings.push.heading', {}, { defaultValue: 'Push notifications' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.push.subheading',
              {},
              { defaultValue: 'Get browser alerts for mentions, action items, and summaries.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
          <span className={cm.textSize('sm')}>
            {t('settings.pushNotifications', {}, { defaultValue: 'Enable push notifications' })}
          </span>
          <Switch
            aria-label={t(
              'settings.pushNotifications',
              {},
              { defaultValue: 'Enable push notifications' },
            )}
            checked={pushEnabled}
            disabled={pushBusy}
            onChange={(e) => handleTogglePush((e.target as HTMLInputElement).checked)}
            size="sm"
          />
        </div>
      </section>

      <section data-mol-id="settings-account-devices" className={cardClass}>
        <h2 className={headingClass}>{t('settings.devices', {}, { defaultValue: 'Devices' })}</h2>
        {devicesLoading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length > 0 ? (
          <ul className="space-y-2" data-mol-id="account-devices-list">
            {devices.map((device) => (
              <li key={device.id} className={cm.textSize('sm')}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('py', 1),
                  )}
                >
                  <span className="min-w-0">
                    {device.name ||
                      device.platform ||
                      t('settings.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                    {device.isCurrent ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('ml', 2),
                        )}
                      >
                        {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                      </span>
                    ) : device.platform ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('ml', 2),
                        )}
                      >
                        {device.platform}
                      </span>
                    ) : null}
                  </span>
                  {device.isCurrent ? null : (
                    /* Shared two-step confirm (arm -> "Confirm sign-out?" ->
                       commit, Escape/auto-disarm) replacing the hand-rolled
                       Cancel + Confirm pair. One element for all states, so
                       the e2e contract collapses onto `device-revoke`. */
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      label={t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      confirmLabel={t(
                        'settings.signOutDeviceConfirm',
                        {},
                        { defaultValue: 'Confirm sign-out?' },
                      )}
                      onConfirm={() => revokeDevice(device.id)}
                      data-mol-id="device-revoke"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.noDevices', {}, { defaultValue: 'No devices registered yet.' })}
          </p>
        )}
      </section>

      <section
        data-mol-id="settings-account-danger"
        className={cm.cn(cardClass, 'border border-error/40')}
      >
        <div>
          <h2 className={cm.cn(headingClass, 'text-error')}>
            {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.deleteAccountModal.warning',
              {},
              {
                defaultValue:
                  'Permanently delete your account and all associated data. This cannot be undone.',
              },
            )}
          </p>
        </div>
        <Button
          color="error"
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteModal(true)}
          data-mol-id="account-delete-account"
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </Button>
      </section>

      <Modal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          resetPasswordState()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Could not change password.' },
              )}
          </Alert>
        ) : null}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="account-current-pw" className={fieldLabelClass}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="account-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="account-new-pw" className={fieldLabelClass}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="account-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button
            type="submit"
            fullWidth
            loading={pwStatus === 'pending'}
            data-mol-id="account-change-password-submit"
          >
            {pwStatus === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'Permanently delete your account and all associated data. This cannot be undone.',
            },
          )}
        </p>
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div>
            <label htmlFor="account-delete-pw" className={fieldLabelClass}>
              {t(
                'settings.deleteAccountModal.password',
                {},
                { defaultValue: 'Confirm your password' },
              )}
            </label>
            <Input
              id="account-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button
            type="submit"
            color="error"
            fullWidth
            loading={deleting}
            data-mol-id="account-delete-account-submit"
          >
            {deleting
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
