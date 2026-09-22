import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function HeroViewport() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeTool, setActiveTool] = useState<'rotate' | 'pan' | 'zoom' | 'layers'>('rotate')
  const [activePin, setActivePin] = useState<number | null>(null)
  return (
    <div
      className={cm.cn(
        cm.w('full'),
        'lg:w-7/12 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-ambient group',
      )}
    >
      {/* Viewport Background */}
      <div className="absolute inset-0 bg-on-background">
        <img
          alt={t('heroViewport.modelViewerAlt', {}, { defaultValue: '3D Model Viewer' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover opacity-80')}
          data-alt="High quality 3D rendering of a modern geometric object with soft cinematic lighting against a dark deep blue background"
          src="https://picsum.photos/seed/HeroViewport-1/1200/800"
        />
      </div>
      {/* HUD Corner */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-on-surface-variant/70 tracking-widest leading-relaxed">
        {t('heroViewport.cameraMode', { mode: 'PERSPECTIVE' }, { defaultValue: 'CAM: {{mode}}' })}
        <br />
        {t('heroViewport.fieldOfView', { degrees: '45°' }, { defaultValue: 'FOV: {{degrees}}' })}
        <br />
        {t(
          'heroViewport.resolution',
          { resolution: '4K UHD' },
          { defaultValue: 'RES: {{resolution}}' },
        )}
      </div>
      {/* Annotation Pins */}
      <button
        type="button"
        aria-pressed={activePin === 1}
        aria-label={t(
          'heroViewport.pinLabel',
          { number: 1 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'absolute top-[30%] left-[45%] p-1.5 -m-1.5',
        )}
        onClick={() => setActivePin(activePin === 1 ? null : 1)}
      >
        <div
          className={`w-6 h-6 ${activePin === 1 ? 'bg-primary scale-110' : 'bg-tertiary'} rounded-full flex items-center justify-center text-on-tertiary text-xs shadow-lg z-10 cursor-pointer hover:scale-110 transition-transform`}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </div>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'absolute border-2 border-tertiary/40 animate-ping',
          )}
        ></div>
      </button>
      <button
        type="button"
        aria-pressed={activePin === 2}
        aria-label={t(
          'heroViewport.pinLabel',
          { number: 2 },
          { defaultValue: 'Annotation pin {{number}}' },
        )}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'absolute top-[60%] right-[30%] p-1.5 -m-1.5',
        )}
        onClick={() => setActivePin(activePin === 2 ? null : 2)}
      >
        <div
          className={`w-6 h-6 ${activePin === 2 ? 'bg-primary scale-110' : 'bg-tertiary'} rounded-full flex items-center justify-center text-on-tertiary text-xs shadow-lg z-10 cursor-pointer hover:scale-110 transition-transform`}
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </div>
      </button>
      {/* Floating Inspector Panel */}
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.w(64),
          'absolute bottom-6 right-6 glass-panel ghost-border rounded-xl shadow-ambient transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface',
            )}
          >
            {t('heroViewport.materialProps', {}, { defaultValue: 'Material Props' })}
          </span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            tune
          </span>
        </div>
        <div className={cm.stack(3)}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[11px] text-on-surface-variant')}>
              {t('heroViewport.roughness', {}, { defaultValue: 'Roughness' })}
            </span>
            <span className="text-[11px] font-mono text-primary">0.15</span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'w-[15%] bg-primary')}></div>
          </div>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[11px] text-on-surface-variant')}>
              {t('heroViewport.metalness', {}, { defaultValue: 'Metalness' })}
            </span>
            <span className="text-[11px] font-mono text-primary">0.85</span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(1),
              cm.roundedFull,
              'bg-surface-container-highest overflow-hidden',
            )}
          >
            <div className={cm.cn(cm.h('full'), cm.roundedFull, 'w-[85%] bg-primary')}></div>
          </div>
        </div>
      </div>
      {/* Viewport Controller */}
      <div
        className={cm.cn(
          cm.roundedFull,
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.flex({ gap: 6 }),
          'absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel ghost-border shadow-ambient',
        )}
      >
        <button
          className={
            activeTool === 'rotate'
              ? 'text-primary hover:text-primary-container transition-colors p-1.5 rounded-md'
              : 'text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md'
          }
          onClick={() => setActiveTool('rotate')}
        >
          <span className="material-symbols-outlined text-[20px]">360</span>
        </button>
        <button
          className={
            activeTool === 'pan'
              ? 'text-primary hover:text-primary-container transition-colors p-1.5 rounded-md'
              : 'text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md'
          }
          onClick={() => setActiveTool('pan')}
        >
          <span className="material-symbols-outlined text-[20px]">pan_tool</span>
        </button>
        <button
          className={
            activeTool === 'zoom'
              ? 'text-primary hover:text-primary-container transition-colors p-1.5 rounded-md'
              : 'text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md'
          }
          onClick={() => setActiveTool('zoom')}
        >
          <span className="material-symbols-outlined text-[20px]">zoom_in</span>
        </button>
        <button
          className={
            activeTool === 'layers'
              ? 'text-primary hover:text-primary-container transition-colors p-1.5 rounded-md'
              : 'text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md'
          }
          onClick={() => setActiveTool('layers')}
        >
          <span className="material-symbols-outlined text-[20px]">layers</span>
        </button>
      </div>
    </div>
  )
}

export default HeroViewport
export { HeroViewport }
