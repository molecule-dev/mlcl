import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFileGridCard } from '../components/NimbusFileGridCard.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'

interface FileRow {
  id: string
  name: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  updated_at?: string
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

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—'
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

function relativeLabel(iso: string | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffMin < 60)
    return t('starred.time.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('starred.time.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7)
    return t('starred.time.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Starred() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<FileRow[]>('/api/files?starred=true')
      .then((res) => {
        if (cancelled) return
        const data = Array.isArray(res.data) ? res.data : []
        setFiles(data.filter((f) => !f.is_trashed))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('starred.fetchError', {}, { defaultValue: 'Could not load starred files.' }),
        )
        setFiles([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const count = files?.length ?? 0

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('starred.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('status.starred', {}, { defaultValue: 'Starred' }) },
      ]}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-gradient-to-br from-warning-container/40 to-tertiary-container/10 border border-outline-variant/15 relative overflow-hidden',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(16),
              cm.h(16),
              cm.roundedFull,
              'bg-warning/15 text-warning shrink-0',
            )}
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              star
            </span>
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('status.starred', {}, { defaultValue: 'Starred' })}
            </p>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'starred.hero.title',
                { count },
                { defaultValue: '{{count}} favourites, ready to go' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
              {t(
                'starred.hero.body',
                {},
                {
                  defaultValue:
                    'Star anything you’ll come back to. We surface it on every device, every workspace, every time.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-warning/15 blur-3xl',
            )}
            aria-hidden="true"
          />
        </section>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        {files === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : files.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
              cm.sp('p', 12),
              'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
              star_border
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'starred.empty',
                {},
                {
                  defaultValue:
                    'Nothing starred yet. Tap the star on any file to keep it close at hand.',
                },
              )}
            </p>
          </div>
        ) : (
          <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2 lg:grid-cols-4')}>
            {files.map((f) => (
              <NimbusFileGridCard
                key={f.id}
                id={f.id}
                kind={kindFromMime(f.mime_type)}
                name={f.name}
                meta={t(
                  'starred.row.meta',
                  { size: formatSize(f.size), modified: relativeLabel(f.updated_at, t) },
                  { defaultValue: '{{size}} · {{modified}}' },
                )}
                starred
              />
            ))}
          </section>
        )}
      </div>
    </NimbusFilesLayout>
  )
}

export default Starred
