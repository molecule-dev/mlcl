import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

interface VoiceOrbProps {
  state?: VoiceState
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

/**
 * VoiceOrb — the signature Vox recording orb.
 *
 * Renders a glowing radial-gradient circle (violet → cyan) sized for the
 * conversation hero, with a state-driven pulsing shadow ring. State maps
 * 1:1 to the colors documented in DESIGN.md (`Listening`, `Processing`,
 * `Speaking`, `Idle`). `aria-live="polite"` so screen readers announce
 * transitions.
 */
/** Ring glow as boxShadow string — uses color-mix() so the hue adapts with theme tokens. */
const RING_SHADOW: Record<VoiceState, string> = {
  idle: '0 0 30px color-mix(in srgb, var(--mol-color-primary) 30%, transparent)',
  listening: '0 0 60px color-mix(in srgb, var(--mol-color-error) 45%, transparent)',
  processing: '0 0 60px color-mix(in srgb, var(--color-primary-container) 45%, transparent)',
  speaking: '0 0 60px color-mix(in srgb, var(--mol-color-secondary) 45%, transparent)',
}

export function VoiceOrb({ state = 'idle', size = 'md', label }: VoiceOrbProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sizes: Record<NonNullable<VoiceOrbProps['size']>, string> = {
    sm: 'w-[120px] h-[120px]',
    md: 'w-[160px] h-[160px]',
    lg: 'w-[200px] h-[200px]',
  }
  const innerColor: Record<VoiceState, string> = {
    idle: 'from-primary to-primary-dark',
    listening: 'from-error to-primary',
    processing: 'from-primary-container to-primary',
    speaking: 'from-secondary to-primary',
  }
  const isPulsing = state === 'listening' || state === 'processing' || state === 'speaking'
  const stateLabel =
    label ??
    t(
      `voiceOrb.state.${state}`,
      {},
      { defaultValue: state.charAt(0).toUpperCase() + state.slice(1) },
    )
  return (
    <div
      aria-live="polite"
      className={cm.cn(
        cm.position('relative'),
        cm.flex({ align: 'center', justify: 'center' }),
        sizes[size],
      )}
    >
      {/* Glow ring — inline boxShadow so color-mix() CSS vars are respected */}
      <div
        className={cm.cn(
          cm.position('absolute'),
          cm.inset0,
          cm.roundedFull,
          'pointer-events-none',
          isPulsing ? 'animate-pulse' : '',
        )}
        style={{ boxShadow: RING_SHADOW[state] }}
      />
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          `bg-gradient-to-br ${innerColor[state]}`,
          'h-full w-full backdrop-blur-md',
        )}
      >
        <span
          aria-hidden="true"
          className={'material-symbols-outlined text-white text-5xl'}
          style={{
            fontVariationSettings: "'FILL' 1",
            filter: 'drop-shadow(0 0 12px color-mix(in srgb, white 40%, transparent))',
          }}
        >
          mic
        </span>
      </div>
      <span className="sr-only">{stateLabel}</span>
    </div>
  )
}
