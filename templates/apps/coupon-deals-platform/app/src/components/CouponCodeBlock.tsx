/**
 * Coupon code block — coupon-strip background, dashed border, monospace
 * tabular code with 2px tracking, inline copy button. The signature
 * UI element of the Snagr brand (per DESIGN.md "Coupon Code Block").
 *
 * Pattern source: bespoke. The dashed-border + monospace-code combo is
 * the brand's defining motif and doesn't have a direct sibling — closest
 * predecessor is helpdesk-ticketing's TicketIdPill (mono code in a chip),
 * adapted here with the scissor/coupon styling.
 */
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CouponCodeBlockProps {
  code: string
  /** Optional caption above the code (e.g. "Show in store"). */
  caption?: string
  /** Optional QR placeholder beneath the code. */
  showQr?: boolean
  /** Optional click handler — defaults to copying the code via the Clipboard API. */
  onCopy?: (code: string) => void | Promise<void>
}

export function CouponCodeBlock({ code, caption, showQr = false, onCopy }: CouponCodeBlockProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  async function copy() {
    setCopyFailed(false)
    let ok = false
    if (onCopy) {
      await onCopy(code)
      ok = true
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      ok = await navigator.clipboard.writeText(code).then(
        () => true,
        () => false,
      )
    }
    if (!ok) {
      // Clipboard API can be unavailable (insecure context / permissions) —
      // fall back to the legacy execCommand path before admitting failure,
      // so "Copy" never silently lies about having copied.
      try {
        const scratch = document.createElement('textarea')
        scratch.value = code
        scratch.setAttribute('readonly', '')
        scratch.style.position = 'fixed'
        scratch.style.opacity = '0'
        document.body.appendChild(scratch)
        scratch.select()
        ok = document.execCommand('copy')
        document.body.removeChild(scratch)
      } catch (_error) {
        // Intentional noop — execCommand unavailability is handled by `ok`.
        ok = false
      }
    }
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } else {
      setCopyFailed(true)
      window.setTimeout(() => setCopyFailed(false), 2500)
    }
  }

  return (
    <div
      data-mol-id="coupon-code-block"
      className={cm.cn(
        cm.sp('p', 5),
        'relative rounded-xl border-2 border-dashed border-outline-variant',
        'bg-surface-container-low',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-surface',
        )}
      />
      <span
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-surface',
        )}
      />

      {caption && (
        <p
          className={cm.cn(
            cm.textCenter,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {caption}
        </p>
      )}

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('mt', caption ? 3 : 0),
        )}
      >
        <code
          className={cm.cn(
            'flex-1 font-mono tabular-nums font-bold text-2xl tracking-[0.2em] text-on-surface',
          )}
        >
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={t('couponCodeBlock.copyAria', {}, { defaultValue: 'Copy redemption code' })}
          aria-live="polite"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary uppercase tracking-wider transition-all',
            'hover:opacity-90 active:scale-95',
            copied && 'ring-2 ring-primary/40',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            {copied ? 'check' : copyFailed ? 'error' : 'content_copy'}
          </span>
          {copied
            ? t('common.copied', {}, { defaultValue: 'Copied' })
            : copyFailed
              ? t('couponCodeBlock.copyFailed', {}, { defaultValue: 'Copy failed' })
              : t('common.copy', {}, { defaultValue: 'Copy' })}
        </button>
      </div>

      {showQr && (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('mt', 5),
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-32 w-32 rounded-md bg-surface-container-highest',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-6xl text-on-surface-variant')}
            >
              qr_code_2
            </span>
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'couponCodeBlock.qrHint',
              {},
              { defaultValue: 'Show this QR to the cashier to redeem' },
            )}
          </p>
        </div>
      )}
    </div>
  )
}
