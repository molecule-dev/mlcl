import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface ActionItem {
  id: string
  text: string
  owner: string
  owner_initial: string
  meeting_id: string
  meeting_title: string
  due_date?: string | null
  status: 'open' | 'in_progress' | 'done'
  created_at: string
}

const FILTERS = ['all', 'open', 'in_progress', 'done'] as const
type Filter = (typeof FILTERS)[number]

const FILTER_DEFAULT_LABEL: Record<Filter, string> = {
  all: 'All',
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_DEFAULT_LABEL: Record<ActionItem['status'], string> = {
  open: 'open',
  in_progress: 'in progress',
  done: 'done',
}

const STATUS_COLOR: Record<ActionItem['status'], string> = {
  open: 'bg-info/15 text-info',
  in_progress: 'bg-warning/15 text-warning',
  done: 'bg-success/15 text-success',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ActionItems() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [items, setItems] = useState<ActionItem[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/action_items')
      .then((res) => {
        if (!cancelled) setItems(unwrapList<ActionItem>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('actions.loadError', {}, { defaultValue: 'Failed to load action items.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const toggleStatus = async (a: ActionItem) => {
    const next: ActionItem['status'] = a.status === 'done' ? 'open' : 'done'
    setItems((prev) => prev.map((i) => (i.id === a.id ? { ...i, status: next } : i)))
    try {
      await http.put(`/api/action_items/${a.id}`, { status: next })
    } catch (_error) {
      // optimistic update failed — revert to previous status
      setItems((prev) => prev.map((i) => (i.id === a.id ? { ...i, status: a.status } : i)))
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((i) => i.status === filter)
  }, [items, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('actions.heading', {}, { defaultValue: 'Action items' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'actions.subheading',
            {},
            { defaultValue: 'Aggregated across every meeting. Filter by status to focus.' },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.card(), cm.sp('p', 4), cm.flex({ gap: 'sm' }))}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.roundedFull,
              filter === f
                ? cm.cn('bg-primary text-on-primary')
                : cm.cn(
                    'bg-surface-container',
                    'text-on-surface-variant',
                    'hover:bg-surface-container-high',
                  ),
            )}
          >
            {t(`actions.filter.${f}`, {}, { defaultValue: FILTER_DEFAULT_LABEL[f] })}
          </button>
        ))}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('actions.empty', {}, { defaultValue: 'No action items match.' })}
        </p>
      ) : (
        <ul className={'space-y-2'}>
          {filtered.map((a) => (
            <li
              key={a.id}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 4),
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <span
                  className={cm.cn(
                    'h-9 w-9',
                    cm.roundedFull,
                    'bg-primary-container grid place-items-center',
                    cm.fontWeight('bold'),
                    cm.textPrimary,
                  )}
                >
                  {a.owner_initial}
                </span>
                <div className={'min-w-0'}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{a.text}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {a.owner} ·{' '}
                    <Link to={`/meetings/${a.meeting_id}`} className={'hover:underline'}>
                      {a.meeting_title}
                    </Link>
                  </p>
                </div>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                {a.due_date ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      cm.roundedFull,
                      'bg-surface-container',
                      'text-on-surface-variant',
                    )}
                  >
                    {fmtDate(a.due_date)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleStatus(a)}
                  aria-pressed={a.status === 'done'}
                  aria-label={
                    a.status === 'done'
                      ? t('actions.toggleReopenLabel', {}, { defaultValue: 'Mark as open' })
                      : t('actions.toggleDoneLabel', {}, { defaultValue: 'Mark as done' })
                  }
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    STATUS_COLOR[a.status],
                    'hover:opacity-80 transition-opacity cursor-pointer',
                  )}
                >
                  {t(
                    `actions.status.${a.status}`,
                    {},
                    { defaultValue: STATUS_DEFAULT_LABEL[a.status] },
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
