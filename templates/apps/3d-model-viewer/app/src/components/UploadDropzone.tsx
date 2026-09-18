import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type UploadDropzoneProps = {
  onFilesAdded: (files: File[]) => Promise<void> | void
}

/**
 * Drag-and-drop dropzone. Owns *no* upload state — it just collects File
 * objects and hands them to the parent (Upload.tsx) which is the single
 * source of truth for the per-session queue and the API calls that turn
 * dropped files into model rows.
 */
function UploadDropzone({ onFilesAdded }: UploadDropzoneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    void onFilesAdded(Array.from(files))
  }

  return (
    <div
      data-mol-id="upload-dropzone"
      data-dragging={isDragging ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-label={t(
        'uploadDropzone.browseLabel',
        {},
        { defaultValue: 'Drop 3D files here or browse to upload' },
      )}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={cm.cn(
        cm.w('full'),
        cm.maxW('[720px]'),
        cm.h('[320px]'),
        cm.mxAuto,
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.textCenter,
        cm.cursorPointer,
        cm.sp('mb', 8),
        'bg-primary/5 border-2 border-dashed rounded-lg group transition-colors relative',
        isDragging
          ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
          : 'border-primary hover:bg-primary/10',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.obj,.fbx,.stl"
        multiple
        className="hidden"
        data-testid="upload-file-input"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div
        className={cm.cn(
          cm.w(16),
          cm.h(16),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 4),
          'bg-surface/60 group-hover:scale-110 transition-transform',
        )}
      >
        <span
          className="material-symbols-outlined text-[48px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          cloud_upload
        </span>
      </div>
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('semibold'),
          cm.sp('mb', 1),
          'text-foreground',
        )}
      >
        {t('uploadDropzone.heading', {}, { defaultValue: 'Drop 3D files here' })}
      </h3>
      <p className={cm.cn(cm.sp('mb', 4), 'text-foreground-secondary')}>
        {t('common.or', {}, { defaultValue: 'or' })}{' '}
        <span
          className={cm.cn(cm.fontWeight('medium'), 'text-primary underline underline-offset-2')}
        >
          {t('uploadDropzone.browse', {}, { defaultValue: 'click to browse' })}
        </span>
      </p>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-foreground-tertiary font-mono tracking-wide uppercase',
        )}
      >
        {t('uploadDropzone.maxFileSize', {}, { defaultValue: 'Max file size 500MB' })}
      </p>
      <div className={cm.cn(cm.flex({ gap: 2 }), 'absolute bottom-6')}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'font-mono text-primary bg-surface/80 border border-primary/20',
          )}
        >
          .GLB
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'font-mono text-primary bg-surface/80 border border-primary/20',
          )}
        >
          .OBJ
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'font-mono text-primary bg-surface/80 border border-primary/20',
          )}
        >
          .FBX
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'font-mono text-primary bg-surface/80 border border-primary/20',
          )}
        >
          .STL
        </span>
      </div>
    </div>
  )
}

export default UploadDropzone
export { UploadDropzone }
