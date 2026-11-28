{{#feature devices}}
import { useState, useEffect, useCallback } from 'react'
{{/feature}}
{{^feature devices}}
import { useState } from 'react'
{{/feature}}
import { useNavigate } from 'react-router'
import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  useDevice,
  useVersion,
  useTranslation,
} from '@molecule/app-react'
{{#feature push-client}}
import { usePush } from '@molecule/app-react/push'
import { Switch } from '@molecule/app-ui-react-native'
{{/feature}}
import {
  Button,
  Input,
  Alert,
  Separator,
  Spinner,
  Modal,
  Flex,
  FormArea,
  TextField,
} from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
{{#feature devices}}
import { Icon } from './Icon.js'
{{/feature}}
import { Footer } from './Footer.js'
{{#feature two-factor}}
import { TwoFactorSetting } from './TwoFactorSetting.js'
{{/feature}}
{{#feature billing}}
import { BillingSection } from './BillingSection.js'
{{/feature}}

{{#feature devices}}
interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}
{{/feature}}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  useVersion()
{{#feature push-client}}
  const {
    permission,
    requestPermission,
    register: registerPush,
    unregister: unregisterPush,
  } = usePush()
{{/feature}}
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

{{#feature devices}}
  // Devices
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
{{/feature}}

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

{{#feature push-client}}
  // Push notifications
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')
{{/feature}}

{{#feature devices}}
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
{{/feature}}

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

  const handlePasswordChange = async () => {
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

{{#feature push-client}}
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
{{/feature}}

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
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
          <h3 className={cm.sectionHeading}>{t('settings.account')}</h3>
          {emailSaving && <Spinner size="xs" />}
        </Flex>
        <div>
          <label htmlFor="settings-email" className={cm.formLabelSmall}>
            {t('settings.email')}
          </label>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onValueChange={setEmail}
            onBlur={handleEmailBlur}
            size="sm"
          />
          {emailError && (
            <p className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>{emailError}</p>
          )}
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
{{#feature two-factor}}
            <TwoFactorSetting />
{{/feature}}
          </div>
        </section>
      )}

{{#feature push-client}}
      {/* Notifications */}
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.notifications')}</h3>
        <Flex align="center" justify="between">
          <span className={cm.textSize('sm')}>{t('settings.pushNotifications')}</span>
          <Switch checked={pushEnabled} onCheckedChange={handleTogglePush} size="sm" />
        </Flex>
      </section>
{{/feature}}

{{#feature billing}}
      <BillingSection />

{{/feature}}
{{#feature devices}}
      {/* Devices */}
      <section>
        <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
          <h3 className={cm.sectionHeading}>{t('settings.devices')}</h3>
          {devicesLoading && <Spinner size="xs" />}
        </Flex>
        {devices.length > 0 ? (
          <ul className={cm.stack(2)}>
            {devices.map((device) => (
              <li key={device.id}>
                <Flex
                  align="center"
                  justify="between"
                  className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}
                >
                  <span>{device.name || device.platform}</span>
                  <Icon name="chevron-right" size={16} className={cm.textSubtle} />
                </Flex>
              </li>
            ))}
          </ul>
        ) : (
          !devicesLoading && (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{t('settings.noDevices')}</p>
          )
        )}
      </section>
{{/feature}}

      {/* This Device */}
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.thisDevice')}</h3>
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
        onClose={() => {
          setShowPasswordModal(false)
          resetPw()
        }}
        title={t('settings.changePasswordModal.title')}
      >
        {pwError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message || t('settings.changePasswordModal.error')}
          </Alert>
        )}
        <FormArea as="form" onSubmit={handlePasswordChange} className={cm.stack(4)}>
          <div>
            <label htmlFor="current-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.currentPassword')}
            </label>
            <TextField
              as="input"
              className={cm.input()}
              id="current-pw"
              type="password"
              name="currentPassword"
              value={currentPassword}
              onValueChange={setCurrentPassword}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.newPassword')}
            </label>
            <TextField
              as="input"
              className={cm.input()}
              id="new-pw"
              type="password"
              name="newPassword"
              value={newPassword}
              onValueChange={setNewPassword}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('settings.changePasswordModal.changing')
              : t('settings.changePassword')}
          </Button>
        </FormArea>
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
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        )}
        <FormArea as="form" onSubmit={handleDeleteAccount} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-pw" className={cm.formLabel}>
              {t('settings.deleteAccountModal.password')}
            </label>
            <TextField
              as="input"
              className={cm.input()}
              id="delete-pw"
              type="password"
              name="password"
              value={deletePassword}
              onValueChange={setDeletePassword}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleteLoading}>
            {deleteLoading
              ? t('settings.deleteAccountModal.deleting')
              : t('settings.deleteAccount')}
          </Button>
        </FormArea>
      </Modal>
    </div>
  )
}
