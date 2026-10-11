import { type FormEvent, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

export function DeleteAccountPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // Load the current user's email so we can gate the button on an exact
  // (case-insensitive) match before hitting the server. The DELETE handler
  // re-validates this server-side (see api/handlers/me.ts).
  useEffect(() => {
    // Loaded ONCE, not per locale: `useTranslation`'s `t` changes identity on a
    // locale switch, so a `[t]` dependency re-ran this fetch and the failure
    // message stayed frozen in the locale it was fetched under. The failure is a
    // FLAG translated at render instead — the message follows a locale switch
    // with no re-fetch (see the i18n docs' render-time guidance).
    let cancelled = false
    // `res.ok` gates the body: a 401 (signed out) or 500 still resolves with a
    // JSON body (`{ error }`), so `r.json()` succeeds and the `.catch` below —
    // the only place the failure is explained — would never run. The form would
    // sit there disabled with no email and no reason given.
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: unknown) => {
        if (cancelled) return
        // `res.ok` alone is not enough: a 2xx proves the route ANSWERED, not
        // that the body carries this user's email. An answer without one (an
        // endpoint with no fixture returns 200 `[]` for a GET — the mock API
        // server's unmatchedFixtureResponse is method-dependent, and `{}` only
        // for a POST — a proxy rewrite, a mismatched route) left `email = null`
        // with `loadFailed` still false —
        // the form sat there disabled with no email and no reason given, the
        // exact state the `res.ok` gate above exists to prevent.
        const p = (body ?? {}) as { email?: unknown }
        if (typeof p.email !== 'string' || p.email.length === 0) {
          setLoadFailed(true)
          return
        }
        setEmail(p.email)
      })
      .catch(() => {
        // A failed load (offline, signed out) must not leave the form
        // unexplained: the button stays disabled and the error below says why.
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const matches = email != null && confirmEmail.trim().toLowerCase() === email.toLowerCase()

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!matches) return
    setDeleting(true)
    setError(null)
    // finally clears the busy state on EVERY path — a rejected fetch (offline,
    // server restart) must not leave the button disabled forever.
    try {
      const res = await fetch('/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_email: confirmEmail.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(
          body.error ??
            t('account.deleteFailed', undefined, {
              defaultValue: 'Could not delete your account',
            }),
        )
        return
      }
      // The server has revoked every device session, so we are now signed out.
      setDeleted(true)
    } catch (_error) {
      setError(
        t('account.deleteFailed', undefined, { defaultValue: 'Could not delete your account' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  if (deleted) {
    return (
      <div
        className={cm.flex({ direction: 'col', gap: 'md' })}
        style={{ maxWidth: '28rem', padding: '1.5rem' }}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
          {t('account.deletedTitle', undefined, {
            defaultValue: 'Your account is scheduled for deletion',
          })}
        </h1>
        <p>
          {t('account.deletedBody', undefined, {
            defaultValue:
              'You have been signed out. Your data will be permanently deleted in 30 days. Sign back in before then to cancel.',
          })}
        </p>
        <button
          onClick={() => {
            window.location.href = '/'
          }}
          data-mol-id="delete-account-return-home"
          className={cm.button({ variant: 'solid' })}
        >
          {t('account.returnHome', undefined, { defaultValue: 'Return to home' })}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className={cm.flex({ direction: 'col', gap: 'md' })}
      style={{ maxWidth: '28rem', padding: '1.5rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('account.deleteTitle', undefined, { defaultValue: 'Delete account' })}
      </h1>

      <div className={cm.alert({ variant: 'warning' })} role="alert">
        <p>
          {t('account.deleteWarning', undefined, {
            defaultValue:
              'This deletes your account and all associated data. You have a 30-day grace period to change your mind — sign back in to cancel. After that, deletion is permanent and cannot be undone.',
          })}
        </p>
      </div>

      <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span>
          {email
            ? t('account.typeEmail', { email }, { defaultValue: 'Type {{email}} to confirm' })
            : t('account.typeEmailLoading', undefined, {
                defaultValue: 'Type your email to confirm',
              })}
        </span>
        <input
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder={t('account.emailPlaceholder', undefined, {
            defaultValue: 'you@example.com',
          })}
          data-mol-id="delete-account-confirm-email"
          className={cm.input({ error: confirmEmail.length > 0 && !matches })}
        />
      </label>

      {loadFailed ? (
        <p className={cm.textError}>
          {t('account.loadFailed', undefined, {
            defaultValue: 'Could not load your account — sign in and try again.',
          })}
        </p>
      ) : null}
      {error ? <p className={cm.textError}>{error}</p> : null}

      <button
        type="submit"
        disabled={!matches || deleting}
        data-mol-id="delete-account-submit"
        className={cm.button({ variant: 'solid', color: 'error' })}
      >
        {deleting
          ? t('account.deleting', undefined, { defaultValue: 'Deleting…' })
          : t('account.deleteConfirm', undefined, {
              defaultValue: 'Permanently delete my account',
            })}
      </button>
    </form>
  )
}
