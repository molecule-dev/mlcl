import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EmbedDimensionsPanelProps {
  width: number
  height: number
  setWidth: (n: number) => void
  setHeight: (n: number) => void
}

function EmbedDimensionsPanel({ width, height, setWidth, setHeight }: EmbedDimensionsPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activeSize, setActiveSize] = useState<'sm' | 'md' | 'lg' | 'custom'>('md')

  const presets = {
    sm: { width: 320, height: 240 },
    md: { width: 640, height: 480 },
    lg: { width: 1280, height: 720 },
  } as const

  function handlePreset(key: 'sm' | 'md' | 'lg' | 'custom') {
    setActiveSize(key)
    if (key !== 'custom') {
      setWidth(presets[key].width)
      setHeight(presets[key].height)
    }
  }

  const activeBtn = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'rounded-lg bg-primary-container/20 border border-primary/50 text-primary transition-all font-mono',
  )
  const inactiveBtn = cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'rounded-lg bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant hover:text-on-surface hover:border-primary/50 transition-all font-mono',
  )

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-high rounded-xl border border-outline-variant/10 relative',
      )}
    >
      <div
        className={cm.cn(
          cm.w(1),
          cm.h('full'),
          'absolute top-0 left-0 bg-primary-container rounded-l-xl opacity-50',
        )}
      ></div>
      <h3
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.textSize('base'),
          cm.fontWeight('medium'),
          cm.sp('mb', 4),
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, 'material-symbols-outlined text-[20px]')}
          data-icon="aspect_ratio"
        >
          aspect_ratio
        </span>
        {t('embedDimensionsPanel.title', {}, { defaultValue: 'Dimensions' })}
      </h3>
      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 2 }), cm.sp('mb', 5))}>
        <button
          data-mol-id="embed-preset-sm"
          className={activeSize === 'sm' ? activeBtn : inactiveBtn}
          onClick={() => handlePreset('sm')}
        >
          {t('embedDimensionsPanel.presetSmall', {}, { defaultValue: 'Sm' })}
        </button>
        <button
          data-mol-id="embed-preset-md"
          className={activeSize === 'md' ? activeBtn : inactiveBtn}
          onClick={() => handlePreset('md')}
        >
          {t('embedDimensionsPanel.presetMedium', {}, { defaultValue: 'Md' })}
        </button>
        <button
          data-mol-id="embed-preset-lg"
          className={activeSize === 'lg' ? activeBtn : inactiveBtn}
          onClick={() => handlePreset('lg')}
        >
          {t('embedDimensionsPanel.presetLarge', {}, { defaultValue: 'Lg' })}
        </button>
        <button
          data-mol-id="embed-preset-custom"
          className={activeSize === 'custom' ? activeBtn : inactiveBtn}
          onClick={() => handlePreset('custom')}
        >
          {t('embedDimensionsPanel.presetCustom', {}, { defaultValue: 'Custom' })}
        </button>
      </div>
      <div className={cm.grid({ cols: 2, gap: 4 })}>
        <div>
          <label
            className={cm.cn(
              cm.sp('mb', 1),
              'block text-[11px] uppercase tracking-wider text-on-surface-variant font-mono',
            )}
          >
            {t('embedDimensionsPanel.widthLabel', {}, { defaultValue: 'Width (px)' })}
          </label>
          <input
            data-mol-id="embed-width"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('px', 3),
              cm.w('full'),
              'bg-surface-container-lowest border-none rounded-lg font-mono text-on-surface py-2.5 focus:ring-1 focus:ring-primary/50 focus:shadow-[inset_0_0_8px_rgba(124,58,237,0.2)]',
            )}
            type="number"
            value={width}
            onChange={(e) => {
              setWidth(Number(e.target.value))
              setActiveSize('custom')
            }}
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.sp('mb', 1),
              'block text-[11px] uppercase tracking-wider text-on-surface-variant font-mono',
            )}
          >
            {t('embedDimensionsPanel.heightLabel', {}, { defaultValue: 'Height (px)' })}
          </label>
          <input
            data-mol-id="embed-height"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('px', 3),
              cm.w('full'),
              'bg-surface-container-lowest border-none rounded-lg font-mono text-on-surface py-2.5 focus:ring-1 focus:ring-primary/50 focus:shadow-[inset_0_0_8px_rgba(124,58,237,0.2)]',
            )}
            type="number"
            value={height}
            onChange={(e) => {
              setHeight(Number(e.target.value))
              setActiveSize('custom')
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default EmbedDimensionsPanel
export { EmbedDimensionsPanel }
