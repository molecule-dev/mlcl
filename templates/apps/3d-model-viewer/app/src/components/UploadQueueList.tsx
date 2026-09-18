import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type QueueItem = {
  id: string
  name: string
  sizeBytes: number
  format: string
  status: 'uploading' | 'ready' | 'error'
  progress: number
  modelId: string | null
  error: string | null
}

type UploadQueueListProps = {
  items: QueueItem[]
  onRemove: (id: string) => void
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function UploadQueueList({ items, onRemove }: UploadQueueListProps) {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <div
      data-mol-id="upload-queue"
      data-queue-count={items.length}
      className={cm.cn(
        cm.w('full'),
        cm.mxAuto,
        cm.flex({ direction: 'col' }),
        'max-w-[720px] bg-surface border border-border rounded-lg shadow-sm overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ justify: 'between', align: 'center' }),
          'border-b border-border bg-surface-secondary',
        )}
      >
        <h4 className={cm.cn(cm.fontWeight('medium'), 'text-foreground')}>
          {t(
            'uploadQueueList.title',
            { count: items.length },
            { defaultValue: 'Upload Queue ({{count}})' },
          )}
        </h4>
      </div>
      {items.length === 0 ? (
        <div className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-foreground-secondary text-sm')}>
          {t(
            'uploadQueueList.empty',
            {},
            { defaultValue: 'Drop a file above to start an upload.' },
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              data-mol-id="upload-queue-item"
              data-status={item.status}
              data-model-id={item.modelId ?? ''}
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
                  'bg-surface-secondary rounded border border-border text-foreground-tertiary',
                )}
              >
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'baseline' }),
                    cm.sp('mb', 1),
                  )}
                >
                  <h5
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-foreground truncate',
                    )}
                  >
                    {item.name}
                  </h5>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono text-foreground-secondary tabular-nums',
                    )}
                  >
                    {formatSize(item.sizeBytes)}
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
                        item.status === 'error'
                          ? 'bg-error'
                          : 'bg-gradient-to-r from-primary to-primary-container',
                      )}
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono tabular-nums',
                      item.status === 'error'
                        ? 'text-error'
                        : item.status === 'ready'
                          ? 'text-success'
                          : 'text-primary',
                    )}
                  >
                    {item.status === 'ready'
                      ? t('uploadQueueList.ready', {}, { defaultValue: 'Ready' })
                      : item.status === 'error'
                        ? t('status.failed', {}, { defaultValue: 'Failed' })
                        : `${item.progress}%`}
                  </span>
                </div>
                {item.status === 'error' && item.error && (
                  <p
                    data-mol-id="upload-queue-error"
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-error')}
                  >
                    {item.error}
                  </p>
                )}
                {item.status === 'ready' && item.modelId && (
                  <div className={cm.cn(cm.flex({ gap: 3 }), cm.sp('mt', 1))}>
                    <Link
                      data-mol-id="upload-queue-edit-link"
                      className={cm.cn(cm.textSize('xs'), 'text-primary underline')}
                      to={`/models/${item.modelId}/edit`}
                    >
                      {t('uploadQueueList.openEditor', {}, { defaultValue: 'Open in editor' })}
                    </Link>
                    <Link
                      data-mol-id="upload-queue-view-link"
                      className={cm.cn(cm.textSize('xs'), 'text-primary underline')}
                      to={`/models/${item.modelId}`}
                    >
                      {t('uploadQueueList.viewModel', {}, { defaultValue: 'View model' })}
                    </Link>
                  </div>
                )}
              </div>
              <button
                aria-label={t('uploadQueueList.cancel', {}, { defaultValue: 'Cancel upload' })}
                className={cm.cn(
                  cm.sp('p', 2),
                  cm.shrink0,
                  'text-foreground-tertiary hover:text-error transition-colors',
                )}
                onClick={() => onRemove(item.id)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadQueueList
export { UploadQueueList }
