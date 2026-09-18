/**
 * Easing curve tile — preset visualization for the Library page. Renders a
 * cubic-bezier curve in cyan over a faint grid, with a name + technical spec.
 *
 * Bespoke per Vivace DESIGN.md (Easing Curve Editor specs).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface EasingPreset {
  id: string
  name: string
  expression: string
  /** Four numbers: x1, y1, x2, y2 for cubic-bezier. */
  bezier: [number, number, number, number]
}

interface EasingCurveTileProps {
  preset: EasingPreset
  active?: boolean
  onPick?: (preset: EasingPreset) => void
}

export function EasingCurveTile({ preset, active = false, onPick }: EasingCurveTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [x1, y1, x2, y2] = preset.bezier
  const W = 200
  const H = 120
  const startX = 8
  const startY = H - 8
  const endX = W - 8
  const endY = 8
  const c1x = startX + (endX - startX) * x1
  const c1y = startY + (endY - startY) * y1
  const c2x = startX + (endX - startX) * x2
  const c2y = startY + (endY - startY) * y2

  const Wrapper = onPick ? 'button' : 'div'

  return (
    <Wrapper
      type={onPick ? 'button' : undefined}
      onClick={onPick ? () => onPick(preset) : undefined}
      data-mol-id={`easing-${preset.id}`}
      className={cm.cn(
        cm.sp('p', 4),
        cm.stack(2),
        'rounded-xl border text-left transition-all hover:-translate-y-0.5',
      )}
      style={{
        backgroundColor: 'var(--anim-surface)',
        borderColor: active
          ? 'color-mix(in srgb, var(--anim-secondary) 60%, transparent)'
          : 'var(--anim-border)',
        boxShadow: active
          ? '0 0 24px -8px color-mix(in srgb, var(--anim-secondary) 60%, transparent)'
          : undefined,
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={cm.cn('w-full h-auto block')} aria-hidden>
        <defs>
          <pattern id={`grid-${preset.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="var(--anim-primary)"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#grid-${preset.id})`} />
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="var(--anim-text-muted)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        <path
          d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
          fill="none"
          stroke="var(--anim-playhead)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={startX}
          y1={startY}
          x2={c1x}
          y2={c1y}
          stroke="var(--anim-secondary)"
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <line
          x1={endX}
          y1={endY}
          x2={c2x}
          y2={c2y}
          stroke="var(--anim-secondary)"
          strokeOpacity="0.5"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <circle cx={c1x} cy={c1y} r="4" fill="var(--anim-secondary)" />
        <circle cx={c2x} cy={c2y} r="4" fill="var(--anim-secondary)" />
      </svg>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          style={{ color: 'var(--anim-text)' }}
        >
          {preset.name}
        </span>
        {active && (
          <span
            className={cm.cn('font-mono text-[10px] uppercase tracking-widest')}
            style={{ color: 'var(--anim-secondary)' }}
          >
            {t('easingCurveTile.active', {}, { defaultValue: 'Active' })}
          </span>
        )}
      </div>
      <code
        className={cm.cn('font-mono text-[10px] truncate block')}
        style={{ color: 'var(--anim-text-muted)' }}
      >
        {preset.expression}
      </code>
    </Wrapper>
  )
}

export default EasingCurveTile
