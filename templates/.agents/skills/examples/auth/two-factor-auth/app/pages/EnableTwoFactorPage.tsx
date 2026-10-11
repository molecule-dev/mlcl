import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

// QRImageUrl is returned directly by the API (generated server-side by @molecule/api-two-factor).
// The enroll body also carries `keyUrl` (the otpauth:// URI behind the QR) — this
// page renders the QR image and the manual secret, so it keeps only what it shows.
type EnrollResponse = {
  secret: string
  QRImageUrl: string
  recoveryCodes: string[]
}

export function EnableTwoFactorPage() {
  const { t } = useTranslation()
  const [enrollment, setEnrollment] = useState<EnrollResponse | null>(null)
  const [code, setCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startEnroll(): Promise<void> {
    setEnrolling(true)
    setError(null)
    // Every failure path clears the busy flag — a rejected enroll fetch
    // (offline, server restart) must not leave the click handler rejecting
    // into the void with a button that just looks dead.
    try {
      const res = await fetch('/api/2fa/enroll', { method: 'POST' })
      if (!res.ok) {
        setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
        return
      }
      // A 2xx proves the route ANSWERED, not that the body is an enrollment. An
      // endpoint with no fixture answers 200 with an empty object (the mock API
      // server's unmatchedFixtureResponse), and a proxy can rewrite a failure
      // into a 200. `enrollment` is what takes the page off the "Get started"
      // step, and the very next render calls `enrollment.recoveryCodes.map(...)`
      // — so an unvalidated body is a white screen instead of a retryable
      // error. Validate the shape before it reaches state.
      const body = (await res.json().catch(() => null)) as Partial<EnrollResponse> | null
      if (!body || typeof body.secret !== 'string' || !Array.isArray(body.recoveryCodes)) {
        setError(t('totp.enrollFailed', undefined, { defaultValue: 'Could not enroll' }))
        return
      }
      setEnrollment({
        secret: body.secret,
        QRImageUrl: typeof body.QRImageUrl === 'string' ? body.QRImageUrl : '',
        // The list renders one <li key={code}> per code; a non-string would
        // reach the DOM, and a code repeated in the body would collide with
        // itself as a React key.
        recoveryCodes: [
          ...new Set(body.recoveryCodes.filter((c): c is string => typeof c === 'string')),
        ],
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
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      // Every non-2xx answer carries `{ error }` (wrong code 401, bad format /
      // not enrolled 400, throttled 429) — read it. Collapsing them all into
      // "Wrong code — try again" told a user whose CORRECT code was refused by
      // the rate limiter to retype it, the exact mislabel LoginVerifyPage
      // documents below.
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (res.status === 401 || res.status === 403) {
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
      // handler's success body is `{ ok: true }` (api/handlers/totp.ts — the
      // promotion of `totp_secret_pending` to `totp_secret` happens on that
      // path), and an endpoint with no fixture answers `{}` while a proxy can
      // rewrite a failure into a 200. Taking any 2xx as success announced
      // "Two-factor authentication enabled" over an account where the second
      // factor is still OFF, with the page offering no way back. The same shape
      // gate `startEnroll` applies to its own 2xx body.
      if (body.ok !== true) {
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
          {/* Same rule as the warning below: the codes are registered here, not
              redeemable by this stack (see the note on `totp.recoveryWarning`),
              so the copy does not tell the user they are a way back in. */}
          {t('totp.savedCodes', undefined, {
            defaultValue: 'Make sure you saved your recovery codes somewhere safe.',
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
          className={cm.button({ variant: 'solid' })}
        >
          {enrolling
            ? t('totp.starting', undefined, { defaultValue: 'Starting…' })
            : t('totp.start', undefined, { defaultValue: 'Get started' })}
        </button>
        {error ? <p className={cm.cn('text-error')}>{error}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={verify} className={cm.flex({ direction: 'col', gap: 'md' })}>
      <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('totp.scanTitle', undefined, { defaultValue: 'Scan with your authenticator app' })}
      </h2>
      {enrollment.QRImageUrl ? (
        <img src={enrollment.QRImageUrl} alt="" width={200} height={200} />
      ) : null}
      <p className={cm.textSize('sm')}>
        {t('totp.manualEntry', undefined, {
          defaultValue: "Can't scan? Enter this code manually:",
        })}
        <code className={cm.cn(cm.textSize('sm'), 'font-mono')}>{enrollment.secret}</code>
      </p>
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('totp.recoveryTitle', undefined, { defaultValue: 'Save your recovery codes' })}
      </h3>
      <ul>
        {enrollment.recoveryCodes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <p className={cm.cn(cm.textSize('sm'), 'text-warning')}>
        {/* The copy must not promise a redemption this stack cannot perform:
            `POST /2fa/enroll` stores the code HASHES (totp_recovery_codes) and
            nothing consumes them — the framework's log-in route verifies a
            TOTP token only, so "each code works once" described a way back in
            that does not exist. Registration is the half this example owns;
            redeeming a code belongs to the log-in path, where a locked-out
            user can reach it. */}
        {t('totp.recoveryWarning', undefined, {
          defaultValue: 'These will not be shown again — save them somewhere safe now.',
        })}
      </p>
      <input
        autoFocus
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder={t('totp.codePlaceholder', undefined, { defaultValue: '6-digit code' })}
        className={cm.input({})}
      />
      {error ? <p className={cm.cn('text-error')}>{error}</p> : null}
      <button
        type="submit"
        disabled={verifying || code.length !== 6}
        className={cm.button({ variant: 'solid' })}
      >
        {verifying
          ? t('totp.verifying', undefined, { defaultValue: 'Verifying…' })
          : t('totp.verify', undefined, { defaultValue: 'Verify and enable' })}
      </button>
    </form>
  )
}
