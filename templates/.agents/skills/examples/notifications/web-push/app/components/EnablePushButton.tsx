import { useEffect, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-react'

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

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') setStatus('denied')
    if (Notification.permission === 'granted') setStatus('enabled')
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
    const reg = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('denied')
      return
    }
    // Fetch the server's VAPID PUBLIC key (public by design) — the browser needs
    // it as applicationServerKey. Do NOT read it from a window global; nothing
    // sets one. GET /api/push/public-key returns 503 until VAPID_PUBLIC_KEY is set.
    const keyRes = await fetch('/api/push/public-key', { credentials: 'include' })
    const publicKey = keyRes.ok
      ? ((await keyRes.json()) as { publicKey?: string }).publicKey
      : undefined
    if (!publicKey) throw new Error('VAPID public key not provided by the server')
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    setStatus('enabled')
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
    <button onClick={enable} className={cm.button({ variant: 'solid' })}>
      {t('push.enable', undefined, { defaultValue: 'Enable notifications' })}
    </button>
  )
}
