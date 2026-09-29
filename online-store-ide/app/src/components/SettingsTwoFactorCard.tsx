import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

interface TwoFactorUser {
  id?: string
  oauthServer?: string
}

/**
 * Two-factor authentication (TOTP) section — real enrollment against the user
 * resource's POST /api/users/:id/verify-two-factor endpoint
 * (@molecule/api-two-factor, bonded in this app):
 * - Enable → {action:'setup'} returns a QR code + secret to scan into an
 *   authenticator app → user enters the 6-digit code → {action:'enable', token}
 *   (200 = enabled, 403 = invalid code).
 * - Disable → user enters a current code → {action:'disable', token}.
 * Current status is read from GET /api/users/me (twoFactorEnabled). Setup
 * failures (e.g. no two-factor provider available) surface inline. Hidden for
 * OAuth-only users, who have no password / 2FA to manage. Mirrors the shared
 * settings-panel AuthSection two-factor flow, themed with this app's cards.
 */
function SettingsTwoFactorCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<TwoFactorUser>()
  const userId = user?.id

  const [enabled, setEnabled] = useState(false)
  const [modal, setModal] = useState<null | 'enable' | 'disable'>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Read the persisted 2FA status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // OAuth-only users have no password / 2FA to manage.
  if (user?.oauthServer) return null

  const close = () => {
    setModal(null)
    setSetup(null)
    setToken('')
    setError('')
  }

  const startEnable = async () => {
    setError('')
    setLoading(true)
    setModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setSetup(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settingsTwoFactor.unavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  const submit = async (action: 'enable' | 'disable') => {
    setError('')
    setLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token })
      setEnabled(action === 'enable')
      close()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settingsTwoFactor.invalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section
        className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
        data-mol-id="section-two-factor"
        id="two-factor"
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
          <span className={cm.cn('material-symbols-outlined text-success')}>verified_user</span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('settingsTwoFactor.title', {}, { defaultValue: 'Two-Factor Authentication' })}
          </h2>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settingsTwoFactor.description',
                {},
                {
                  defaultValue:
                    'Add an extra layer of security by requiring a code from your authenticator app at sign-in.',
                },
              )}
            </p>
            {enabled && (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('mt', 1),
                  'text-success',
                )}
              >
                {t('settingsTwoFactor.statusOn', {}, { defaultValue: 'Enabled' })}
              </p>
            )}
          </div>
          {enabled ? (
            <button
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-surface-secondary text-foreground rounded-md shadow-sm hover:bg-border transition-all',
              )}
              type="button"
              data-mol-id="two-factor-disable"
              onClick={() => {
                setError('')
                setToken('')
                setModal('disable')
              }}
            >
              {t('settingsTwoFactor.disable', {}, { defaultValue: 'Disable' })}
            </button>
          ) : (
            <button
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-white rounded-md shadow-sm hover:bg-primary-hover transition-all',
              )}
              type="button"
              data-mol-id="two-factor-enable"
              onClick={startEnable}
            >
              {t('settingsTwoFactor.enable', {}, { defaultValue: 'Enable' })}
            </button>
          )}
        </div>
      </section>

      <Modal
        open={modal !== null}
        onClose={close}
        title={
          modal === 'disable'
            ? t(
                'settingsTwoFactor.disableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settingsTwoFactor.enableTitle',
                {},
                { defaultValue: 'Enable two-factor authentication' },
              )
        }
      >
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        {modal === 'enable' && setup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'settingsTwoFactor.scan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={setup.QRImageUrl}
              alt={t('settingsTwoFactor.qrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {setup.secret ? (
              <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'text-center break-all')}>
                {setup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {(modal === 'disable' || setup) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit(modal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label
                htmlFor="two-factor-token"
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'block text-foreground-secondary uppercase tracking-wider mb-1.5',
                )}
              >
                {t('settingsTwoFactor.code', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="two-factor-token"
                type="text"
                value={token}
                onChange={(e) => setToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <Button
              type="submit"
              color={modal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={loading}
            >
              {modal === 'disable'
                ? t('settingsTwoFactor.disable', {}, { defaultValue: 'Disable' })
                : t('settingsTwoFactor.verify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        )}
      </Modal>
    </>
  )
}

export default SettingsTwoFactorCard
export { SettingsTwoFactorCard }
