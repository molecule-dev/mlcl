import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function PlaybackHUD() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  return (
    // md+ only — on phones it would sit under the centered ViewerToolbar.
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 4 }),
        'hidden md:flex absolute bottom-8 left-6 z-30',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('p', 2),
          'bg-surface-container-highest/70 backdrop-blur-lg border border-outline-variant/20 rounded-xl shadow-2xl shadow-black/50',
        )}
      >
        <button
          className={cm.cn(
            cm.sp('p', 2),
            'text-on-surface hover:text-on-primary hover:bg-primary/80 rounded-lg transition-colors',
          )}
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={
            isPlaying
              ? t('common.pause', {}, { defaultValue: 'Pause' })
              : t('common.play', {}, { defaultValue: 'Play' })
          }
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <div
          className={cm.cn(
            cm.w(48),
            cm.h(1),
            cm.sp('mx', 2),
            cm.roundedFull,
            'bg-surface-container-lowest relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.roundedFull,
              'absolute top-0 left-0 h-full bg-primary w-[35%] shadow-[0_0_8px_rgba(124,58,237,0.5)]',
            )}
          ></div>
        </div>
        <span
          className={cm.cn(
            cm.w(12),
            cm.textCenter,
            'font-label text-[10px] text-on-surface-variant tabular-nums',
          )}
        >
          00:14:02
        </span>
      </div>
    </div>
  )
}

export default PlaybackHUD
export { PlaybackHUD }
