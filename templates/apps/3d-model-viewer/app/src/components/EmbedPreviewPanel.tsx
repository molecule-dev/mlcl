import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function EmbedPreviewPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.w('full'), 'lg:w-3/5')}>
      <div
        ref={containerRef}
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          'bg-surface-container-low rounded-xl relative overflow-hidden shadow-[0_0_32px_rgba(124,58,237,0.05)] border border-outline-variant/10 group min-h-[400px]',
        )}
      >
        {/* Overlay HUD */}
        <div className={cm.cn(cm.flex({ gap: 2 }), 'absolute top-4 left-4 z-10')}>
          <div
            className={cm.cn(
              cm.sp('py', 1),
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 text-on-surface font-mono text-[10px] uppercase tracking-widest border border-surface/5',
            )}
          >
            {t('embedPreviewPanel.fps', { count: 60 }, { defaultValue: 'FPS: {{count}}' })}
          </div>
          <div
            className={cm.cn(
              cm.sp('py', 1),
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 text-on-surface font-mono text-[10px] uppercase tracking-widest border border-surface/5',
            )}
          >
            {t(
              'embedPreviewPanel.triangles',
              { count: '142k' },
              { defaultValue: 'Tris: {{count}}' },
            )}
          </div>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('py', 1),
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 text-primary font-mono text-[10px] uppercase tracking-widest border border-primary/20',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" data-icon="visibility">
              visibility
            </span>
            {t('embedPreviewPanel.livePreview', {}, { defaultValue: 'Live Preview' })}
          </div>
        </div>
        {/* 3D Placeholder Image */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container to-surface-container-lowest">
          <img
            alt={t('embedPreviewPanel.modelAlt', {}, { defaultValue: '3D Abstract Model Preview' })}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover opacity-80 mix-blend-screen',
            )}
            data-alt="Abstract 3D rendering of smooth organic metallic shapes on a dark dramatic background with purple and blue rim lighting"
            src="https://picsum.photos/seed/EmbedPreviewPanel-1/1200/800"
            style={{
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.3s ease',
              transformOrigin: 'center',
            }}
          />
        </div>
        {/* Mock Controls Bottom */}
        <div
          className={cm.cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 4 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'bg-surface/60 backdrop-blur-[20px] rounded-full border border-surface/10',
            )}
          >
            <button
              className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              onClick={() => setIsPlaying((p) => !p)}
            >
              <span
                className="material-symbols-outlined"
                data-icon={isPlaying ? 'pause' : 'play_arrow'}
              >
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div className={cm.cn(cm.w('[1px]'), cm.h(4), 'bg-surface/20')}></div>
            <button
              className={`${isRotating ? 'text-primary' : 'text-on-surface'} hover:text-primary transition-colors`}
              onClick={() => setIsRotating((r) => !r)}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="360">
                360
              </span>
            </button>
            <button
              className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              onClick={() => setZoomLevel((z) => (z >= 2 ? 1 : z + 0.5))}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="zoom_in">
                zoom_in
              </span>
            </button>
            <button
              className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              onClick={handleFullscreen}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="fullscreen">
                fullscreen
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmbedPreviewPanel
export { EmbedPreviewPanel }
