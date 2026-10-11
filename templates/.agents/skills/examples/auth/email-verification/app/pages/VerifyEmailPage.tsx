import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status =
  | 'verifying'
  | 'success'
  | 'expired'
  | 'invalid'
  | 'resent'
  | 'alreadyVerified'
  /** The check itself could not be completed (offline, a 5xx) — see the effect. */
  | 'verifyFailed'
/** Why the last resend failed, if it did. */
type ResendFailure = 'failed' | 'signedOut' | 'rateLimited'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('verifying')
  const [resendFailure, setResendFailure] = useState<ResendFailure | null>(null)
  // Bumped by the retry control under `verifyFailed`: the check effect keys on
  // it, which is what makes an uncompleted verification retryable (nothing else
  // changes when the user retries the same link).
  const [verifyAttempt, setVerifyAttempt] = useState(0)
  // A resend in flight. The endpoint rate-limits per user, so without this a
  // double click sent two requests: the first created and mailed a link, the
  // second came back 429 and the page reported "Could not send a new link" —
  // a failure the user is told to retry, for a link that WAS sent.
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      setStatus('invalid')
      return
    }
    // A superseded attempt must not write state over a newer one's answer.
    let cancelled = false
    setStatus('verifying')
    fetch(`/api/verify?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (cancelled) return
        if (r.ok) setStatus('success')
        else if (r.status === 410) setStatus('expired')
        // A 5xx is the SERVER failing, not the link being bad: reporting it as
        // "Invalid link" told a reader whose link (and whose verification) was
        // fine that the link was worthless, and the invalid branch carried no
        // retry control, so there was nothing to do but guess. Only a definite
        // 4xx is a verdict on the token.
        else if (r.status >= 500) setStatus('verifyFailed')
        else setStatus('invalid')
      })
      .catch(() => {
        // A rejected fetch (offline, server restart) is the same class as a 5xx:
        // an UNCOMPLETED check, never a verdict on the link — the token is still
        // valid server-side and a retry can still verify the account.
        if (!cancelled) setStatus('verifyFailed')
      })
    return () => {
      cancelled = true
    }
  }, [verifyAttempt])

  async function resend(): Promise<void> {
    // One resend at a time — see the state's comment.
    if (resending) return
    setResendFailure(null)
    setResending(true)
    // A rejected resend (offline, server restart) must not reject out of the
    // click handler with the button silently doing nothing — surface it.
    try {
      const res = await fetch('/api/verify/request', { method: 'POST' })
      if (!res.ok) {
        // The endpoint is session-gated, and an expired-link page is commonly
        // opened signed out (a new device, a cleared cookie jar). "Try again"
        // then sends the user into a retry loop that cannot ever succeed —
        // name the sign-in requirement instead, like DeleteAccountPage does.
        // A 429 is likewise not "try again" the way an outage is: the endpoint
        // caps resends per user, so it says so instead of inviting a retry that
        // will be refused the same way.
        setResendFailure(
          res.status === 401 ? 'signedOut' : res.status === 429 ? 'rateLimited' : 'failed',
        )
        return
      }
      // A 2xx proves the route accepted the request, not that it MAILED
      // anything: an already-verified account answers `{ ok: true,
      // alreadyVerified: true }` without sending (the handler mints no token
      // and calls no sendMail). Reading only the status told that user "We've
      // sent a new link to your email" about a message that does not exist —
      // reachable whenever the address was verified through a different link
      // than the one that brought the reader here, since verifying does not
      // invalidate a user's other outstanding tokens.
      const body = (await res.json().catch(() => ({}))) as { alreadyVerified?: boolean }
      setStatus(body.alreadyVerified === true ? 'alreadyVerified' : 'resent')
    } catch (_error) {
      setResendFailure('failed')
    } finally {
      setResending(false)
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
          <button onClick={resend} disabled={resending} className={cm.button({ variant: 'solid' })}>
            {t('verifyEmail.resend', undefined, { defaultValue: 'Send a new link' })}
          </button>
          {resendFailure === 'signedOut' ? (
            <p className={cm.textError}>
              {t('verifyEmail.resendSignedOut', undefined, {
                defaultValue: 'Your session has expired — sign in, then resend the link.',
              })}
            </p>
          ) : null}
          {resendFailure === 'rateLimited' ? (
            <p className={cm.textError}>
              {t('verifyEmail.resendRateLimited', undefined, {
                defaultValue: 'Too many link requests — wait a minute and try again.',
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
      {status === 'verifyFailed' ? (
        <>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('verifyEmail.verifyFailedTitle', undefined, {
              defaultValue: 'Could not check this link',
            })}
          </h2>
          <p className={cm.textMuted}>
            {t('verifyEmail.verifyFailedBody', undefined, {
              defaultValue: 'The check did not complete — your link may still work.',
            })}
          </p>
          <button
            data-mol-id="verify-email-retry"
            onClick={() => setVerifyAttempt((n) => n + 1)}
            className={cm.button({ variant: 'solid' })}
          >
            {t('verifyEmail.retry', undefined, { defaultValue: 'Try again' })}
          </button>
        </>
      ) : null}
      {status === 'resent' ? (
        <p className={cm.textSuccess}>
          {t('verifyEmail.resentBody', undefined, {
            defaultValue: "We've sent a new link to your email.",
          })}
        </p>
      ) : null}
      {status === 'alreadyVerified' ? (
        <p className={cm.textSuccess}>
          {t('verifyEmail.alreadyVerifiedBody', undefined, {
            defaultValue: 'Your email is already verified.',
          })}
        </p>
      ) : null}
    </div>
  )
}
