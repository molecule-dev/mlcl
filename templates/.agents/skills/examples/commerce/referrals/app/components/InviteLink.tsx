import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * Renders the current user's referral invite link with share affordances
 * (Copy to clipboard, Email, WhatsApp).
 *
 * The code comes from `GET /referrals/code` (see api/handlers/referrals.ts),
 * which lazily mints a stable code on first request. The shareable link is
 * `/signup?ref=<code>`; signup POSTs it to `/referrals/redeem`.
 */
export function InviteLink() {
  const { t } = useTranslation()
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Held so a second click RESETS the "Copied!" window instead of letting an
  // earlier timeout clear it early, and so unmount clears a pending one.
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )

  useEffect(() => {
    fetch('/api/referrals/code')
      .then((r) => r.json())
      .then((body) => setCode(typeof body.code === 'string' ? body.code : null))
      .catch(() => setCode(null))
  }, [])

  if (!code) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('referrals.loading', undefined, { defaultValue: 'Loading your invite link…' })}
      </p>
    )
  }

  const link = `${window.location.origin}/signup?ref=${code}`
  const shareText = t(
    'referrals.shareText',
    { link },
    {
      defaultValue: 'Join me — we both get $10 in credit. Sign up here: {{link}}',
    },
  )
  const mailto = `mailto:?subject=${encodeURIComponent(
    t('referrals.emailSubject', undefined, { defaultValue: 'You should try this' }),
  )}&body=${encodeURIComponent(shareText)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <div className={cm.flex({ direction: 'row', gap: 'sm' })}>
        <input
          readOnly
          value={link}
          aria-label={t('referrals.linkLabel', undefined, { defaultValue: 'Your invite link' })}
          className={cm.cn(cm.input(), cm.flex1)}
        />
        <button
          data-mol-id="referral-copy-link"
          onClick={copy}
          className={cm.button({ variant: 'solid' })}
        >
          {copied
            ? t('referrals.copied', undefined, { defaultValue: 'Copied!' })
            : t('referrals.copy', undefined, { defaultValue: 'Copy' })}
        </button>
      </div>
      <div className={cm.flex({ direction: 'row', gap: 'sm' })}>
        <a
          data-mol-id="referral-share-email"
          href={mailto}
          className={cm.button({ variant: 'outline' })}
        >
          {t('referrals.email', undefined, { defaultValue: 'Email' })}
        </a>
        <a
          data-mol-id="referral-share-whatsapp"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={cm.button({ variant: 'outline' })}
        >
          {t('referrals.whatsapp', undefined, { defaultValue: 'WhatsApp' })}
        </a>
      </div>
    </div>
  )
}
