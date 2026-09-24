import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, Switch } from '@molecule/app-ui-react'

import { CalciteKpiTile } from '../components/CalciteKpiTile.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface AutomationRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  trigger: Record<string, unknown> & { type?: string; event?: string }
  action: Record<string, unknown> & { type?: string; kind?: string }
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SpreadsheetSummary {
  id: string
  title: string
}

const HEALTH_TINT = {
  healthy: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'Active',
    labelKey: 'automations.status.active',
  },
  paused: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    label: 'Paused',
    labelKey: 'automations.status.paused',
  },
}

function describeTrigger(trigger: AutomationRow['trigger']): string {
  return String(trigger.type ?? trigger.event ?? 'event')
}

function describeAction(action: AutomationRow['action']): string {
  return String(action.type ?? action.kind ?? 'noop')
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function Automations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [items, setItems] = useState<AutomationRow[]>([])
  const [workbooks, setWorkbooks] = useState<SpreadsheetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [triggerType, setTriggerType] = useState('row.created')
  const [actionKind, setActionKind] = useState<'email' | 'webhook' | 'noop'>('noop')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [autoRes, sheetsRes] = await Promise.all([
          http.get<AutomationRow[]>('/automations'),
          http.get<SpreadsheetSummary[]>('/spreadsheets'),
        ])
        if (cancelled) return
        setItems(Array.isArray(autoRes.data) ? autoRes.data : [])
        const wbs = Array.isArray(sheetsRes.data) ? sheetsRes.data : []
        setWorkbooks(wbs)
        if (wbs.length && !spreadsheetId) setSpreadsheetId(wbs[0]!.id)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // spreadsheetId intentionally omitted: only seed from workbooks on mount; form state manages it

  async function toggleActive(item: AutomationRow, next: boolean): Promise<void> {
    try {
      await http.patch(`/automations/${item.id}`, { is_active: next })
      setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_active: next } : a)))
      track({
        name: 'automation.toggled',
        properties: { automation_id: item.id, active: next },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function deleteItem(item: AutomationRow): Promise<void> {
    try {
      await http.delete(`/automations/${item.id}`)
      setItems((prev) => prev.filter((a) => a.id !== item.id))
      track({ name: 'automation.deleted', properties: { automation_id: item.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function createAutomation(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!name.trim() || !spreadsheetId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post<AutomationRow>('/automations', {
        spreadsheet_id: spreadsheetId,
        name: name.trim(),
        trigger: { type: triggerType },
        action: { type: actionKind },
        is_active: true,
      })
      if (res.data) {
        setItems((prev) => [res.data!, ...prev])
        track({ name: 'automation.created', properties: { automation_id: res.data.id } })
      }
      setName('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const activeCount = items.filter((a) => a.is_active).length
  const pausedCount = items.length - activeCount

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p className={cm.cn('text-[10px] uppercase tracking-[0.25em] font-bold text-primary')}>
            {t('automations.eyebrow', {}, { defaultValue: 'When-this-then-that · no-code' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('automations.headline', {}, { defaultValue: 'Automations' })}
          </h1>
          <p
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('lg'),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {t(
              'automations.subhead',
              {},
              {
                defaultValue:
                  'Triggers and actions across every workbook. Each run logs a row you can audit later.',
              },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          type="button"
          disabled={workbooks.length === 0}
          className={
            'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50'
          }
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add_circle
          </span>
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('automations.newAutomation', {}, { defaultValue: 'New automation' })}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'text-sm text-error bg-error-container/40 rounded-2xl')}
        >
          {error}
        </div>
      )}

      {showForm && workbooks.length > 0 && (
        <form
          onSubmit={createAutomation}
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
          )}
          data-testid="automation-form"
        >
          <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }))}>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t(
                  'automations.namePlaceholder',
                  {},
                  { defaultValue: 'Daily snapshot' },
                )}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('automations.field.workbook', {}, { defaultValue: 'Workbook' })}
              </span>
              <select
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {workbooks.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('automations.field.trigger', {}, { defaultValue: 'Trigger' })}
              </span>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="row.created">
                  {t('automations.trigger.rowCreated', {}, { defaultValue: 'Row created' })}
                </option>
                <option value="row.updated">
                  {t('automations.trigger.rowUpdated', {}, { defaultValue: 'Row updated' })}
                </option>
                <option value="schedule.daily">
                  {t('automations.trigger.dailySchedule', {}, { defaultValue: 'Daily schedule' })}
                </option>
              </select>
            </label>
            <label className={cm.cn(cm.stack(1))}>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {t('automations.field.action', {}, { defaultValue: 'Action' })}
              </span>
              <select
                value={actionKind}
                onChange={(e) => setActionKind(e.target.value as 'email' | 'webhook' | 'noop')}
                className="px-3 py-2 text-sm bg-surface-container-low rounded-md border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="email">
                  {t('automations.action.email', {}, { defaultValue: 'Email' })}
                </option>
                <option value="webhook">
                  {t('automations.action.webhook', {}, { defaultValue: 'Webhook' })}
                </option>
                <option value="noop">
                  {t('automations.action.noop', {}, { defaultValue: 'No-op' })}
                </option>
              </select>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('mt', 4))}>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-primary rounded-full bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.create', {}, { defaultValue: 'Create' })}
            </button>
          </div>
        </form>
      )}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <CalciteKpiTile
          icon="bolt"
          accent="primary"
          label={t('status.active', {}, { defaultValue: 'Active' })}
          value={activeCount}
        />
        <CalciteKpiTile
          icon="pause_circle"
          accent="warning"
          label={t('status.paused', {}, { defaultValue: 'Paused' })}
          value={pausedCount}
        />
        <CalciteKpiTile
          icon="grid_on"
          accent="info"
          label={t('automations.kpi.workbooksLabel', {}, { defaultValue: 'Workbooks' })}
          value={workbooks.length}
        />
        <CalciteKpiTile
          icon="schedule"
          accent="success"
          label={t('automations.kpi.totalLabel', {}, { defaultValue: 'Total automations' })}
          value={items.length}
        />
      </div>

      <div
        className={
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden'
        }
      >
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-b border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('automations.list.headline', {}, { defaultValue: 'Workspace automations' })}
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
            {t(
              'automations.list.count',
              { count: items.length },
              { defaultValue: '{{count}} configured' },
            )}
          </span>
        </header>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : items.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(2))}>
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('automations.empty.headline', {}, { defaultValue: 'No automations yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {workbooks.length === 0
                ? t(
                    'automations.empty.needsWorkbook',
                    {},
                    { defaultValue: 'Create a workbook first to add automations.' },
                  )
                : t(
                    'automations.empty.subhead',
                    {},
                    { defaultValue: 'Hit "New automation" to wire a trigger to an action.' },
                  )}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/40" data-testid="automations-list">
            {items.map((a) => {
              const tint = a.is_active ? HEALTH_TINT.healthy : HEALTH_TINT.paused
              return (
                <li
                  key={a.id}
                  data-testid={`automation-${a.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                    'group hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      'rounded-xl bg-primary-fixed text-primary shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">bolt</span>
                  </span>
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <p className="font-bold text-on-surface truncate">{a.name}</p>
                    <p className={'text-sm text-on-surface-variant truncate font-mono'}>
                      <span className="text-primary">{describeTrigger(a.trigger)}</span>
                      {' → '}
                      {describeAction(a.action)}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0',
                      tint.bg,
                      tint.text,
                    )}
                  >
                    {t(tint.labelKey, {}, { defaultValue: tint.label })}
                  </span>
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'end' }),
                      'shrink-0 text-right',
                    )}
                  >
                    <span className={'text-xs font-bold text-on-surface tabular-nums'}>
                      {relativeTime(a.updated_at)}
                    </span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">
                      {t('automations.lastUpdated', {}, { defaultValue: 'Last updated' })}
                    </span>
                  </div>
                  <Switch
                    checked={a.is_active}
                    onChange={(e) => void toggleActive(a, (e.target as HTMLInputElement).checked)}
                    aria-label={t(
                      'automations.toggle',
                      { name: a.name },
                      { defaultValue: 'Toggle {{name}}' },
                    )}
                    data-testid={`toggle-${a.id}`}
                  />
                  <ConfirmButton
                    label={
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        delete
                      </span>
                    }
                    confirmLabel={t(
                      'automations.confirmDelete',
                      { name: a.name },
                      { defaultValue: 'Delete "{{name}}"?' },
                    )}
                    disarmSeconds={6}
                    onConfirm={() => deleteItem(a)}
                    aria-label={t(
                      'automations.delete',
                      { name: a.name },
                      { defaultValue: 'Delete {{name}}' },
                    )}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </WorkbenchLayout>
  )
}

export default Automations
