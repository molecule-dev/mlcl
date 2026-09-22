import React, { useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function AgentProfileContactForm({ agentId }: { agentId?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await http.post('/api/leads', { agentId, name, email, message })
      void track({ name: 'lead.captured', properties: { agent_id: agentId ?? null } })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <section
        className={cm.cn(cm.sp('p', 10), 'lg:col-span-5 bg-surface-container lg:p-12 rounded-lg')}
      >
        <h2
          className={cm.cn(
            cm.textSize('3xl'),
            cm.textPrimary,
            cm.sp('mb', 8),
            'font-headline font-extrabold tracking-tight',
          )}
        >
          {t('agentProfileContactForm.messageSent', {}, { defaultValue: 'Message Sent!' })}
        </h2>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t(
            'agentProfileContactForm.successDescription',
            {},
            { defaultValue: 'Thank you for reaching out. The agent will be in touch shortly.' },
          )}
        </p>
      </section>
    )
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 10), 'lg:col-span-5 bg-surface-container lg:p-12 rounded-lg')}
    >
      <h2
        className={cm.cn(
          cm.textSize('3xl'),
          cm.textPrimary,
          cm.sp('mb', 8),
          'font-headline font-extrabold tracking-tight',
        )}
      >
        {t('agentProfileContactForm.title', {}, { defaultValue: 'Get in Touch' })}
      </h2>
      <form className={cm.stack(6)} onSubmit={handleSubmit}>
        <div>
          <label
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('mb', 2),
              'block uppercase tracking-widest',
            )}
          >
            {t('agentProfileContactForm.fullNameLabel', {}, { defaultValue: 'Full Name' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 4),
              'bg-surface-container-low border-none rounded-lg focus:bg-surface-container-lowest focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline-variant',
            )}
            placeholder={t(
              'agentProfileContactForm.namePlaceholder',
              {},
              { defaultValue: 'John Doe' },
            )}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('mb', 2),
              'block uppercase tracking-widest',
            )}
          >
            {t('agentProfileContactForm.emailLabel', {}, { defaultValue: 'Email Address' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 4),
              'bg-surface-container-low border-none rounded-lg focus:bg-surface-container-lowest focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline-variant',
            )}
            placeholder={t(
              'agentProfileContactForm.emailPlaceholder',
              {},
              { defaultValue: 'john@example.com' },
            )}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              cm.sp('mb', 2),
              'block uppercase tracking-widest',
            )}
          >
            {t('agentProfileContactForm.messageLabel', {}, { defaultValue: 'Your Message' })}
          </label>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 4),
              'bg-surface-container-low border-none rounded-lg focus:bg-surface-container-lowest focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline-variant',
            )}
            placeholder={t(
              'agentProfileContactForm.messagePlaceholder',
              {},
              { defaultValue: "I'm interested in viewing your listings..." },
            )}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>
        </div>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.sp('py', 5),
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'btn-gradient text-on-primary rounded-lg font-headline tracking-tight transition-all hover:opacity-90',
          )}
          type="submit"
          disabled={loading}
        >
          {t('agentProfileContactForm.submit', {}, { defaultValue: 'Send Message' })}
        </button>
      </form>
    </section>
  )
}
export { AgentProfileContactForm }
