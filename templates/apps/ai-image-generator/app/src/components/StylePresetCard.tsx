import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface StylePreset {
  id: string
  label: string
  /** One-line description shown beneath the title. */
  description: string
  /** Tailwind gradient classes for the hero strip (uses the dreamscape palette). */
  gradient: string
  /** Material symbol glyph name. */
  icon: string
  /** Tag chips. */
  tags: string[]
}

export interface StylePresetCardProps {
  preset: StylePreset
  /** Active state — adds a primary ring + filled icon. */
  active?: boolean
  /** True while an activate request is in flight. */
  pending?: boolean
  onSelect?: (id: string) => void
}

/**
 * Tile used by the Styles index — gradient hero strip + glyph + label/description
 * + tag chips. Hover lift mirrors the GenerationCard for visual consistency.
 */
export function StylePresetCard({
  preset,
  active = false,
  pending = false,
  onSelect,
}: StylePresetCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onSelect?.(preset.id)}
      disabled={pending}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group relative overflow-hidden rounded-2xl border bg-surface-container-lowest text-left shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all disabled:opacity-60',
        active ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/15',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'relative h-32 text-white',
          preset.gradient,
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined text-5xl drop-shadow-lg')}
          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {preset.icon}
        </span>
        <div className={cm.cn('absolute inset-0 bg-gradient-to-t from-black/30 to-transparent')} />
        {active && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'absolute top-3 right-3 px-2 py-0.5 rounded-full bg-surface text-primary uppercase tracking-widest',
            )}
          >
            {t('status.active', {}, { defaultValue: 'Active' })}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('p', 4))}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'tracking-tight text-on-surface',
          )}
        >
          {preset.label}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {preset.description}
        </p>
        <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap pt-2')}>
          {preset.tags.map((tag) => (
            <span
              key={tag}
              className={cm.cn(
                cm.sp('px', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'rounded-full bg-primary-container/30 text-primary uppercase tracking-widest',
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}
