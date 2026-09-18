import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * Sends the signed-in user a test SMS to their OWN stored number
 * (`POST /api/sms/notify-me`). The recipient is resolved server-side from the
 * user's record — this button never sends a phone number to the API, so it
 * can't be used to text anyone else.
 */
export function TextMeButton({
  message = 'This is a test alert from your app.',
}: {
  message?: string
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function textMe(): Promise<void> {
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/sms/notify-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch (_error) {
      // Network failure — show the generic error state; the server logs specifics.
      setStatus('error')
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} style={{ maxWidth: '24rem' }}>
      <button
        type="button"
        data-mol-id="sms-text-me"
        onClick={textMe}
        disabled={status === 'sending'}
        className={cm.button({ variant: 'solid' })}
      >
        {status === 'sending'
          ? t('sms.sending', undefined, { defaultValue: 'Sending…' })
          : t('sms.textMe', undefined, { defaultValue: 'Text me a test alert' })}
      </button>
      {status === 'sent' ? (
        <p className={cm.textMuted}>{t('sms.sent', undefined, { defaultValue: 'Sent!' })}</p>
      ) : null}
      {status === 'error' ? (
        <p className={cm.textError}>
          {error || t('sms.error', undefined, { defaultValue: 'Could not send. Try again.' })}
        </p>
      ) : null}
    </div>
  )
}

export default TextMeButton
