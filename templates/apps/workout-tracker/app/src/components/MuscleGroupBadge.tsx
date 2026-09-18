import { getClassMap } from '@molecule/app-ui'

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'

interface MuscleGroupBadgeProps {
  group: MuscleGroup
  /** Optional translated label override; defaults to the capitalised key. */
  label?: string
  /** When true, render a tighter compact pill (used inline with text). */
  compact?: boolean
}

const TONE: Record<MuscleGroup, { bg: string; fg: string }> = {
  chest: { bg: 'bg-muscle-chest-bg', fg: 'text-muscle-chest' },
  back: { bg: 'bg-muscle-back-bg', fg: 'text-muscle-back' },
  legs: { bg: 'bg-muscle-legs-bg', fg: 'text-muscle-legs' },
  shoulders: { bg: 'bg-muscle-shoulders-bg', fg: 'text-muscle-shoulders' },
  arms: { bg: 'bg-muscle-arms-bg', fg: 'text-muscle-arms' },
  core: { bg: 'bg-muscle-core-bg', fg: 'text-muscle-core' },
  cardio: { bg: 'bg-muscle-cardio-bg', fg: 'text-muscle-cardio' },
}

const DEFAULT_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
}

/**
 * Color-coded muscle-group pill — matches the DESIGN.md table verbatim
 * (chest red, back blue, legs green, shoulders amber, arms violet, core
 * pink, cardio cyan). Each pill draws its bg + fg from the registered
 * --color-muscle-* tokens in theme.css.
 */
export function MuscleGroupBadge({ group, label, compact }: MuscleGroupBadgeProps) {
  const cm = getClassMap()
  const tone = TONE[group]
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        compact ? cm.sp('px', 2) : cm.sp('px', 3),
        compact ? cm.sp('py', 0) : cm.sp('py', 1),
        compact ? cm.textSize('xs') : 'text-[11px]',
        'inline-flex w-fit rounded-full font-bold uppercase tracking-widest',
        tone.bg,
        tone.fg,
      )}
    >
      {label ?? DEFAULT_LABELS[group]}
    </span>
  )
}
