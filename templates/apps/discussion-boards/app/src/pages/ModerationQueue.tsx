import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type QueueKind = 'flagged-post' | 'pending-thread' | 'reported-user' | 'ban-appeal'

interface QueueItem {
  id: string
  kind: QueueKind
  title: string
  excerpt?: string
  reason?: string
  reporter?: { username: string }
  subject?: { username: string }
  thread?: { id: string; slug?: string; title: string }
  flagged_at: string
  flag_count?: number
}

const KIND_PRESENTATION: Record<QueueKind, { icon: string; label: string; tone: string }> = {
  'flagged-post': {
    icon: 'flag',
    label: 'Flagged post',
    tone: 'bg-error-light text-error',
  },
  'pending-thread': {
    icon: 'hourglass_top',
    label: 'Pending thread',
    tone: 'bg-warning-light text-warning',
  },
  'reported-user': {
    icon: 'person_alert',
    label: 'Reported user',
    tone: 'bg-[var(--color-moderator-light)] text-[var(--color-moderator)]',
  },
  'ban-appeal': {
    icon: 'gavel',
    label: 'Ban appeal',
    tone: 'bg-border text-foreground',
  },
}

const ACTIONS: Array<{
  key: 'approve' | 'hide' | 'lock' | 'ban'
  defaultLabel: string
  icon: string
  className: string
}> = [
  {
    key: 'approve',
    defaultLabel: 'Approve',
    icon: 'check',
    className: 'bg-success text-white hover:bg-success/90',
  },
  {
    key: 'hide',
    defaultLabel: 'Hide',
    icon: 'visibility_off',
    className:
      'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/40',
  },
  {
    key: 'lock',
    defaultLabel: 'Lock thread',
    icon: 'lock',
    className: 'bg-border hover:bg-border-secondary text-foreground',
  },
  {
    key: 'ban',
    defaultLabel: 'Ban user',
    icon: 'block',
    className: 'bg-error text-on-error hover:bg-error/90',
  },
]

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime()
  const diff = Math.max(Date.now() - then, 0)
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function ModerationQueue() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [filter, setFilter] = useState<'all' | QueueKind>('all')
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<{ data: QueueItem[] }>('/api/moderation/queue')
      .then((res) => {
        if (cancelled) return
        setItems(res?.data?.data ?? [])
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setItems([])
        setError(e instanceof Error ? e.message : 'Failed to load moderation queue')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = items ?? [] // derived inline; useMemo deps below rely on items state stability
  const visible = useMemo(
    () => (filter === 'all' ? list : list.filter((i) => i.kind === filter)),
    [filter, list],
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: list.length }
    for (const kind of Object.keys(KIND_PRESENTATION)) {
      map[kind] = list.filter((i) => i.kind === kind).length
    }
    return map
  }, [list])

  const handleAction = async (item: QueueItem, action: (typeof ACTIONS)[number]['key']) => {
    setResolved((prev) => ({ ...prev, [item.id]: action }))
    try {
      await http.post(`/api/moderation/${item.id}/${action}`)
      setError(null)
    } catch (e) {
      // Revert the optimistic resolution so the action buttons come back
      // and the moderator can retry.
      setResolved((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      setError(
        e instanceof Error
          ? e.message
          : t('moderationQueue.actionFailed', {}, { defaultValue: 'Action failed. Try again.' }),
      )
    }
  }

  return (
    <div className={cm.cn(cm.stack(6))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t('moderationQueue.eyebrow', {}, { defaultValue: 'Moderator workspace' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'moderationQueue.heading',
              { count: list.length.toLocaleString() },
              { defaultValue: 'Moderation queue · {{count}} open items' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'moderationQueue.subtitle',
              {},
              {
                defaultValue:
                  'Every action logs an audit trail you can review later. Restraint over deletion.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-2xl bg-warning-light border border-warning/30 text-warning text-xs leading-relaxed max-w-md',
          )}
        >
          <p className={cm.cn(cm.fontWeight('bold'), 'uppercase tracking-widest mb-1')}>
            {t('moderationQueue.sla', {}, { defaultValue: 'Live SLA' })}
          </p>
          {t(
            'moderationQueue.slaBody',
            {},
            {
              defaultValue:
                'Aim for first-touch under two hours. Escalate to admin@stoa for ambiguous calls.',
            },
          )}
        </div>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {(
          [
            { key: 'all', defaultLabel: 'All', icon: 'apps' },
            { key: 'flagged-post', defaultLabel: 'Flags', icon: 'flag' },
            { key: 'pending-thread', defaultLabel: 'Pending', icon: 'hourglass_top' },
            { key: 'reported-user', defaultLabel: 'Reports', icon: 'person_alert' },
            { key: 'ban-appeal', defaultLabel: 'Appeals', icon: 'gavel' },
          ] as const
        ).map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-colors',
                active
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
              )}
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden>
                {f.icon}
              </span>
              {t(`moderationQueue.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              <span className="tabular-nums opacity-80">{counts[f.key] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')} role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        <p className={cm.textMuted}>
          {t('moderationQueue.loading', {}, { defaultValue: 'Loading queue…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.textMuted}>
          {t('moderationQueue.empty', {}, { defaultValue: 'Queue clear. Brew a tea.' })}
        </p>
      ) : (
        <div className={cm.stack(3)}>
          {visible.map((item) => {
            const presentation = KIND_PRESENTATION[item.kind]
            const decision = resolved[item.id]
            return (
              <article
                key={item.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.flex({ direction: 'col', gap: 'md' }),
                  'rounded-2xl bg-surface-container-lowest border transition-all',
                  decision
                    ? 'border-success/30 bg-success-light/40 opacity-90'
                    : 'border-outline-variant/30 hover:shadow-md',
                )}
              >
                <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest',
                      presentation.tone,
                    )}
                  >
                    <span className="material-symbols-outlined text-[12px]" aria-hidden>
                      {presentation.icon}
                    </span>
                    {t(
                      `moderationQueue.kind.${item.kind}`,
                      {},
                      { defaultValue: presentation.label },
                    )}
                  </span>
                  {item.flag_count !== undefined && item.flag_count > 0 && (
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'py-0.5 text-[10px] uppercase tracking-widest bg-error-light text-error',
                      )}
                    >
                      {t(
                        'moderationQueue.flagCount',
                        { count: item.flag_count.toLocaleString() },
                        { defaultValue: '{{count}} flags' },
                      )}
                    </span>
                  )}
                  <span className={cm.cn(cm.flex1)} />
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {formatRelative(item.flagged_at)}
                  </span>
                </header>
                <div className={cm.stack(1)}>
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'text-on-surface tracking-tight',
                    )}
                  >
                    {item.title}
                  </h3>
                  {item.excerpt && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                      style={{ fontFamily: 'var(--mol-font-serif, Georgia, serif)' }}
                    >
                      {item.excerpt}
                    </p>
                  )}
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant flex-wrap',
                    )}
                  >
                    {item.reason && (
                      <span className={cm.fontWeight('semibold')}>
                        {t(
                          'moderationQueue.reason',
                          { reason: item.reason },
                          { defaultValue: 'Reason: {{reason}}' },
                        )}
                      </span>
                    )}
                    {item.reporter && (
                      <span>
                        {t(
                          'moderationQueue.reporter',
                          { user: item.reporter.username },
                          { defaultValue: 'Reported by @{{user}}' },
                        )}
                      </span>
                    )}
                    {item.subject && (
                      <Link
                        to={`/u/${item.subject.username}`}
                        className={cm.cn('text-primary hover:underline')}
                      >
                        @{item.subject.username}
                      </Link>
                    )}
                    {item.thread && (
                      <Link
                        to={`/t/${item.thread.slug ?? item.thread.id}`}
                        className={cm.cn('text-on-surface-variant hover:text-primary truncate')}
                      >
                        ↗ {item.thread.title}
                      </Link>
                    )}
                  </div>
                </div>
                <footer className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  {decision ? (
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'inline-flex items-center gap-1 text-xs uppercase tracking-widest bg-success-light text-success',
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden>
                        check_circle
                      </span>
                      {t(
                        'moderationQueue.resolved',
                        { action: decision },
                        { defaultValue: 'Resolved · {{action}}' },
                      )}
                    </span>
                  ) : (
                    ACTIONS.map((action) => (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => handleAction(item, action.key)}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'inline-flex items-center gap-2 text-xs uppercase tracking-widest transition-colors',
                          action.className,
                        )}
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden>
                          {action.icon}
                        </span>
                        {t(
                          `moderationQueue.action.${action.key}`,
                          {},
                          { defaultValue: action.defaultLabel },
                        )}
                      </button>
                    ))
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ModerationQueue
