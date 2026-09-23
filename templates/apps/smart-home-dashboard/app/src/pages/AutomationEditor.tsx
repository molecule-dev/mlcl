import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface AutomationRecord {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  trigger?: { type?: string; value?: unknown; label?: string; description?: string } | null
  actions?: ReadonlyArray<{ type: string; target?: string; payload?: Record<string, unknown> }>
}

const TRIGGER_TYPES = ['time', 'device', 'event'] as const

type TriggerType = (typeof TRIGGER_TYPES)[number]

function unwrap(payload: unknown): AutomationRecord | null {
  if (!payload || typeof payload !== 'object') return null
  if ('id' in payload && typeof (payload as { id: unknown }).id === 'string') {
    return payload as AutomationRecord
  }
  if ('data' in payload && (payload as { data?: unknown }).data) {
    const inner = (payload as { data: unknown }).data
    if (inner && typeof inner === 'object' && 'id' in inner) return inner as AutomationRecord
  }
  return null
}

function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch (_error) {
      // intentional noop — invalid JSON falls back to the provided default
      return fallback
    }
  }
  if (value && typeof value === 'object') return value as T
  return fallback
}

export function AutomationEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('time')
  const [triggerValue, setTriggerValue] = useState('')
  const [actionType, setActionType] = useState('notify')
  const [actionTarget, setActionTarget] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/automations/${id}`)
      .then((payload) => {
        if (cancelled) return
        const automation = unwrap(payload)
        if (!automation) {
          setError(t('automationEditor.notFound', {}, { defaultValue: 'Automation not found.' }))
          return
        }
        setName(automation.name || '')
        setDescription(automation.description || '')
        setEnabled(Boolean(automation.enabled))
        const trigger = parseJSON<{ type?: string; value?: unknown }>(automation.trigger, {
          type: 'time',
        })
        setTriggerType((trigger.type as TriggerType) || 'time')
        setTriggerValue(
          trigger.value == null
            ? ''
            : typeof trigger.value === 'string'
              ? trigger.value
              : JSON.stringify(trigger.value),
        )
        const actions = parseJSON<Array<{ type: string; target?: string }>>(automation.actions, [])
        const first = actions[0]
        if (first) {
          setActionType(first.type)
          setActionTarget(first.target || '')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('automationEditor.loadError', {}, { defaultValue: 'Failed to load automation.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, isNew, t])

  const buildPayload = useCallback(() => {
    return {
      name: name.trim(),
      description: description.trim(),
      enabled,
      trigger: {
        type: triggerType,
        value: triggerValue.trim() || null,
      },
      actions: [
        {
          type: actionType.trim() || 'notify',
          target: actionTarget.trim() || undefined,
        },
      ],
    }
  }, [actionTarget, actionType, description, enabled, name, triggerType, triggerValue])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(
        t('automationEditor.nameRequired', {}, { defaultValue: 'Give the automation a name.' }),
      )
      return
    }
    setError(null)
    setInfo(null)
    setSaving(true)
    try {
      const body = buildPayload()
      if (isNew) {
        const response = await http.post('/api/automations', body)
        const created = unwrap(response)
        if (created?.id) {
          track({ name: 'automation.created', properties: { automation_id: created.id } })
          navigate('/automations')
        }
      } else {
        await http.put(`/api/automations/${id}`, body)
        setInfo(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('automationEditor.saveError', {}, { defaultValue: 'Could not save automation.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (isNew || !id) {
      setError(
        t(
          'automationEditor.testNew',
          {},
          { defaultValue: 'Save the automation first to test it.' },
        ),
      )
      return
    }
    setTesting(true)
    setError(null)
    setInfo(null)
    try {
      await http.post(`/api/automations/${id}/trigger`, {})
      track({
        name: 'automation.triggered',
        properties: { automation_id: id, source: 'editor-test' },
      })
      setInfo(t('automationEditor.tested', {}, { defaultValue: 'Test trigger fired.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('automationEditor.testError', {}, { defaultValue: 'Test failed.' }),
      )
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <Link
          to="/automations"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            chevron_left
          </span>
          {t('automationEditor.back', {}, { defaultValue: 'All automations' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {isNew
            ? t('automationEditor.newHeading', {}, { defaultValue: 'New automation' })
            : t('automationEditor.editHeading', {}, { defaultValue: 'Edit automation' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'automationEditor.subheading',
            {},
            {
              defaultValue: 'Pick a trigger, the action it should fire, and Save to wire it up.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      ) : null}

      {info ? (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-success-container text-on-success-container text-sm',
          )}
        >
          {info}
        </div>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 6), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <form
          aria-label={t('automationEditor.formLabel', {}, { defaultValue: 'Automation editor' })}
          onSubmit={handleSubmit}
          className={cm.cn(cm.sp('p', 6), cm.stack(5), 'bg-surface-container-lowest rounded-2xl')}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="automation-name"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="automation-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t(
                'automationEditor.placeholder.name',
                {},
                { defaultValue: 'Sunset porch lights' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
              )}
            />
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="automation-description"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.description', {}, { defaultValue: 'Description' })}
            </label>
            <textarea
              id="automation-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t(
                'automationEditor.placeholder.description',
                {},
                { defaultValue: 'Warm porch lights at 60% from sunset to midnight.' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
              )}
            />
          </div>

          <fieldset className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <legend
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('automationEditor.field.trigger', {}, { defaultValue: 'Trigger' })}
            </legend>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
              <select
                id="automation-trigger-type"
                name="trigger_type"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
                )}
              >
                {TRIGGER_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`automationEditor.triggerType.${opt}`, {}, { defaultValue: opt })}
                  </option>
                ))}
              </select>
              <input
                id="automation-trigger-value"
                name="trigger_value"
                type="text"
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder={t(
                  'automationEditor.placeholder.triggerValue',
                  {},
                  { defaultValue: 'sunset, 06:45, motion-living-room…' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
                )}
              />
            </div>
          </fieldset>

          <fieldset className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <legend
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('automationEditor.field.action', {}, { defaultValue: 'Action' })}
            </legend>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
              <input
                id="automation-action-type"
                name="action_type"
                type="text"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                required
                placeholder={t(
                  'automationEditor.placeholder.actionType',
                  {},
                  { defaultValue: 'set_state, scene_activate, notify…' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
                )}
              />
              <input
                id="automation-action-target"
                name="action_target"
                type="text"
                value={actionTarget}
                onChange={(e) => setActionTarget(e.target.value)}
                placeholder={t(
                  'automationEditor.placeholder.actionTarget',
                  {},
                  { defaultValue: 'Device id or scene name' },
                )}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
                )}
              />
            </div>
          </fieldset>

          <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
            <input
              type="checkbox"
              name="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className={cm.cn(cm.w(4), cm.h(4))}
            />
            <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('automationEditor.field.enabled', {}, { defaultValue: 'Enabled' })}
            </span>
          </label>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || isNew}
              data-testid="automation-test"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.roundedFull,
                'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50',
              )}
            >
              {testing
                ? t('automationEditor.testing', {}, { defaultValue: 'Testing…' })
                : t('automationEditor.test', {}, { defaultValue: 'Test now' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="automation-save"
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.roundedFull,
                'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : isNew
                  ? t('automationEditor.create', {}, { defaultValue: 'Create automation' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
