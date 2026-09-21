import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { del, get, post, put } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InboxLayout } from '../components/InboxLayout.js'
import { StatusPill } from '../components/StatusPill.js'

interface RuleRow {
  id: string
  name: string
  trigger: string
  conditions: Record<string, unknown> | null
  actions: unknown[] | null
  enabled: boolean
  created_at: string | null
}

interface CannedReply {
  id: string
  shortcut: string
  title: string
  content: string
  created_at: string | null
}

function Toggle({ on }: { on: boolean }) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.roundedFull,
        cm.w(10),
        'h-5 transition-colors',
        on ? 'bg-primary justify-end' : 'bg-surface-hover justify-start',
      )}
    >
      <span className={cm.cn(cm.w(4), cm.h(4), cm.roundedFull, 'bg-surface shadow-sm m-0.5')} />
    </span>
  )
}

/**
 * Two-step destructive button: the first click arms it ("Confirm?"),
 * the second click fires. Disarms itself after ~3s or when the row
 * unmounts — deletes are irreversible, so a single mis-tap must not
 * destroy a rule / canned response.
 */
function ConfirmDeleteButton({
  onConfirm,
  disabled,
  label,
  iconOnly,
}: {
  onConfirm: () => void
  disabled: boolean
  label: string
  iconOnly?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [armed])
  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      disabled={disabled}
      aria-label={armed ? t('common.confirmDelete', {}, { defaultValue: 'Confirm delete' }) : label}
      className={cm.cn(
        iconOnly ? cm.sp('p', 2) : cm.sp('px', 2),
        'py-2.5',
        cm.textSize('xs'),
        armed
          ? 'font-bold text-[color:var(--color-error)] bg-[color:var(--color-error-container)]'
          : 'text-on-surface-variant hover:text-[color:var(--color-error)]',
        'rounded-md transition-colors disabled:opacity-50',
      )}
    >
      {iconOnly ? (
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          {armed ? 'warning' : 'delete'}
        </span>
      ) : armed ? (
        t('common.confirmDelete', {}, { defaultValue: 'Confirm?' })
      ) : (
        label
      )}
    </button>
  )
}

function AutomationsBody() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [rules, setRules] = useState<RuleRow[]>([])
  const [canned, setCanned] = useState<CannedReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [ruleName, setRuleName] = useState('')
  const [ruleTrigger, setRuleTrigger] = useState('inbound_message')
  const [showCannedForm, setShowCannedForm] = useState(false)
  const [cannedShortcut, setCannedShortcut] = useState('')
  const [cannedTitle, setCannedTitle] = useState('')
  const [cannedBody, setCannedBody] = useState('')

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, c] = await Promise.all([
        get<RuleRow[]>('/api/automations'),
        get<CannedReply[]>('/api/canned-responses'),
      ])
      setRules(Array.isArray(r.data) ? r.data : [])
      setCanned(Array.isArray(c.data) ? c.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const toggleRule = async (rule: RuleRow) => {
    setBusy(true)
    setError(null)
    try {
      await put(`/api/automations/${rule.id}`, { enabled: !rule.enabled })
      void track({
        name: 'automation.rule_toggled',
        properties: { rule_id: rule.id, enabled: !rule.enabled },
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle rule')
    } finally {
      setBusy(false)
    }
  }

  const deleteRule = async (rule: RuleRow) => {
    setBusy(true)
    setError(null)
    try {
      await del(`/api/automations/${rule.id}`)
      void track({ name: 'automation.rule_deleted', properties: { rule_id: rule.id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setBusy(false)
    }
  }

  const createRule = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ruleName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const created = await post<{ id: string }>('/api/automations', {
        name: ruleName.trim(),
        trigger: ruleTrigger,
        enabled: true,
      })
      void track({
        name: 'automation.rule_created',
        properties: { rule_id: (created.data as { id?: string })?.id, trigger: ruleTrigger },
      })
      setRuleName('')
      setRuleTrigger('inbound_message')
      setShowRuleForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setBusy(false)
    }
  }

  const deleteCanned = async (item: CannedReply) => {
    setBusy(true)
    setError(null)
    try {
      await del(`/api/canned-responses/${item.id}`)
      void track({ name: 'automation.canned_deleted', properties: { canned_id: item.id } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete canned response')
    } finally {
      setBusy(false)
    }
  }

  const createCanned = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!cannedShortcut.trim() || !cannedBody.trim()) return
    setBusy(true)
    setError(null)
    try {
      const created = await post<{ id: string }>('/api/canned-responses', {
        shortcut: cannedShortcut.trim(),
        title: cannedTitle.trim() || cannedShortcut.trim(),
        content: cannedBody.trim(),
      })
      void track({
        name: 'automation.canned_created',
        properties: { canned_id: (created.data as { id?: string })?.id },
      })
      setCannedShortcut('')
      setCannedTitle('')
      setCannedBody('')
      setShowCannedForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create canned response')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('automations.eyebrow', {}, { defaultValue: 'Workflow studio' })}
        </span>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('automations.heading', {}, { defaultValue: 'Automations' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'automations.subheading',
            {},
            {
              defaultValue:
                'Rules, canned responses and chatbots — keep the workspace humming while your team focuses on the hard stuff.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)]',
          )}
        >
          {error}
        </div>
      ) : null}

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('automations.rulesTitle', {}, { defaultValue: 'Rules' })}
          </h2>
          <button
            type="button"
            onClick={() => setShowRuleForm((v) => !v)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'rounded-md bg-primary/10 text-primary-dark hover:bg-primary/15 transition-colors',
            )}
          >
            {showRuleForm
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('automations.newRule', {}, { defaultValue: '+ New rule' })}
          </button>
        </header>
        {showRuleForm ? (
          <form
            onSubmit={createRule}
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ direction: 'col', gap: 3 }),
              'rounded-xl bg-surface border border-[color:var(--color-border)]',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                'md:flex-row md:items-center',
              )}
            >
              <input
                type="text"
                required
                placeholder={t('automations.ruleName', {}, { defaultValue: 'Rule name' })}
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full md:flex-1 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
                )}
              />
              <select
                value={ruleTrigger}
                onChange={(e) => setRuleTrigger(e.target.value)}
                aria-label={t('automations.triggerLabel', {}, { defaultValue: 'Trigger' })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full md:w-auto rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
                )}
              >
                <option value="inbound_message">
                  {t('automations.trigger.inboundMessage', {}, { defaultValue: 'Inbound message' })}
                </option>
                <option value="conversation_resolved">
                  {t(
                    'automations.trigger.conversationResolved',
                    {},
                    { defaultValue: 'Conversation resolved' },
                  )}
                </option>
                <option value="wait_time_exceeded">
                  {t(
                    'automations.trigger.waitTimeExceeded',
                    {},
                    { defaultValue: 'Wait time exceeded' },
                  )}
                </option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-lg bg-primary text-on-primary disabled:opacity-50',
                )}
              >
                {t('automations.saveRule', {}, { defaultValue: 'Save rule' })}
              </button>
            </div>
          </form>
        ) : null}
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          {loading ? (
            <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </li>
          ) : rules.length === 0 ? (
            <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('automations.noRules', {}, { defaultValue: 'No automation rules yet.' })}
            </li>
          ) : (
            rules.map((rule) => (
              <li
                key={rule.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 4 }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface border border-[color:var(--color-border)] hover:border-primary/40 transition-colors',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                      {rule.name}
                    </span>
                    <StatusPill variant={rule.enabled ? 'online' : 'offline'} />
                  </div>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('automations.triggerLabel', {}, { defaultValue: 'Trigger' })}
                    </span>{' '}
                    · {rule.trigger}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), 'shrink-0')}>
                  <button
                    type="button"
                    onClick={() => void toggleRule(rule)}
                    disabled={busy}
                    className={cm.cn(
                      cm.sp('px', 2),
                      'py-2.5 cursor-pointer disabled:opacity-50',
                      cm.flex({ align: 'center' }),
                    )}
                    aria-label={
                      rule.enabled
                        ? t('automations.disable', {}, { defaultValue: 'Disable' })
                        : t('automations.enable', {}, { defaultValue: 'Enable' })
                    }
                  >
                    <Toggle on={rule.enabled} />
                  </button>
                  <ConfirmDeleteButton
                    onConfirm={() => void deleteRule(rule)}
                    disabled={busy}
                    label={t('common.delete', {}, { defaultValue: 'Delete' })}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('automations.cannedTitle', {}, { defaultValue: 'Canned responses' })}
          </h2>
          <button
            type="button"
            onClick={() => setShowCannedForm((v) => !v)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'rounded-md bg-primary/10 text-primary-dark hover:bg-primary/15 transition-colors',
            )}
          >
            {showCannedForm
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('automations.newCanned', {}, { defaultValue: '+ New canned' })}
          </button>
        </header>
        {showCannedForm ? (
          <form
            onSubmit={createCanned}
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ direction: 'col', gap: 3 }),
              'rounded-xl bg-surface border border-[color:var(--color-border)]',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), 'md:flex-row')}>
              <input
                type="text"
                required
                placeholder={t('automations.shortcut', {}, { defaultValue: '/shortcut' })}
                value={cannedShortcut}
                onChange={(e) => setCannedShortcut(e.target.value)}
                aria-label={t('automations.shortcut', {}, { defaultValue: 'Shortcut' })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full md:w-32 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface font-mono',
                )}
              />
              <input
                type="text"
                placeholder={t(
                  'automations.cannedTitlePlaceholder',
                  {},
                  { defaultValue: 'Title (optional)' },
                )}
                value={cannedTitle}
                onChange={(e) => setCannedTitle(e.target.value)}
                aria-label={t('automations.cannedTitlePlaceholder', {}, { defaultValue: 'Title' })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-full md:flex-1 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
                )}
              />
            </div>
            <textarea
              rows={3}
              required
              aria-label={t(
                'automations.cannedBodyPlaceholder',
                {},
                { defaultValue: 'Reply body' },
              )}
              placeholder={t(
                'automations.cannedBodyPlaceholder',
                {},
                { defaultValue: 'Reply body' },
              )}
              value={cannedBody}
              onChange={(e) => setCannedBody(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
              )}
            />
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <button
                type="submit"
                disabled={busy}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-lg bg-primary text-on-primary disabled:opacity-50',
                )}
              >
                {t('automations.saveCanned', {}, { defaultValue: 'Save canned response' })}
              </button>
            </div>
          </form>
        ) : null}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 3 }), 'md:grid-cols-3')}>
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : canned.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('automations.noCanned', {}, { defaultValue: 'No canned responses yet.' })}
            </p>
          ) : (
            canned.map((c) => (
              <div
                key={c.id}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 2 }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface border border-[color:var(--color-border)]',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 2),
                      cm.roundedFull,
                      'text-[10px] uppercase tracking-widest bg-secondary/15 text-secondary py-0.5 font-mono',
                    )}
                  >
                    {c.shortcut}
                  </span>
                  <ConfirmDeleteButton
                    onConfirm={() => void deleteCanned(c)}
                    disabled={busy}
                    label={t('common.delete', {}, { defaultValue: 'Delete' })}
                    iconOnly
                  />
                </div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{c.title}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function Automations() {
  return <InboxLayout main={<AutomationsBody />} />
}

export default Automations
export { Automations, Automations as AutomationsPage }
