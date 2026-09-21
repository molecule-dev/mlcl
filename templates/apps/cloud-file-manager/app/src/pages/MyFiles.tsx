import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFileGridCard } from '../components/NimbusFileGridCard.js'
import { NimbusFileRow } from '../components/NimbusFileRow.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from '../components/NimbusFileTypeIcon.js'

interface FileRow {
  id: string
  name: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  folder_id: string | null
  updated_at?: string
  created_at?: string
}

interface FolderRow {
  id: string
  name: string
  parent_id: string | null
  updated_at?: string
}

interface StatsResponse {
  totalFiles: number
  totalFolders: number
  starredFiles: number
  collaborators: number
  usedBytes: number
}

interface QuickStat {
  glyph: string
  labelKey: string
  defaultLabel: string
  value: string
  detail: string
  tone: 'primary' | 'tertiary' | 'success' | 'warning'
}

function kindFromMime(mime: string): NimbusFileKind {
  if (!mime) return 'document'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf') return 'document'
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
    mime === 'application/typescript' ||
    mime.startsWith('text/x-') ||
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

function relativeLabel(iso?: string, t?: ReturnType<typeof useTranslation>['t']): string {
  if (!iso || !t) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (diffMin < 60)
    return t('myFiles.time.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('myFiles.time.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7)
    return t('myFiles.time.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function MyFiles() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [folders, setFolders] = useState<FolderRow[] | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  // `?folder=<id>` browses into a folder — folder cards below link here.
  const [params] = useSearchParams()
  const folderId = params.get('folder')
  const [currentFolder, setCurrentFolder] = useState<FolderRow | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<FileRow[]>('/api/files'),
      http.get<FolderRow[]>('/api/folders'),
      http.get<StatsResponse>('/api/stats'),
      folderId
        ? http.get<FolderRow>(`/api/folders/${folderId}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([filesRes, foldersRes, statsRes, folderRes]) => {
        if (cancelled) return
        setFiles(Array.isArray(filesRes.data) ? filesRes.data : [])
        setFolders(Array.isArray(foldersRes.data) ? foldersRes.data : [])
        setStats(statsRes.data ?? null)
        setCurrentFolder(folderRes?.data ?? null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('myFiles.fetchError', {}, { defaultValue: 'Could not load your files.' }),
        )
        setFiles([])
        setFolders([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t, version, folderId])

  const userFirstName = useMemo(() => {
    const raw = (user as { name?: string; email?: string } | null | undefined)?.name?.trim()
    if (raw) return raw.split(/\s+/)[0]
    const email = (user as { email?: string } | null | undefined)?.email
    if (email) return email.split('@')[0]
    return t('myFiles.hero.youFallback', {}, { defaultValue: 'there' })
  }, [user, t])

  const usedBytes = stats?.usedBytes ?? 0
  const totalBytes = 200 * 1024 ** 3

  const quickStats: QuickStat[] = useMemo(() => {
    const totalFilesValue = stats?.totalFiles ?? 0
    const foldersValue = stats?.totalFolders ?? 0
    const collaboratorsValue = stats?.collaborators ?? 0
    return [
      {
        glyph: 'description',
        labelKey: 'myFiles.stats.totalFiles',
        defaultLabel: 'Total files',
        value: totalFilesValue.toLocaleString(),
        detail: t(
          'myFiles.stats.totalFilesDetail',
          { count: stats?.starredFiles ?? 0 },
          { defaultValue: '{{count}} starred' },
        ),
        tone: 'primary',
      },
      {
        glyph: 'folder',
        labelKey: 'myFiles.stats.folders',
        defaultLabel: 'Folders',
        value: foldersValue.toLocaleString(),
        detail: t(
          'myFiles.stats.foldersDetail',
          { count: foldersValue },
          { defaultValue: 'Across your archive' },
        ),
        tone: 'tertiary',
      },
      {
        glyph: 'group',
        labelKey: 'myFiles.stats.collaborators',
        defaultLabel: 'Collaborators',
        value: collaboratorsValue.toLocaleString(),
        detail: t('myFiles.stats.collaboratorsDetail', {}, { defaultValue: 'Across shared files' }),
        tone: 'success',
      },
      {
        glyph: 'cloud',
        labelKey: 'myFiles.stats.usage',
        defaultLabel: 'Used storage',
        value: formatSize(usedBytes),
        detail: t(
          'myFiles.stats.usageDetail',
          { total: formatSize(totalBytes) },
          { defaultValue: 'of {{total}} on Pro' },
        ),
        tone: 'warning',
      },
    ]
  }, [stats, t, usedBytes, totalBytes])

  const toneClass: Record<QuickStat['tone'], string> = {
    primary: 'border-l-primary',
    tertiary: 'border-l-tertiary',
    success: 'border-l-success',
    warning: 'border-l-warning',
  }

  const visibleFolders = (folders ?? []).filter((f) =>
    folderId ? f.parent_id === folderId : !f.parent_id,
  )
  const visibleFiles = (files ?? []).filter(
    (f) => !f.is_trashed && (folderId ? f.folder_id === folderId : !f.folder_id),
  )

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t(
            'myFiles.breadcrumb.home',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          ),
        },
        ...(folderId
          ? [
              {
                to: '/files',
                label: t('myFiles.breadcrumb.myFiles', {}, { defaultValue: 'My Files' }),
              },
              {
                label:
                  currentFolder?.name ??
                  t('myFiles.breadcrumb.folder', {}, { defaultValue: 'Folder' }),
              },
            ]
          : [{ label: t('myFiles.breadcrumb.myFiles', {}, { defaultValue: 'My Files' }) }]),
      ]}
      usedBytes={usedBytes}
      topbarRight={
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 1),
              'rounded-lg bg-surface-container-low',
            )}
          >
            <button
              type="button"
              onClick={() => setView('grid')}
              data-mol-id="myfiles-view-grid"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-md transition-colors',
                view === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
              aria-label={t('myFiles.viewToggle.grid', {}, { defaultValue: 'Grid view' })}
              aria-pressed={view === 'grid'}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              data-mol-id="myfiles-view-list"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-md transition-colors',
                view === 'list'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
              aria-label={t('myFiles.viewToggle.list', {}, { defaultValue: 'List view' })}
              aria-pressed={view === 'list'}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>view_list</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            data-mol-id="myfiles-refresh"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              // Convenience-only on phones — the list refetches on every
              // navigation, and the top bar needs the width for breadcrumbs.
              'hidden sm:flex',
              'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
            )}
            aria-label={t('myFiles.refresh', {}, { defaultValue: 'Refresh' })}
          >
            <span className={cm.cn('material-symbols-outlined text-lg')}>refresh</span>
          </button>
          <Link
            to="/upload"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'min-h-[40px]',
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-lg bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity shadow-sm shadow-primary/20',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>upload</span>
            <span className="hidden sm:inline">
              {t('common.upload', {}, { defaultValue: 'Upload' })}
            </span>
          </Link>
        </div>
      }
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
        data-mol-id={`myfiles-version-${version}`}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
            'p-6 md:p-10',
            'min-h-[260px] rounded-[2rem] bg-gradient-to-br from-primary to-tertiary-container text-on-primary relative overflow-hidden',
          )}
        >
          <div className="relative z-10">
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 3),
                'font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {t('myFiles.hero.eyebrow', {}, { defaultValue: 'Your archive' })}
            </p>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}
            >
              {t(
                'myFiles.hero.title',
                { name: userFirstName },
                { defaultValue: 'Welcome back, {{name}}.' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 3),
                cm.maxW('lg'),
                'text-on-primary/85',
              )}
            >
              {stats
                ? t(
                    'myFiles.hero.bodyDynamic',
                    { files: stats.totalFiles, used: formatSize(stats.usedBytes) },
                    { defaultValue: '{{files}} files synced — {{used}} used so far.' },
                  )
                : t(
                    'myFiles.hero.bodyEmpty',
                    {},
                    {
                      defaultValue:
                        'Upload a file to get started — your archive will sync everywhere.',
                    },
                  )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), 'relative z-10')}>
            <Link
              to="/upload"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-xl bg-on-primary text-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className="material-symbols-outlined">upload</span>
              {t('myFiles.hero.uploadCta', {}, { defaultValue: 'Upload files' })}
            </Link>
            <Link
              to="/recent"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-xl bg-surface/15 backdrop-blur-md text-on-primary hover:bg-surface/20 transition-colors',
              )}
            >
              <span className="material-symbols-outlined">history</span>
              {t('myFiles.hero.recentCta', {}, { defaultValue: 'See recent activity' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute right-12 top-12 w-32 h-32 rounded-full bg-surface/10 blur-2xl',
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

        <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'md:grid-cols-2 lg:grid-cols-4')}>
          {quickStats.map((s) => (
            <div
              key={s.labelKey}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:-translate-y-0.5 transition-transform',
                'border-l-4',
                toneClass[s.tone],
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    'rounded-lg bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>{s.glyph}</span>
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'text-on-surface tabular-nums tracking-tight',
                )}
              >
                {s.value}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {s.detail}
              </span>
            </div>
          ))}
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('myFiles.folders.title', {}, { defaultValue: 'Folders' })}
            </h2>
            <Link
              to="/files"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('myFiles.folders.seeAll', {}, { defaultValue: 'See all' })}
            </Link>
          </div>
          {folders === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visibleFolders.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-3xl text-outline')}>
                folder_off
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'myFiles.folders.empty',
                  {},
                  { defaultValue: 'No folders yet — your uploads will appear here.' },
                )}
              </p>
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'md:grid-cols-2 lg:grid-cols-4')}>
              {visibleFolders.slice(0, 8).map((f) => (
                <Link
                  key={f.id}
                  to={`/files?folder=${f.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('p', 4),
                    'group rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary-container hover:shadow-md transition-all',
                  )}
                >
                  <NimbusFileTypeIcon kind="folder" size="md" />
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-grow')}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'truncate text-on-surface',
                      )}
                    >
                      {f.name}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                      {relativeLabel(f.updated_at, t) ||
                        t('myFiles.folders.justCreated', {}, { defaultValue: 'Just created' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('myFiles.files.title', {}, { defaultValue: 'Files' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'myFiles.files.count',
                { count: visibleFiles.length },
                { defaultValue: '{{count}} items' },
              )}
            </span>
          </div>
          {files === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visibleFiles.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 12),
                'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
                cloud_off
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'myFiles.files.empty',
                  {},
                  {
                    defaultValue:
                      'No files yet. Drag a file here or use the upload button to get started.',
                  },
                )}
              </p>
              <Link
                to="/upload"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
                )}
              >
                <span className="material-symbols-outlined text-base">upload</span>
                {t('myFiles.files.emptyCta', {}, { defaultValue: 'Upload your first file' })}
              </Link>
            </div>
          ) : view === 'grid' ? (
            <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }), 'md:grid-cols-3 xl:grid-cols-5')}>
              {visibleFiles.map((f) => (
                <NimbusFileGridCard
                  key={f.id}
                  id={f.id}
                  kind={kindFromMime(f.mime_type)}
                  name={f.name}
                  meta={t(
                    'myFiles.files.meta',
                    { size: formatSize(f.size), modified: relativeLabel(f.updated_at, t) },
                    { defaultValue: '{{size}} · {{modified}}' },
                  )}
                  starred={f.is_starred}
                />
              ))}
            </div>
          ) : (
            <div
              className={cm.cn(
                'rounded-xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'border-b border-outline-variant/20 font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span className={cm.cn('w-8 shrink-0')} aria-hidden="true" />
                <span className={cm.cn('flex-grow')}>
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <span className={cm.cn('w-40 shrink-0 hidden md:inline')}>
                  {t('myFiles.files.col.modified', {}, { defaultValue: 'Modified' })}
                </span>
                <span className={cm.cn('w-24 shrink-0 hidden md:inline text-right')}>
                  {t('form.size', {}, { defaultValue: 'Size' })}
                </span>
                <span className={cm.cn('w-20 shrink-0 hidden md:inline')}>
                  {t('status.shared', {}, { defaultValue: 'Shared' })}
                </span>
              </div>
              <ul className="divide-y divide-outline-variant/10">
                {visibleFiles.map((f) => (
                  <li key={f.id}>
                    <NimbusFileRow
                      id={f.id}
                      kind={kindFromMime(f.mime_type)}
                      name={f.name}
                      modifiedLabel={relativeLabel(f.updated_at, t)}
                      sizeLabel={formatSize(f.size)}
                      starred={f.is_starred}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default MyFiles
