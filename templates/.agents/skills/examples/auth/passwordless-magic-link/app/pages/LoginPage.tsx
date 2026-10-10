import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type State = 'idle' | 'submitting' | 'sent' | 'error'

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setState('submitting')
    setErrorMsg(null)

    // Every failure path sets the `error` state (which also clears the
    // submitting flag) — a rejected fetch (offline, server restart) must not
    // leave the form stuck on "Sending…" with the button disabled forever.
    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      // `res.ok` is true for EVERY 2xx, 202 included — the status the
      // `/auth/magic-link/request` handler always answers with. A separate
      // `|| res.status === 202` clause can never change the outcome, and reading
      // as if it could suggests a status the check would otherwise reject.
      if (res.ok) {
        // Always show "check your email" regardless — the API never reveals
        // whether the address is registered.
        setState('sent')
      } else {
        const body = await res.json().catch(() => ({}))
        setErrorMsg(
          body.error ??
            t('magicLink.error.generic', undefined, {
              defaultValue: 'Something went wrong. Try again.',
            }),
        )
        setState('error')
      }
    } catch (_error) {
      setErrorMsg(
        t('magicLink.error.network', undefined, { defaultValue: 'Network error. Try again.' }),
      )
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md', align: 'center' }), cm.maxW('sm'))}
        style={cm.sp({ p: 6 })}
      >
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
          {t('magicLink.sent.title', undefined, { defaultValue: 'Check your email' })}
        </h1>
        <p className={cm.textMuted}>
          {t(
            'magicLink.sent.body',
            { email },
            {
              defaultValue: "We've sent a login link to {{email}}. It expires in 15 minutes.",
            },
          )}
        </p>
        <button
          type="button"
          className={cm.button({ variant: 'ghost' })}
          onClick={() => {
            setState('idle')
            setEmail('')
          }}
        >
          {t('magicLink.sent.tryAgain', undefined, { defaultValue: 'Use a different email' })}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.maxW('sm'))}
      style={cm.sp({ p: 6 })}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('magicLink.title', undefined, { defaultValue: 'Log in' })}
      </h1>
      <p className={cm.textMuted}>
        {t('magicLink.subtitle', undefined, {
          defaultValue:
            "Enter your email and we'll send you a one-tap login link — no password needed.",
        })}
      </p>
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('magicLink.emailPlaceholder', undefined, {
          defaultValue: 'you@example.com',
        })}
        className={cm.input({})}
      />
      {errorMsg ? <p className={cm.textError}>{errorMsg}</p> : null}
      <button
        type="submit"
        disabled={state === 'submitting'}
        className={cm.button({ variant: 'solid' })}
      >
        {state === 'submitting'
          ? t('magicLink.submitting', undefined, { defaultValue: 'Sending…' })
          : t('magicLink.submit', undefined, { defaultValue: 'Send login link' })}
      </button>
    </form>
  )
}
