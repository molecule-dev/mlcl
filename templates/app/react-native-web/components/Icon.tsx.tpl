import { getIcon } from '@molecule/app-icons'

interface IconProps {
  name: string
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  const icon = getIcon(name)
  const viewBox = icon.viewBox || '0 0 20 20'

  if (icon.svg) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={icon.fill || 'none'}
        className={className}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    )
  }

  const isStroked = !!icon.stroke

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={isStroked ? 'none' : (icon.fill || 'currentColor')}
      {...(isStroked ? {
        stroke: icon.stroke,
        strokeWidth: icon.strokeWidth,
        strokeLinecap: icon.strokeLinecap,
        strokeLinejoin: icon.strokeLinejoin,
      } : {})}
      className={className}
    >
      {icon.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          {...(p.fill ? { fill: p.fill } : {})}
          {...(p.fillRule ? { fillRule: p.fillRule } : {})}
          {...(p.clipRule ? { clipRule: p.clipRule } : {})}
          {...(p.opacity !== undefined ? { opacity: p.opacity } : {})}
        />
      ))}
    </svg>
  )
}
