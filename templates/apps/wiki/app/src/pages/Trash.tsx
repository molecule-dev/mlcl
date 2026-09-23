import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill } from '../components/StatPill.js'

interface ApiPage {
  id: string
  title: string
  trashed_at: string | null
  updated_at: string | null
  author_id: string
  space_id: string
}

interface ApiSpace {
  id: string
  name: string
}

const RETENTION_DAYS = 30

function daysUntilPurge(trashedAt: string | null): number {
  if (!trashedAt) return RETENTION_DAYS
  const trashedTime = new Date(trashedAt).getTime()
  const elapsed = (Date.now() - trashedTime) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed))
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return d.toLocaleDateString()
}

export function Trash() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [pages, setPages] = useState<ApiPage[] | null>(null)
  const [spaces, setSpaces] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<{ id: string; action: 'restore' | 'purge' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Two-step purge: the first click ARMS the button ("Purge forever?"), the
  // second confirms. Auto-disarms after 4s so a stray click never leaves a
  // destructive action primed.
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null)
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const [pagesRes, spacesRes] = await Promise.all([
        // First get all spaces, then aggregate pages per space (the API filters by author_id when no space_id is given).
        http.get<ApiPage[]>('/pages', { params: { trashed: 'true' } }),
        http.get<ApiSpace[]>('/spaces'),
      ])
      const allPages: ApiPage[] = Array.isArray(pagesRes.data) ? pagesRes.data : []
      const spaceList: ApiSpace[] = Array.isArray(spacesRes.data) ? spacesRes.data : []
      const spaceMap: Record<string, string> = {}
      for (const s of spaceList) spaceMap[s.id] = s.name
      // Also fetch trashed pages from each space the user owns (in case author_id ≠ owner_id for shared editors).
      const perSpace = await Promise.all(
        spaceList.map((s) =>
          http
            .get<ApiPage[]>('/pages', { params: { space_id: s.id, trashed: 'true' } })
            .then((r) => (Array.isArray(r.data) ? r.data : []))
            .catch(() => []),
        ),
      )
      const seen = new Set<string>()
      const merged: ApiPage[] = []
      for (const p of [...allPages, ...perSpace.flat()]) {
        if (seen.has(p.id)) continue
        seen.add(p.id)
        merged.push(p)
      }
      merged.sort((a, b) => (b.trashed_at ?? '').localeCompare(a.trashed_at ?? ''))
      setPages(merged)
      setSpaces(spaceMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash')
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    return () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current)
    }
  }, [])

  const armPurge = (id: string) => {
    setConfirmPurgeId(id)
    if (disarmTimer.current) clearTimeout(disarmTimer.current)
    disarmTimer.current = setTimeout(() => setConfirmPurgeId(null), 4_000)
  }

  const handleRestore = async (id: string) => {
    setWorking({ id, action: 'restore' })
    try {
      await http.post(`/pages/${id}/restore`)
      void track({ name: 'page.restored', properties: { page_id: id, source: 'trash' } })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore')
    } finally {
      setWorking(null)
    }
  }

  const handlePurge = async (id: string) => {
    // Two-step confirm: first click arms, second click (while armed) purges.
    if (confirmPurgeId !== id) {
      armPurge(id)
      return
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current)
    setConfirmPurgeId(null)
    setWorking({ id, action: 'purge' })
    try {
      await http.delete(`/pages/${id}`, { params: { permanent: 'true' } })
      void track({ name: 'page.purged', properties: { page_id: id, source: 'trash' } })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge')
    } finally {
      setWorking(null)
    }
  }

  const decorated = useMemo(() => {
    return (pages ?? []).map((p) => ({
      ...p,
      spaceName: spaces[p.space_id] ?? '',
      daysLeft: daysUntilPurge(p.trashed_at),
      deletedWhen: formatRelative(p.trashed_at),
    }))
  }, [pages, spaces])

  return (
    <div className={cm.stack(8)} data-testid="trash-page">
      <header className={cm.stack(2)}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('trash.eyebrow', {}, { defaultValue: 'Archive · 30-day retention' })}
        </span>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('trash.heading', {}, { defaultValue: 'Trash' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'trash.subtitle',
            {},
            {
              defaultValue:
                'Deleted pages live here for 30 days. Restore the ones you still need, purge the ones you do not — nothing leaves until you say so.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border-l-4 border-error bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {pages === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('trash.loading', {}, { defaultValue: 'Loading trash…' })}
        </p>
      ) : decorated.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
          data-testid="trash-empty"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[40px] text-on-surface-variant/60')}
            aria-hidden="true"
          >
            delete_outline
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('trash.empty.title', {}, { defaultValue: 'Trash is empty.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'trash.empty.body',
              {},
              { defaultValue: 'Deleted pages will appear here for 30 days before being purged.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.stack(3)} data-testid="trash-list">
          {decorated.map((p) => {
            const urgent = p.daysLeft <= 7
            const isWorking = working?.id === p.id
            return (
              <li
                key={p.id}
                data-testid={`trash-item-${p.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
                  urgent ? 'border-l-[3px] border-l-error' : '',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-10 w-10 shrink-0 rounded-lg bg-error/10 text-error',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-[20px]')}>delete</span>
                </span>

                <div className={cm.cn(cm.stack(1), 'min-w-0 flex-1')}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <h3
                      className={cm.cn(
                        cm.textSize('base'),
                        cm.fontWeight('semibold'),
                        'truncate text-on-surface',
                      )}
                    >
                      {p.title}
                    </h3>
                    <StatPill
                      tone={urgent ? 'locked' : 'archived'}
                      icon={urgent ? 'warning' : 'schedule'}
                    >
                      {t(
                        'trash.daysUntilPurge',
                        { days: p.daysLeft },
                        { defaultValue: '{{days}} days left' },
                      )}
                    </StatPill>
                  </div>
                  {p.spaceName ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {p.spaceName}
                    </p>
                  ) : null}
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'trash.deletedWhen',
                      { when: p.deletedWhen },
                      { defaultValue: 'Deleted {{when}}' },
                    )}
                  </p>
                </div>

                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
                  <button
                    type="button"
                    onClick={() => handleRestore(p.id)}
                    disabled={isWorking}
                    data-testid={`trash-restore-${p.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'h-9 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      restore
                    </span>
                    {isWorking && working?.action === 'restore'
                      ? t('trash.restoring', {}, { defaultValue: 'Restoring…' })
                      : t('trash.restore', {}, { defaultValue: 'Restore' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePurge(p.id)}
                    disabled={isWorking}
                    data-testid={`trash-purge-${p.id}`}
                    aria-label={
                      confirmPurgeId === p.id
                        ? t(
                            'trash.confirmPurgeAria',
                            { title: p.title },
                            { defaultValue: 'Confirm: permanently delete {{title}}' },
                          )
                        : undefined
                    }
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      confirmPurgeId === p.id
                        ? 'h-9 rounded-md bg-error text-on-error ring-2 ring-error/50 hover:bg-error-hover disabled:opacity-60 transition-colors animate-pulse'
                        : 'h-9 rounded-md bg-error/80 text-on-error hover:bg-error disabled:opacity-60 transition-colors',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[16px]')}
                      aria-hidden="true"
                    >
                      delete_forever
                    </span>
                    {isWorking && working?.action === 'purge'
                      ? t('trash.purging', {}, { defaultValue: 'Purging…' })
                      : confirmPurgeId === p.id
                        ? t('trash.confirmPurge', {}, { defaultValue: 'Purge forever?' })
                        : t('trash.purge', {}, { defaultValue: 'Purge' })}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
