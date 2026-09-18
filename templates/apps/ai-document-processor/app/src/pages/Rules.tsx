import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type DocumentType, DocumentTypeBadge } from '../components/DocumentTypeBadge.js'
import { unwrapList } from '../lib/unwrap.js'

interface FilingRule {
  id: string
  name: string
  matchedType: DocumentType
  conditions: string[]
  action: string
  destination: string
  enabled: boolean
  matched_count_30d: number
}

interface ExtractionTemplate {
  id: string
  name: string
  type: DocumentType
  fields: string[]
  last_used: string
}

interface RuleDraft {
  name: string
  matchedType: DocumentType
  destination: string
}

const DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'receipt',
  'contract',
  'form',
  'report',
  'identification',
  'letter',
  'other',
]

const EMPTY_DRAFT: RuleDraft = {
  name: '',
  matchedType: 'invoice',
  destination: '',
}

export function Rules() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rules, setRules] = useState<FilingRule[]>([])
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewRule, setShowNewRule] = useState(false)
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/extraction-rules').catch(() => null),
      http.get('/api/extraction-templates').catch(() => null),
    ])
      .then(([rRes, tRes]) => {
        if (cancelled) return
        setRules(unwrapList<FilingRule>(rRes))
        setTemplates(unwrapList<ExtractionTemplate>(tRes))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('rules.loadError', {}, { defaultValue: 'Failed to load rules.' }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const toggle = async (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return
    const next = !rule.enabled
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: next } : r)))
    try {
      await http.patch(`/api/extraction-rules/${id}`, { enabled: next })
    } catch (_error) {
      // Optimistic update: roll back on failure; error detail not needed
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !next } : r)))
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim() || !draft.destination.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await http.post('/api/extraction-rules', {
        name: draft.name,
        matchedType: draft.matchedType,
        destination: draft.destination,
        enabled: true,
      })
      const created = res?.data as FilingRule | undefined
      if (created) {
        setRules((prev) => [created, ...prev])
      } else {
        setRules((prev) => [
          {
            id: `local-${Date.now()}`,
            name: draft.name,
            matchedType: draft.matchedType,
            conditions: [`classification = ${draft.matchedType}`],
            action: 'File to',
            destination: draft.destination,
            enabled: true,
            matched_count_30d: 0,
          },
          ...prev,
        ])
      }
      setDraft(EMPTY_DRAFT)
      setShowNewRule(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('rules.saveError', {}, { defaultValue: 'Failed to save rule.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      data-mol-id="rules-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('rules.eyebrow', {}, { defaultValue: 'Automation' })}
        </p>
        <div
          className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
        >
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('rules.heading', {}, { defaultValue: 'Filing rules' })}
          </h1>
          <button
            type="button"
            data-mol-id="rules-new"
            onClick={() => setShowNewRule((v) => !v)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-2',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 18 }}
              aria-hidden="true"
            >
              {showNewRule ? 'close' : 'add'}
            </span>
            {showNewRule
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('rules.newRule', {}, { defaultValue: 'New rule' })}
          </button>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'rules.subheading',
            {},
            {
              defaultValue:
                'Tell the system where each kind of document should go. Conditions chain top-to-bottom — first match wins.',
            },
          )}
        </p>
        {error ? (
          <p
            data-mol-id="rules-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'text-error')}
          >
            {error}
          </p>
        ) : null}
      </header>

      {showNewRule ? (
        <form
          data-mol-id="rules-new-form"
          onSubmit={handleCreateRule}
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm space-y-4',
          )}
        >
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant font-bold',
                )}
              >
                {t('rules.form.name', {}, { defaultValue: 'Rule name' })}
              </span>
              <input
                data-mol-id="rules-form-name"
                type="text"
                required
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md border border-outline-variant bg-surface-container-low',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant font-bold',
                )}
              >
                {t('rules.form.type', {}, { defaultValue: 'Document type' })}
              </span>
              <select
                data-mol-id="rules-form-type"
                value={draft.matchedType}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, matchedType: e.target.value as DocumentType }))
                }
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md border border-outline-variant bg-surface-container-low',
                )}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant font-bold',
                )}
              >
                {t('rules.form.destination', {}, { defaultValue: 'File to' })}
              </span>
              <input
                data-mol-id="rules-form-destination"
                type="text"
                required
                value={draft.destination}
                onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-md border border-outline-variant bg-surface-container-low',
                )}
              />
            </label>
          </div>
          <button
            type="submit"
            data-mol-id="rules-form-submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary font-semibold disabled:opacity-60',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('rules.form.save', {}, { defaultValue: 'Save rule' })}
          </button>
        </form>
      ) : null}

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
          {t('rules.activeHeading', {}, { defaultValue: 'Active rules' })}
        </h2>
        {loading ? (
          <p
            data-mol-id="rules-loading"
            className={cm.cn(cm.sp('py', 6), 'text-on-surface-variant text-sm')}
          >
            {t('rules.loading', {}, { defaultValue: 'Loading rules…' })}
          </p>
        ) : rules.length === 0 ? (
          <p
            data-mol-id="rules-empty"
            className={cm.cn(cm.sp('py', 6), 'text-on-surface-variant text-sm')}
          >
            {t(
              'rules.empty',
              {},
              { defaultValue: 'No filing rules yet. Use New rule to add one.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {rules.map((rule) => (
              <article
                key={rule.id}
                data-mol-id={`rule-${rule.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow',
                )}
                style={{
                  borderLeft: `4px solid ${rule.enabled ? 'var(--color-primary)' : 'var(--color-surface-dim)'}`,
                }}
              >
                <header
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
                  )}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <h3 className={cm.cn(cm.textSize('lg'), 'font-bold')}>{rule.name}</h3>
                      <DocumentTypeBadge type={rule.matchedType} />
                    </div>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'rules.matched30d',
                        { count: rule.matched_count_30d },
                        { defaultValue: '{{count}} documents matched in the last 30 days' },
                      )}
                    </p>
                  </div>
                  <label
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant cursor-pointer',
                    )}
                    style={{ fontSize: 10 }}
                  >
                    <input
                      type="checkbox"
                      data-mol-id={`rule-${rule.id}-toggle`}
                      checked={rule.enabled}
                      onChange={() => toggle(rule.id)}
                      className={cm.cn('sr-only peer')}
                    />
                    <span
                      className={cm.cn(
                        'w-9 h-5 rounded-full bg-surface-container relative transition-colors peer-checked:bg-primary',
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cm.cn(
                          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow-sm transition-transform',
                        )}
                        style={{ transform: rule.enabled ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </span>
                    {rule.enabled
                      ? t('status.active', {}, { defaultValue: 'Active' })
                      : t('status.paused', {}, { defaultValue: 'Paused' })}
                  </label>
                </header>

                <div
                  className={cm.cn(
                    cm.grid({ gap: 'md' }),
                    cm.sp('mt', 4),
                    'grid-cols-1 md:grid-cols-2',
                  )}
                >
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant font-bold',
                      )}
                      style={{ fontSize: 10 }}
                    >
                      {t('form.when', {}, { defaultValue: 'When' })}
                    </p>
                    <ul className={cm.cn(cm.sp('mt', 2), 'space-y-1')}>
                      {rule.conditions.map((c, i) => (
                        <li
                          key={i}
                          className={cm.cn(
                            cm.textSize('sm'),
                            'flex items-center gap-2 text-on-surface',
                          )}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-primary')}
                            style={{ fontSize: 16 }}
                            aria-hidden="true"
                          >
                            filter_alt
                          </span>
                          <span className={cm.cn('font-mono text-xs')}>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-on-surface-variant font-bold',
                      )}
                      style={{ fontSize: 10 }}
                    >
                      {t('rules.then', {}, { defaultValue: 'Then' })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 2),
                        'flex items-center gap-2 text-on-surface',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-tertiary')}
                        style={{ fontSize: 16 }}
                        aria-hidden="true"
                      >
                        double_arrow
                      </span>
                      <span>
                        <span className={cm.cn('font-bold')}>{rule.action}:</span>{' '}
                        <span className={cm.cn('font-mono text-xs')}>{rule.destination}</span>
                      </span>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
          {t('rules.templatesHeading', {}, { defaultValue: 'Extraction templates' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'rules.templatesSubheading',
            {},
            { defaultValue: 'Field schemas the extractor uses for each document type.' },
          )}
        </p>
        {templates.length === 0 ? (
          <p
            data-mol-id="templates-empty"
            className={cm.cn(cm.sp('py', 6), 'text-on-surface-variant text-sm')}
          >
            {t('rules.templatesEmpty', {}, { defaultValue: 'No extraction templates yet.' })}
          </p>
        ) : (
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {templates.map((tpl) => (
              <article
                key={tpl.id}
                data-mol-id={`template-${tpl.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                )}
              >
                <header
                  className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 3))}
                >
                  <DocumentTypeBadge type={tpl.type} withLabel={false} />
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'rules.lastUsed',
                      { date: tpl.last_used },
                      { defaultValue: 'Used {{date}}' },
                    )}
                  </span>
                </header>
                <h3 className={cm.cn(cm.textSize('base'), 'font-bold')}>{tpl.name}</h3>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    cm.sp('mb', 3),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'rules.fieldsCount',
                    { count: tpl.fields.length },
                    { defaultValue: '{{count}} fields' },
                  )}
                </p>
                <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                  {tpl.fields.slice(0, 5).map((f) => (
                    <li
                      key={f}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded-md bg-surface-container font-mono text-on-surface-variant',
                      )}
                    >
                      {f}
                    </li>
                  ))}
                  {tpl.fields.length > 5 ? (
                    <li
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        'rounded-md bg-surface-container font-bold text-on-surface-variant',
                      )}
                    >
                      +{tpl.fields.length - 5}
                    </li>
                  ) : null}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
