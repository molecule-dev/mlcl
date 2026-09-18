import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

type Tool = '360' | 'pan' | 'zoom' | 'ar' | 'grid'

function ViewerToolbar() {
  const cm = getClassMap()
  const [activeTool, setActiveTool] = useState<Tool>('360')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.roundedFull,
          'bg-surface-container-highest/60 backdrop-blur-xl border border-outline-variant/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        )}
      >
        <button
          aria-pressed={activeTool === '360'}
          onClick={() => setActiveTool('360')}
          className={`p-2.5 rounded-full transition-all ${activeTool === '360' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>360</span>
        </button>
        <button
          aria-pressed={activeTool === 'pan'}
          onClick={() => setActiveTool('pan')}
          className={`p-2.5 rounded-full transition-all ${activeTool === 'pan' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>pan_tool</span>
        </button>
        <button
          aria-pressed={activeTool === 'zoom'}
          onClick={() => setActiveTool('zoom')}
          className={`p-2.5 rounded-full transition-all ${activeTool === 'zoom' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>zoom_in</span>
        </button>
        <div className={cm.cn(cm.h(6), cm.sp('mx', 1), 'w-[1px] bg-outline-variant/30')}></div>
        <button
          aria-pressed={activeTool === 'ar'}
          onClick={() => setActiveTool('ar')}
          className={`p-2.5 rounded-full transition-all ${activeTool === 'ar' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>view_in_ar</span>
        </button>
        <button
          aria-pressed={activeTool === 'grid'}
          onClick={() => setActiveTool('grid')}
          className={`p-2.5 rounded-full transition-all ${activeTool === 'grid' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'}`}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>grid_on</span>
        </button>
        <div className={cm.cn(cm.h(6), cm.sp('mx', 1), 'w-[1px] bg-outline-variant/30')}></div>
        <button
          onClick={toggleFullscreen}
          className={cm.cn(
            cm.roundedFull,
            'p-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface/5 transition-all',
          )}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default ViewerToolbar
export { ViewerToolbar }
