import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function UploadQueueItem({ onCancel }: { onCancel?: () => void }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.flex({ align: 'center', gap: 4 }),
        'hover:bg-surface-secondary transition-colors',
      )}
    >
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.shrink0,
          'bg-surface-secondary rounded border border-border overflow-hidden',
        )}
      >
        {/* Mock Thumbnail */}
        <img
          alt={t('uploadQueueItem.thumbnailAlt', {}, { defaultValue: 'Abstract 3D render' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          data-alt="abstract 3d geometric shapes floating in soft studio lighting gray background"
          src="https://picsum.photos/seed/UploadQueueItem-1/1200/800"
        />
      </div>
      <div className={cm.cn(cm.flex1, 'min-w-0')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'baseline' }), cm.sp('mb', 1))}>
          <h5
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-foreground truncate',
            )}
          >
            Character_Sculpt.glb
          </h5>
          <span
            className={cm.cn(cm.textSize('xs'), 'font-mono text-foreground-secondary tabular-nums')}
          >
            45.2 MB
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <div
            className={cm.cn(
              cm.flex1,
              cm.roundedFull,
              'h-1.5 bg-surface-secondary overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                cm.h('full'),
                cm.roundedFull,
                'bg-gradient-to-r from-primary to-primary-container w-[65%]',
              )}
            ></div>
          </div>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'font-mono text-primary tabular-nums',
            )}
          >
            65%
          </span>
        </div>
      </div>
      <button
        className={cm.cn(
          cm.sp('p', 2),
          cm.shrink0,
          'text-foreground-tertiary hover:text-error transition-colors',
        )}
        onClick={onCancel}
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  )
}
export default UploadQueueItem
