import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { FileDropzone } from '@molecule/app-file-dropzone-react'

const cm = getClassMap()

export function ProfilePhotoPage() {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file, file.name)
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          body.error ?? t('profilePhoto.error.generic', {}, { defaultValue: 'Upload failed' }),
        )
      }
      // `avatar` is a same-origin serve URL (/api/upload/avatar/<id>) — the browser sends
      // the session cookie with the <img> request, so the authenticated stream loads. It
      // changes on every upload (new file id), so no cache-busting is needed.
      const data = (await res.json()) as { avatar: string }
      setUrl(data.avatar)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('profilePhoto.error.generic', {}, { defaultValue: 'Upload failed' }),
      )
    } finally {
      setUploading(false)
    }
  }

  function handleRejected(files: File[]) {
    const name = files[0]?.name ?? ''
    setError(t('profilePhoto.error.rejected', { name }, { defaultValue: `File rejected: ${name}` }))
  }

  return (
    <div className={cm.flex({ direction: 'col', gap: 'md' })} style={{ padding: '1.5rem' }}>
      <h1 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
        {t('profilePhoto.title', {}, { defaultValue: 'Profile photo' })}
      </h1>
      {url ? <img src={url} alt="" className={cm.avatar({ size: 'xl' })} /> : null}
      <FileDropzone
        accept="image/*"
        maxSize={5 * 1024 * 1024}
        onFiles={(files) => void handleFiles(files)}
        onRejected={handleRejected}
        disabled={uploading}
      />
      {error ? <p className={cm.cn(cm.textSize('sm'))}>{error}</p> : null}
    </div>
  )
}
