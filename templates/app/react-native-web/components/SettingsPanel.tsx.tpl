import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useDevice,
  useVersion,
  useTranslation,
} from '@molecule/app-react'
import {
  Button,
  Input,
  Switch,
  Alert,
  Separator,
  Spinner,
  Modal,
  Flex,
} from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'
import { Footer } from './Footer.js'

interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  useVersion()
  const { permission, requestPermission, register: registerPush, unregister: unregisterPush } = usePush()
  const { deviceInfo } = useDevice()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()

  // Email editing
  const [email, setEmail] = useState(user?.email || '')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)

  // Devices
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)

  // Plan
  const [plan] = useState<string>('Free')

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')

  const loadDevices = useCallback(async () => {
    try {
      const response = await http.get<{ data: Device[] }>('/devices')
      setDevices(response.data.data || [])
    } catch (_error) {
      // Devices may not be available
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleEmailBlur = async () => {
    if (email === user?.email || !email) return
    setEmailSaving(true)
    setEmailError('')
    try {
      await http.patch(`/users/${user?.id}`, { data: { email } })
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('settings.failedToUpdateEmail'))
      setEmail(user?.email || '')
    } finally {
      setEmailSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
    } catch (_error) {
      // Error tracked in hook state
    }
  }

  const handleToggle2FA = async (enabled: boolean) => {
    setTwoFactorLoading(true)
    try {
      await http.patch(`/users/${user?.id}`, { data: { twoFactorEnabled: enabled } })
      setTwoFactorEnabled(enabled)
    } catch (_error) {
      // Revert on failure
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const handleTogglePush = async (enabled: boolean) => {
    try {
      if (enabled) {
        await requestPermission()
        await registerPush()
        setPushEnabled(true)
      } else {
        await unregisterPush()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Permission may be denied
    }
  }

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      onClose()
      navigate('/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('settings.failedToDeleteAccount'))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6))}>
      {/* Account */}
      <section>
        <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
          <h3 className={cm.sectionHeading}>
            {t('settings.account')}
          </h3>
          {emailSaving && <Spinner size="xs" />}
        </Flex>
        <div>
          <label htmlFor="settings-email" className={cm.formLabelSmall}>{t('settings.email')}</label>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            onBlur={handleEmailBlur}
            size="sm"
          />
          {emailError && <p className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>{emailError}</p>}
        </div>
      </section>

      {/* Authentication — hidden for OAuth users */}
      {!(user as unknown as Record<string, unknown>)?.oauthServer && (
        <section>
          <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {t('settings.authentication')}
          </h3>
          <div className={cm.stack(3)}>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
              {t('settings.changePassword')}
            </Button>
            <Flex align="center" justify="between">
              <span className={cm.textSize('sm')}>{t('settings.twoFactor')}</span>
              <Switch
                checked={twoFactorEnabled}
                onChange={(e) => handleToggle2FA((e.target as HTMLInputElement).checked)}
                disabled={twoFactorLoading}
                size="sm"
              />
            </Flex>
          </div>
        </section>
      )}

      {/* Notifications */}
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.notifications')}
        </h3>
        <Flex align="center" justify="between">
          <span className={cm.textSize('sm')}>{t('settings.pushNotifications')}</span>
          <Switch
            checked={pushEnabled}
            onChange={(e) => handleTogglePush((e.target as HTMLInputElement).checked)}
            size="sm"
          />
        </Flex>
      </section>

      {/* Billing */}
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.billing')}
        </h3>
        <Flex align="center" justify="between">
          <span className={cm.textSize('sm')}>{t('settings.plan')}<strong>{plan}</strong></span>
          <Button variant="outline" size="sm">{t('settings.upgrade')}</Button>
        </Flex>
      </section>

      {/* Devices */}
      <section>
        <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
          <h3 className={cm.sectionHeading}>
            {t('settings.devices')}
          </h3>
          {devicesLoading && <Spinner size="xs" />}
        </Flex>
        {devices.length > 0 ? (
          <ul className={cm.stack(2)}>
            {devices.map((device) => (
              <li key={device.id}>
                <Flex align="center" justify="between" className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}>
                  <span>{device.name || device.platform}</span>
                  <Icon name="chevron-right" size={16} className={cm.textSubtle} />
                </Flex>
              </li>
            ))}
          </ul>
        ) : (
          !devicesLoading && <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{t('settings.noDevices')}</p>
        )}
      </section>

      {/* This Device */}
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.thisDevice')}
        </h3>
        <dl className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <Flex justify="between">
            <dt className={cm.textMuted}>{t('settings.platform')}</dt>
            <dd>{deviceInfo.os.name || t('settings.unknown')}</dd>
          </Flex>
          <Flex justify="between">
            <dt className={cm.textMuted}>{t('settings.browser')}</dt>
            <dd>{deviceInfo.browser.name || t('settings.unknown')}</dd>
          </Flex>
          <Flex justify="between">
            <dt className={cm.textMuted}>{t('settings.network')}</dt>
            <dd>{navigator.onLine ? t('settings.online') : t('settings.offline')}</dd>
          </Flex>
        </dl>
      </section>

      <Separator />

      {/* Actions */}
      <section className={cm.stack(3)}>
        <Button color="error" fullWidth onClick={handleLogout}>
          {t('settings.logOut')}
        </Button>
        <Button variant="ghost" fullWidth onClick={() => setShowDeleteModal(true)}>
          {t('settings.deleteAccount')}
        </Button>
      </section>

      <Footer />

      {/* Password Change Modal */}
      <Modal
        open={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); resetPw() }}
        title={t('settings.changePasswordModal.title')}
      >
        {pwError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message || t('settings.changePasswordModal.error')}
          </Alert>
        )}
        <form onSubmit={handlePasswordChange} className={cm.stack(4)}>
          <div>
            <label htmlFor="current-pw" className={cm.formLabel}>{t('settings.changePasswordModal.currentPassword')}</label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={cm.formLabel}>{t('settings.changePasswordModal.newPassword')}</label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending' ? t('settings.changePasswordModal.changing') : t('settings.changePassword')}
          </Button>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title')}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning')}
        </p>
        {deleteError && (
          <Alert status="error" className={cm.sp('mb', 4)}>{deleteError}</Alert>
        )}
        <form onSubmit={handleDeleteAccount} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-pw" className={cm.formLabel}>{t('settings.deleteAccountModal.password')}</label>
            <Input
              id="delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleteLoading}>
            {deleteLoading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
