/**
 * App-local authentication section for the Settings panel — change password
 * (modal) + real TOTP two-factor enrollment.
 *
 * Why this exists instead of the shared `AuthSection` from
 * `@molecule/app-settings-panel-react`: the shared section flips 2FA by
 * PATCHing `/api/users/:id` with `{ twoFactorEnabled }`, but the platform's
 * generic user-update route deliberately STRIPS `twoFactorEnabled` (a
 * security flag must go through TOTP step-up), so that PATCH returns 400 and
 * the switch never persists (the M6-1 issue).
 *
 * The 2FA switch here drives the app's REAL TOTP lifecycle via the narrow,
 * self-authed app routes (see api/src/handlers/users-2fa.ts):
 *
 *   enable:  POST /api/users/me/two-factor/setup → provisioning data (QR +
 *            secret) is shown in a modal, and the user confirms with a live
 *            6-digit code → PATCH /api/users/me/two-factor
 *            { enabled: true, token }
 *   disable: the modal asks for the current code → PATCH
 *            /api/users/me/two-factor { enabled: false, token }
 *
 * A bare flag write is never sent — every transition carries a token the
 * server verifies, so a stolen session can't toggle the second factor.
 *
 * The 2FA switch is rendered first so it remains the first `role="switch"`
 * on the Settings page (per-page spec asserts on the first switch).
 */
import type { JSX } from 'react'
import type { FormEvent } from 'react'
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

interface TwoFactorSetup {
  keyUrl?: string
  QRImageUrl?: string
  secret?: string
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
  const [twoFactorModal, setTwoFactorModal] = useState<null | 'enable' | 'disable'>(null)

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

  // The switch never flips the flag directly — it opens the enrollment (or
  // confirmation) modal, and the flag only moves once a live TOTP code is
  // verified server-side.
  const handleToggleTwoFactor = (): void => {
    setTwoFactorModal(twoFactorEnabled ? 'disable' : 'enable')
  }

  const handleTwoFactorDone = (enabled: boolean): void => {
    setTwoFactorEnabled(enabled)
    setTwoFactorModal(null)
    if (user) setUser({ ...user, twoFactorEnabled: enabled })
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
              onChange={handleToggleTwoFactor}
              size="sm"
              aria-label={t(
                'settings.twoFactor',
                {},
                { defaultValue: 'Two-factor authentication' },
              )}
              data-mol-id="two-factor-switch"
            />
          </Flex>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </div>
      </section>

      <TwoFactorModal
        mode={twoFactorModal}
        onClose={() => setTwoFactorModal(null)}
        onSuccess={handleTwoFactorDone}
      />

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

function TwoFactorModal({
  mode,
  onClose,
  onSuccess,
}: {
  mode: null | 'enable' | 'disable'
  onClose: () => void
  onSuccess: (enabled: boolean) => void
}): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Enabling starts by requesting a fresh TOTP secret + QR code from the
  // app's setup route. Disabling skips straight to code entry (verified
  // against the active secret). If no two-factor provider is bonded the
  // setup call 500s and we surface it inline.
  useEffect(() => {
    if (mode !== 'enable') return
    let cancelled = false
    setBusy(true)
    setError(null)
    setSetup(null)
    setToken('')
    http
      .post<TwoFactorSetup>('/api/users/me/two-factor/setup')
      .then((res) => {
        if (cancelled) return
        const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
        setSetup(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'settings.twofa.unavailable',
                {},
                { defaultValue: 'Two-factor authentication is not available for this app.' },
              ),
        )
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, http, t])

  if (!mode) return null

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await http.patch('/api/users/me/two-factor', { enabled: mode === 'enable', token })
      onSuccess(mode === 'enable')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.twofa.invalidCode', {}, { defaultValue: 'Invalid code' }),
      )
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        mode === 'enable'
          ? t(
              'settings.twofa.enableTitle',
              {},
              { defaultValue: 'Enable two-factor authentication' },
            )
          : t(
              'settings.twofa.disableTitle',
              {},
              { defaultValue: 'Disable two-factor authentication' },
            )
      }
    >
      {error && (
        <Alert status="error" className={cm.sp('mb', 4)}>
          {error}
        </Alert>
      )}

      {mode === 'enable' && (
        <div className={cm.sp('mb', 4)}>
          {busy && !setup ? (
            <p className={cm.textSize('sm')}>
              {t(
                'settings.twofa.preparing',
                {},
                { defaultValue: 'Preparing your authenticator setup…' },
              )}
            </p>
          ) : (
            <>
              {setup?.QRImageUrl && (
                <div className={cm.flex({ justify: 'center', direction: 'col' })}>
                  <img
                    src={setup.QRImageUrl}
                    alt={t(
                      'settings.twofa.qrAlt',
                      {},
                      { defaultValue: 'QR code to add the account to your authenticator app' },
                    )}
                    data-mol-id="two-factor-qr"
                  />
                </div>
              )}
              {setup?.secret && (
                <p
                  className={cm.cn('font-mono', cm.textSize('sm'), cm.sp('mt', 2), 'break-all')}
                  data-mol-id="two-factor-secret"
                >
                  {setup.secret}
                </p>
              )}
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'settings.twofa.scanHint',
                  {},
                  {
                    defaultValue:
                      'Scan the code (or enter the key) in your authenticator app, then enter the 6-digit code it shows to confirm.',
                  },
                )}
              </p>
            </>
          )}
        </div>
      )}

      {mode === 'disable' && (
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4))}>
          {t(
            'settings.twofa.disableHint',
            {},
            {
              defaultValue:
                'Enter the current 6-digit code from your authenticator app to turn two-factor authentication off.',
            },
          )}
        </p>
      )}

      <form onSubmit={submit} className={cm.stack(4)}>
        <div>
          <label htmlFor="two-factor-token" className={cm.formLabel}>
            {t('settings.twofa.tokenLabel', {}, { defaultValue: 'Authenticator code' })}
          </label>
          <Input
            id="two-factor-token"
            autoComplete="one-time-code"
            value={token}
            onChange={(e) => setToken((e.target as HTMLInputElement).value)}
            data-mol-id="two-factor-token"
            required
          />
        </div>
        <Button type="submit" fullWidth loading={busy} data-mol-id="two-factor-submit">
          {mode === 'enable'
            ? t('settings.twofa.verifyEnable', {}, { defaultValue: 'Verify & enable' })
            : t('settings.twofa.verifyDisable', {}, { defaultValue: 'Verify & disable' })}
        </Button>
      </form>
    </Modal>
  )
}
