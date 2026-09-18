import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function EmbedPreviewFrame() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.()
  }

  return (
    <div className={cm.cn(cm.w('full'), cm.flex({ direction: 'col' }), 'lg:w-3/5')}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.flex1,
          cm.minH('[400px]'),
          'bg-surface-container-low rounded-xl relative overflow-hidden shadow-[0_0_32px_rgba(124,58,237,0.05)] border border-outline-variant/10 group',
        )}
        ref={containerRef}
      >
        {/* Overlay HUD */}
        <div className={cm.cn(cm.flex({ gap: 2 }), 'absolute top-4 left-4 z-10')}>
          <div
            className={cm.cn(
              cm.sp('py', 1),
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 text-on-surface font-mono text-[10px] uppercase tracking-widest border border-surface/5',
            )}
          >
            {t('embedPreviewFrame.fps', { value: 60 }, { defaultValue: 'FPS: {{value}}' })}
          </div>
          <div
            className={cm.cn(
              cm.sp('py', 1),
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 text-on-surface font-mono text-[10px] uppercase tracking-widest border border-surface/5',
            )}
          >
            {t('embedPreviewFrame.tris', { count: '142k' }, { defaultValue: 'Tris: {{count}}' })}
          </div>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('py', 1),
              cm.textPrimary,
              'bg-surface/40 backdrop-blur-[20px] rounded px-2.5 font-mono text-[10px] uppercase tracking-widest border border-primary/20',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" data-icon="visibility">
              visibility
            </span>{' '}
            {t('embedPreviewFrame.livePreview', {}, { defaultValue: 'Live Preview' })}
          </div>
        </div>
        {/* 3D Placeholder Image */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container to-surface-container-lowest">
          <img
            alt={t(
              'embedPreviewFrame.modelPreviewAlt',
              {},
              { defaultValue: '3D Abstract Model Preview' },
            )}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover opacity-80 mix-blend-screen',
            )}
            data-alt="Abstract 3D rendering of smooth organic metallic shapes on a dark dramatic background with purple and blue rim lighting"
            src="https://picsum.photos/seed/EmbedPreviewFrame-1/1200/800"
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
              cm.roundedFull,
              'bg-surface/60 backdrop-blur-[20px] border border-surface/10',
            )}
          >
            <button
              className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              onClick={() => setIsPlaying((p) => !p)}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                data-icon={isPlaying ? 'pause' : 'play_arrow'}
              >
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <div className={cm.cn(cm.w('[1px]'), cm.h(4), 'bg-surface/20')}></div>
            <button
              className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              onClick={() => setIsRotating((r) => !r)}
              style={isRotating ? { color: 'var(--md-sys-color-primary)' } : undefined}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="360">
                360
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

export default EmbedPreviewFrame
export { EmbedPreviewFrame }
