import type { ReactNode } from 'react'
import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface UploadDropZoneProps {
  /** Called with the dropped/selected files. */
  onFiles?: (files: File[]) => void
  /** Comma-separated input `accept` value, e.g. `.pdf,.png,.jpg,.tiff`. */
  accept?: string
  /** When true, multiple files are allowed (default true). */
  multiple?: boolean
  /** Replace the supported-formats badge row. Defaults to PDF/PNG/JPG/TIFF/HEIC. */
  formats?: string[]
  /** Optional secondary action rendered below the primary CTA. */
  footer?: ReactNode
}

const DEFAULT_FORMATS = ['PDF', 'PNG', 'JPG', 'TIFF', 'HEIC']

/**
 * Large dashed drop-zone with drag-state shading, format-pill row, and a
 * file-input proxy so click works the same as drag-and-drop.
 *
 * Translated from the DESIGN.md "Upload Drop Zone" recipe — 16px radius,
 * 2px dashed outline, drop-zone-active background swap on dragover.
 */
export function UploadDropZone({
  onFiles,
  accept = '.pdf,.png,.jpg,.jpeg,.tiff,.heic',
  multiple = true,
  formats = DEFAULT_FORMATS,
  footer,
}: UploadDropZoneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSelect = (files: FileList | null) => {
    if (!files || !files.length) return
    onFiles?.(Array.from(files))
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleSelect(e.dataTransfer.files)
      }}
      className={cm.cn(
        cm.sp('p', 12),
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'md' }),
        cm.textCenter,
        'rounded-2xl border-2 border-dashed transition-all',
        isDragging
          ? 'bg-primary-container/30 border-primary shadow-md'
          : 'border-outline-variant bg-surface-container-low hover:bg-surface-container',
      )}
      aria-label={t('uploadDropZone.aria', {}, { defaultValue: 'Drop documents to upload' })}
    >
      <span
        className={cm.cn(
          cm.w(16),
          cm.h(16),
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-full bg-primary/10 text-primary',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 36 }}
          aria-hidden="true"
        >
          cloud_upload
        </span>
      </span>
      <div>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('uploadDropZone.title', {}, { defaultValue: 'Drop documents to start processing' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'uploadDropZone.body',
            {},
            {
              defaultValue:
                'Or drop multiple files at once for batch extraction, classification, and filing.',
            },
          )}
        </p>
      </div>
      <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 'xs' }))}>
        {formats.map((f) => (
          <span
            key={f}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full bg-surface-container-high text-on-surface-variant uppercase tracking-widest',
            )}
            style={{ fontSize: 10 }}
          >
            {f}
          </span>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className={cm.cn('hidden')}
        onChange={(e) => handleSelect(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.sp('mt', 2),
          'rounded-full text-on-primary shadow-md hover:shadow-lg transition-all active:scale-95',
        )}
        style={{ background: 'var(--color-primary)' }}
      >
        {t('uploadDropZone.cta', {}, { defaultValue: 'Choose files' })}
      </button>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'uploadDropZone.maxSize',
          {},
          { defaultValue: 'Max 25 MB per file · End-to-end encrypted' },
        )}
      </p>
      {footer ? <div className={cm.sp('mt', 2)}>{footer}</div> : null}
    </section>
  )
}
