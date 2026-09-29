import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

type Severity = 'high' | 'med' | 'low' | 'info' | 'warning'

interface CustomRuleRow {
  id: string
  name: string
  description: string | null
  language: string
  pattern: string
  severity: Severity
  enabled: boolean
}

const SEVERITY_OPTIONS: ReadonlyArray<Severity> = ['high', 'med', 'low', 'info', 'warning']

const SEVERITY_TINT: Record<Severity, string> = {
  high: 'bg-red-500/15 text-error',
  med: 'bg-amber-500/15 text-warning',
  low: 'bg-violet-500/15 text-violet-600',
  warning: 'bg-amber-500/15 text-warning',
  info: 'bg-cyan-500/15 text-cyan-600',
}

interface NewRuleDraft {
  name: string
  description: string
  language: string
  pattern: string
  severity: Severity
}

const EMPTY_DRAFT: NewRuleDraft = {
  name: '',
  description: '',
  language: 'any',
  pattern: '',
  severity: 'warning',
}

export function RulesEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rules, setRules] = useState<CustomRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<CustomRuleRow>>>({})
  const [draft, setDraft] = useState<NewRuleDraft>(EMPTY_DRAFT)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/custom-rules')
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setRules(unwrapList<CustomRuleRow>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('rulesEditor.loadError', {}, { defaultValue: 'Failed to load rules.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules])

  const queueChange = (id: string, change: Partial<CustomRuleRow>) => {
    setPendingChanges((prev) => ({ ...prev, [id]: { ...prev[id], ...change } }))
  }

  const toggle = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
    const next = rules.find((r) => r.id === id)
    if (next) queueChange(id, { enabled: !next.enabled })
  }

  const setSeverity = (id: string, severity: Severity) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, severity } : r)))
    queueChange(id, { severity })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const ids = Object.keys(pendingChanges)
      await Promise.all(ids.map((id) => http.put(`/api/custom-rules/${id}`, pendingChanges[id])))
      track({
        name: 'rule.updated',
        properties: { rule_count: ids.length },
      })
      setPendingChanges({})
      setSavedAt(new Date().toISOString())
    } catch (err) {
      console.error('[rules-editor] save failed', err)
      setError(t('rulesEditor.saveError', {}, { defaultValue: 'Failed to save policy.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    const previous = rules
    setRules((prev) => prev.filter((r) => r.id !== id))
    try {
      await http.delete(`/api/custom-rules/${id}`)
      track({
        name: 'rule.deleted',
        properties: { rule_id: id },
      })
    } catch (err) {
      console.error('[rules-editor] delete failed', err)
      setRules(previous)
      setError(t('rulesEditor.deleteError', {}, { defaultValue: 'Failed to delete rule.' }))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    if (!draft.name.trim() || !draft.pattern.trim()) {
      setCreateError(
        t('rulesEditor.createMissing', {}, { defaultValue: 'Name and pattern are required.' }),
      )
      return
    }
    try {
      new RegExp(draft.pattern)
    } catch (_error) {
      // SyntaxError from invalid regex is the expected signal; error message is shown to user below
      setCreateError(
        t(
          'rulesEditor.invalidRegex',
          {},
          { defaultValue: 'Pattern must be a valid regular expression.' },
        ),
      )
      return
    }
    setCreating(true)
    try {
      const res = await http.post('/api/custom-rules', {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        language: draft.language.trim() || 'any',
        pattern: draft.pattern,
        severity: draft.severity,
        enabled: true,
      })
      const created = unwrapSingle<CustomRuleRow>(res)
      if (created) {
        setRules((prev) => [created, ...prev])
      } else {
        const refreshed = await http.get('/api/custom-rules').catch(() => null)
        setRules(unwrapList<CustomRuleRow>(refreshed))
      }
      setDraft(EMPTY_DRAFT)
      track({
        name: 'rule.created',
        properties: {
          rule_id: created?.id,
          language: draft.language.trim() || 'any',
          severity: draft.severity,
        },
      })
    } catch (err) {
      console.error('[rules-editor] create failed', err)
      const message = err instanceof Error ? err.message : ''
      setCreateError(
        message.includes('Invalid')
          ? t(
              'rulesEditor.invalidRegex',
              {},
              { defaultValue: 'Pattern must be a valid regular expression.' },
            )
          : t('rulesEditor.createError', {}, { defaultValue: 'Failed to create rule.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const dirty = Object.keys(pendingChanges).length > 0

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {t(
              'rulesEditor.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · review policy' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('rulesEditor.heading', {}, { defaultValue: 'Rules' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'rulesEditor.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Curate the lint rules {{appName}} enforces and tune severities per category.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={handleSave}
          data-mol-id="rules-save-btn"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('rulesEditor.saveCta', {}, { defaultValue: 'Save policy' })}
        </button>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')} data-mol-id="rules-error">
          {error}
        </p>
      ) : null}

      {savedAt ? (
        <p
          className={cm.cn(cm.textSize('xs'), 'text-success font-mono')}
          data-mol-id="rules-saved-at"
        >
          {t(
            'rulesEditor.savedAt',
            { time: new Date(savedAt).toLocaleTimeString() },
            { defaultValue: 'Saved {{time}}' },
          )}
        </p>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 5),
          'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        )}
        aria-labelledby="rules-create-heading"
      >
        <h2
          id="rules-create-heading"
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            'tracking-tight',
          )}
        >
          {t('rulesEditor.createHeading', {}, { defaultValue: 'New rule' })}
        </h2>
        <form onSubmit={handleCreate} className={cm.stack(3)} data-mol-id="rules-create-form">
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-3')}>
            <label className={cm.cn(cm.stack(1), cm.textSize('xs'))}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                required
                data-mol-id="rules-new-name"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md border border-outline-variant/40 bg-surface text-sm text-on-surface focus:border-primary focus:outline-none',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), cm.textSize('xs'))}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </span>
              <input
                type="text"
                value={draft.language}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
                placeholder="any | typescript | python …"
                data-mol-id="rules-new-language"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md border border-outline-variant/40 bg-surface text-sm text-on-surface focus:border-primary focus:outline-none',
                )}
              />
            </label>
          </div>
          <label className={cm.cn(cm.stack(1), cm.textSize('xs'))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('rulesEditor.field.pattern', {}, { defaultValue: 'Regex pattern' })}
            </span>
            <input
              type="text"
              value={draft.pattern}
              onChange={(e) => setDraft((d) => ({ ...d, pattern: e.target.value }))}
              required
              spellCheck={false}
              data-mol-id="rules-new-pattern"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md border border-outline-variant/40 bg-surface font-mono text-sm text-on-surface focus:border-primary focus:outline-none',
              )}
            />
          </label>
          <label className={cm.cn(cm.stack(1), cm.textSize('xs'))}>
            <span
              className={cm.cn(
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant font-mono',
              )}
            >
              {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
            </span>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              data-mol-id="rules-new-description"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md border border-outline-variant/40 bg-surface text-sm text-on-surface focus:border-primary focus:outline-none',
              )}
            />
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
            <div
              className={cm.cn(cm.flex({ gap: 'xs', wrap: 'wrap' }))}
              role="group"
              aria-label={t('rulesEditor.field.severity', {}, { defaultValue: 'Severity' })}
            >
              {SEVERITY_OPTIONS.map((sev) => {
                const active = draft.severity === sev
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, severity: sev }))}
                    aria-pressed={active}
                    className={cm.cn(
                      'px-3 min-h-[40px] text-[10px] font-extrabold uppercase tracking-widest font-mono rounded-md transition-all',
                      active
                        ? `${SEVERITY_TINT[sev]} ring-2 ring-current/40`
                        : 'text-on-surface-variant hover:bg-surface-container-low',
                    )}
                  >
                    {t(`rulesEditor.severity.${sev}`, {}, { defaultValue: sev })}
                  </button>
                )
              })}
            </div>
            <button
              type="submit"
              disabled={creating}
              data-mol-id="rules-create-btn"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'ml-auto rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50',
              )}
            >
              {creating
                ? t('rulesEditor.creating', {}, { defaultValue: 'Creating…' })
                : t('rulesEditor.createCta', {}, { defaultValue: 'Add rule' })}
            </button>
          </div>
          {createError ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-mol-id="rules-create-error">
              {createError}
            </p>
          ) : null}
        </form>
      </section>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : rules.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}
          data-mol-id="rules-empty"
        >
          {t(
            'rulesEditor.empty',
            {},
            { defaultValue: 'No custom rules yet — use the form above to add your first one.' },
          )}
        </p>
      ) : (
        <section
          className={cm.cn(
            cm.sp('p', 5),
            cm.accentCard({ tone: 'custom' }),
            'rounded-2xl bg-surface-container-lowest shadow-sm',
          )}
          style={{ ['--mol-accent' as string]: 'var(--color-violet-500)' }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
            <span
              className="material-symbols-outlined text-on-surface-variant text-[20px]"
              aria-hidden="true"
            >
              gavel
            </span>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t('rulesEditor.allRulesHeading', {}, { defaultValue: 'Custom rules' })}
            </h2>
            <span
              className={cm.cn('ml-auto text-xs font-mono text-on-surface-variant')}
              data-mol-id="rules-enabled-count"
            >
              {t(
                'rulesEditor.enabledCount',
                { on: enabledRules.length, total: rules.length },
                { defaultValue: '{{on}} / {{total}} enabled' },
              )}
            </span>
          </div>
          <ul className={cm.stack(3)} data-mol-id="rules-list">
            {rules.map((r) => (
              <li
                key={r.id}
                data-mol-id="rule-row"
                data-rule-id={r.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  cm.sp('p', 3),
                  'rounded-lg border border-outline-variant/40 bg-surface',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-pressed={r.enabled}
                  data-mol-id="rule-toggle"
                  aria-label={
                    r.enabled
                      ? t('rulesEditor.disableRule', {}, { defaultValue: 'Disable rule' })
                      : t('rulesEditor.enableRule', {}, { defaultValue: 'Enable rule' })
                  }
                  className={cm.cn(
                    'shrink-0 w-12 h-7 rounded-full relative transition-colors',
                    r.enabled ? 'bg-primary' : 'bg-surface-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      'absolute top-1 w-5 h-5 rounded-full bg-surface shadow transition-transform',
                    )}
                    style={{ left: r.enabled ? 'calc(100% - 1.5rem)' : '0.25rem' }}
                  />
                </button>
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                    data-mol-id="rule-name"
                  >
                    {r.name}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {r.description ?? r.pattern}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ gap: 'xs', wrap: 'wrap' }), 'shrink-0')}>
                  {SEVERITY_OPTIONS.map((sev) => {
                    const active = r.severity === sev
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(r.id, sev)}
                        aria-pressed={active}
                        className={cm.cn(
                          'px-3 min-h-[40px] text-[10px] font-extrabold uppercase tracking-widest font-mono rounded-md transition-all',
                          active
                            ? `${SEVERITY_TINT[sev]} ring-2 ring-current/40`
                            : 'text-on-surface-variant hover:bg-surface-container-low',
                        )}
                      >
                        {t(`rulesEditor.severity.${sev}`, {}, { defaultValue: sev })}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  aria-label={t('rulesEditor.deleteRule', {}, { defaultValue: 'Delete rule' })}
                  data-mol-id="rule-delete"
                  className={cm.cn(
                    'shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:bg-red-500/10 hover:text-error transition-colors',
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    delete
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
