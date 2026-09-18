import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ViewerBackground() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 bg-surface-container-low')}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(40,40,61,0.5) 0%, rgba(26,26,46,1) 100%)',
      }}
    >
      <img
        alt={t('viewerBackground.modelImageAlt', {}, { defaultValue: '3D model placeholder' })}
        className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover mix-blend-overlay opacity-30')}
        data-alt="Highly detailed 3D wireframe render of a dragon head, glowing neon purple edges against a deep dark navy background, technical technical mesh visualization"
        src="https://picsum.photos/seed/ViewerBackground-1/1200/800"
      />
    </div>
  )
}

export default ViewerBackground
export { ViewerBackground }
