import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusActivityRow } from '../components/NimbusActivityRow.js'
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
  created_at?: string
}

type ActivityKind = 'edit' | 'share' | 'upload' | 'restore' | 'delete'

interface ActivityEntry {
  id: string
  kind: ActivityKind
  fileId: string
  fileName: string
  mimeType: string
  timestamp: string
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
    return t('recent.time.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('recent.time.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7)
    return t('recent.time.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function bucketFor(date: Date): 'today' | 'yesterday' | 'earlier' {
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(date, now)) return 'today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return 'yesterday'
  return 'earlier'
}

interface RecentSectionProps {
  titleKey: string
  defaultTitle: string
  files: FileRow[]
}

function RecentSection({ titleKey, defaultTitle, files }: RecentSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden',
      )}
    >
      <header
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 3), 'border-b border-outline-variant/15')}
      >
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(titleKey, {}, { defaultValue: defaultTitle })}
        </h2>
      </header>
      <ul className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/15')}>
        {files.map((f) => (
          <NimbusFileRow
            key={f.id}
            id={f.id}
            kind={kindFromMime(f.mime_type)}
            name={f.name}
            modifiedLabel={relativeLabel(f.updated_at, t)}
            sizeLabel={formatSize(f.size)}
            starred={f.is_starred}
          />
        ))}
      </ul>
    </section>
  )
}

const ACTIVITY_LABELS: Record<ActivityKind, { key: string; defaultValue: string }> = {
  edit: { key: 'recent.activity.edited', defaultValue: 'edited' },
  share: { key: 'recent.activity.shared', defaultValue: 'shared' },
  upload: { key: 'recent.activity.uploaded', defaultValue: 'uploaded' },
  restore: { key: 'recent.activity.restored', defaultValue: 'restored' },
  delete: { key: 'recent.activity.deleted', defaultValue: 'deleted' },
}

export function Recent() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<FileRow[]>('/api/files?sort_by=updated_at&sort_order=desc'),
      http.get<{ data?: ActivityEntry[] }>('/api/activity?limit=20'),
    ])
      .then(([filesRes, activityRes]) => {
        if (cancelled) return
        const filesData = Array.isArray(filesRes.data) ? filesRes.data : []
        setFiles(filesData.filter((f) => !f.is_trashed))
        setActivity(activityRes.data?.data ?? [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('recent.fetchError', {}, { defaultValue: 'Could not load recent activity.' }),
        )
        setFiles([])
        setActivity([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const groups = useMemo(() => {
    if (!files) return null
    const today: FileRow[] = []
    const yesterday: FileRow[] = []
    const earlier: FileRow[] = []
    for (const f of files) {
      if (!f.updated_at) {
        earlier.push(f)
        continue
      }
      const date = new Date(f.updated_at)
      if (Number.isNaN(date.getTime())) {
        earlier.push(f)
        continue
      }
      const b = bucketFor(date)
      if (b === 'today') today.push(f)
      else if (b === 'yesterday') yesterday.push(f)
      else earlier.push(f)
    }
    return { today, yesterday, earlier }
  }, [files])

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('recent.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('status.recent', {}, { defaultValue: 'Recent' }) },
      ]}
    >
      <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-[1fr_360px]')}>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 8),
              'rounded-2xl bg-gradient-to-br from-primary-container/15 to-tertiary-container/15 border border-outline-variant/15 relative overflow-hidden',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-primary',
              )}
            >
              {t('status.recent', {}, { defaultValue: 'Recent' })}
            </p>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('recent.hero.title', {}, { defaultValue: 'Pick up where you left off' })}
            </h1>
            <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
              {t(
                'recent.hero.body',
                {},
                {
                  defaultValue:
                    'Files appear the moment anyone touches them. The activity feed on the right tells you who, when, and why.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl',
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

          {groups === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : groups.today.length === 0 &&
            groups.yesterday.length === 0 &&
            groups.earlier.length === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 12),
                'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
                history_toggle_off
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'recent.empty',
                  {},
                  {
                    defaultValue:
                      'No recent activity yet. Upload or share something to see it here.',
                  },
                )}
              </p>
            </div>
          ) : (
            <>
              {groups.today.length > 0 && (
                <RecentSection
                  titleKey="recent.sections.today"
                  defaultTitle="Today"
                  files={groups.today}
                />
              )}
              {groups.yesterday.length > 0 && (
                <RecentSection
                  titleKey="recent.sections.yesterday"
                  defaultTitle="Yesterday"
                  files={groups.yesterday}
                />
              )}
              {groups.earlier.length > 0 && (
                <RecentSection
                  titleKey="recent.sections.earlier"
                  defaultTitle="Earlier"
                  files={groups.earlier}
                />
              )}
            </>
          )}
        </div>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 h-fit lg:sticky lg:top-24',
          )}
        >
          <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
          </h2>
          {activity === null ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : activity.length === 0 ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('recent.activity.empty', {}, { defaultValue: 'Nothing to show yet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {activity.slice(0, 12).map((a) => {
                const label = ACTIVITY_LABELS[a.kind]
                const stamp = new Date(a.timestamp)
                return (
                  <NimbusActivityRow
                    key={a.id}
                    id={a.id}
                    activity={a.kind}
                    actorName={t('nav.you', {}, { defaultValue: 'You' })}
                    actorInitials={t('recent.activity.youInitials', {}, { defaultValue: 'Y' })}
                    actionLabel={t(label.key, {}, { defaultValue: label.defaultValue })}
                    fileId={a.fileId}
                    fileName={a.fileName}
                    fileKind={kindFromMime(a.mimeType)}
                    timestamp={
                      Number.isNaN(stamp.getTime()) ? a.timestamp : relativeLabel(a.timestamp, t)
                    }
                  />
                )
              })}
            </ul>
          )}
        </aside>
      </div>
    </NimbusFilesLayout>
  )
}

export default Recent
