import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'unsupported' | 'denied' | 'enabled' | 'available'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const decoded = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) arr[i] = decoded.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

export function EnablePushButton() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('available')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    // Permission alone is a BROWSER fact, and it is not "push works": the
    // user can hold a granted permission while the browser has no live
    // subscription (data cleared, subscription expired) or while the server
    // never stored the one the browser created (the subscribe POST below
    // failed, or the row was purged server-side). Treating 'granted' as
    // "enabled" — as this mount check used to — hid the Enable control in
    // exactly those states, so the user could not re-register and nothing was
    // ever delivered; it contradicted the rule the `enable()` path states two
    // screens down ("Reporting 'enabled' on one would tell the user push works
    // while the server stored no subscription"). So reconcile instead of
    // assuming: re-post the browser's OWN subscription (the endpoint dedupes
    // by endpoint, so this is idempotent), and only call it enabled when the
    // server answers ok. Anything else leaves the Enable control in place as
    // the retry path.
    let cancelled = false
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.getSubscription?.()
        if (!sub) return // granted, but nothing is subscribed — the button is the way back
        const saved = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        })
        if (!cancelled && saved.ok) setStatus('enabled')
      } catch (_error) {
        // A failed reconcile (registration, getSubscription, network) leaves
        // the status at 'available': the user can still press Enable, which
        // reports the real reason.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'unsupported') {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('push.unsupported', undefined, {
          defaultValue: 'Your browser does not support push notifications.',
        })}
      </p>
    )
  }

  async function enable(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }
      if (permission !== 'granted') {
        // 'default' — the prompt was DISMISSED, which is not a denial: the
        // browser will ask again on the next click. Labelling it "denied" sent
        // the user to browser settings for a permission that was still one
        // click away, with the button gone until a remount.
        return
      }
      // Fetch the server's VAPID PUBLIC key (public by design) — the browser needs
      // it as applicationServerKey. Do NOT read it from a window global; nothing
      // sets one. GET /api/push/public-key returns 503 until VAPID_PUBLIC_KEY is set —
      // the exact case handled below, not an exception that dies in the console.
      const keyRes = await fetch('/api/push/public-key', { credentials: 'include' })
      const publicKey = keyRes.ok
        ? ((await keyRes.json()) as { publicKey?: string }).publicKey
        : undefined
      if (!publicKey) {
        setError(
          t('push.noServerKey', undefined, {
            defaultValue:
              'Push is not configured on the server yet (VAPID_PUBLIC_KEY is missing) — try again later.',
          }),
        )
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const saved = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      // `fetch` only rejects on a NETWORK failure — an HTTP error (401 expired
      // session, 500, 503) resolves with `ok === false`. Reporting "enabled" on
      // one would tell the user push works while the server stored no
      // subscription, so nothing would ever be delivered. Same check as the
      // public-key GET above.
      if (!saved.ok) {
        setError(
          t('push.saveFailed', undefined, {
            defaultValue: 'Could not save the subscription — try again.',
          }),
        )
        return
      }
      setStatus('enabled')
    } catch (_error) {
      // A failed service-worker registration, a denied subscribe, or a network
      // failure on any of the fetches above must surface here — an exception
      // escaping the click handler is an unhandled rejection and the button
      // just looks dead. (An HTTP error from the subscribe POST is handled by
      // the `saved.ok` check above, which `fetch` does not reject on.)
      setError(
        t('push.enableFailed', undefined, {
          defaultValue: 'Could not enable notifications — try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  if (status === 'enabled') {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
        {t('push.enabled', undefined, { defaultValue: 'Push notifications enabled' })}
      </p>
    )
  }

  if (status === 'denied') {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('push.denied', undefined, {
          defaultValue: 'Push notifications were denied. Update browser settings to enable.',
        })}
      </p>
    )
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <button onClick={enable} disabled={busy} className={cm.button({ variant: 'solid' })}>
        {t('push.enable', undefined, { defaultValue: 'Enable notifications' })}
      </button>
      {error ? <p className={cm.textError}>{error}</p> : null}
    </div>
  )
}
