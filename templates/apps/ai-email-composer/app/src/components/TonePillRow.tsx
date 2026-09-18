import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type Tone = 'formal' | 'friendly' | 'concise' | 'persuasive' | 'urgent' | 'warm'

interface TonePillRowProps {
  value: Tone
  onChange: (tone: Tone) => void
  /** Restrict the pill set if needed; defaults to all tones. */
  options?: ReadonlyArray<Tone>
}

const TONE_META: Record<Tone, { defaultLabel: string; icon: string; tint: string }> = {
  formal: { defaultLabel: 'Formal', icon: 'gavel', tint: 'text-info' },
  friendly: { defaultLabel: 'Friendly', icon: 'favorite', tint: 'text-secondary-dark' },
  concise: { defaultLabel: 'Concise', icon: 'short_text', tint: 'text-on-surface-variant' },
  persuasive: { defaultLabel: 'Persuasive', icon: 'auto_awesome', tint: 'text-primary' },
  urgent: { defaultLabel: 'Urgent', icon: 'priority_high', tint: 'text-error' },
  warm: { defaultLabel: 'Warm', icon: 'wb_sunny', tint: 'text-warning' },
}

const ALL_TONES: ReadonlyArray<Tone> = [
  'formal',
  'friendly',
  'concise',
  'persuasive',
  'urgent',
  'warm',
]

/**
 * Pill-segment selector for AI tone — used in the Compose AI panel and on
 * the Profile tone-preference card. The active pill fills with the brand
 * gradient and shows white text/icon; inactive pills show the tinted icon
 * over a tonal background.
 */
export function TonePillRow({ value, onChange, options = ALL_TONES }: TonePillRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('tonePillRow.label', {}, { defaultValue: 'AI tone' })}
      className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}
    >
      {options.map((tone) => {
        const meta = TONE_META[tone]
        const active = tone === value
        return (
          <button
            key={tone}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tone)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'transition-all border',
              active
                ? 'text-white border-transparent shadow-sm'
                : 'bg-surface-container-low border-outline-variant/60 text-on-surface hover:bg-surface-container',
            )}
            style={
              active
                ? {
                    background:
                      'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
                    boxShadow:
                      '0 4px 12px color-mix(in srgb, var(--color-primary) 25%, transparent)',
                  }
                : undefined
            }
          >
            <span
              className={cm.cn(
                'material-symbols-outlined text-base',
                active ? 'text-white' : meta.tint,
              )}
              aria-hidden="true"
            >
              {meta.icon}
            </span>
            {t(`tonePillRow.${tone}`, {}, { defaultValue: meta.defaultLabel })}
          </button>
        )
      })}
    </div>
  )
}
