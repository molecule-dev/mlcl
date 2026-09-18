import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * License key display block — JetBrains Mono font on code-block background,
 * violet license color, copy-to-clipboard button. Per DESIGN.md "License Key
 * Display" spec: XXXX-XXXX-XXXX-XXXX letter-spacing 0.05em.
 *
 * No direct sibling — this is Trove-specific. Treatment derived from
 * online-store/CartOrderSummary inline-pill conventions and the catalog
 * §16 "info row" recipe.
 */

interface LicenseKeyDisplayProps {
  licenseKey: string
  productName?: string
  /** "active" | "expired" | "revoked" — shows status pill. */
  status?: 'active' | 'expired' | 'revoked'
  /** Optional issued date (ISO string). */
  issuedAt?: string
}

const STATUS_LABEL: Record<NonNullable<LicenseKeyDisplayProps['status']>, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
}

const STATUS_CLASS: Record<NonNullable<LicenseKeyDisplayProps['status']>, string> = {
  active: 'bg-info-light text-info',
  expired: 'bg-bg-tertiary text-on-surface-variant',
  revoked: 'bg-error-light text-error',
}

function formatLicenseKey(raw: string) {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (clean.length === 16) {
    return clean.match(/.{1,4}/g)?.join('-') ?? raw
  }
  return raw
}

export default function LicenseKeyDisplay({
  licenseKey,
  productName,
  status = 'active',
  issuedAt,
}: LicenseKeyDisplayProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const formatted = formatLicenseKey(licenseKey)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // clipboard write failed (permissions denied or unsupported); reset copy state silently
      setCopied(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest border border-border',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
        <div className={cm.stack(1)}>
          {productName && (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'text-on-surface-variant uppercase tracking-widest',
              )}
            >
              {productName}
            </p>
          )}
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('licenseKeyDisplay.label', {}, { defaultValue: 'License key' })}
          </p>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest',
            STATUS_CLASS[status],
          )}
        >
          {t(`licenseKeyDisplay.status.${status}`, {}, { defaultValue: STATUS_LABEL[status] })}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl',
        )}
        style={{ backgroundColor: 'var(--color-code-block, var(--color-code-block))' }}
      >
        <code
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'flex-1 truncate')}
          style={{
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-license-key, #c4b5fd)',
            letterSpacing: '0.05em',
          }}
        >
          {formatted}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t('licenseKeyDisplay.copy', {}, { defaultValue: 'Copy license key' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-md uppercase tracking-widest text-white/80 hover:text-white hover:bg-surface/10 transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied
            ? t('common.copied', {}, { defaultValue: 'Copied' })
            : t('common.copy', {}, { defaultValue: 'Copy' })}
        </button>
      </div>
      {issuedAt && (
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3), 'text-on-surface-variant')}>
          {t(
            'licenseKeyDisplay.issuedAt',
            { date: new Date(issuedAt).toLocaleDateString() },
            { defaultValue: 'Issued {{date}}' },
          )}
        </p>
      )}
    </div>
  )
}

export { LicenseKeyDisplay }
