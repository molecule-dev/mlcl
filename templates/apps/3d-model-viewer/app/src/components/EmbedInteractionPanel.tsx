import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EmbedInteractionPanelProps {
  autoRotate: boolean
  showAnnotations: boolean
  setAutoRotate: (v: boolean) => void
  setShowAnnotations: (v: boolean) => void
}

export default function EmbedInteractionPanel({
  autoRotate,
  showAnnotations,
  setAutoRotate,
  setShowAnnotations,
}: EmbedInteractionPanelProps) {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-high rounded-xl border border-outline-variant/10',
      )}
    >
      <h3
        className={cm.cn(
          cm.fontWeight('medium'),
          cm.textSize('base'),
          cm.sp('mb', 4),
          cm.flex({ align: 'center', gap: 2 }),
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, 'material-symbols-outlined text-[20px]')}
          data-icon="touch_app"
        >
          touch_app
        </span>
        {t('embedInteractionPanel.title', {}, { defaultValue: 'Interaction' })}
      </h3>
      <div className={cm.flex({ direction: 'col', gap: 3 })}>
        <button
          type="button"
          role="switch"
          aria-checked={autoRotate}
          data-mol-id="embed-auto-rotate"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.w('full'),
            cm.cursorPointer,
            'group',
          )}
          onClick={() => setAutoRotate(!autoRotate)}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant group-hover:text-on-surface transition-colors',
            )}
          >
            {t('embedInteractionPanel.autoRotate', {}, { defaultValue: 'Auto-rotate model' })}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full ${autoRotate ? 'bg-primary-container' : 'bg-surface-container-lowest border border-outline-variant/30'}`}
          >
            <span
              className={`inline-block h-3 w-3 ${autoRotate ? 'translate-x-5' : 'translate-x-1'} rounded-full ${autoRotate ? 'bg-on-primary-container' : 'bg-on-surface-variant'} transition`}
            ></span>
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={showAnnotations}
          data-mol-id="embed-show-annotations"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.w('full'),
            cm.cursorPointer,
            'group',
          )}
          onClick={() => setShowAnnotations(!showAnnotations)}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant group-hover:text-on-surface transition-colors',
            )}
          >
            {t('embedInteractionPanel.showAnnotations', {}, { defaultValue: 'Show annotations' })}
          </span>
          <span
            className={`relative inline-flex h-5 w-9 items-center rounded-full ${showAnnotations ? 'bg-primary-container' : 'bg-surface-container-lowest border border-outline-variant/30'}`}
          >
            <span
              className={`inline-block h-3 w-3 ${showAnnotations ? 'translate-x-5' : 'translate-x-1'} rounded-full ${showAnnotations ? 'bg-on-primary-container' : 'bg-on-surface-variant'} transition`}
            ></span>
          </span>
        </button>
      </div>
    </div>
  )
}
export { EmbedInteractionPanel }
