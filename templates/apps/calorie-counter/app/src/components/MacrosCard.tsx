import { getClassMap } from '@molecule/app-ui'

export interface MacroValue {
  /** Brand semantic key — drives bar color via the theme. */
  key: 'protein' | 'carbs' | 'fat' | 'fiber'
  /** Translated display label (already through i18n upstream). */
  label: string
  /** Current grams consumed. */
  current: number
  /** Goal grams. */
  goal: number
  /** Display unit. Defaults to 'g'. */
  unit?: string
}

interface MacrosCardProps {
  /** Card heading (translated). */
  title: string
  macros: MacroValue[]
}

const BAR_COLOR: Record<MacroValue['key'], string> = {
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  fiber: 'bg-fiber',
}

/**
 * Side-by-side macronutrient bars with current/goal labels.
 *
 * Each bar uses its DESIGN.md semantic color (protein/carbs/fat/fiber) and
 * sits on a neutral track. Values are clamped to 0..100% width and rendered
 * with tabular numerals for clean alignment.
 */
export function MacrosCard({ title, macros }: MacrosCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'center', gap: 'lg' }),
        cm.sp('p', 8),
        'bg-surface rounded-2xl shadow-sm min-h-[320px]',
      )}
    >
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
        {title}
      </h3>
      {macros.map(({ key, label, current, goal, unit = 'g' }) => {
        const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
        return (
          <div key={key}>
            <div
              className={cm.cn(
                cm.flex({ justify: 'between' }),
                cm.textSize('sm'),
                cm.sp('mb', 2),
                'font-medium',
              )}
            >
              <span className={cm.cn('text-on-surface')}>{label}</span>
              <span className={cm.cn('text-on-surface-variant tabular-nums')}>
                {current}{' '}
                <span className={cm.cn('text-on-surface-variant/70')}>
                  / {goal}
                  {unit}
                </span>
              </span>
            </div>
            <div className={cm.cn('w-full bg-surface-variant rounded-full h-2 overflow-hidden')}>
              <div
                className={`${BAR_COLOR[key]} h-2 rounded-full transition-[width] duration-700 ease-out`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-label={`${label} ${current} of ${goal}${unit}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
