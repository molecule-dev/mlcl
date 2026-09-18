import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFileRow } from '../components/NimbusFileRow.js'
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

interface ShareRow {
  id: string
  file_id: string
  token: string
  permission: 'view' | 'edit'
  created_by: string
  created_at: string
  expires_at: string | null
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
    return t('shared.time.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('shared.time.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7)
    return t('shared.time.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function SharedWithMe() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [sharesByFile, setSharesByFile] = useState<Map<string, ShareRow[]>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'view' | 'edit'>('all')

  useEffect(() => {
    let cancelled = false
    Promise.all([http.get<FileRow[]>('/api/files'), http.get<ShareRow[]>('/api/shares')])
      .then(([filesRes, sharesRes]) => {
        if (cancelled) return
        const filesData = Array.isArray(filesRes.data) ? filesRes.data : []
        const sharesData = Array.isArray(sharesRes.data) ? sharesRes.data : []
        const byFile = new Map<string, ShareRow[]>()
        for (const sh of sharesData) {
          const list = byFile.get(sh.file_id) ?? []
          list.push(sh)
          byFile.set(sh.file_id, list)
        }
        setSharesByFile(byFile)
        setFiles(filesData.filter((f) => !f.is_trashed && byFile.has(f.id)))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('shared.fetchError', {}, { defaultValue: 'Could not load shared files.' }),
        )
        setFiles([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filteredFiles = useMemo(() => {
    if (!files) return null
    if (filter === 'all') return files
    return files.filter((f) => {
      const shares = sharesByFile.get(f.id) ?? []
      return shares.some((s) => s.permission === filter)
    })
  }, [files, sharesByFile, filter])

  const filterChips: Array<{ id: 'all' | 'view' | 'edit'; key: string; defaultLabel: string }> = [
    { id: 'all', key: 'shared.filter.all', defaultLabel: 'All' },
    { id: 'view', key: 'shared.filter.view', defaultLabel: 'View only' },
    { id: 'edit', key: 'shared.filter.edit', defaultLabel: 'Can edit' },
  ]

  const totalSharedCount = filteredFiles?.length ?? 0

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('shared.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('status.shared', {}, { defaultValue: 'Shared' }) },
      ]}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-gradient-to-br from-secondary-container/30 to-tertiary-container/30 border border-outline-variant/20 relative overflow-hidden',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-tertiary',
            )}
          >
            {t('status.shared', {}, { defaultValue: 'Shared' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'shared.hero.title',
              { count: totalSharedCount },
              { defaultValue: '{{count}} files with active links' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
            {t(
              'shared.hero.body',
              {},
              {
                defaultValue:
                  'Every file you share via link or invite shows up here. Toggle a permission to see what access has been granted.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              'absolute -right-12 -top-12 w-48 h-48 rounded-full bg-tertiary/10 blur-3xl',
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

        <section className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {filterChips.map((c) => {
            const active = filter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                data-mol-id={`shared-filter-${c.id}`}
                aria-pressed={active}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-all',
                  active
                    ? 'bg-gradient-to-br from-primary to-tertiary-container text-on-primary shadow-md shadow-primary/20'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(c.key, {}, { defaultValue: c.defaultLabel })}
              </button>
            )
          })}
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
              'border-b border-outline-variant/15',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('shared.list.title', {}, { defaultValue: 'Recently shared' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'shared.list.subtitle',
                { count: totalSharedCount },
                { defaultValue: '{{count}} files' },
              )}
            </span>
          </header>
          {filteredFiles === null ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : filteredFiles.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 12),
                'text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
                group_off
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'shared.empty',
                  {},
                  {
                    defaultValue:
                      'No shared files yet. Open any file and tap Share to send a link.',
                  },
                )}
              </p>
            </div>
          ) : (
            <ul
              className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/15')}
            >
              {filteredFiles.map((f) => (
                <NimbusFileRow
                  key={f.id}
                  id={f.id}
                  kind={kindFromMime(f.mime_type)}
                  name={f.name}
                  modifiedLabel={relativeLabel(f.updated_at, t)}
                  sizeLabel={formatSize(f.size)}
                  sharedWith={t(
                    'shared.row.sharedSummary',
                    { count: sharesByFile.get(f.id)?.length ?? 0 },
                    { defaultValue: '{{count}} link(s)' },
                  )}
                  starred={f.is_starred}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default SharedWithMe
