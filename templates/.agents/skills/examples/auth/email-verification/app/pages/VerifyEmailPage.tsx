import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'verifying' | 'success' | 'expired' | 'invalid' | 'resent'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('verifying')
  const [resendFailed, setResendFailed] = useState(false)

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
    setResendFailed(false)
    // A rejected resend (offline, server restart) must not reject out of the
    // click handler with the button silently doing nothing — surface it.
    try {
      const res = await fetch('/api/verify/request', { method: 'POST' })
      if (!res.ok) {
        setResendFailed(true)
        return
      }
      setStatus('resent')
    } catch (_error) {
      setResendFailed(true)
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
          {resendFailed ? (
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
