import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import type { NimbusFileKind } from '../components/NimbusFileTypeIcon.js'
import { NimbusFileTypeIcon } from '../components/NimbusFileTypeIcon.js'

interface FileRecord {
  id: string
  name: string
  mime_type: string
  size: number
  is_starred: boolean
  is_trashed: boolean
  folder_id: string | null
  download_path?: string
  created_at?: string
  updated_at?: string
}

interface FolderRecord {
  id: string
  name: string
}

interface ShareRecord {
  id: string
  file_id: string
  permission: 'view' | 'edit'
  created_at: string
  expires_at: string | null
  token: string
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

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function FileDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [file, setFile] = useState<FileRecord | null>(null)
  const [folder, setFolder] = useState<FolderRecord | null>(null)
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [shareSuccessAt, setShareSuccessAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    http
      .get<FileRecord>(`/api/files/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const f = res.data
        if (!f) {
          setError(t('fileDetail.notFound', {}, { defaultValue: 'File not found.' }))
          setLoading(false)
          return
        }
        setFile(f)
        setDraftName(f.name)
        if (f.folder_id) {
          const fr = await http.get<FolderRecord>(`/api/folders/${f.folder_id}`).catch(() => null)
          if (cancelled) return
          setFolder(fr?.data ?? null)
        }
        const sharesRes = await http
          .get<ShareRecord[]>(`/api/shares?file_id=${encodeURIComponent(f.id)}`)
          .catch(() => null)
        if (cancelled) return
        setShares(Array.isArray(sharesRes?.data) ? sharesRes!.data : [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('fileDetail.fetchError', {}, { defaultValue: 'Could not load file.' }),
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function handleStar() {
    if (!file) return
    setBusyAction('star')
    try {
      const res = await http.post<{ id: string; is_starred: boolean }>(
        `/api/files/${file.id}/star`,
        {},
      )
      const next = res.data?.is_starred ?? !file.is_starred
      setFile({ ...file, is_starred: next })
      void track({
        name: 'file.starred',
        properties: { file_id: file.id, starred: next },
      })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('fileDetail.starError', {}, { defaultValue: 'Could not toggle star.' }),
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRename() {
    if (!file) return
    if (!draftName.trim() || draftName === file.name) {
      setRenaming(false)
      setDraftName(file.name)
      return
    }
    setBusyAction('rename')
    try {
      const res = await http.patch<FileRecord>(`/api/files/${file.id}`, { name: draftName.trim() })
      if (res.data) setFile(res.data)
      setRenaming(false)
      void track({ name: 'file.renamed', properties: { file_id: file.id } })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('fileDetail.renameError', {}, { defaultValue: 'Could not rename file.' }),
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete() {
    if (!file) return
    setBusyAction('delete')
    try {
      await http.delete(`/api/files/${file.id}`)
      void track({ name: 'file.trashed', properties: { file_id: file.id } })
      navigate('/trash')
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('fileDetail.deleteError', {}, { defaultValue: 'Could not delete file.' }),
      )
      setBusyAction(null)
    }
  }

  async function handleShare() {
    if (!file) return
    setBusyAction('share')
    try {
      const created = await http.post<ShareRecord>('/api/shares', {
        file_id: file.id,
        permission: 'view',
      })
      const sharesRes = await http
        .get<ShareRecord[]>(`/api/shares?file_id=${encodeURIComponent(file.id)}`)
        .catch(() => null)
      setShares(Array.isArray(sharesRes?.data) ? sharesRes!.data : [])
      setShareSuccessAt(Date.now())
      void track({
        name: 'file.shared',
        properties: { file_id: file.id, share_id: created.data?.id, permission: 'view' },
      })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('fileDetail.shareError', {}, { defaultValue: 'Could not create share link.' }),
      )
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRevokeShare(shareId: string) {
    setBusyAction(`revoke-${shareId}`)
    try {
      await http.delete(`/api/shares/${shareId}`)
      setShares(shares.filter((s) => s.id !== shareId))
      void track({
        name: 'share.revoked',
        properties: { file_id: file?.id, share_id: shareId },
      })
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t('fileDetail.revokeError', {}, { defaultValue: 'Could not revoke share link.' }),
      )
    } finally {
      setBusyAction(null)
    }
  }

  const kind = useMemo(() => (file ? kindFromMime(file.mime_type) : 'document'), [file])

  if (loading) {
    return (
      <NimbusFilesLayout
        breadcrumbs={[
          {
            to: '/files',
            label: t(
              'fileDetail.crumbs.home',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            ),
          },
          { label: t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' }) },
        ]}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('fileDetail.loading', {}, { defaultValue: 'Loading file…' })}
        </p>
      </NimbusFilesLayout>
    )
  }

  if (error || !file) {
    return (
      <NimbusFilesLayout
        breadcrumbs={[
          {
            to: '/files',
            label: t(
              'fileDetail.crumbs.home',
              { appName: APP_NAME },
              { defaultValue: '{{appName}}' },
            ),
          },
          { label: t('fileDetail.crumbs.unavailable', {}, { defaultValue: 'Unavailable' }) },
        ]}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 12),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 text-center',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-4xl text-error')}>
            error_outline
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {error ?? t('fileDetail.notFound', {}, { defaultValue: 'File not found.' })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/files')}
            data-mol-id="filedetail-back"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {t('fileDetail.backToFiles', {}, { defaultValue: 'Back to files' })}
          </button>
        </div>
      </NimbusFilesLayout>
    )
  }

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t(
            'fileDetail.crumbs.home',
            { appName: APP_NAME },
            { defaultValue: '{{appName}}' },
          ),
        },
        ...(folder ? [{ to: `/files?folder=${folder.id}`, label: folder.name }] : []),
        { label: file.name },
      ]}
    >
      <div
        className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-[1fr_400px]')}
        data-mol-id={`filedetail-${file.id}`}
      >
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <button
            type="button"
            onClick={() => navigate('/files')}
            data-mol-id="filedetail-back"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'self-start rounded-xl bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            {t('fileDetail.backToFiles', {}, { defaultValue: 'Back to files' })}
          </button>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.sp('p', 12),
              'min-h-[420px] rounded-2xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary relative overflow-hidden',
            )}
          >
            <NimbusFileTypeIcon kind={kind} size="lg" />
            <h2
              className={cm.cn(
                'text-2xl font-extrabold tracking-tight relative z-10 mt-4 text-center',
              )}
            >
              {file.name}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 1),
                'text-on-primary/80 relative z-10',
              )}
            >
              {t(
                'fileDetail.preview.meta',
                { type: file.mime_type || 'binary', size: formatBytes(file.size) },
                { defaultValue: '{{type}} · {{size}}' },
              )}
            </p>
            <div
              className={cm.cn(
                'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -left-12 top-12 w-40 h-40 rounded-full bg-surface/10 blur-2xl',
              )}
              aria-hidden="true"
            />
          </div>

          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            <a
              href={file.download_path ?? `/api/files/${file.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                void track({ name: 'file.downloaded', properties: { file_id: file.id } })
              }
              data-mol-id="filedetail-download"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>download</span>
              {t('common.download', {}, { defaultValue: 'Download' })}
            </a>
            <button
              onClick={() => void handleShare()}
              disabled={busyAction === 'share'}
              type="button"
              data-mol-id="filedetail-share"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>share</span>
              {busyAction === 'share'
                ? t('fileDetail.actions.sharing', {}, { defaultValue: 'Creating link…' })
                : t('fileDetail.actions.share', {}, { defaultValue: 'Create share link' })}
            </button>
            <button
              onClick={() => void handleStar()}
              disabled={busyAction === 'star'}
              type="button"
              data-mol-id="filedetail-star"
              aria-pressed={file.is_starred}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl transition-colors disabled:opacity-50',
                file.is_starred
                  ? 'bg-warning-light text-warning hover:bg-warning-container/60'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-lg')}
                style={file.is_starred ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                star
              </span>
              {file.is_starred
                ? t('status.starred', {}, { defaultValue: 'Starred' })
                : t('fileDetail.actions.star', {}, { defaultValue: 'Star' })}
            </button>
            {renaming ? (
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  data-mol-id="filedetail-rename-input"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-lg bg-surface-container-low text-on-surface w-56 border border-outline-variant/30 focus:outline-none focus:border-primary',
                  )}
                />
                <button
                  type="button"
                  onClick={() => void handleRename()}
                  disabled={busyAction === 'rename'}
                  data-mol-id="filedetail-rename-confirm"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                  )}
                >
                  {t('common.save', {}, { defaultValue: 'Save' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(false)
                    setDraftName(file.name)
                  }}
                  data-mol-id="filedetail-rename-cancel"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setRenaming(true)
                  setDraftName(file.name)
                }}
                type="button"
                data-mol-id="filedetail-rename"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')}>edit</span>
                {t('fileDetail.actions.rename', {}, { defaultValue: 'Rename' })}
              </button>
            )}
            <button
              onClick={() => void handleDelete()}
              disabled={busyAction === 'delete'}
              type="button"
              data-mol-id="filedetail-delete"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-xl bg-error-container/30 text-error hover:bg-error-container/50 transition-colors ml-auto disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-lg')}>delete</span>
              {file.is_trashed
                ? t('fileDetail.actions.deleteForever', {}, { defaultValue: 'Delete forever' })
                : t('fileDetail.actions.delete', {}, { defaultValue: 'Move to trash' })}
            </button>
          </div>

          {shareSuccessAt && (
            <div
              role="status"
              data-mol-id="filedetail-share-success"
              className={cm.cn(
                cm.sp('p', 4),
                cm.textSize('sm'),
                'rounded-xl bg-success-light text-success',
              )}
            >
              {t(
                'fileDetail.shareSuccess',
                {},
                { defaultValue: 'Share link created. Find it in the panel below.' },
              )}
            </div>
          )}

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/15',
            )}
          >
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('fileDetail.shares.title', {}, { defaultValue: 'Active share links' })}
            </h3>
            {shares.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'fileDetail.shares.empty',
                  {},
                  {
                    defaultValue: 'No active share links yet. Tap "Create share link" to make one.',
                  },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {shares.map((s) => {
                  const fullLink = `${window.location.origin}/s/${s.token}`
                  return (
                    <li
                      key={s.id}
                      data-mol-id={`filedetail-share-${s.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'md' }),
                        cm.sp('p', 3),
                        'rounded-xl bg-surface-container-low',
                      )}
                    >
                      <span className={cm.cn('material-symbols-outlined text-primary')}>link</span>
                      <code
                        className={cm.cn(
                          cm.textSize('xs'),
                          'flex-grow truncate text-on-surface-variant font-mono',
                        )}
                      >
                        {fullLink}
                      </code>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.fontWeight('semibold'),
                          'uppercase tracking-widest shrink-0 bg-surface-container-high text-on-surface-variant',
                        )}
                      >
                        {s.permission}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRevokeShare(s.id)}
                        disabled={busyAction === `revoke-${s.id}`}
                        data-mol-id={`filedetail-share-revoke-${s.id}`}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.w(8),
                          cm.h(8),
                          cm.roundedFull,
                          'text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors disabled:opacity-50',
                        )}
                        aria-label={t(
                          'fileDetail.shares.revoke',
                          {},
                          { defaultValue: 'Revoke link' },
                        )}
                      >
                        <span className={cm.cn('material-symbols-outlined text-base')}>close</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/15',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <NimbusFileTypeIcon kind={kind} size="lg" />
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('fileDetail.about.eyebrow', {}, { defaultValue: 'About this file' })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('bold'),
                    'text-on-surface truncate',
                  )}
                >
                  {file.name}
                </span>
              </div>
            </div>

            <dl className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.size', {}, { defaultValue: 'Size' })}
                </dt>
                <dd
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface tabular-nums',
                  )}
                >
                  {formatBytes(file.size)}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.type', {}, { defaultValue: 'Type' })}
                </dt>
                <dd
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {file.mime_type || '—'}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('fileDetail.field.created', {}, { defaultValue: 'Created' })}
                </dt>
                <dd
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {formatDate(file.created_at) || '—'}
                </dd>
              </div>
              <div>
                <dt
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('fileDetail.field.modified', {}, { defaultValue: 'Modified' })}
                </dt>
                <dd
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {formatDate(file.updated_at) || '—'}
                </dd>
              </div>
            </dl>
            {folder && (
              <div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.location', {}, { defaultValue: 'Location' })}
                </span>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {folder.name}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </NimbusFilesLayout>
  )
}

export default FileDetail
