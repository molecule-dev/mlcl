import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from './PasswordStrengthMeter.js'

interface GeneratedPasswordCardProps {
  /** The generated password to display in the mono band. */
  password: string
  /** 4-segment strength rating. */
  strength: 1 | 2 | 3 | 4
  /** Bits of entropy text (e.g. "176 bits · 1.2 trillion years to crack"). */
  entropyLabel?: string
  /** Trigger regenerate. */
  onRegenerate?: () => void
  /** Trigger "use in new login" navigation. */
  onUseInLogin?: () => void
}

/**
 * Hero output card on the Generator page — large mono password display
 * over a soft inset, strength meter with entropy footer, primary
 * regenerate / outline copy / soft "use in new login" button row, all
 * sitting on a subtle indigo glow gradient.
 *
 * Translated from podcast's HeroPlayerCard + ai-chatbot-builder's
 * generated-output card, recoloured for Sigil's crystalline indigo.
 */
export function GeneratedPasswordCard({
  password,
  strength,
  entropyLabel,
  onRegenerate,
  onUseInLogin,
}: GeneratedPasswordCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (_error) {
      // clipboard API unavailable in non-secure contexts; copy failure is non-fatal
    }
  }

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'bg-surface rounded-[1.5rem] shadow-lg shadow-primary-light/40 border border-surface/60 relative overflow-hidden',
      )}
      aria-label={t('generatedPasswordCard.aria', {}, { defaultValue: 'Generated password' })}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary-light/30 to-transparent pointer-events-none" />

      <div
        className={cm.cn(
          'relative z-10 w-full',
          cm.maxW('2xl'),
          cm.flex({ direction: 'col', gap: 'lg', align: 'center' }),
        )}
      >
        <div
          className={cm.cn(
            cm.sp('p', 6),
            cm.w('full'),
            cm.textCenter,
            'bg-surface-container-low border border-primary-light/40 rounded-xl select-all cursor-text',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'font-mono text-lg sm:text-2xl md:text-[32px] tracking-[0.08em] text-primary break-all',
            )}
          >
            {password}
          </span>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
            cm.w('full'),
            cm.maxW('sm'),
          )}
        >
          <PasswordStrengthMeter segments={strength} width="full" />
          {entropyLabel && (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {entropyLabel}
            </p>
          )}
        </div>

        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }), 'flex-wrap')}
        >
          <button
            type="button"
            onClick={onRegenerate}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              refresh
            </span>
            {t('generatedPasswordCard.regenerate', {}, { defaultValue: 'Regenerate' })}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface border border-primary-light/60 hover:bg-surface-container-low text-on-surface rounded-lg shadow-sm transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied
              ? t('common.copied', {}, { defaultValue: 'Copied' })
              : t('common.copy', {}, { defaultValue: 'Copy' })}
          </button>
          <button
            type="button"
            onClick={onUseInLogin}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-primary-light hover:bg-primary-light/80 text-primary rounded-lg transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              login
            </span>
            {t('generatedPasswordCard.useInLogin', {}, { defaultValue: 'Use in new login' })}
          </button>
        </div>
      </div>
    </section>
  )
}

export default GeneratedPasswordCard
