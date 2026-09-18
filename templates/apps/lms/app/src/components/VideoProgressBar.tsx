import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VideoProgressBarProps {
  progress?: number
}

function VideoProgressBar({ progress = 0 }: VideoProgressBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))} data-mol-id="course-progress-bar">
      <div className={cm.cn(cm.flex1, cm.h(2), cm.roundedFull, cm.surface, 'overflow-hidden')}>
        <div className={cm.cn(cm.h('full'), 'bg-primary')} style={{ width: `${pct}%` }}></div>
      </div>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}>
        {t(
          'videoProgressBar.coursePercent',
          { progress: pct },
          { defaultValue: '{{progress}}% of course complete' },
        )}
      </span>
    </div>
  )
}
export default VideoProgressBar
export { VideoProgressBar }
