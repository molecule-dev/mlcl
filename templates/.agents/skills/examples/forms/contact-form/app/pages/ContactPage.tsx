import { type FormEvent, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Status = 'idle' | 'submitting' | 'sent' | 'error'

export function ContactPage() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setStatus('submitting')
    setError(null)
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(
        body.error ??
          t('contact.failed', undefined, { defaultValue: 'Could not send your message' }),
      )
      setStatus('error')
      return
    }
    setStatus('sent')
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <form
      onSubmit={submit}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}
      style={{ maxWidth: '28rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('contact.title', undefined, { defaultValue: 'Get in touch' })}
      </h1>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('contact.namePlaceholder', undefined, { defaultValue: 'Your name' })}
        className={cm.input({})}
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('contact.emailPlaceholder', undefined, { defaultValue: 'Your email' })}
        className={cm.input({})}
      />
      <textarea
        required
        minLength={10}
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('contact.messagePlaceholder', undefined, {
          defaultValue: 'How can we help?',
        })}
        className={cm.textarea({})}
      />
      {status === 'sent' ? (
        <p className={cm.textSuccess}>
          {t('contact.sent', undefined, { defaultValue: "Thanks — we'll get back to you soon." })}
        </p>
      ) : null}
      {status === 'error' && error ? <p className={cm.textError}>{error}</p> : null}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className={cm.button({ variant: 'solid' })}
      >
        {status === 'submitting'
          ? t('contact.submitting', undefined, { defaultValue: 'Sending…' })
          : t('contact.submit', undefined, { defaultValue: 'Send message' })}
      </button>
    </form>
  )
}
