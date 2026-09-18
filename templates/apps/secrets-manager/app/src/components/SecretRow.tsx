import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SecretStatusPill, type SecretStatusTone } from './SecretStatusPill.js'

/**
 * Editorial secrets row — 52px monospace row with status dot, key name,
 * masked value with reveal-on-hold, status pill, last-rotated stamp,
 * and a hover-revealed copy button.
 *
 * Translated from database-admin's QueryHistory row (mono uppercase
 * tracking-widest action verb + tabular-nums timestamp + ghost row
 * actions) into Arcanum's secret idiom: the value is masked by
 * default and reveals while the eye button is held down (per
 * DESIGN.md "Hide first, reveal on intent"), then snaps back to dots
 * on release. Used inside `VaultDetail` and `Rotations`.
 */

export interface SecretRowData {
  id: string
  /** Mono key name (e.g. `STRIPE_SECRET_KEY`). */
  key: string
  /** Optional namespace path (e.g. `acme/prod/payments`). */
  path?: string
  /**
   * Sensitive value — never logged; rendered only while held. When absent
   * (list views don't ship plaintext), the row renders a static masked
   * display and disables the reveal/copy controls.
   */
  value?: string | null
  /** Status drives the leading dot + pill. */
  status: SecretStatusTone
  /** Friendly last-rotated timestamp (e.g. `3 days ago`). */
  lastRotated?: string
  /** Optional environment tag (DEV / STAGING / PROD). */
  environment?: 'production' | 'staging' | 'dev'
}

interface SecretRowProps {
  secret: SecretRowData
  /** Override the label rendered on the status pill. */
  statusLabel?: string
  /** Click handler when the row chrome is selected (opens detail). */
  onOpen?: () => void
}

const STATUS_COLOR: Record<SecretStatusTone, string> = {
  active: 'var(--color-secret-active)',
  expiring: 'var(--color-secret-expiring)',
  expired: 'var(--color-secret-expired)',
  revoked: 'var(--color-secret-revoked)',
  inherited: 'var(--color-secret-inherited)',
  masked: 'var(--color-secret-masked)',
  dev: 'var(--color-sky)',
  staging: 'var(--color-violet)',
  production: 'var(--color-red)',
  pending: 'var(--color-secret-masked)',
}

export function SecretRow({ secret, statusLabel, onOpen }: SecretRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const dotColor = STATUS_COLOR[secret.status]
  const hasValue = typeof secret.value === 'string' && secret.value.length > 0
  const valueLength = hasValue ? (secret.value as string).length : 16
  const masked = '•'.repeat(Math.min(20, Math.max(8, valueLength)))

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation()
    if (!hasValue) return
    try {
      await navigator.clipboard.writeText(secret.value as string)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (_error) {
      /* clipboard not available — silently noop */
    }
  }

  return (
    <div
      data-mol-id={`secret-row-${secret.id}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cm.cn(
        'group flex h-[52px] items-center gap-3 border-b border-border/60 px-4',
        'transition-colors hover:bg-surface-secondary',
        onOpen ? 'cursor-pointer' : '',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('inline-block h-2 w-2 shrink-0 rounded-full')}
        style={{
          backgroundColor: dotColor,
          boxShadow: `0 0 6px color-mix(in srgb, ${dotColor} 40%, transparent)`,
        }}
      />

      <div className={cm.cn('flex min-w-0 flex-1 items-center gap-3')}>
        <span className={cm.cn('truncate font-mono text-sm font-medium text-text')}>
          {secret.key}
        </span>
        {secret.path ? (
          <span
            className={cm.cn('hidden truncate font-mono text-[11px] text-muted md:inline')}
            title={secret.path}
          >
            {secret.path}
          </span>
        ) : null}
      </div>

      <div className={cm.cn('flex items-center gap-2')}>
        <code
          className={cm.cn(
            'inline-flex h-7 items-center rounded border border-border/60 px-2 font-mono text-[12px]',
            revealed && hasValue
              ? 'bg-primary/10 text-primary'
              : 'bg-background text-secret-masked',
          )}
          style={{ letterSpacing: revealed && hasValue ? 'normal' : '0.15em' }}
          data-mol-id={`secret-row-value-${secret.id}`}
        >
          {revealed && hasValue ? (secret.value as string) : masked}
        </code>
        <button
          type="button"
          aria-label={
            revealed
              ? t('secretRow.hide', {}, { defaultValue: 'Hide value' })
              : t('secretRow.reveal', {}, { defaultValue: 'Hold to reveal value' })
          }
          disabled={!hasValue}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => hasValue && setRevealed(true)}
          onMouseUp={() => setRevealed(false)}
          onMouseLeave={() => setRevealed(false)}
          onTouchStart={() => hasValue && setRevealed(true)}
          onTouchEnd={() => setRevealed(false)}
          className={cm.cn(
            'inline-flex h-7 w-7 items-center justify-center rounded border border-border/60 text-muted',
            'transition-colors hover:border-primary hover:text-primary',
            !hasValue && 'cursor-not-allowed opacity-40',
          )}
        >
          <span className="material-symbols-outlined text-[16px]">
            {revealed ? 'visibility_off' : 'visibility'}
          </span>
        </button>
        <button
          type="button"
          aria-label={t('secretRow.copy', {}, { defaultValue: 'Copy value' })}
          disabled={!hasValue}
          onClick={handleCopy}
          className={cm.cn(
            'inline-flex h-7 w-7 items-center justify-center rounded border border-border/60 text-muted opacity-0',
            'transition-all group-hover:opacity-100 hover:border-primary hover:text-primary',
            copied && 'opacity-100 border-primary text-primary',
            !hasValue && 'cursor-not-allowed opacity-40 group-hover:opacity-40',
          )}
        >
          <span className="material-symbols-outlined text-[16px]">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>

      <SecretStatusPill tone={secret.status} label={statusLabel} compact />

      <span className={cm.cn('hidden w-28 text-right font-mono text-[11px] text-muted md:inline')}>
        {secret.lastRotated ?? '—'}
      </span>
    </div>
  )
}
