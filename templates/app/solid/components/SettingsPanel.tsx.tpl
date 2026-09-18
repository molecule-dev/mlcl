import { createSignal, Show, For, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import type { UserProfile } from '@molecule/app-auth'
import {
  createAuth,
  createChangePassword,
  createHttpHelpers,
  createPush,
  createDevice,
  createVersion,
  useTranslate,
} from '@molecule/app-solid'
import {
  Button,
  Input,
  Switch as SwitchInput,
  Alert,
  Separator,
  Spinner,
  Modal,
  Flex,
} from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'
import { Footer } from './Footer.js'

interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
}

export function SettingsPanel(props: { onClose: () => void }) {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const { user, logout } = createAuth<UserProfile>()
  const http = createHttpHelpers()
  createVersion()
  const { permission, requestPermission, register: registerPush, unregister: unregisterPush } = createPush()
  const { deviceInfo } = createDevice()
  const { state: pwState, changePassword, reset: resetPw } = createChangePassword()

  // Email editing
  const [email, setEmail] = createSignal(user()?.email || '')
  const [emailSaving, setEmailSaving] = createSignal(false)
  const [emailError, setEmailError] = createSignal('')

  // Password change
  const [showPasswordModal, setShowPasswordModal] = createSignal(false)
  const [currentPassword, setCurrentPassword] = createSignal('')
  const [newPassword, setNewPassword] = createSignal('')

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = createSignal(false)
  const [twoFactorLoading, setTwoFactorLoading] = createSignal(false)

  // Devices
  const [devices, setDevices] = createSignal<Device[]>([])
  const [devicesLoading, setDevicesLoading] = createSignal(true)

  // Plan
  const [plan] = createSignal<string>('Free')

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = createSignal(false)
  const [deletePassword, setDeletePassword] = createSignal('')
  const [deleteLoading, setDeleteLoading] = createSignal(false)
  const [deleteError, setDeleteError] = createSignal('')

  // Push notifications
  const [pushEnabled, setPushEnabled] = createSignal(permission() === 'granted')

  const loadDevices = async () => {
    try {
      const response = await http.get<{ data: Device[] }>('/devices')
      setDevices(response.data.data || [])
    } catch {
      // Devices may not be available
    } finally {
      setDevicesLoading(false)
    }
  }

  onMount(() => {
    loadDevices()
  })

  const handleEmailBlur = async () => {
    if (email() === user()?.email || !email()) return
    setEmailSaving(true)
    setEmailError('')
    try {
      await http.patch(`/users/${user()?.id}`, { data: { email: email() } })
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('settings.failedToUpdateEmail'))
      setEmail(user()?.email || '')
    } finally {
      setEmailSaving(false)
    }
  }

  const handlePasswordChange = async (e: Event) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword(), newPassword())
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
    } catch {
      // Error tracked in hook state
    }
  }

  const handleToggle2FA = async (enabled: boolean) => {
    setTwoFactorLoading(true)
    try {
      await http.patch(`/users/${user()?.id}`, { data: { twoFactorEnabled: enabled } })
      setTwoFactorEnabled(enabled)
    } catch {
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
    } catch {
      // Permission may be denied
    }
  }

  const handleLogout = async () => {
    await logout()
    props.onClose()
    navigate('/login')
  }

  const handleDeleteAccount = async (e: Event) => {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${user()?.id}`, { data: { password: deletePassword() } })
      await logout()
      props.onClose()
      navigate('/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('settings.failedToDeleteAccount'))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div class={cm.cn(cm.sp('p', 6), cm.stack(6))}>
      {/* Account */}
      <section>
        <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
          <h3 class={cm.sectionHeading}>
            {t('settings.account')}
          </h3>
          <Show when={emailSaving()}>
            <Spinner size="xs" />
          </Show>
        </Flex>
        <div>
          <label for="settings-email" class={cm.formLabelSmall}>{t('settings.email')}</label>
          <Input
            id="settings-email"
            type="email"
            value={email()}
            onInput={(e: Event) =>
              setEmail((e.currentTarget as HTMLInputElement).value)
            }
            onBlur={handleEmailBlur}
            size="sm"
          />
          <Show when={emailError()}>
            <p class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>{emailError()}</p>
          </Show>
        </div>
      </section>

      {/* Authentication -- hidden for OAuth users */}
      <Show when={!(user() as unknown as Record<string, unknown>)?.oauthServer}>
        <section>
          <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
            {t('settings.authentication')}
          </h3>
          <div class={cm.stack(3)}>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
              {t('settings.changePassword')}
            </Button>
            <Flex align="center" justify="between">
              <span class={cm.textSize('sm')}>{t('settings.twoFactor')}</span>
              <SwitchInput
                checked={twoFactorEnabled()}
                onChange={(e: Event) =>
                  handleToggle2FA((e.target as HTMLInputElement).checked)
                }
                disabled={twoFactorLoading()}
                size="sm"
              />
            </Flex>
          </div>
        </section>
      </Show>

      {/* Notifications */}
      <section>
        <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.notifications')}
        </h3>
        <Flex align="center" justify="between">
          <span class={cm.textSize('sm')}>{t('settings.pushNotifications')}</span>
          <SwitchInput
            checked={pushEnabled()}
            onChange={(e: Event) =>
              handleTogglePush((e.target as HTMLInputElement).checked)
            }
            size="sm"
          />
        </Flex>
      </section>

      {/* Billing */}
      <section>
        <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.billing')}
        </h3>
        <Flex align="center" justify="between">
          <span class={cm.textSize('sm')}>{t('settings.plan')}: <strong>{plan()}</strong></span>
          <Button variant="outline" size="sm">{t('settings.upgrade')}</Button>
        </Flex>
      </section>

      {/* Devices */}
      <section>
        <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
          <h3 class={cm.sectionHeading}>
            {t('settings.devices')}
          </h3>
          <Show when={devicesLoading()}>
            <Spinner size="xs" />
          </Show>
        </Flex>
        <Show
          when={devices().length > 0}
          fallback={
            <Show when={!devicesLoading()}>
              <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>{t('settings.noDevices')}</p>
            </Show>
          }
        >
          <ul class={cm.stack(2)}>
            <For each={devices()}>
              {(device) => (
                <li>
                  <Flex align="center" justify="between" className={cm.cn(cm.textSize('sm'), cm.sp('py', 1))}>
                    <span>{device.name || device.platform}</span>
                    <Icon name="chevron-right" size={16} class={cm.textSubtle} />
                  </Flex>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      {/* This Device */}
      <section>
        <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.thisDevice')}
        </h3>
        <dl class={cm.cn(cm.stack(1), cm.textSize('sm'))}>
          <Flex justify="between">
            <dt class={cm.textMuted}>{t('settings.platform')}</dt>
            <dd>{deviceInfo.os.name || t('settings.unknown')}</dd>
          </Flex>
          <Flex justify="between">
            <dt class={cm.textMuted}>{t('settings.browser')}</dt>
            <dd>{deviceInfo.browser.name || t('settings.unknown')}</dd>
          </Flex>
          <Flex justify="between">
            <dt class={cm.textMuted}>{t('settings.network')}</dt>
            <dd>{navigator.onLine ? t('settings.online') : t('settings.offline')}</dd>
          </Flex>
        </dl>
      </section>

      <Separator />

      {/* Actions */}
      <section class={cm.stack(3)}>
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
        open={showPasswordModal()}
        onClose={() => { setShowPasswordModal(false); resetPw() }}
        title={t('settings.changePasswordModal.title')}
      >
        <Show when={pwState().error}>
          <Alert status="error" className={cm.sp('mb', 4)}>
            {(pwState().error as Error)?.message || t('settings.changePasswordModal.error')}
          </Alert>
        </Show>
        <form onSubmit={handlePasswordChange} class={cm.stack(4)}>
          <div>
            <label for="current-pw" class={cm.formLabel}>{t('settings.changePasswordModal.currentPassword')}</label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword()}
              onInput={(e: Event) =>
                setCurrentPassword((e.currentTarget as HTMLInputElement).value)
              }
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label for="new-pw" class={cm.formLabel}>{t('settings.changePasswordModal.newPassword')}</label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword()}
              onInput={(e: Event) =>
                setNewPassword((e.currentTarget as HTMLInputElement).value)
              }
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwState().status === 'pending'}>
            {pwState().status === 'pending' ? t('settings.changePasswordModal.changing') : t('settings.changePassword')}
          </Button>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal()}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title')}
      >
        <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning')}
        </p>
        <Show when={deleteError()}>
          <Alert status="error" className={cm.sp('mb', 4)}>{deleteError()}</Alert>
        </Show>
        <form onSubmit={handleDeleteAccount} class={cm.stack(4)}>
          <div>
            <label for="delete-pw" class={cm.formLabel}>{t('settings.deleteAccountModal.password')}</label>
            <Input
              id="delete-pw"
              type="password"
              value={deletePassword()}
              onInput={(e: Event) =>
                setDeletePassword((e.currentTarget as HTMLInputElement).value)
              }
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleteLoading()}>
            {deleteLoading() ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
