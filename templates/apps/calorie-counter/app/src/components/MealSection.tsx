import { getClassMap } from '@molecule/app-ui'

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

export interface FoodEntry {
  id: string
  name: string
  calories: number
}

interface MealSectionProps {
  meal: MealKey
  /** Translated meal title (Breakfast/Lunch/Dinner/Snacks). */
  title: string
  /** Material-symbols icon name for the meal. */
  icon: string
  /** Logged entries — empty array renders the "What's for X?" empty state. */
  entries: FoodEntry[]
  /** Total calories label suffix (defaults to 'cal'). */
  unit?: string
  /** Optional click handler for the empty/Add slot. */
  onAdd?: () => void
  /** Translated empty-state CTA. Falls back to "What's next?" */
  emptyLabel?: string
  /** Translated "tap to log" subtitle. */
  emptyHint?: string
}

const ACCENT: Record<MealKey, string> = {
  breakfast: 'border-l-breakfast text-breakfast',
  lunch: 'border-l-lunch text-lunch',
  dinner: 'border-l-dinner text-dinner',
  snacks: 'border-l-snacks text-snacks',
}

/**
 * One meal column on the Today grid — header (icon + name + total) plus a
 * vertical stack of logged FoodEntry pills, or an empty "tap to add" state.
 *
 * 3px left-border accent in the meal's brand color, per DESIGN.md
 * "Meal Section Card" recipe.
 */
export function MealSection({
  meal,
  title,
  icon,
  entries,
  unit = 'cal',
  onAdd,
  emptyLabel = "What's next?",
  emptyHint = 'Tap to log',
}: MealSectionProps) {
  const cm = getClassMap()
  const total = entries.reduce((sum, e) => sum + e.calories, 0)
  const isEmpty = entries.length === 0
  const accent = ACCENT[meal]

  if (isEmpty) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 5),
          'bg-surface rounded-2xl shadow-sm border border-dashed border-outline/50 border-l-[3px] min-h-[160px] cursor-pointer hover:bg-surface-variant/30 transition-colors group',
          accent.split(' ')[0],
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            'material-symbols-outlined text-4xl mb-2 opacity-50 group-hover:scale-110 transition-transform',
            accent.split(' ')[1],
          )}
        >
          {icon}
        </span>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {emptyLabel}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant/60 mt-1')}>
          {emptyHint}
        </span>
      </button>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('p', 5),
        'bg-surface rounded-2xl shadow-sm border-l-[3px] h-full',
        accent.split(' ')[0],
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.flex({ align: 'center', gap: 'xs' })}>
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined', accent.split(' ')[1])}
          >
            {icon}
          </span>
          <h3 className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{title}</h3>
        </div>
        <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
          {total}{' '}
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-normal')}>
            {unit}
          </span>
        </span>
      </div>
      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none flex-1')}>
        {entries.map((e) => (
          <li
            key={e.id}
            className={cm.cn(
              cm.flex({ justify: 'between' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'text-on-surface-variant bg-surface-variant/50 rounded-lg',
            )}
          >
            <span>{e.name}</span>
            <span className={cm.cn(cm.textSize('xs'), 'tabular-nums')}>
              {e.calories} {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
