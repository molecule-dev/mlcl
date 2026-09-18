import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TelemetryHUDProps {
  triangles?: number
  renderTime?: string
}

function TelemetryHUD({ triangles, renderTime }: TelemetryHUDProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const triCount = (triangles ?? 0).toLocaleString()
  const frameTime = renderTime ?? '4.2'
  return (
    <div className="absolute top-6 right-[340px] z-30">
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.flex({ align: 'center', gap: 4 }),
          'bg-surface-container-highest/80 backdrop-blur-md border border-outline-variant/15 shadow-[0_4px_32px_rgba(0,0,0,0.4)] shadow-black/40',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <span
            className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary animate-pulse')}
          ></span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-label text-on-surface tabular-nums tracking-wider',
            )}
          >
            {t(
              'telemetryHud.triangleCount',
              { count: triCount },
              { defaultValue: '{{count}} TRIS' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.h(3), 'w-[1px] bg-outline-variant/30')}></div>
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-label text-on-surface-variant tabular-nums tracking-wider',
            )}
          >
            {t('telemetryHud.frameTime', { value: frameTime }, { defaultValue: '{{value}}ms' })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default TelemetryHUD
export { TelemetryHUD }
