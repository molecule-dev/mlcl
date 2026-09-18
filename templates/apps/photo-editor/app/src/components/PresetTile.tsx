import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SamplePreset } from '../lib/sample-photos.js'

interface PresetTileProps {
  preset: SamplePreset
  /** Whether this preset is currently applied to the photo. */
  active?: boolean
  /** Click handler — wires preset application from Editor / Presets. */
  onApply?: (presetId: string) => void
}

const PRESET_GRADIENTS: Record<SamplePreset['category'], string> = {
  mood: 'linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 50%, #ec4899 100%)',
  cinema: 'linear-gradient(135deg, #1e1e36 0%, #7c2d12 50%, #c2410c 100%)',
  studio: 'linear-gradient(135deg, #fafaf9 0%, #fbcfe8 50%, #c4b5fd 100%)',
  street: 'linear-gradient(135deg, #0c0c1d 0%, #1e1e36 40%, #06b6d4 100%)',
  mono: 'linear-gradient(135deg, #1a1a2e 0%, #6b7280 50%, #f0eef8 100%)',
}

const CATEGORY_LABEL: Record<SamplePreset['category'], string> = {
  mood: 'Mood',
  cinema: 'Cinema',
  studio: 'Studio',
  street: 'Street',
  mono: 'Mono',
}

/**
 * Filter / LUT preset card — square gradient thumbnail with a fine
 * curve overlay and adjustment readouts in JetBrains Mono. Clicking
 * applies the preset to the active photo.
 *
 * Translated from animation-tool's ProjectCard.tsx gradient-thumbnail
 * pattern + photo-sharing's monospace EXIF readout treatment, recoloured
 * by category and given a per-category SVG curve overlay so each tile
 * communicates its tonal feel at a glance.
 */
export function PresetTile({ preset, active, onApply }: PresetTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const gradient = PRESET_GRADIENTS[preset.category]

  return (
    <button
      type="button"
      onClick={() => onApply?.(preset.id)}
      data-mol-id={`preset-${preset.id}`}
      className={cm.cn(
        'group block text-left rounded-xl bg-[var(--photo-surface-elevated)] border overflow-hidden transition-all hover:-translate-y-0.5',
        active
          ? 'border-[var(--photo-accent)] shadow-lg'
          : 'border-[var(--photo-border)] hover:border-[var(--photo-accent)]/50 hover:shadow-md',
      )}
    >
      <div
        className={cm.cn('relative aspect-square overflow-hidden')}
        style={{ background: gradient }}
      >
        <div
          className={cm.cn(
            'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:14px_14px] opacity-50',
          )}
          aria-hidden="true"
        />

        {/* Tone curve overlay — reads the preset's contrast/brightness */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={cm.cn('absolute inset-0 w-full h-full')}
          aria-hidden="true"
        >
          <path
            d={curvePath(preset.adjustments.contrast, preset.adjustments.brightness)}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`${curvePath(preset.adjustments.contrast, preset.adjustments.brightness)} L 100 100 L 0 100 Z`}
            fill="rgba(255,255,255,0.18)"
          />
        </svg>

        {active && (
          <span
            className={cm.cn(
              'absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded-full bg-[var(--photo-accent)] text-white shadow',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[12px]')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              check_circle
            </span>
            {t('presetTile.activeBadge', {}, { defaultValue: 'Applied' })}
          </span>
        )}

        <span
          className={cm.cn(
            'absolute bottom-2 left-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded bg-foreground/55 backdrop-blur text-white',
          )}
        >
          {t(
            `presetTile.category.${preset.category}`,
            {},
            { defaultValue: CATEGORY_LABEL[preset.category] },
          )}
        </span>
      </div>

      <div className={cm.cn(cm.sp('p', 4), cm.stack(2))}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'tracking-tight text-[var(--photo-text)] line-clamp-1 group-hover:text-[var(--photo-panel-text-highlight)] transition-colors',
          )}
        >
          {preset.name}
        </h3>
        <p className={cm.cn('text-xs text-[var(--photo-text-muted)] line-clamp-2 leading-relaxed')}>
          {preset.description}
        </p>
        <div
          className={cm.cn(
            'flex items-center gap-3 mt-1 text-[10px] font-mono tabular-nums text-[var(--photo-panel-text-highlight)]',
          )}
        >
          <span>{fmtSigned(preset.adjustments.contrast)} CONT</span>
          <span aria-hidden="true">·</span>
          <span>{fmtSigned(preset.adjustments.saturation)} SAT</span>
          <span aria-hidden="true">·</span>
          <span>{fmtSigned(preset.adjustments.grain)} GRN</span>
        </div>
      </div>
    </button>
  )
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

function curvePath(contrast: number, brightness: number): string {
  // Contrast bends the midpoint, brightness lifts/drops the curve.
  // Uses two chained cubic Beziers so the curve passes through 5 anchor
  // points (start → drop → mid → lift → end). A single `C` only accepts
  // three points; piling on extras silently corrupts the path string and
  // browsers reject it (`<path> attribute d: Expected number`).
  const mid = 50 + brightness * 0.4
  const lift = Math.max(15, Math.min(85, mid - contrast * 0.4))
  const drop = Math.max(15, Math.min(85, mid + contrast * 0.4))
  return [
    `M 0 95`,
    `C 12.5 ${100 - drop}, 37.5 ${100 - mid}, 50 ${100 - mid}`,
    `C 62.5 ${100 - mid}, 87.5 ${100 - lift}, 100 5`,
  ].join(' ')
}

export default PresetTile
