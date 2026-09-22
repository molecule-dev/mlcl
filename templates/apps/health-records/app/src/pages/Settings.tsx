import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { t as tGlobal } from '@molecule/app-i18n'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ProfileBundle {
  name: string
  email: string
  twoFactorEnabled: boolean
  profile: Record<string, string | undefined>
  emergency_contacts: Array<{ name: string; relation?: string; phone?: string; email?: string }>
  preferences: {
    refillReminders?: boolean
    abnormalLabAlerts?: boolean
    sharingRequests?: boolean
  }
  security: {
    lastEncryptionKeyRotation?: string
    encryptionKeyVersion?: number
    encryptionKeyFingerprint?: string
    encryptionKeyHistory?: Array<{ version: number; fingerprint: string; rotatedAt: string }>
  }
}

interface DeviceRow {
  id: string
  name?: string | null
  isCurrent?: boolean | null
  createdAt?: string
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

interface ExportSummary {
  user: { id: string; email: string; name: string }
  generated_at: string
  counts: Record<string, number>
}

function relativeDays(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
  if (days === 0) return tGlobal('status.today', undefined, { defaultValue: 'Today' })
  if (days === 1) return tGlobal('status.yesterday', undefined, { defaultValue: 'Yesterday' })
  return tGlobal('status.daysAgo', { days }, { defaultValue: '{{days}} days ago' })
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()

  const [bundle, setBundle] = useState<ProfileBundle | null>(null)
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<{ key: string; ts: number } | null>(null)

  // Modals
  const [showRotateModal, setShowRotateModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportData, setExportData] = useState<unknown>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditEvents, setAuditEvents] = useState<Array<{ when: string; what: string }>>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  // Two-factor (TOTP) enrollment
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Per-device session revocation
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  const loadBundle = async () => {
    try {
      const res = await http.get('/api/profile/me')
      const b = unwrapSingle<ProfileBundle>(res)
      if (b) setBundle(b)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' }),
      )
    }
  }

  const loadDevices = async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // devices endpoint is optional; missing data leaves the list empty — safe to ignore
    }
  }

  useEffect(() => {
    loadBundle()
    loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flashSaved = (key: string) => setSavedAt({ key, ts: Date.now() })

  const setPreference = async (key: keyof ProfileBundle['preferences'], value: boolean) => {
    if (!bundle) return
    setBusy(key)
    setError(null)
    setBundle({ ...bundle, preferences: { ...bundle.preferences, [key]: value } })
    try {
      const res = await http.patch('/api/profile/me', { preferences: { [key]: value } })
      const b = unwrapSingle<ProfileBundle>(res)
      if (b) setBundle(b)
      flashSaved(`pref:${key}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.prefError', {}, { defaultValue: 'Could not save preference.' }),
      )
      await loadBundle()
    } finally {
      setBusy(null)
    }
  }

  const closeTwoFactor = () => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Real TOTP enrollment against POST /api/users/:id/verify-two-factor.
  // Enable → {action:'setup'} returns a QR code + secret to scan, then the
  // user enters a 6-digit code → {action:'enable', token}. Disable → the user
  // enters a current code → {action:'disable', token}. This replaces the prior
  // boolean PATCH (a field the update handler ignores, so it never enrolled).
  const startTwoFactorSetup = async () => {
    if (!user) return
    setTfError('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${user.id}/verify-two-factor`, { action: 'setup' })
      const setup = unwrapSingle<TwoFactorSetup>(res)
      if (setup) setTfSetup(setup)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const openTwoFactor = () => {
    setTfError('')
    setTfToken('')
    if (bundle?.twoFactorEnabled) {
      setTfModal('disable')
    } else {
      void startTwoFactorSetup()
    }
  }

  const submitTwoFactor = async (action: 'enable' | 'disable') => {
    if (!user) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user.id}/verify-two-factor`, { action, token: tfToken })
      if (bundle) setBundle({ ...bundle, twoFactorEnabled: action === 'enable' })
      flashSaved('2fa')
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorInvalidCode',
              {},
              { defaultValue: 'Invalid code. Please try again.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const revokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    setError(null)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settings.deviceRevokeError',
              {},
              { defaultValue: 'Could not sign out that device.' },
            ),
      )
    } finally {
      setRevokingDeviceId(null)
    }
  }

  const rotateEncryptionKey = async () => {
    setBusy('rotate')
    setError(null)
    try {
      const res = await http.post('/api/profile/me/rotate-key', {})
      const b = unwrapSingle<ProfileBundle>(res)
      if (b) setBundle(b)
      track({
        name: 'settings.key_rotated',
        properties: { key_version: b?.security?.encryptionKeyVersion ?? null },
      })
      flashSaved('rotate')
      setShowRotateModal(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.rotateError', {}, { defaultValue: 'Could not rotate key.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(pwCurrent, pwNew)
      track({ name: 'settings.password_changed', properties: {} })
      setShowPasswordModal(false)
      setPwCurrent('')
      setPwNew('')
      resetPw()
      flashSaved('password')
    } catch (_error) {
      // error is captured in pwError from the hook and displayed in the UI — no further handling needed
    }
  }

  const exportData_ = async () => {
    setBusy('export')
    setError(null)
    try {
      const [
        profile,
        conditions,
        allergies,
        medications,
        labs,
        vitals,
        immunizations,
        documents,
        visits,
        notifications,
        sharing,
      ] = await Promise.all([
        http.get('/api/profile/me'),
        http.get('/api/conditions'),
        http.get('/api/allergies'),
        http.get('/api/medications'),
        http.get('/api/labs'),
        http.get('/api/vitals'),
        http.get('/api/immunizations'),
        http.get('/api/documents'),
        http.get('/api/visits'),
        http.get('/api/notifications'),
        http.get('/api/sharing'),
      ])
      const dump = {
        user: unwrapSingle(profile),
        conditions: unwrapList(conditions),
        allergies: unwrapList(allergies),
        medications: unwrapList(medications),
        labs: unwrapList(labs),
        vitals: unwrapList(vitals),
        immunizations: unwrapList(immunizations),
        documents: unwrapList(documents),
        visits: unwrapList(visits),
        notifications: unwrapList(notifications),
        sharing: unwrapList(sharing),
        generated_at: new Date().toISOString(),
      }
      setExportData(dump)
      setShowExportModal(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.exportError', {}, { defaultValue: 'Export failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const downloadExport = () => {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${APP_NAME.toLowerCase()}-${(user?.email ?? 'export').replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const loadAudit = async () => {
    setBusy('audit')
    setError(null)
    try {
      const [notif, doc, vis, lab, med] = await Promise.all([
        http.get('/api/notifications'),
        http.get('/api/documents'),
        http.get('/api/visits'),
        http.get('/api/labs'),
        http.get('/api/medications'),
      ])
      const events: Array<{ when: string; what: string }> = []
      for (const n of unwrapList<{
        created_at?: string
        kind?: string
        payload?: Record<string, unknown> | string
      }>(notif)) {
        const payload = typeof n.payload === 'string' ? safeJson(n.payload) : (n.payload ?? {})
        events.push({
          when: n.created_at ?? new Date().toISOString(),
          what: `Notification · ${n.kind ?? '—'} · ${(payload as Record<string, unknown>)?.title ?? ''}`,
        })
      }
      for (const d of unwrapList<{ uploaded_at?: string; created_at?: string; title?: string }>(
        doc,
      )) {
        events.push({
          when: d.uploaded_at ?? d.created_at ?? new Date().toISOString(),
          what: `Document uploaded · ${d.title ?? '—'}`,
        })
      }
      for (const v of unwrapList<{
        scheduled_at?: string
        created_at?: string
        chief_complaint?: string
      }>(vis)) {
        events.push({
          when: v.scheduled_at ?? v.created_at ?? new Date().toISOString(),
          what: `Visit · ${v.chief_complaint ?? '—'}`,
        })
      }
      for (const l of unwrapList<{
        collected_date?: string
        created_at?: string
        test_name?: string
      }>(lab)) {
        events.push({
          when: l.collected_date ?? l.created_at ?? new Date().toISOString(),
          what: `Lab result · ${l.test_name ?? '—'}`,
        })
      }
      for (const m of unwrapList<{ start_date?: string; created_at?: string; name?: string }>(
        med,
      )) {
        events.push({
          when: m.start_date ?? m.created_at ?? new Date().toISOString(),
          what: `Medication · ${m.name ?? '—'}`,
        })
      }
      events.sort((a, b) => b.when.localeCompare(a.when))
      setAuditEvents(events.slice(0, 50))
      setShowAuditModal(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.auditError', {}, { defaultValue: 'Audit log unavailable.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy('delete')
    setError(null)
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.deleteError', {}, { defaultValue: 'Account delete failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sessionsLine = useMemo(
    () =>
      devices.length === 1
        ? t('settings.deviceCountOne', {}, { defaultValue: '1 device' })
        : t(
            'settings.deviceCount',
            { count: devices.length },
            { defaultValue: '{{count}} devices' },
          ),
    [devices, t],
  )
  const dobLine = bundle?.profile?.dateOfBirth ?? ''
  const emergencyLine =
    bundle && bundle.emergency_contacts[0]
      ? `${bundle.emergency_contacts[0].name}${bundle.emergency_contacts[0].phone ? ` · ${bundle.emergency_contacts[0].phone}` : ''}`
      : t('settings.noEmergencySet', {}, { defaultValue: 'Not set' })

  if (!bundle) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-settings">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-settings">
      <div className={cm.cn(cm.sp('mb', 8))}>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Tune what gets encrypted, who gets notified, and how your records leave the platform.',
            },
          )}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          data-mol-id="settings-error"
          className={cm.cn(cm.sp('mb', 4), 'text-error font-bold text-sm')}
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        {/* Security & encryption */}
        <Section
          icon="lock"
          title={t('settings.section.security', {}, { defaultValue: 'Security & encryption' })}
          cm={cm}
        >
          <SettingRow
            cm={cm}
            label={t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
            value={
              bundle.twoFactorEnabled
                ? t('settings.twoFactorOn', {}, { defaultValue: 'Enabled' })
                : t('settings.twoFactorOff', {}, { defaultValue: 'Disabled' })
            }
            action={
              bundle.twoFactorEnabled
                ? t('settings.twoFactorTurnOff', {}, { defaultValue: 'Turn off' })
                : t('settings.twoFactorTurnOn', {}, { defaultValue: 'Turn on' })
            }
            onClick={openTwoFactor}
            disabled={tfLoading}
            molId="set-two-factor"
            saved={savedAt?.key === '2fa'}
          />
          <SettingRow
            cm={cm}
            label={t('auth.login.password', {}, { defaultValue: 'Password' })}
            value={t(
              'settings.passwordValue',
              {},
              { defaultValue: 'Change your account password' },
            )}
            action={t('settings.changeAction', {}, { defaultValue: 'Change' })}
            onClick={() => setShowPasswordModal(true)}
            molId="set-change-password"
            saved={savedAt?.key === 'password'}
          />
          <SettingRow
            cm={cm}
            label={t(
              'settings.item.security.encryptionKey.label',
              {},
              { defaultValue: 'Encryption key' },
            )}
            value={
              bundle.security?.encryptionKeyFingerprint
                ? t(
                    'settings.encryptionKeyValue',
                    {
                      version: bundle.security.encryptionKeyVersion ?? 1,
                      fingerprint: bundle.security.encryptionKeyFingerprint.slice(0, 8),
                      when: relativeDays(bundle.security?.lastEncryptionKeyRotation),
                    },
                    { defaultValue: 'v{{version}} · {{fingerprint}}… · last rotated {{when}}' },
                  )
                : t(
                    'settings.encryptionKeyRotated',
                    { when: relativeDays(bundle.security?.lastEncryptionKeyRotation) },
                    { defaultValue: 'Last rotated {{when}}' },
                  )
            }
            action={t('settings.rotateNow', {}, { defaultValue: 'Rotate now' })}
            onClick={() => setShowRotateModal(true)}
            molId="set-rotate-key"
            saved={savedAt?.key === 'rotate'}
          />
          <SettingRow
            cm={cm}
            label={t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
            value={sessionsLine}
            action={t('settings.review', {}, { defaultValue: 'Review' })}
            onClick={() => setShowSessionsModal(true)}
            molId="set-review-sessions"
            saved={false}
          />
        </Section>

        {/* Profile & contact */}
        <Section
          icon="person"
          title={t('settings.section.profile', {}, { defaultValue: 'Profile & contact' })}
          cm={cm}
        >
          <SettingRow
            cm={cm}
            label={t('settings.item.profile.name.label', {}, { defaultValue: 'Legal name' })}
            value={bundle.name || t('settings.unnamed', {}, { defaultValue: '— Not set —' })}
            action={t('common.edit', {}, { defaultValue: 'Edit' })}
            onClick={() => navigate('/profile')}
            molId="set-edit-name"
            saved={false}
          />
          <SettingRow
            cm={cm}
            label={t('settings.item.profile.dob.label', {}, { defaultValue: 'Date of birth' })}
            value={dobLine || t('settings.dobUnset', {}, { defaultValue: 'Not set' })}
            action={t('common.edit', {}, { defaultValue: 'Edit' })}
            onClick={() => navigate('/profile')}
            molId="set-edit-dob"
            saved={false}
          />
          <SettingRow
            cm={cm}
            label={t(
              'settings.item.profile.emergency.label',
              {},
              { defaultValue: 'Emergency contact' },
            )}
            value={emergencyLine}
            action={t('common.edit', {}, { defaultValue: 'Edit' })}
            onClick={() => navigate('/profile')}
            molId="set-edit-emergency"
            saved={false}
          />
        </Section>

        {/* Notifications */}
        <Section
          icon="notifications"
          title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          cm={cm}
        >
          <ToggleRow
            cm={cm}
            label={t(
              'settings.item.notifications.refills.label',
              {},
              { defaultValue: 'Refill reminders' },
            )}
            description={t(
              'settings.item.notifications.refills.value',
              {},
              { defaultValue: 'Notify a few days before each refill runs out.' },
            )}
            checked={!!bundle.preferences.refillReminders}
            disabled={busy === 'refillReminders'}
            onChange={(v) => setPreference('refillReminders', v)}
            molId="pref-refillReminders"
            saved={savedAt?.key === 'pref:refillReminders'}
          />
          <ToggleRow
            cm={cm}
            label={t(
              'settings.item.notifications.abnormal.label',
              {},
              { defaultValue: 'Abnormal lab alerts' },
            )}
            description={t(
              'settings.item.notifications.abnormal.value',
              {},
              { defaultValue: 'Notify when a lab result is flagged out of range.' },
            )}
            checked={!!bundle.preferences.abnormalLabAlerts}
            disabled={busy === 'abnormalLabAlerts'}
            onChange={(v) => setPreference('abnormalLabAlerts', v)}
            molId="pref-abnormalLabAlerts"
            saved={savedAt?.key === 'pref:abnormalLabAlerts'}
          />
          <ToggleRow
            cm={cm}
            label={t(
              'settings.item.notifications.sharing.label',
              {},
              { defaultValue: 'Sharing requests' },
            )}
            description={t(
              'settings.item.notifications.sharing.value',
              {},
              { defaultValue: 'Notify when someone requests record access.' },
            )}
            checked={!!bundle.preferences.sharingRequests}
            disabled={busy === 'sharingRequests'}
            onChange={(v) => setPreference('sharingRequests', v)}
            molId="pref-sharingRequests"
            saved={savedAt?.key === 'pref:sharingRequests'}
          />
        </Section>

        {/* Language */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-language"
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-lg bg-primary-container text-on-primary-container',
              )}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">language</span>
            </div>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </section>

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
        {/* Your data */}
        <Section
          icon="download"
          title={t('settings.section.data', {}, { defaultValue: 'Your data' })}
          cm={cm}
        >
          <SettingRow
            cm={cm}
            label={t('settings.item.data.export.label', {}, { defaultValue: 'Export full record' })}
            value={t(
              'settings.item.data.export.value',
              {},
              { defaultValue: 'JSON bundle of every entity in your account.' },
            )}
            action={
              busy === 'export'
                ? t('settings.exporting', {}, { defaultValue: 'Preparing…' })
                : t('common.export', {}, { defaultValue: 'Export' })
            }
            onClick={exportData_}
            disabled={busy === 'export'}
            molId="set-export"
            saved={false}
          />
          <SettingRow
            cm={cm}
            label={t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
            value={t(
              'settings.item.data.audit.value',
              {},
              { defaultValue: 'Recent activity across your records.' },
            )}
            action={t('settings.viewLog', {}, { defaultValue: 'View log' })}
            onClick={loadAudit}
            disabled={busy === 'audit'}
            molId="set-audit"
            saved={false}
          />
          <SettingRow
            cm={cm}
            label={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
            value={t(
              'settings.item.data.delete.value',
              { appName: APP_NAME },
              { defaultValue: 'Permanently erase all records on {{appName}}.' },
            )}
            action={t('common.delete', {}, { defaultValue: 'Delete' })}
            onClick={() => setShowDeleteModal(true)}
            molId="set-delete"
            saved={false}
            danger
          />
        </Section>

        <button
          type="button"
          onClick={handleLogout}
          className={cm.cn(
            cm.fontWeight('bold'),
            'mt-4 self-center px-6 py-3 rounded-full bg-error text-on-error text-[11px] uppercase tracking-widest hover:opacity-90',
          )}
          data-mol-id="set-logout"
        >
          {t('settings.logOut', {}, { defaultValue: 'Log out' })}
        </button>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
        <Link
          to="/profile"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-primary hover:underline',
          )}
        >
          {t('settings.viewProfile', {}, { defaultValue: 'View patient profile →' })}
        </Link>
      </div>

      {/* === Modals === */}

      {showRotateModal && (
        <Modal
          title={t('settings.rotateModalTitle', {}, { defaultValue: 'Rotate encryption key' })}
          onClose={() => setShowRotateModal(false)}
          cm={cm}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-4')}>
            {t(
              'settings.rotateBody',
              {},
              {
                defaultValue:
                  'Rotating your encryption key forces all future record reads to use a new key. Past records remain readable. This is logged in your audit trail.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => setShowRotateModal(false)}
              className={btnGhostCls(cm)}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={rotateEncryptionKey}
              disabled={busy === 'rotate'}
              className={btnPrimaryCls(cm)}
              data-mol-id="rotate-confirm"
            >
              {busy === 'rotate'
                ? t('settings.rotating', {}, { defaultValue: 'Rotating…' })
                : t('settings.rotateNow', {}, { defaultValue: 'Rotate now' })}
            </button>
          </div>
        </Modal>
      )}

      {showSessionsModal && (
        <Modal
          title={t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
          onClose={() => {
            setShowSessionsModal(false)
            setConfirmingDeviceId(null)
          }}
          cm={cm}
        >
          {devices.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('settings.noDevices', {}, { defaultValue: 'No devices on file.' })}
            </p>
          ) : (
            <ul className={cm.cn('divide-y divide-outline-variant/20')} data-mol-id="sessions-list">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {d.name ||
                        t('settings.unnamedDevice', {}, { defaultValue: 'Unnamed device' })}
                    </p>
                    {d.createdAt && (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.connectedWhen',
                          { when: relativeDays(d.createdAt) },
                          { defaultValue: 'Connected {{when}}' },
                        )}
                      </p>
                    )}
                  </div>
                  {d.isCurrent ? (
                    <span
                      className={cm.cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary-container text-on-primary-container',
                      )}
                      data-mol-id={`device-current-${d.id}`}
                    >
                      {t('settings.currentDevice', {}, { defaultValue: 'Current' })}
                    </span>
                  ) : confirmingDeviceId === d.id ? (
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeviceId(null)}
                        disabled={revokingDeviceId === d.id}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'px-3 py-1 uppercase tracking-widest rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeDevice(d.id)}
                        disabled={revokingDeviceId === d.id}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'px-3 py-1 uppercase tracking-widest rounded-full border border-error text-error hover:bg-error-container disabled:opacity-50',
                        )}
                        data-mol-id={`device-revoke-confirm-${d.id}`}
                      >
                        {revokingDeviceId === d.id
                          ? t('settings.signingOut', {}, { defaultValue: 'Signing out…' })
                          : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDeviceId(d.id)}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'px-3 py-1 uppercase tracking-widest rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low',
                      )}
                      data-mol-id={`device-revoke-${d.id}`}
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'end' }))}>
            <button
              type="button"
              onClick={() => {
                setShowSessionsModal(false)
                setConfirmingDeviceId(null)
              }}
              className={btnPrimaryCls(cm)}
            >
              {t('common.done', {}, { defaultValue: 'Done' })}
            </button>
          </div>
        </Modal>
      )}

      {showPasswordModal && (
        <Modal
          title={t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          onClose={() => {
            setShowPasswordModal(false)
            resetPw()
          }}
          cm={cm}
        >
          <form onSubmit={handleChangePassword} className={cm.cn('space-y-3')}>
            <input
              type="password"
              required
              placeholder={t(
                'settings.currentPasswordPlaceholder',
                {},
                { defaultValue: 'Current password' },
              )}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className={inputCls(cm)}
              data-mol-id="pw-current"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder={t(
                'settings.newPasswordPlaceholder',
                {},
                { defaultValue: 'New password (8+ characters)' },
              )}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className={inputCls(cm)}
              data-mol-id="pw-new"
            />
            {pwError && (
              <p
                role="alert"
                data-mol-id="pw-error"
                className={cm.cn(cm.textSize('xs'), 'text-error font-bold')}
              >
                {pwError.message}
              </p>
            )}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className={btnGhostCls(cm)}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={pwStatus === 'pending'}
                className={btnPrimaryCls(cm)}
                data-mol-id="pw-submit"
              >
                {pwStatus === 'pending'
                  ? t('settings.changingPassword', {}, { defaultValue: 'Changing…' })
                  : t('settings.changePasswordAction', {}, { defaultValue: 'Change password' })}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showExportModal && exportData != null && (
        <Modal
          title={t('settings.exportReadyTitle', {}, { defaultValue: 'Your record export' })}
          onClose={() => setShowExportModal(false)}
          cm={cm}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-3')}>
            {t(
              'settings.exportReadyBody',
              {},
              { defaultValue: 'Your full record bundle is ready to download as JSON.' },
            )}
          </p>
          <ExportSummaryCard data={exportData as ExportSummary} cm={cm} />
          <div
            className={cm.cn(cm.flex({ justify: 'end', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}
          >
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className={btnGhostCls(cm)}
            >
              {t('common.close', {}, { defaultValue: 'Close' })}
            </button>
            <button
              type="button"
              onClick={downloadExport}
              className={btnPrimaryCls(cm)}
              data-mol-id="export-download"
            >
              {t('settings.downloadJson', {}, { defaultValue: 'Download JSON' })}
            </button>
          </div>
        </Modal>
      )}

      {showAuditModal && (
        <Modal
          title={t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
          onClose={() => setShowAuditModal(false)}
          cm={cm}
        >
          {auditEvents.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('settings.noActivity', {}, { defaultValue: 'No activity yet.' })}
            </p>
          ) : (
            <ul
              className={cm.cn('divide-y divide-outline-variant/20 max-h-96 overflow-y-auto')}
              data-mol-id="audit-events"
            >
              {auditEvents.map((e, i) => (
                <li
                  key={i}
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
                    cm.sp('py', 2),
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'))}>{e.what}</span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant whitespace-nowrap',
                    )}
                  >
                    {relativeDays(e.when)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'end' }))}>
            <button
              type="button"
              onClick={() => setShowAuditModal(false)}
              className={btnPrimaryCls(cm)}
            >
              {t('common.done', {}, { defaultValue: 'Done' })}
            </button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          title={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          onClose={() => setShowDeleteModal(false)}
          cm={cm}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-3')}>
            {t(
              'settings.deleteWarn',
              {},
              {
                defaultValue:
                  'This permanently erases your records, devices, and notifications. There is no undo.',
              },
            )}
          </p>
          <form onSubmit={handleDelete} className={cm.cn('space-y-3')}>
            <input
              type="password"
              required
              placeholder={t(
                'settings.confirmPasswordPlaceholder',
                {},
                { defaultValue: 'Confirm with your password' },
              )}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={inputCls(cm)}
              data-mol-id="delete-password"
            />
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={btnGhostCls(cm)}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={busy === 'delete'}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-error text-on-error disabled:opacity-50',
                )}
                data-mol-id="delete-confirm"
              >
                {busy === 'delete'
                  ? t('settings.deleting', {}, { defaultValue: 'Deleting…' })
                  : t('settings.deleteForever', {}, { defaultValue: 'Delete forever' })}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {tfModal && (
        <Modal
          title={
            tfModal === 'disable'
              ? t(
                  'settings.twoFactorDisableTitle',
                  {},
                  { defaultValue: 'Disable two-factor authentication' },
                )
              : t(
                  'settings.twoFactorEnableTitle',
                  {},
                  { defaultValue: 'Enable two-factor authentication' },
                )
          }
          onClose={closeTwoFactor}
          cm={cm}
        >
          {tfError && (
            <p
              role="alert"
              data-mol-id="tf-error"
              className={cm.cn(cm.sp('mb', 3), 'text-error font-bold text-sm')}
            >
              {tfError}
            </p>
          )}
          {tfModal === 'enable' && tfLoading && !tfSetup && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-3')}>
              {t(
                'settings.twoFactorPreparing',
                {},
                { defaultValue: 'Preparing your authenticator setup…' },
              )}
            </p>
          )}
          {tfModal === 'enable' && tfSetup?.QRImageUrl && (
            <div className={cm.cn('space-y-3', cm.sp('mb', 4))}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.twoFactorScan',
                  {},
                  {
                    defaultValue:
                      'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                  },
                )}
              </p>
              <img
                src={tfSetup.QRImageUrl}
                alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                className={cm.cn('mx-auto', cm.maxW('xs'))}
                data-mol-id="tf-qr"
              />
              {tfSetup.secret && (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant text-center break-all',
                  )}
                >
                  {tfSetup.secret}
                </p>
              )}
            </div>
          )}
          {(tfModal === 'disable' || tfSetup) && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void submitTwoFactor(tfModal === 'disable' ? 'disable' : 'enable')
              }}
              className={cm.cn('space-y-3')}
            >
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder={t(
                  'settings.twoFactorCode',
                  {},
                  { defaultValue: 'Authentication code' },
                )}
                value={tfToken}
                onChange={(e) => setTfToken(e.target.value)}
                className={inputCls(cm)}
                data-mol-id="tf-token"
              />
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
                <button type="button" onClick={closeTwoFactor} className={btnGhostCls(cm)}>
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={tfLoading}
                  className={
                    tfModal === 'disable'
                      ? cm.cn(
                          cm.fontWeight('bold'),
                          'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-error text-on-error disabled:opacity-50',
                        )
                      : btnPrimaryCls(cm)
                  }
                  data-mol-id="tf-submit"
                >
                  {tfModal === 'disable'
                    ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                    : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch (_error) {
    // invalid JSON falls back to empty object — safe to ignore
    return {}
  }
}

type CMTools = ReturnType<typeof getClassMap>

function Section({
  icon,
  title,
  cm,
  children,
}: {
  icon: string
  title: string
  cm: CMTools
  children: React.ReactNode
}) {
  return (
    <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-lg bg-primary-container text-on-primary-container',
          )}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
      </div>
      <ul className={cm.cn('divide-y divide-outline-variant/20')}>{children}</ul>
    </section>
  )
}

function SettingRow({
  cm,
  label,
  value,
  action,
  onClick,
  disabled,
  molId,
  saved,
  danger,
}: {
  cm: CMTools
  label: string
  value: string
  action: string
  onClick: () => void
  disabled?: boolean
  molId: string
  saved: boolean
  danger?: boolean
}) {
  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
        cm.sp('py', 4),
      )}
    >
      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{value}</p>
        {saved && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-clinical-normal font-bold uppercase tracking-widest mt-1',
            )}
            data-mol-id={`${molId}-saved`}
          >
            {tGlobal('common.saved', undefined, { defaultValue: 'Saved' })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        data-mol-id={molId}
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'px-4 py-2 uppercase tracking-widest rounded-full border transition-colors disabled:opacity-50',
          danger
            ? 'border-error text-error hover:bg-error-container'
            : 'border-outline-variant text-on-surface hover:bg-surface-container-low',
        )}
      >
        {action}
      </button>
    </li>
  )
}

function ToggleRow({
  cm,
  label,
  description,
  checked,
  disabled,
  onChange,
  molId,
  saved,
}: {
  cm: CMTools
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  molId: string
  saved: boolean
}) {
  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
        cm.sp('py', 4),
      )}
    >
      <div className="max-w-prose">
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{description}</p>
        {saved && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-clinical-normal font-bold uppercase tracking-widest mt-1',
            )}
            data-mol-id={`${molId}-saved`}
          >
            {tGlobal('common.saved', undefined, { defaultValue: 'Saved' })}
          </p>
        )}
      </div>
      <label className={cm.cn('relative inline-flex items-center cursor-pointer')}>
        <input
          type="checkbox"
          aria-label={label}
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          data-mol-id={molId}
        />
        <span
          aria-hidden
          className={cm.cn(
            'w-11 h-6 rounded-full transition-colors pointer-events-none',
            checked ? 'bg-primary' : 'bg-outline-variant',
          )}
        />
        <span
          aria-hidden
          className={cm.cn(
            'absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform pointer-events-none',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </label>
    </li>
  )
}

function Modal({
  title,
  onClose,
  children,
  cm,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  cm: CMTools
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface rounded-2xl shadow-xl w-[min(94vw,560px)] max-h-[90vh] overflow-y-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={tGlobal('common.close', undefined, { defaultValue: 'Close' })}
            className={cm.cn(
              'material-symbols-outlined text-on-surface-variant hover:text-on-surface',
            )}
          >
            close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ExportSummaryCard({ data, cm }: { data: unknown; cm: CMTools }) {
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const counts = Object.entries(obj)
    .filter(([k, v]) => k !== 'user' && k !== 'generated_at' && Array.isArray(v))
    .map(([k, v]) => [k, (v as unknown[]).length] as const)
  return (
    <ul className={cm.cn('grid grid-cols-2 sm:grid-cols-3 gap-3')} data-mol-id="export-summary">
      {counts.map(([k, n]) => (
        <li key={k} className={cm.cn(cm.sp('p', 3), 'bg-surface-container-low rounded-lg')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant font-bold',
            )}
          >
            {k.replace(/_/g, ' ')}
          </p>
          <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tabular-nums')}>
            {String(n)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function inputCls(cm: CMTools): string {
  return cm.cn(
    cm.sp('p', 3),
    'w-full bg-surface-container-low border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
  )
}

function btnPrimaryCls(cm: CMTools): string {
  return cm.cn(
    cm.fontWeight('bold'),
    'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md disabled:opacity-50',
  )
}

function btnGhostCls(cm: CMTools): string {
  return cm.cn(
    cm.fontWeight('bold'),
    'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-50',
  )
}
