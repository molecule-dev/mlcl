import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from '../components/NimbusFileTypeIcon.js'

interface SharePayload {
  file: { id: string; name: string; mime_type: string; size: number }
  permission: 'view' | 'edit'
  expires_at: string | null
  download_path: string
}

function kindFromMime(mime: string): NimbusFileKind {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime === 'application/zip' ||
    mime === 'application/x-tar' ||
    mime === 'application/gzip' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/x-7z-compressed'
  ) {
    return 'archive'
  }
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv')
    return 'spreadsheet'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation'
  if (
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/javascript' ||
    mime.startsWith('text/markdown')
  ) {
    return 'code'
  }
  return 'document'
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

export function SharePublic() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()

  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setLoading(false)
      setError(t('sharePublic.missingToken', {}, { defaultValue: 'No share token provided.' }))
      return
    }
    fetch(`/api/shares/public/${encodeURIComponent(token)}`, { credentials: 'omit' })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(
            body.error ??
              t(
                'sharePublic.notFound',
                {},
                { defaultValue: 'Share link not found or has expired.' },
              ),
          )
        }
        return (await res.json()) as SharePayload
      })
      .then((data) => {
        if (cancelled) return
        setPayload(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('sharePublic.fetchError', {}, { defaultValue: 'Could not load shared file.' }),
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t, token])

  return (
    <main
      data-mol-id="page-share-public"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'min-h-screen bg-surface text-on-surface',
      )}
    >
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 10),
          cm.maxW('xl'),
          cm.w('full'),
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl',
        )}
      >
        <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-primary',
            )}
          >
            {t(
              'sharePublic.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Shared via {{appName}}' },
            )}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('sharePublic.title', {}, { defaultValue: 'A file has been shared with you' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'sharePublic.subtitle',
              {},
              { defaultValue: 'You can preview the metadata and download the file directly.' },
            )}
          </p>
        </header>

        {loading && (
          <p
            data-mol-id="share-public-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('sharePublic.loading', {}, { defaultValue: 'Resolving share link…' })}
          </p>
        )}

        {error && (
          <div
            role="alert"
            data-mol-id="share-public-error"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        {payload && (
          <article
            data-mol-id={`share-public-file-${payload.file.id}`}
            className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <NimbusFileTypeIcon kind={kindFromMime(payload.file.mime_type)} size="lg" />
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'truncate text-on-surface',
                  )}
                >
                  {payload.file.name}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {payload.file.mime_type ||
                    t('sharePublic.binary', {}, { defaultValue: 'binary' })}
                  {' · '}
                  {formatBytes(payload.file.size)}
                  {' · '}
                  {t(
                    'sharePublic.permission',
                    { permission: payload.permission },
                    { defaultValue: '{{permission}}' },
                  )}
                </span>
              </div>
            </div>

            <a
              href={payload.download_path}
              data-mol-id="share-public-download"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')}>download</span>
              {t('sharePublic.actions.download', {}, { defaultValue: 'Download file' })}
            </a>

            {payload.expires_at && (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'sharePublic.expires',
                  { date: new Date(payload.expires_at).toLocaleString() },
                  { defaultValue: 'Link expires on {{date}}' },
                )}
              </p>
            )}
          </article>
        )}

        <footer className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}>
          <Link
            to="/"
            data-mol-id="share-public-home-link"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary hover:underline',
            )}
          >
            {t(
              'sharePublic.home',
              { appName: APP_NAME },
              { defaultValue: 'Back to {{appName}} home' },
            )}
          </Link>
        </footer>
      </section>
    </main>
  )
}

export default SharePublic
