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
  const [loadFailed, setLoadFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
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
    // `res.ok` gates the body: a 401 (signed out) or 500 still resolves with a
    // JSON body (`{ error }`) that carries no `code`, so without this check the
    // page sat on "Loading your invite link…" forever with nothing to read.
    // The same is true of a 2xx whose body is not an answer — an endpoint with
    // no fixture answers 200 with an empty object (the mock API server's
    // unmatchedFixtureResponse) — so a body without a string `code` is treated
    // like the failure it is, not parked on the loading line. The test is for a
    // code that can BE a link: `''` (and a blank string) is a string, but it is
    // falsy at the render gate below, so `setCode('')` left the same stuck
    // loading line the `typeof` check was added to prevent — with no error and
    // no retry.
    fetch('/api/referrals/code')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body) => {
        if (typeof body.code !== 'string' || body.code.trim().length === 0)
          throw new Error('no code in body')
        setCode(body.code)
      })
      .catch(() => {
        setCode(null)
        setLoadFailed(true)
      })
  }, [])

  if (!code) {
    return loadFailed ? (
      <p role="alert" className={cm.cn(cm.textSize('sm'), cm.textError)}>
        {t('referrals.loadFailed', undefined, {
          defaultValue: 'Could not load your invite link — try again later.',
        })}
      </p>
    ) : (
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
    setCopyFailed(false)
    // clipboard.writeText REJECTS when the document is not focused (an iframe,
    // a background tab) or permission is denied — a common case, not an edge
    // case. Without this catch the rejection escapes the click handler and the
    // button silently does nothing.
    try {
      await navigator.clipboard.writeText(link)
    } catch (_error) {
      setCopied(false)
      setCopyFailed(true)
      return
    }
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
      {copyFailed ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textError)}>
          {t('referrals.copyFailed', undefined, {
            defaultValue: 'Could not copy — select the link and copy it manually.',
          })}
        </p>
      ) : null}
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
