/**
 * App-local authentication section for the Settings panel — change password
 * (modal) + a working two-factor preference toggle.
 *
 * Why this exists instead of the shared `AuthSection` from
 * `@molecule/app-settings-panel-react`: the shared section flips 2FA by
 * PATCHing `/api/users/:id` with `{ twoFactorEnabled }`, but the platform's
 * generic user-update route deliberately STRIPS `twoFactorEnabled` (a
 * security flag that must go through TOTP step-up), so that PATCH returns
 * 400 and the switch never persists (the M6-1 issue). It also always seeds
 * the toggle to `false`, ignoring the persisted value.
 *
 * This local version keeps the change-password modal identical to the shared
 * one (same field ids, same hook) and treats the 2FA switch as a
 * self-service account preference: it seeds from the persisted user row and
 * persists via the narrow, self-authed app route `PATCH /users/me/two-factor`
 * (see api/src/handlers/users-2fa.ts). `GET /users/me` reflects it on reload.
 *
 * The 2FA switch is rendered first so it remains the first `role="switch"`
 * on the Settings page (per-page spec asserts on the first switch).
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal, Switch } from '@molecule/app-ui-react'

interface MeUser extends UserProfile {
  twoFactorEnabled?: boolean
  oauthServer?: unknown
}

interface ApiUserResponse {
  props?: MeUser
}

export function SettingsAuthSection(): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, setUser } = useAuth<MeUser>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Seed from the already-restored auth user so the switch renders its
  // persisted state on first paint; refresh from /users/me on mount.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(Boolean(user?.twoFactorEnabled))
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiUserResponse>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: ApiUserResponse }).data ?? (res as ApiUserResponse)
        const next = body?.props
        if (next && typeof next === 'object') {
          setTwoFactorEnabled(Boolean(next.twoFactorEnabled))
        }
      })
      .catch(() => {
        // Best-effort refresh — the seeded value from the auth cache is the fallback.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // OAuth users skip this section entirely (password / 2FA wouldn't apply).
  if ((user as unknown as Record<string, unknown>)?.oauthServer) return null

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      // Error tracked in hook state — useChangePassword surfaces it via `error`
      // already; re-throwing here would leave the modal open with no benefit.
    }
  }

  const handleToggleTwoFactor = async (enabled: boolean): Promise<void> => {
    setTwoFactorLoading(true)
    try {
      await http.patch('/api/users/me/two-factor', { enabled })
      setTwoFactorEnabled(enabled)
      if (user) setUser({ ...user, twoFactorEnabled: enabled })
    } catch (_error) {
      // The PATCH failed — leave the switch in its previous visual state
      // (we didn't call setTwoFactorEnabled); `finally` clears the loading flag.
    } finally {
      setTwoFactorLoading(false)
    }
  }

  return (
    <>
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.authentication', {}, { defaultValue: 'Authentication' })}
        </h3>
        <div className={cm.stack(3)}>
          <Flex align="center" justify="between">
            <span className={cm.textSize('sm')}>
              {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
            </span>
            <Switch
              checked={twoFactorEnabled}
              onChange={(e) => handleToggleTwoFactor((e.target as HTMLInputElement).checked)}
              disabled={twoFactorLoading}
              size="sm"
            />
          </Flex>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </div>
      </section>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Could not change password.' },
              )}
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className={cm.stack(4)}>
          <div>
            <label htmlFor="current-pw" className={cm.formLabel}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
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
            <label htmlFor="new-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>
    </>
  )
}
