import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from '../components/NimbusFileTypeIcon.js'

interface FileRow {
  id: string
  name: string
  mime_type: string
  size: number
  is_trashed: boolean
  trashed_at?: string | null
}

const TRASH_RETENTION_DAYS = 30

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

function trashedAtLabel(
  iso: string | null | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (!iso) return t('trash.row.trashedRecently', {}, { defaultValue: 'Recently' })
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return t('trash.row.trashedRecently', {}, { defaultValue: 'Recently' })
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 60)
    return t('trash.row.minutesAgo', { count: diffMin }, { defaultValue: '{{count}} min ago' })
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24)
    return t('trash.row.hoursAgo', { count: diffHr }, { defaultValue: '{{count}}h ago' })
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30)
    return t('trash.row.daysAgo', { count: diffDay }, { defaultValue: '{{count}}d ago' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function expiresIn(iso: string | null | undefined): number {
  if (!iso) return TRASH_RETENTION_DAYS
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return TRASH_RETENTION_DAYS
  const elapsed = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, TRASH_RETENTION_DAYS - elapsed)
}

function expiryTone(days: number): string {
  if (days <= 7) return 'bg-error-container/30 text-error'
  if (days <= 14) return 'bg-warning-container/30 text-warning'
  return 'bg-success-light text-success'
}

export function Trash() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [files, setFiles] = useState<FileRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [emptying, setEmptying] = useState(false)
  // Two-step destructive confirms: `confirmingId` marks the row whose
  // delete-forever is armed; `confirmingEmpty` arms the empty-all action.
  // Nothing permanent happens on a single tap.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmingEmpty, setConfirmingEmpty] = useState(false)

  function load(): Promise<void> {
    return http
      .get<FileRow[]>('/api/files?trash=true')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : []
        setFiles(data.filter((f) => f.is_trashed))
        setError(null)
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : t('trash.fetchError', {}, { defaultValue: 'Could not load trash.' }),
        )
        setFiles([])
      })
  }

  useEffect(() => {
    let cancelled = false
    http
      .get<FileRow[]>('/api/files?trash=true')
      .then((res) => {
        if (cancelled) return
        const data = Array.isArray(res.data) ? res.data : []
        setFiles(data.filter((f) => f.is_trashed))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('trash.fetchError', {}, { defaultValue: 'Could not load trash.' }),
        )
        setFiles([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleRestore(id: string): Promise<void> {
    setBusyId(id)
    try {
      await http.post(`/api/files/${id}/restore`, {})
      void track({ name: 'file.restored', properties: { file_id: id } })
      await load()
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('trash.restoreError', {}, { defaultValue: 'Could not restore file.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDeleteForever(id: string): Promise<void> {
    setBusyId(id)
    try {
      await http.delete(`/api/files/${id}`)
      void track({ name: 'file.purged', properties: { file_id: id } })
      await load()
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('trash.deleteError', {}, { defaultValue: 'Could not delete file.' }),
      )
    } finally {
      setBusyId(null)
      setConfirmingId(null)
    }
  }

  async function handleEmptyAll(): Promise<void> {
    if (!files || files.length === 0) return
    setEmptying(true)
    const count = files.length
    try {
      for (const f of files) {
        await http.delete(`/api/files/${f.id}`).catch(() => null)
      }
      void track({ name: 'trash.emptied', properties: { count } })
      await load()
    } finally {
      setEmptying(false)
      setConfirmingEmpty(false)
    }
  }

  const count = files?.length ?? 0

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('trash.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('trash.crumbs.trash', {}, { defaultValue: 'Trash' }) },
      ]}
      topbarRight={
        confirmingEmpty ? (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'hidden sm:inline text-error',
              )}
            >
              {t(
                'trash.actions.emptyConfirmPrompt',
                {},
                { defaultValue: 'Permanently delete all?' },
              )}
            </span>
            <button
              onClick={() => void handleEmptyAll()}
              disabled={emptying}
              type="button"
              data-mol-id="trash-empty-confirm"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'min-h-[40px]',
                cm.sp('px', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>delete_forever</span>
              {emptying
                ? t('trash.actions.emptying', {}, { defaultValue: 'Emptying…' })
                : t('trash.actions.emptyConfirm', {}, { defaultValue: 'Yes, empty' })}
            </button>
            <button
              onClick={() => setConfirmingEmpty(false)}
              type="button"
              data-mol-id="trash-empty-cancel"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(10),
                cm.h(10),
                'rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors',
              )}
              aria-label={t('common.cancel', {}, { defaultValue: 'Cancel' })}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>close</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingEmpty(true)}
            disabled={emptying || count === 0}
            type="button"
            data-mol-id="trash-empty-all"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'min-h-[40px]',
              cm.sp('px', 4),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl transition-colors',
              count === 0 || emptying
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : 'bg-error-container/30 text-error hover:bg-error-container/50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-lg')}>delete_forever</span>
            {emptying
              ? t('trash.actions.emptying', {}, { defaultValue: 'Emptying…' })
              : t('trash.actions.emptyAll', {}, { defaultValue: 'Empty trash' })}
          </button>
        )
      }
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
        data-mol-id={`trash-count-${count}`}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-low border border-outline-variant/15 relative overflow-hidden',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('trash.hero.eyebrow', {}, { defaultValue: 'Trash' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'trash.hero.title',
              { count },
              {
                defaultValue:
                  count === 1 ? '1 item waiting to clear' : '{{count}} items waiting to clear',
              },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.maxW('lg'), 'text-on-surface-variant')}>
            {t(
              'trash.hero.body',
              {},
              {
                defaultValue:
                  'Anything you delete sticks around for 30 days, just in case. Restore in one tap, or empty everything to free up space immediately.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              'absolute -right-16 -top-16 w-48 h-48 rounded-full bg-error/5 blur-3xl',
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
              {t('trash.list.title', {}, { defaultValue: 'Recently deleted' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('trash.list.legend', {}, { defaultValue: 'Auto-clears in 30 days' })}
            </span>
          </header>

          {files === null ? (
            <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : count === 0 ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 12),
                'text-center',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-4xl text-outline')}>
                delete_outline
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('trash.empty', {}, { defaultValue: 'Trash is empty. Nothing to clean up.' })}
              </p>
            </div>
          ) : (
            <ul
              className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/15')}
            >
              {files.map((item) => {
                const days = expiresIn(item.trashed_at)
                const busy = busyId === item.id
                return (
                  <li
                    key={item.id}
                    data-mol-id={`trash-row-${item.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      'flex-wrap px-4 py-3 md:px-6 md:py-4',
                      'hover:bg-surface-container-low transition-colors',
                      busy && 'opacity-60',
                    )}
                  >
                    <NimbusFileTypeIcon kind={kindFromMime(item.mime_type)} size="sm" />
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 'xs' }),
                        'flex-grow min-w-[130px]',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'truncate text-on-surface',
                        )}
                      >
                        {item.name}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'trash.row.meta',
                          { deletedAt: trashedAtLabel(item.trashed_at, t) },
                          { defaultValue: 'Deleted {{deletedAt}}' },
                        )}
                      </span>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'hidden md:inline w-20 text-right text-on-surface-variant tabular-nums',
                      )}
                    >
                      {formatSize(item.size)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.roundedFull,
                        cm.fontWeight('semibold'),
                        'uppercase tracking-widest shrink-0',
                        // While the destructive confirm is armed, the badge
                        // yields its width to the Delete/Cancel pair on phones.
                        confirmingId === item.id && 'hidden md:inline',
                        expiryTone(days),
                      )}
                    >
                      {t('trash.row.expires', { days }, { defaultValue: '{{days}}d left' })}
                    </span>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                      {confirmingId === item.id ? (
                        <>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'hidden sm:inline text-error',
                            )}
                          >
                            {t(
                              'trash.row.deleteConfirmPrompt',
                              {},
                              { defaultValue: 'Delete forever?' },
                            )}
                          </span>
                          <button
                            onClick={() => void handleDeleteForever(item.id)}
                            disabled={busy}
                            type="button"
                            data-mol-id={`trash-confirm-${item.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center' }),
                              'min-h-[40px]',
                              cm.sp('px', 3),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-lg bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50',
                            )}
                          >
                            {t('trash.row.deleteConfirm', {}, { defaultValue: 'Delete' })}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={busy}
                            type="button"
                            data-mol-id={`trash-keep-${item.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center' }),
                              'min-h-[40px]',
                              cm.sp('px', 3),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => void handleRestore(item.id)}
                            disabled={busy}
                            type="button"
                            data-mol-id={`trash-restore-${item.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'xs' }),
                              'min-h-[40px]',
                              cm.sp('px', 3),
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                              'rounded-lg bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors disabled:opacity-50',
                            )}
                          >
                            <span className={cm.cn('material-symbols-outlined text-base')}>
                              restore
                            </span>
                            {t('trash.row.restore', {}, { defaultValue: 'Restore' })}
                          </button>
                          <button
                            onClick={() => setConfirmingId(item.id)}
                            disabled={busy}
                            type="button"
                            data-mol-id={`trash-delete-${item.id}`}
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.w(10),
                              cm.h(10),
                              cm.roundedFull,
                              'text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors disabled:opacity-50',
                            )}
                            aria-label={t(
                              'trash.row.deleteForever',
                              {},
                              { defaultValue: 'Delete forever' },
                            )}
                          >
                            <span className={cm.cn('material-symbols-outlined text-base')}>
                              delete_forever
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default Trash
