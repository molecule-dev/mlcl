import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AdjustmentSliderProps {
  /** Translation key suffix — gets prefixed with `adjustmentSlider.`. */
  labelKey: string
  /** Default label fallback if the i18n key is missing. */
  defaultLabel: string
  /** Optional Material Symbols Outlined icon name shown next to the label. */
  icon?: string
  value: number
  min: number
  max: number
  /** Step (default 1). */
  step?: number
  onChange: (value: number) => void
  /** Visual unit suffix (e.g. "%", "px", "°"). */
  unit?: string
  /** Render an "active" left-edge accent + value tint. */
  active?: boolean
}

/**
 * Precision adjustment slider — uppercase 10px label + JetBrains Mono
 * value readout (bound to the same row), violet→magenta gradient track
 * fill with a white 14px thumb. Per DESIGN.md "Adjustment Slider" §.
 *
 * Translated from photo-sharing's monospace EXIF row treatment + the
 * crm dashboard's KPI hover-lift accent — but rebuilt as an actual
 * `<input type="range">` with a custom track gradient (DESIGN.md spec
 * §"Adjustment Slider").
 */
export function AdjustmentSlider({
  labelKey,
  defaultLabel,
  icon,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  active,
}: AdjustmentSliderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const range = max - min
  const fillPct = range === 0 ? 0 : ((value - min) / range) * 100

  // Track fill: accent→danger gradient up to the current value, then
  // panel-divider color. Uses an inline backgroundImage so the gradient
  // is exact — ClassMap can't express dynamic-percentage stops.
  const trackBg = `linear-gradient(90deg, var(--photo-accent) 0%, var(--photo-danger) ${fillPct}%, var(--photo-slider-track) ${fillPct}%, var(--photo-slider-track) 100%)`

  return (
    <div
      className={cm.cn(
        'group rounded-md border-l-2 transition-colors',
        cm.sp('px', 3),
        cm.sp('py', 3),
        active
          ? 'border-[var(--photo-accent)] bg-[var(--photo-accent)]/10'
          : 'border-transparent hover:bg-[var(--photo-surface-elevated)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('mb', 2),
        )}
      >
        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'text-[10px] font-bold uppercase tracking-widest text-[var(--photo-text-muted)]',
          )}
        >
          {icon && (
            <span
              className={cm.cn(
                'material-symbols-outlined text-[14px] text-[var(--photo-text-muted)]',
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          {t(`adjustmentSlider.${labelKey}`, {}, { defaultValue: defaultLabel })}
        </label>
        <span
          className={cm.cn(
            'text-xs font-mono tabular-nums text-[var(--photo-panel-text-highlight)]',
          )}
        >
          {fmtSigned(value)}
          {unit ? unit : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-mol-id={`adjust-${labelKey}`}
        aria-label={t(`adjustmentSlider.${labelKey}`, {}, { defaultValue: defaultLabel })}
        className={cm.cn(
          'lustra-slider w-full h-[14px] appearance-none bg-transparent cursor-pointer focus:outline-none',
        )}
        style={{
          backgroundImage: trackBg,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 4px',
          backgroundPosition: 'center',
        }}
      />
    </div>
  )
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${n}`
  return String(n)
}

export default AdjustmentSlider
