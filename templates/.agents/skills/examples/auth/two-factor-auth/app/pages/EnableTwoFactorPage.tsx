import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

// The setup answer from `@molecule/api-resource-user` (`{ action: 'setup' }`): the secret it
// stored as pending, and the QR image `@molecule/api-two-factor` generated server-side. The body
// also carries `keyUrl` (the otpauth:// URI behind the QR); this page shows the QR and the manual
// secret, so it keeps only those.
type Enrollment = {
  secret: string
  QRImageUrl: string
}

/** Props: the signed-in user's id, which names the user resource's own route. */
export type EnableTwoFactorPageProps = { userId: string }

/**
 * Enroll the signed-in user in TOTP two-factor through the user resource's
 * `POST /api/users/:id/verify-two-factor` route: `setup` returns the secret and QR,
 * and `enable` with a code from the authenticator turns the second factor on. That
 * route writes the state the log-in route reads (`usersSecrets` and
 * `users.twoFactorEnabled`), so the next login asks for a code. An enrollment kept
 * anywhere else is one the log-in route never checks.
 */
export function EnableTwoFactorPage({ userId }: EnableTwoFactorPageProps) {
  const { t } = useTranslation()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const route = `/api/users/${encodeURIComponent(userId)}/verify-two-factor`

  function post(body: { action: 'setup' } | { action: 'enable'; token: string }) {
    return fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function startEnroll(): Promise<void> {
    setEnrolling(true)
    setError(null)
    // Every failure path clears the busy flag — a rejected setup fetch
    // (offline, server restart) must not leave the click handler rejecting
    // into the void with a button that just looks dead.
    try {
      const res = await post({ action: 'setup' })
      if (!res.ok) {
        setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
        return
      }
      // A 2xx proves the route ANSWERED, not that the body is an enrollment. An
      // endpoint with no fixture answers 200 with an empty object (the mock API
      // server's unmatchedFixtureResponse), and a proxy can rewrite a failure
      // into a 200. `enrollment` is what takes the page off the "Get started"
      // step, so validate the shape before it reaches state.
      const body = (await res.json().catch(() => null)) as Partial<Enrollment> | null
      if (!body || typeof body.secret !== 'string' || !body.secret) {
        setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
        return
      }
      setEnrollment({
        secret: body.secret,
        QRImageUrl: typeof body.QRImageUrl === 'string' ? body.QRImageUrl : '',
      })
    } catch (_error) {
      setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
    } finally {
      setEnrolling(false)
    }
  }

  async function verify(e: FormEvent): Promise<void> {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever.
    try {
      const res = await post({ action: 'enable', token: code })
      // Every non-2xx answer carries `{ error }` (wrong or reused code 403, missing
      // code or no pending setup 400, throttled 429) — read it. Collapsing them all
      // into "Wrong code — try again" told a user whose CORRECT code was refused by
      // the rate limiter to retype it.
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        twoFactorEnabled?: boolean
      }
      if (res.status === 403) {
        setError(
          body.error ?? t('totp.wrongCode', undefined, { defaultValue: 'Wrong code — try again' }),
        )
        return
      }
      if (!res.ok) {
        setError(
          body.error ??
            t('totp.verifyFailed', undefined, {
              defaultValue: 'Could not verify the code — try again shortly.',
            }),
        )
        return
      }
      // A 2xx proves the route ANSWERED, not that the code was ACCEPTED: the
      // route's success body is `{ twoFactorEnabled: true }`, while an endpoint
      // with no fixture answers `{}` and a proxy can rewrite a failure into a
      // 200. Taking any 2xx as success announced "Two-factor authentication
      // enabled" over an account where the second factor is still OFF.
      if (body.twoFactorEnabled !== true) {
        setError(
          body.error ??
            t('totp.verifyFailed', undefined, {
              defaultValue: 'Could not verify the code — try again shortly.',
            }),
        )
        return
      }
      setEnabled(true)
    } catch (_error) {
      setError(t('totp.networkError', undefined, { defaultValue: 'Network error — try again' }))
    } finally {
      setVerifying(false)
    }
  }

  if (enabled) {
    return (
      <div className={cm.flex({ direction: 'col', gap: 'md' })}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('totp.enabledTitle', undefined, { defaultValue: 'Two-factor authentication enabled' })}
        </h2>
        <p>
          {t('totp.enabledNextLogin', undefined, {
            defaultValue: 'Your next login will ask for a code from your authenticator app.',
          })}
        </p>
      </div>
    )
  }

  if (!enrollment) {
    return (
      <div className={cm.flex({ direction: 'col', gap: 'md' })}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('totp.title', undefined, { defaultValue: 'Enable two-factor authentication' })}
        </h2>
        <p>
          {t('totp.intro', undefined, {
            defaultValue: 'Add a second factor to protect your account.',
          })}
        </p>
        <button
          onClick={startEnroll}
          disabled={enrolling}
          data-mol-id="totp-enroll-start"
          className={cm.button({ variant: 'solid' })}
        >
          {enrolling
            ? t('totp.starting', undefined, { defaultValue: 'Starting…' })
            : t('totp.start', undefined, { defaultValue: 'Get started' })}
        </button>
        {error ? <p className={cm.textError}>{error}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={verify} className={cm.flex({ direction: 'col', gap: 'md' })}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('totp.scanTitle', undefined, { defaultValue: 'Scan with your authenticator app' })}
      </h2>
      {enrollment.QRImageUrl ? (
        <img
          src={enrollment.QRImageUrl}
          alt={t('totp.qrAlt', undefined, { defaultValue: 'QR code for your authenticator app' })}
          width={200}
          height={200}
        />
      ) : null}
      <p className={cm.textSize('sm')}>
        {t('totp.manualEntry', undefined, {
          defaultValue: "Can't scan? Enter this code manually:",
        })}{' '}
        <code className={cm.textSize('sm')}>{enrollment.secret}</code>
      </p>
      <input
        autoFocus
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder={t('totp.codePlaceholder', undefined, { defaultValue: '6-digit code' })}
        aria-label={t('totp.codeLabel', undefined, {
          defaultValue: 'Code from your authenticator app',
        })}
        data-mol-id="totp-enroll-code"
        className={cm.input({})}
      />
      {error ? <p className={cm.textError}>{error}</p> : null}
      <button
        type="submit"
        disabled={verifying || code.length !== 6}
        data-mol-id="totp-enroll-submit"
        className={cm.button({ variant: 'solid' })}
      >
        {verifying
          ? t('totp.verifying', undefined, { defaultValue: 'Verifying…' })
          : t('totp.verify', undefined, { defaultValue: 'Verify and enable' })}
      </button>
    </form>
  )
}
