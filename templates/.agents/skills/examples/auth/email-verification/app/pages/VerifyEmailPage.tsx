import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'verifying' | 'success' | 'expired' | 'invalid' | 'resent'
/** Why the last resend failed, if it did. */
type ResendFailure = 'failed' | 'signedOut'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('verifying')
  const [resendFailure, setResendFailure] = useState<ResendFailure | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setStatus('invalid')
      return
    }
    fetch(`/api/verify?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.ok) setStatus('success')
        else if (r.status === 410) setStatus('expired')
        else setStatus('invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [])

  async function resend(): Promise<void> {
    setResendFailure(null)
    // A rejected resend (offline, server restart) must not reject out of the
    // click handler with the button silently doing nothing — surface it.
    try {
      const res = await fetch('/api/verify/request', { method: 'POST' })
      if (!res.ok) {
        // The endpoint is session-gated, and an expired-link page is commonly
        // opened signed out (a new device, a cleared cookie jar). "Try again"
        // then sends the user into a retry loop that cannot ever succeed —
        // name the sign-in requirement instead, like DeleteAccountPage does.
        setResendFailure(res.status === 401 ? 'signedOut' : 'failed')
        return
      }
      setStatus('resent')
    } catch (_error) {
      setResendFailure('failed')
    }
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'md', align: 'center' })}>
      {status === 'verifying' ? (
        <p>{t('verifyEmail.verifying', undefined, { defaultValue: 'Verifying…' })}</p>
      ) : null}
      {status === 'success' ? (
        <>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('verifyEmail.successTitle', undefined, { defaultValue: 'Email verified' })}
          </h2>
          <p>
            {t('verifyEmail.successBody', undefined, {
              defaultValue: 'You can now use the full app.',
            })}
          </p>
        </>
      ) : null}
      {status === 'expired' ? (
        <>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('verifyEmail.expiredTitle', undefined, { defaultValue: 'Link expired' })}
          </h2>
          <button onClick={resend} className={cm.button({ variant: 'solid' })}>
            {t('verifyEmail.resend', undefined, { defaultValue: 'Send a new link' })}
          </button>
          {resendFailure === 'signedOut' ? (
            <p className={cm.textError}>
              {t('verifyEmail.resendSignedOut', undefined, {
                defaultValue: 'Your session has expired — sign in, then resend the link.',
              })}
            </p>
          ) : null}
          {resendFailure === 'failed' ? (
            <p className={cm.textError}>
              {t('verifyEmail.resendFailed', undefined, {
                defaultValue: 'Could not send a new link — try again.',
              })}
            </p>
          ) : null}
        </>
      ) : null}
      {status === 'invalid' ? (
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('verifyEmail.invalidTitle', undefined, { defaultValue: 'Invalid link' })}
        </h2>
      ) : null}
      {status === 'resent' ? (
        <p className={cm.textSuccess}>
          {t('verifyEmail.resentBody', undefined, {
            defaultValue: "We've sent a new link to your email.",
          })}
        </p>
      ) : null}
    </div>
  )
}
