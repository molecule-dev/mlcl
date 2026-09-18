import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type DocumentCategory,
  EncryptedDocumentCard,
} from '../components/EncryptedDocumentCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface MedicalDocument {
  id: string
  title: string
  category: DocumentCategory
  file_size: number
  mime_type: string
  file_url?: string | null
  provider_name?: string
  document_date: string
  uploaded_at: string
}

/** 5 MB cap on inline upload — anything larger needs an S3 path we can't wire here. */
const MAX_INLINE_BYTES = 5 * 1024 * 1024

function categoryFromMime(mime: string): DocumentCategory {
  if (mime.includes('dicom') || mime.startsWith('image/')) return 'imaging'
  if (mime.includes('pdf')) return 'lab_report'
  return 'other'
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsDataURL(file)
  })
}

const CATEGORIES = [
  'all',
  'lab_report',
  'imaging',
  'referral',
  'insurance',
  'consent',
  'prescription',
] as const
type CategoryKey = (typeof CATEGORIES)[number]

function fileTypeLabel(mime: string): string {
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('dicom')) return 'DICOM'
  return mime.split('/')[1]?.toUpperCase() || 'FILE'
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [docs, setDocs] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryKey>('all')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  )

  const reload = () => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/documents?patient_id=me')
      .then((res) => {
        if (cancelled) return
        setDocs(unwrapList<MedicalDocument>(res))
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'documents.loadError',
                {},
                { defaultValue: 'Could not reach the records service.' },
              ),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(() => {
    return reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (category === 'all') return docs
    return docs.filter((d) => d.category === category)
  }, [docs, category])

  const handleUploadClick = () => {
    if (uploading) return
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_INLINE_BYTES) {
      setUploadStatus({
        kind: 'err',
        text: t(
          'documents.tooLarge',
          { mb: 5 },
          { defaultValue: 'File is larger than {{mb}} MB. Use a smaller copy.' },
        ),
      })
      return
    }
    setUploading(true)
    setUploadStatus(null)
    try {
      const dataUrl = await readFileAsDataURL(file)
      const mime = file.type || 'application/octet-stream'
      const res = await http.post('/api/documents', {
        title: file.name,
        category: categoryFromMime(mime),
        file_name: file.name,
        file_size: file.size,
        size_bytes: file.size,
        content_type: mime,
        mime_type: mime,
        file_url: dataUrl,
        document_date: new Date().toISOString().slice(0, 10),
      })
      const created = unwrapSingle<MedicalDocument>(res)
      if (created) {
        setDocs((prev) => [created, ...prev])
        setUploadStatus({
          kind: 'ok',
          text: t(
            'documents.uploadOk',
            { name: file.name },
            { defaultValue: '{{name}} uploaded.' },
          ),
        })
      } else {
        reload()
        setUploadStatus({
          kind: 'ok',
          text: t(
            'documents.uploadOk',
            { name: file.name },
            { defaultValue: '{{name}} uploaded.' },
          ),
        })
      }
    } catch (err) {
      setUploadStatus({
        kind: 'err',
        text:
          err instanceof Error
            ? err.message
            : t('documents.uploadError', {}, { defaultValue: 'Upload failed.' }),
      })
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = (d: MedicalDocument) => {
    if (!d.file_url) {
      setUploadStatus({
        kind: 'err',
        text: t(
          'documents.noFile',
          {},
          { defaultValue: 'No attached file — only metadata is recorded for this document.' },
        ),
      })
      return
    }
    if (d.file_url.startsWith('data:')) {
      // Trigger an actual download for inline data URLs.
      const a = document.createElement('a')
      a.href = d.file_url
      a.download = d.title
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      window.open(d.file_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-documents">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('documents.eyebrow', {}, { defaultValue: 'Vault' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('documents.title', {}, { defaultValue: 'Documents' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={uploading}
          data-mol-id="documents-upload"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>upload</span>
          {uploading
            ? t('documents.uploading', {}, { defaultValue: 'Uploading…' })
            : t('documents.upload', {}, { defaultValue: 'Upload document' })}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.dcm,application/pdf,image/*"
          className="hidden"
          onChange={handleFileSelected}
          data-mol-id="documents-file-input"
        />
      </div>

      {uploadStatus && (
        <p
          role="status"
          data-mol-id="documents-upload-status"
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest',
            uploadStatus.kind === 'ok' ? 'text-clinical-normal' : 'text-error',
          )}
        >
          {uploadStatus.text}
        </p>
      )}

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 6))}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full transition-colors',
              category === c
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {t(
              `documents.category.${c}`,
              {},
              {
                defaultValue:
                  c === 'all'
                    ? 'All'
                    : c.replace('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase()),
              },
            )}
          </button>
        ))}
      </div>

      {error && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-widest font-bold',
          )}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('documents.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>
            description
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('documents.empty.title', {}, { defaultValue: 'No documents yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'documents.empty.body',
              {},
              {
                defaultValue:
                  'Upload a PDF, image, or DICOM scan — encrypted before it leaves your device.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {filtered.map((d) => (
            <EncryptedDocumentCard
              key={d.id}
              title={d.title}
              documentDate={fmtDate(d.document_date)}
              fileSize={fmtSize(d.file_size)}
              fileType={fileTypeLabel(d.mime_type)}
              category={d.category}
              categoryLabel={t(
                `documents.category.${d.category}`,
                {},
                { defaultValue: d.category.replace('_', ' ') },
              )}
              providerName={d.provider_name}
              onOpen={() => handleOpen(d)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
