import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
// Switch: shared accessible toggle — role="switch", aria-checked, 40x40 touch
// hit-area, size/color variants (replaces the hand-rolled track+thumb pair).
import { Switch } from '@molecule/app-ui-react'

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
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.w('full'))}>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('embedInteractionPanel.autoRotate', {}, { defaultValue: 'Auto-rotate model' })}
          </span>
          <Switch
            checked={autoRotate}
            size="sm"
            aria-label={t(
              'embedInteractionPanel.autoRotate',
              {},
              { defaultValue: 'Auto-rotate model' },
            )}
            data-mol-id="embed-auto-rotate"
            onChange={(e) => setAutoRotate((e.target as HTMLInputElement).checked)}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.w('full'))}>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('embedInteractionPanel.showAnnotations', {}, { defaultValue: 'Show annotations' })}
          </span>
          <Switch
            checked={showAnnotations}
            size="sm"
            aria-label={t(
              'embedInteractionPanel.showAnnotations',
              {},
              { defaultValue: 'Show annotations' },
            )}
            data-mol-id="embed-show-annotations"
            onChange={(e) => setShowAnnotations((e.target as HTMLInputElement).checked)}
          />
        </div>
      </div>
    </div>
  )
}
export { EmbedInteractionPanel }
