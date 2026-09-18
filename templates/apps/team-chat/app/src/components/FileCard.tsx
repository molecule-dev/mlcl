import React, { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FileCardProps {
  fileName: string
  fileSize: string
  fileType: string
  onClick?: () => void
}

export function FileCard({ fileName, fileSize, fileType, onClick }: FileCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isDownloading, setIsDownloading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDownloading(true)
    setNotice(t('demo.fileDownloadUnavailable'))
    window.setTimeout(() => setNotice(null), 4000)
    setIsDownloading(false)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 4 }),
          cm.sp('p', 4),
          cm.cursorPointer,
          'group/file max-w-sm rounded-xl bg-surface-container-lowest shadow-sm transition-all',
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
      >
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-error-light text-error',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-2xl')}>description</span>
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          {notice && (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 1), 'text-warning')}>{notice}</p>
          )}
          <h4
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate text-on-surface')}
          >
            {fileName}
          </h4>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[11px] uppercase text-on-surface-variant',
            )}
          >
            {fileSize} • {fileType}
          </p>
        </div>
        <button
          type="button"
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'text-on-surface-variant transition-all hover:bg-surface-secondary hover:text-primary',
          )}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <span className={cm.cn('material-symbols-outlined')}>download</span>
        </button>
      </div>
    </>
  )
}
export default FileCard
