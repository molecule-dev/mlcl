import { getClassMap } from '@molecule/app-ui'
export default function UsageProgressBar({
  label,
  used,
  limit,
  percent,
  barColor,
}: {
  label: string
  used: string
  limit: string
  percent: number
  barColor: string
}) {
  const cm = getClassMap()
  return (
    <div data-mol-id="usage-progress-bar">
      <div
        className={cm.cn(cm.flex({ justify: 'between' }), cm.fontWeight('bold'), cm.sp('mb', 2))}
        style={{ fontSize: '${textSizeToRem($1)}', lineHeight: '${textSizeToLineHeight($1)}' }}
      >
        <span
          style={{
            color: 'var(--md-sys-color-on-surface)',
            textTransform: 'uppercase',
            letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
          }}
        >
          {label}
        </span>
        <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
          {used} / {limit}
        </span>
      </div>
      <div
        className={cm.roundedFull}
        style={{
          height: 'calc(2 * 0.25rem)',
          width: '100%',
          backgroundColor: 'var(--md-sys-color-surface-container-high)',
          overflow: 'hidden',
        }}
      >
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}

export { UsageProgressBar }
