import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LineBadgeLine {
  code: string
  name?: string
  kind?: string
  color: string
}

/**
 * Route badge — the line's own color from the data (`transit_lines.color`)
 * with the code in white. Used on boards, line lists, itinerary legs, and
 * alert cards. The color comes from inline style because it is DATA, not a
 * theme token — ClassMap cannot express arbitrary per-line brand colors.
 */
export function LineBadge({ line, size = 'md' }: { line: LineBadgeLine; size?: 'sm' | 'md' }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const kindIcon =
    line.kind === 'metro' ? 'directions_subway' : line.kind === 'tram' ? 'tram' : 'directions_bus'
  return (
    <span
      data-mol-id={`line-badge-${line.code}`}
      className={cm.cn(
        'inline-flex items-center',
        cm.fontWeight('bold'),
        cm.roundedFull,
        'text-white tabular-nums tracking-tight',
        size === 'sm' ? cm.textSize('xs') : cm.textSize('sm'),
        size === 'sm' ? cm.sp('px', 2) : cm.sp('px', 3),
        size === 'sm' ? cm.sp('py', 0.5) : cm.sp('py', 1),
      )}
      style={{ backgroundColor: line.color }}
    >
      <span
        className={'material-symbols-outlined'}
        aria-hidden="true"
        style={{ fontSize: size === 'sm' ? '0.9rem' : '1rem' }}
      >
        {kindIcon}
      </span>
      {line.code}
      <span className="sr-only">
        {line.name
          ? t('lineBadge.suffix', { name: line.name }, { defaultValue: '— {{name}}' })
          : ''}
      </span>
    </span>
  )
}
