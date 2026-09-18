import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type UploadPageHeaderProps = {
  queueCount: number
  onClear: () => void
  onViewLibrary: () => void
}

function UploadPageHeader({ queueCount, onClear, onViewLibrary }: UploadPageHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
      <div>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'font-headline text-on-surface tracking-tight',
          )}
        >
          {t('uploadPageHeader.title', {}, { defaultValue: 'Upload Models' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('uploadPageHeader.subtitle', {}, { defaultValue: 'Add new assets to your library.' })}
        </p>
      </div>
      <div className={cm.flex({ gap: 3 })}>
        <button
          data-mol-id="upload-clear-queue"
          type="button"
          className={cm.cn(
            cm.button(),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('medium'),
            'rounded-lg text-foreground-secondary bg-surface border border-border hover:bg-surface-secondary transition-colors disabled:opacity-50',
          )}
          onClick={onClear}
          disabled={queueCount === 0}
        >
          {t('uploadPageHeader.clearQueue', {}, { defaultValue: 'Clear Queue' })}
        </button>
        <button
          data-mol-id="upload-view-library"
          type="button"
          className={cm.cn(
            'px-6 py-2 rounded-lg font-medium text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-sm hover:opacity-90 transition-opacity',
          )}
          onClick={onViewLibrary}
        >
          {t('uploadPageHeader.viewLibrary', {}, { defaultValue: 'View Library' })}
        </button>
      </div>
    </div>
  )
}

export default UploadPageHeader
export { UploadPageHeader }
