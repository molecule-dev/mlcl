import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MeridianAppShell } from '../components/MeridianAppShell.js'
import { MeridianMessageCard } from '../components/MeridianMessageCard.js'
import type { EmailRow } from '../lib/api.js'
import { deriveInitials, ensureArray, formatRelativeTimestamp } from '../lib/api.js'

export function ThreadView() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [thread, setThread] = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get<EmailRow[]>(`/api/emails/${id}/thread`)
        const payload = ((res as { data?: EmailRow[] }).data ?? res) as EmailRow[]
        if (cancelled) return
        setThread(Array.isArray(payload) ? payload : [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load thread')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, http])

  const subject = thread[0]?.subject ?? ''
  const root = thread[0]

  const archive = useCallback(async () => {
    if (!id) return
    try {
      await http.put(`/api/emails/${id}/move`, { folder: 'archive' })
      navigate('/inbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'archive failed')
    }
  }, [http, id, navigate])

  const remove = useCallback(async () => {
    if (!id) return
    try {
      await http.delete(`/api/emails/${id}`)
      navigate('/inbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed')
    }
  }, [http, id, navigate])

  const toggleStar = useCallback(async () => {
    if (!id) return
    try {
      await http.put(`/api/emails/${id}/star`)
      setRefreshKey((k) => k + 1)
      // refresh thread by re-fetching
      const res = await http.get<EmailRow[]>(`/api/emails/${id}/thread`)
      const payload = ((res as { data?: EmailRow[] }).data ?? res) as EmailRow[]
      setThread(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'star failed')
    }
  }, [http, id])

  return (
    <MeridianAppShell refreshKey={refreshKey}>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'h-full bg-surface-container-lowest overflow-hidden',
        )}
        data-mol-id="page-thread"
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 6),
            'h-14 border-b border-outline-variant/40 bg-surface shrink-0',
          )}
        >
          <Link
            to="/inbox"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
            data-mol-id="thread-back"
          >
            <span className={'material-symbols-outlined text-base'} aria-hidden="true">
              arrow_back
            </span>
            {t('meridian.thread.back', {}, { defaultValue: 'Back to Inbox' })}
          </Link>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'text-on-surface-variant')}
          >
            <button
              type="button"
              onClick={archive}
              data-mol-id="thread-archive"
              aria-label={t('common.archive', {}, { defaultValue: 'Archive' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.cursorPointer,
                'rounded-full hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                archive
              </span>
            </button>
            <button
              type="button"
              onClick={remove}
              data-mol-id="thread-delete"
              aria-label={t('common.delete', {}, { defaultValue: 'Delete' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.cursorPointer,
                'rounded-full hover:bg-surface-container-low transition-colors',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                delete
              </span>
            </button>
            <button
              type="button"
              onClick={toggleStar}
              data-mol-id="thread-star"
              aria-label={t('meridian.thread.star', {}, { defaultValue: 'Star' })}
              className={cm.cn(
                cm.sp('p', 2),
                cm.cursorPointer,
                'rounded-full hover:bg-surface-container-low transition-colors',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={root?.is_starred ? { fontVariationSettings: "'FILL' 1" } : undefined}
                aria-hidden="true"
              >
                star
              </span>
            </button>
          </div>
        </header>

        <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), 'overflow-y-auto')}>
          <div
            className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.flex({ direction: 'col', gap: 'lg' }))}
          >
            <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('meridian.thread.eyebrow', { id: id ?? '' }, { defaultValue: 'Thread #{{id}}' })}
              </p>
              <h1
                className={cm.cn(
                  'text-3xl font-extrabold tracking-tight text-on-surface leading-tight',
                )}
                data-mol-id="thread-subject"
              >
                {subject ||
                  (loading
                    ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                    : t('meridian.thread.notFound', {}, { defaultValue: 'Thread not found.' }))}
              </h1>
            </header>

            {error && (
              <p className="text-error text-sm" data-mol-id="thread-error">
                {error}
              </p>
            )}

            {thread.map((msg) => {
              const senderName =
                msg.from
                  .split('@')[0]
                  ?.replace(/[._-]+/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase()) ?? msg.from
              return (
                <MeridianMessageCard
                  key={msg.id}
                  message={{
                    sender: senderName,
                    senderEmail: msg.from,
                    initials: deriveInitials(msg.from),
                    recipients: ensureArray(msg.to).join(', '),
                    timestamp: formatRelativeTimestamp(msg.sent_at ?? msg.created_at),
                    body: (msg.body || '').split(/\n+/).filter(Boolean),
                    attachments: (msg.attachments ?? undefined)?.map((a) => ({
                      name: a.name,
                      sizeLabel: a.size_label ?? '',
                      url: a.url ?? undefined,
                      icon: 'description',
                      tone: 'doc',
                    })),
                  }}
                />
              )
            })}

            {!loading && thread.length === 0 && !error && (
              <p className="text-on-surface-variant text-sm" data-mol-id="thread-empty">
                {t('meridian.thread.empty', {}, { defaultValue: 'No messages in this thread.' })}
              </p>
            )}
          </div>
        </div>
      </div>
    </MeridianAppShell>
  )
}

export default ThreadView
