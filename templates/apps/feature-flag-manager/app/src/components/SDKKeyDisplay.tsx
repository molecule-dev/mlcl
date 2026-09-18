import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvironmentBadge, type EnvTone } from './EnvironmentBadge.js'

/**
 * SDK key display — code-block surface with a partially masked key,
 * env-tinted badge label, reveal toggle, and copy-to-clipboard
 * button. Used on the Environments page and on the FlagDetail
 * `/integrate` panel.
 *
 * Translated from database-admin's connection-string row + the
 * DESIGN.md "SDK Key Display" spec (mono sm font, env label above,
 * 8px radius, ghost copy button).
 */

interface SDKKeyDisplayProps {
  envName: string
  envTone: EnvTone
  /** Full SDK key (only the last 8 chars are visible by default). */
  sdkKey: string
}

function maskKey(value: string): string {
  if (value.length <= 12) return value
  return '•'.repeat(value.length - 8) + value.slice(-8)
}

export function SDKKeyDisplay({ envName, envTone, sdkKey }: SDKKeyDisplayProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(sdkKey)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      } catch (_error) {
        // Clipboard unavailable in this context — the copy button is best-effort.
      }
    }
  }

  return (
    <div className={cm.cn('space-y-2')} data-mol-id={`sdk-key-${envTone}`}>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <EnvironmentBadge tone={envTone} label={envName} />
        <span
          className={cm.cn(
            'font-mono text-[10px] text-on-surface-variant tracking-widest uppercase',
          )}
        >
          {t('sdkKeyDisplay.label', {}, { defaultValue: 'SDK key' })}
        </span>
      </div>
      <div
        className={cm.cn('flex items-center gap-2 rounded-lg px-3 py-2.5')}
        style={{
          backgroundColor: 'var(--color-code-block)',
          border: '1px solid rgba(30, 41, 59, 0.8)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
          aria-hidden="true"
        >
          key
        </span>
        <code
          className={cm.cn('font-mono text-sm flex-1 min-w-0 truncate')}
          style={{ color: 'var(--color-text-code)', letterSpacing: '0.025em' }}
        >
          {revealed ? sdkKey : maskKey(sdkKey)}
        </code>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className={cm.cn(
            'inline-flex items-center justify-center rounded-md p-1 text-on-surface-variant hover:text-on-surface transition-colors',
          )}
          aria-label={
            revealed
              ? t('sdkKeyDisplay.hide', {}, { defaultValue: 'Hide key' })
              : t('sdkKeyDisplay.reveal', {}, { defaultValue: 'Reveal key' })
          }
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>
            {revealed ? 'visibility_off' : 'visibility'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={cm.cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono font-semibold transition-colors',
          )}
          style={{
            backgroundColor: copied ? 'var(--color-env-filter-active-bg)' : 'rgba(30, 41, 59, 0.8)',
            color: copied ? 'var(--color-emerald-chip-text)' : 'var(--color-on-surface-variant)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied
            ? t('common.copied', {}, { defaultValue: 'Copied' })
            : t('common.copy', {}, { defaultValue: 'Copy' })}
        </button>
      </div>
    </div>
  )
}
