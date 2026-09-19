import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ActionItem {
  id: string
  description: string
  owner_member_id: string | null
  owner_name: string | null
  status: 'open' | 'in_progress' | 'done'
  due_at: string | null
}

interface PostmortemDetailData {
  id: string
  incident_id: string
  title: string
  summary: string
  contributing_factors: string[]
  status: 'draft' | 'published'
  incident: {
    id: string
    title: string
    severity: string
    status: string
    service: string
    triggered_at: string
    resolved_at: string | null
  } | null
  action_items: ActionItem[]
  open_action_items: number
}

const STATUS_TONE: Record<ActionItem['status'], { color: string; bg: string }> = {
  open: { color: 'var(--color-severity-critical)', bg: 'var(--color-severity-critical-light)' },
  in_progress: {
    color: 'var(--color-severity-warning)',
    bg: 'var(--color-severity-warning-light)',
  },
  done: { color: 'var(--color-severity-resolved)', bg: 'var(--color-severity-resolved-light)' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PostmortemDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [pm, setPm] = useState<PostmortemDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [factorsText, setFactorsText] = useState('')
  const [newItem, setNewItem] = useState('')

  const reload = useCallback(async () => {
    if (!id) return
    const res = await http.get(`/api/postmortems/${id}`)
    const single = unwrapSingle<PostmortemDetailData>(res)
    if (single) {
      setPm(single)
      setSummary(single.summary)
      setFactorsText(single.contributing_factors.join('\n'))
    }
  }, [http, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/postmortems/${id}`)
      .then((res) => {
        if (cancelled) return
        const single = unwrapSingle<PostmortemDetailData>(res)
        if (single) {
          setPm(single)
          setSummary(single.summary)
          setFactorsText(single.contributing_factors.join('\n'))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('postmortems.loadError', {}, { defaultValue: "Couldn't load the postmortem." }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const saveEdits = async () => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await http.put(`/api/postmortems/${id}`, {
        summary,
        contributing_factors: factorsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      })
      await reload()
    } catch (_error) {
      setError(
        t('postmortemDetail.saveError', {}, { defaultValue: "Couldn't save — please retry." }),
      )
    } finally {
      setSaving(false)
    }
  }

  const setItemStatus = async (item: ActionItem, status: ActionItem['status']) => {
    if (!id) return
    setSaving(true)
    try {
      await http.put(`/api/postmortems/${id}/action-items/${item.id}`, { status })
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const addItem = async () => {
    if (!id || !newItem.trim()) return
    setSaving(true)
    try {
      await http.post(`/api/postmortems/${id}/action-items`, {
        description: newItem.trim(),
      })
      setNewItem('')
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!id) return
    setSaving(true)
    try {
      await http.put(`/api/postmortems/${id}`, { status: 'published' })
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (!pm) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
        <Link
          to="/postmortems"
          className={cm.cn(
            'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
          )}
          style={{ color: BRAND_COLOR }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('postmortemDetail.back', {}, { defaultValue: 'Back to postmortems' })}
        </Link>
        <p className={cm.cn('font-mono text-sm')} style={{ color: 'var(--color-text-secondary)' }}>
          {loading
            ? t('postmortemDetail.loading', {}, { defaultValue: 'Loading postmortem…' })
            : t('postmortemDetail.notFound', {}, { defaultValue: 'Postmortem not found.' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/postmortems"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest mb-4 hover:opacity-80',
        )}
        style={{ color: BRAND_COLOR }}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('postmortemDetail.back', {}, { defaultValue: 'Back to postmortems' })}
      </Link>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs mb-4')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : null}

      <header
        className={cm.cn('rounded-2xl mb-6 p-6')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className={cm.cn('flex items-center gap-2 flex-wrap mb-3')}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
            )}
            style={{
              backgroundColor:
                pm.status === 'published'
                  ? 'var(--color-severity-resolved-light)'
                  : 'var(--color-severity-warning-light)',
              color:
                pm.status === 'published'
                  ? 'var(--color-severity-resolved)'
                  : 'var(--color-severity-warning)',
            }}
          >
            {pm.status}
          </span>
          {pm.incident ? (
            <Link
              to={`/incidents/${pm.incident.id}`}
              data-mol-id="postmortem-incident-link"
              className={cm.cn('font-mono text-xs underline hover:opacity-80')}
              style={{ color: BRAND_COLOR }}
            >
              {t('postmortemDetail.linkedIncident', {}, { defaultValue: 'linked incident' })} ↗
            </Link>
          ) : null}
        </div>
        <h1
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}
          style={{ color: 'var(--color-text)' }}
        >
          {pm.title}
        </h1>
        {pm.incident ? (
          <p
            className={cm.cn('mt-2 font-mono text-xs')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {pm.incident.service} ·{' '}
            {t('postmortemDetail.triggered', {}, { defaultValue: 'triggered' })}{' '}
            {fmtDate(pm.incident.triggered_at)} ·{' '}
            {t('postmortemDetail.resolved', {}, { defaultValue: 'resolved' })}{' '}
            {fmtDate(pm.incident.resolved_at)}
          </p>
        ) : null}
        <div className={cm.cn('mt-4 flex flex-wrap gap-2')}>
          <button
            type="button"
            disabled={saving || summary === pm.summary}
            onClick={saveEdits}
            data-mol-id="postmortem-save"
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
            )}
            style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
          >
            {saving
              ? t('common.saving', {}, { defaultValue: 'Saving…' })
              : t('postmortemDetail.saveDraft', {}, { defaultValue: 'Save draft' })}
          </button>
          {pm.status !== 'published' ? (
            <button
              type="button"
              disabled={saving}
              onClick={publish}
              data-mol-id="postmortem-publish"
              className={cm.cn(
                'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
              )}
              style={{
                backgroundColor: 'var(--color-severity-resolved)',
                borderColor: 'var(--color-severity-resolved)',
                color: 'var(--color-text-inverse)',
              }}
            >
              {t('postmortemDetail.publish', {}, { defaultValue: 'Publish' })}
            </button>
          ) : null}
        </div>
      </header>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        {/* Summary + factors editor */}
        <section className={cm.cn('lg:col-span-7 space-y-4')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('postmortemDetail.summary', {}, { defaultValue: 'Summary' })}
            </h2>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none resize-y')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              aria-label={t('postmortemDetail.summary', {}, { defaultValue: 'Summary' })}
              data-mol-id="postmortem-summary-input"
            />
          </div>

          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'postmortemDetail.contributingFactors',
                {},
                { defaultValue: 'Contributing factors (one per line)' },
              )}
            </h2>
            <textarea
              value={factorsText}
              onChange={(e) => setFactorsText(e.target.value)}
              rows={5}
              className={cm.cn('w-full px-3 py-2 rounded-md text-sm outline-none resize-y')}
              style={{
                backgroundColor: 'var(--color-input-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              aria-label={t(
                'postmortemDetail.contributingFactors',
                {},
                { defaultValue: 'Contributing factors, one per line' },
              )}
              data-mol-id="postmortem-factors-input"
            />
          </div>
        </section>

        {/* Action items */}
        <section className={cm.cn('lg:col-span-5')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('postmortemDetail.actionItems', {}, { defaultValue: 'Action items' })}
            </h2>
            <ul className={cm.cn('space-y-2 mb-4')}>
              {pm.action_items.map((item) => (
                <li
                  key={item.id}
                  data-mol-id={`action-item-${item.id}`}
                  className={cm.cn('rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap')}
                  style={{
                    backgroundColor: 'var(--color-background-tertiary)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <button
                    type="button"
                    disabled={saving || item.status === 'done'}
                    onClick={() =>
                      setItemStatus(item, item.status === 'open' ? 'in_progress' : 'done')
                    }
                    data-mol-id={`action-item-advance-${item.id}`}
                    aria-label={t(
                      'postmortemDetail.advanceItem',
                      { description: item.description },
                      { defaultValue: 'Advance "{{description}}"' },
                    )}
                    className={cm.cn(
                      'material-symbols-outlined text-lg shrink-0 disabled:cursor-default',
                    )}
                    style={{
                      color: STATUS_TONE[item.status].color,
                    }}
                  >
                    {item.status === 'done' ? 'check_circle' : 'radio_button_unchecked'}
                  </button>
                  <div className={cm.cn('flex-1 min-w-[10rem]')}>
                    <p
                      className={cm.cn(
                        'text-sm',
                        item.status === 'done' && 'line-through opacity-60',
                      )}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {item.description}
                    </p>
                    <p
                      className={cm.cn('mt-0.5 font-mono text-[11px]')}
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {item.owner_name ??
                        t('postmortemDetail.unowned', {}, { defaultValue: 'unassigned' })}
                      {' · '}
                      {t('postmortemDetail.due', {}, { defaultValue: 'due' })}{' '}
                      {fmtDate(item.due_at)}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      'px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: STATUS_TONE[item.status].bg,
                      color: STATUS_TONE[item.status].color,
                    }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
            <div className={cm.cn('flex gap-2')}>
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className={cm.cn('flex-1 px-3 py-2 rounded-md text-sm outline-none')}
                style={{
                  backgroundColor: 'var(--color-input-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
                placeholder={t(
                  'postmortemDetail.newItemPlaceholder',
                  {},
                  { defaultValue: 'New follow-up item…' },
                )}
                aria-label={t('postmortemDetail.newItem', {}, { defaultValue: 'New action item' })}
                data-mol-id="postmortem-new-item-input"
              />
              <button
                type="button"
                disabled={!newItem.trim() || saving}
                onClick={addItem}
                data-mol-id="postmortem-new-item-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border disabled:opacity-50',
                )}
                style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              >
                {t('common.add', {}, { defaultValue: 'Add' })}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
