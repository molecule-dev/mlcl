import { useEffect, useState } from 'react'
import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { Button as SubmitButton } from '@molecule/app-ui-react'
import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'

/** The enrollment data `POST /users/:id/verify-two-factor` answers `{ action: 'setup' }` with. */
interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

/**
 * Two-factor authentication setting, over the user resource's
 * `POST /users/:id/verify-two-factor` (the bonded two-factor provider):
 * Enable asks for a QR code and secret (`{ action: 'setup' }`), and the code
 * from the authenticator app turns it on (`{ action: 'enable', token }`).
 * Disable takes a current code (`{ action: 'disable', token }`). The current
 * status is read from `/users/me`.
 */
export function TwoFactorSetting() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState<null | 'enable' | 'disable'>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/users/me')
      .then((response) => {
        const body = response.data
        if (!cancelled) setEnabled(Boolean((body?.props ?? body)?.twoFactorEnabled))
      })
      .catch((_error) => {
        // The status read is best-effort: the setting shows as off until it answers.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const close = () => {
    setMode(null)
    setSetup(null)
    setToken('')
    setError('')
  }

  const startEnable = async () => {
    setError('')
    setLoading(true)
    setMode('enable')
    try {
      const response = await http.post<TwoFactorSetup>(`/users/${user?.id}/verify-two-factor`, {
        action: 'setup',
      })
      setSetup(response.data)
    } catch (err) {
      setError(
        serverErrorMessage(err) ??
          t('settings.twoFactorUnavailable', undefined, {
            defaultValue: 'Two-factor authentication is not available for this app.',
          }),
      )
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mode) return
    setError('')
    setLoading(true)
    try {
      await http.post(`/users/${user?.id}/verify-two-factor`, { action: mode, token })
      setEnabled(mode === 'enable')
      close()
    } catch (err) {
      setError(
        serverErrorMessage(err) ??
          t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Flex align="center" justify="between">
        <span className={cm.textSize('sm')}>
          {t('settings.twoFactor')}
          {enabled && (
            <span className={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}>
              {t('settings.twoFactorOn', undefined, { defaultValue: 'On' })}
            </span>
          )}
        </span>
        {enabled ? (
          <Button variant="outline" size="sm" onClick={() => setMode('disable')}>
            {t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startEnable}>
            {t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' })}
          </Button>
        )}
      </Flex>

      <Modal
        open={mode !== null}
        onClose={close}
        title={
          mode === 'disable'
            ? t('settings.twoFactorDisableTitle', undefined, {
                defaultValue: 'Disable two-factor authentication',
              })
            : t('settings.twoFactorEnableTitle', undefined, {
                defaultValue: 'Enable two-factor authentication',
              })
        }
      >
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        {mode === 'enable' && setup?.QRImageUrl && (
          <div className={cm.cn(cm.stack(2), cm.sp('mb', 4))}>
            <p className={cm.textSize('sm')}>
              {t('settings.twoFactorScan', undefined, {
                defaultValue:
                  'Scan this code with your authenticator app, then enter the 6-digit code.',
              })}
            </p>
            <img
              src={setup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })}
              width={192}
              height={192}
            />
            {setup.secret && <code className={cm.textSize('xs')}>{setup.secret}</code>}
          </div>
        )}
        {!!mode && (mode === 'disable' || setup) && (
          <form onSubmit={submit} className={cm.stack(4)}>
            <div>
              <label htmlFor="two-factor-code" className={cm.formLabel}>
                {t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="two-factor-code"
                type="number"
                value={token}
                onValueChange={setToken}
                autoComplete="one-time-code"
                required
              />
            </div>
            <SubmitButton
              type="submit"
              color={mode === 'disable' ? 'error' : undefined}
              fullWidth
              loading={loading}
            >
              {mode === 'disable'
                ? t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' })}
            </SubmitButton>
          </form>
        )}
      </Modal>
    </>
  )
}
