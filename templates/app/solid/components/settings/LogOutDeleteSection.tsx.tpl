import { useNavigate } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { createAuth, createHttpHelpers, useTranslate } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-solid'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Receives `onClose` (the
 * React reference reads it from the `SettingsContainer` context) to
 * dismiss the panel after either action and navigates to `/login`.
 */
export function LogOutDeleteSection(props: { onClose: () => void }) {
  const cm = getClassMap()
  const t = useTranslate()
  const navigate = useNavigate()
  const { user, logout } = createAuth<UserProfile>()
  const http = createHttpHelpers()

  const [showModal, setShowModal] = createSignal(false)
  const [password, setPassword] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleLogout = async (): Promise<void> => {
    await logout()
    props.onClose()
    navigate('/login')
  }

  const handleDelete = async (e: Event): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user()?.id}`, { data: { password: password() } })
      await logout()
      props.onClose()
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.failedToDeleteAccount'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section class={cm.stack(3)}>
        <Button
          color="error"
          fullWidth
          onClick={() => void handleLogout()}
          data-mol-id="user-menu-logout"
        >
          {t('settings.logOut', undefined, { defaultValue: 'Sign out' })}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowModal(true)}
          data-mol-id="user-menu-delete-account"
        >
          {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
        </Button>
      </section>

      <Modal
        open={showModal()}
        onClose={() => setShowModal(false)}
        title={t('settings.deleteAccountModal.title')}
      >
        <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning')}
        </p>
        <Show when={error()}>
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error()}
          </Alert>
        </Show>
        <form onSubmit={handleDelete} class={cm.stack(4)}>
          <div>
            <label for="delete-pw" class={cm.formLabel}>
              {t('settings.deleteAccountModal.password')}
            </label>
            <Input
              id="delete-pw"
              type="password"
              value={password()}
              onChange={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
              onInput={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={loading()}>
            {loading() ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount')}
          </Button>
        </form>
      </Modal>
    </>
  )
}
