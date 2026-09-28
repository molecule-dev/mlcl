import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface BudgetItem {
  id: string
  category: string
  label: string
  estimated_cents: number
  actual_cents: number | null
  vendor: string | null
}

interface BudgetResponse {
  items: BudgetItem[]
  estimated_total_cents: number
  actual_total_cents: number
  by_category: Array<{
    category: string
    estimated_cents: number
    actual_cents: number
    count: number
  }>
}

const CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'attire',
  'flowers',
  'music',
  'decor',
  'stationery',
  'gifts',
  'other',
] as const

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function parseDollars(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, '')
  if (trimmed === '') return null
  const dollars = Number(trimmed)
  if (Number.isNaN(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}

const EMPTY_FORM = {
  label: '',
  category: 'other' as (typeof CATEGORIES)[number],
  estimated: '',
  actual: '',
  vendor: '',
}

export function Budget() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [data, setData] = useState<BudgetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ estimated: '', actual: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/budget')
      setData(res.data as BudgetResponse)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/budget', {
        label: form.label.trim(),
        category: form.category,
        estimated_cents: parseDollars(form.estimated) ?? 0,
        actual_cents: parseDollars(form.actual),
        vendor: form.vendor.trim() || null,
      })
      void track({ name: 'budget_line.created', properties: { category: form.category } })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not add the line item')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    try {
      await http.put(`/api/budget/${id}`, {
        estimated_cents: parseDollars(editForm.estimated) ?? 0,
        actual_cents: parseDollars(editForm.actual),
      })
      void track({ name: 'budget_line.updated', properties: { line_id: id } })
      setEditingId(null)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not save the line item')
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(id: string) {
    try {
      await http.delete(`/api/budget/${id}`)
      void track({ name: 'budget_line.deleted', properties: { line_id: id } })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not remove the line item')
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  const estimatedTotal = data?.estimated_total_cents ?? 0
  const actualTotal = data?.actual_total_cents ?? 0
  const overBudget = actualTotal > estimatedTotal

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-budget"
    >
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <p
            className={cm.cn('text-xs font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-accent)' }}
          >
            {t('budget.eyebrow', {}, { defaultValue: 'Money' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('budget.title', {}, { defaultValue: 'Budget' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
            {t(
              'budget.subtitle',
              {},
              { defaultValue: 'Estimate every line, log what you actually pay, watch the total.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-mol-id="budget-toggle-form"
          className={cm.cn(
            'px-4 py-2.5 rounded-xl font-bold text-white shadow-md shadow-primary/30',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {showForm
            ? t('budget.hideForm', {}, { defaultValue: 'Close' })
            : t('budget.addItem', {}, { defaultValue: 'Add line item' })}
        </button>
      </header>

      {error ? (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            'mt-4 rounded-xl bg-error-light text-error font-bold text-sm',
          )}
          data-mol-id="budget-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Totals banner */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
        )}
        data-mol-id="budget-totals"
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }), 'gap-4')}
        >
          <div>
            <p
              className={cm.cn('text-xs font-black uppercase tracking-widest')}
              style={{ color: overBudget ? 'var(--color-error)' : 'var(--color-success)' }}
            >
              {overBudget
                ? t('budget.spentOver', {}, { defaultValue: 'Spent — over estimate' })
                : t('budget.spentWithin', {}, { defaultValue: 'Spent — within estimate' })}
            </p>
            <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight mt-1')}>
              {formatMoney(actualTotal)}{' '}
              <span className={cm.cn('text-lg font-bold text-on-surface-variant')}>
                / {formatMoney(estimatedTotal)}
              </span>
            </p>
          </div>
          <p
            className={cm.cn('px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide')}
            style={{
              background: overBudget ? 'var(--color-budget-over-bg)' : 'var(--color-budget-ok-bg)',
              color: overBudget ? 'var(--color-budget-over)' : 'var(--color-budget-ok)',
            }}
            data-mol-id="budget-delta-chip"
          >
            {overBudget
              ? t(
                  'budget.overBy',
                  { amount: formatMoney(actualTotal - estimatedTotal) },
                  { defaultValue: '{{amount}} over' },
                )
              : t(
                  'budget.underBy',
                  { amount: formatMoney(estimatedTotal - actualTotal) },
                  { defaultValue: '{{amount}} to spend' },
                )}
          </p>
        </div>
        <div
          className={cm.cn('mt-4 h-2.5 w-full rounded-full overflow-hidden')}
          style={{ background: 'var(--color-toggle-off)' }}
          role="progressbar"
          aria-label={t('budget.progressAria', {}, { defaultValue: 'Budget spent' })}
          aria-valuenow={
            estimatedTotal > 0 ? Math.min(100, Math.round((actualTotal / estimatedTotal) * 100)) : 0
          }
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cm.cn('h-full rounded-full')}
            style={{
              width: `${
                estimatedTotal > 0
                  ? Math.min(100, Math.round((actualTotal / estimatedTotal) * 100))
                  : 0
              }%`,
              background: overBudget ? 'var(--color-error)' : 'var(--color-success)',
            }}
          />
        </div>
      </section>

      {showForm ? (
        <form
          onSubmit={addItem}
          data-mol-id="budget-add-form"
          className={cm.cn(
            cm.sp('p', 6),
            'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
            'grid gap-4 sm:grid-cols-2 lg:grid-cols-5',
          )}
        >
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('budget.form.label', {}, { defaultValue: 'Line item' })}
            </span>
            <input
              type="text"
              required
              maxLength={200}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              data-mol-id="budget-form-label"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('budget.form.category', {}, { defaultValue: 'Category' })}
            </span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as (typeof CATEGORIES)[number] })
              }
              data-mol-id="budget-form-category"
              className={inputCls}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`budget.category.${category}`, {}, { defaultValue: category })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('budget.form.estimated', {}, { defaultValue: 'Estimated ($)' })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={form.estimated}
              onChange={(e) => setForm({ ...form, estimated: e.target.value })}
              data-mol-id="budget-form-estimated"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('budget.form.actual', {}, { defaultValue: 'Actual ($)' })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={form.actual}
              onChange={(e) => setForm({ ...form, actual: e.target.value })}
              data-mol-id="budget-form-actual"
              className={inputCls}
            />
          </label>
          <div className={cm.cn(cm.flex({ align: 'end' }))}>
            <button
              type="submit"
              disabled={saving || !form.label.trim()}
              data-mol-id="budget-form-submit"
              className={cm.cn(
                'w-full px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50',
              )}
              style={{ background: 'var(--color-primary)' }}
            >
              {saving
                ? t('budget.form.saving', {}, { defaultValue: 'Saving…' })
                : t('budget.form.submit', {}, { defaultValue: 'Add' })}
            </button>
          </div>
        </form>
      ) : null}

      {/* Category rollup */}
      {data && data.by_category.length > 0 ? (
        <section className={cm.cn('mt-8')} data-mol-id="budget-categories">
          <h2 className={cm.cn('text-lg font-bold mb-3')}>
            {t('budget.byCategory', {}, { defaultValue: 'By category' })}
          </h2>
          <div className={cm.cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
            {data.by_category.map((cat) => {
              const catOver = cat.actual_cents > cat.estimated_cents
              return (
                <div
                  key={cat.category}
                  data-mol-id={`budget-category-${cat.category}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface border border-outline-variant/40',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <p className={cm.cn('text-sm font-black uppercase tracking-wide')}>
                      {t(`budget.category.${cat.category}`, {}, { defaultValue: cat.category })}
                    </p>
                    <span className={cm.cn('text-xs text-on-surface-variant tabular-nums')}>
                      {t(
                        'budget.lines',
                        { count: cat.count },
                        { defaultValue: cat.count === 1 ? '1 line' : '{{count}} lines' },
                      )}
                    </span>
                  </div>
                  <p className={cm.cn('text-xl font-extrabold tabular-nums mt-2')}>
                    {formatMoney(cat.actual_cents)}
                    <span className={cm.cn('text-sm font-bold text-on-surface-variant')}>
                      {' '}
                      / {formatMoney(cat.estimated_cents)}
                    </span>
                  </p>
                  <div
                    className={cm.cn('mt-2 h-1.5 w-full rounded-full overflow-hidden')}
                    style={{ background: 'var(--color-toggle-off)' }}
                  >
                    <div
                      className={cm.cn('h-full rounded-full')}
                      style={{
                        width: `${
                          cat.estimated_cents > 0
                            ? Math.min(
                                100,
                                Math.round((cat.actual_cents / cat.estimated_cents) * 100),
                              )
                            : 0
                        }%`,
                        background: catOver ? 'var(--color-error)' : 'var(--color-tertiary)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Line items table */}
      <div
        className={cm.cn(
          'mt-8 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm overflow-x-auto',
        )}
        data-mol-id="budget-table"
      >
        {loading ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !data || data.items.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'budget.empty',
              {},
              { defaultValue: 'No line items yet — add venue, catering, and florals to begin.' },
            )}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left', cm.textSize('sm'))}>
            <thead>
              <tr
                className={cm.cn(
                  'text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40',
                )}
              >
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('budget.col.label', {}, { defaultValue: 'Item' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('budget.col.category', {}, { defaultValue: 'Category' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('budget.col.estimated', {}, { defaultValue: 'Estimated' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('budget.col.actual', {}, { defaultValue: 'Actual' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('budget.col.vendor', {}, { defaultValue: 'Vendor' })}
                </th>
                {/* `relative` pins the sr-only span's containing block to this
                    th — an abs-positioned sr-only child of a static ancestor
                    escapes every overflow clip up to the viewport and widens
                    the document's horizontal scroll area on mobile. */}
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'relative')}>
                  <span className="sr-only">
                    {t('common.actions', {}, { defaultValue: 'Actions' })}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const editing = editingId === item.id
                return (
                  <tr
                    key={item.id}
                    data-mol-id={`budget-row-${item.id}`}
                    className={cm.cn('border-b border-outline-variant/20 last:border-0')}
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                      {item.label}
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}
                    >
                      {t(`budget.category.${item.category}`, {}, { defaultValue: item.category })}
                    </td>
                    {editing ? (
                      <>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editForm.estimated}
                            onChange={(e) =>
                              setEditForm({ ...editForm, estimated: e.target.value })
                            }
                            aria-label={t(
                              'budget.editEstimatedAria',
                              { label: item.label },
                              { defaultValue: 'Estimated dollars for {{label}}' },
                            )}
                            data-mol-id={`budget-edit-estimated-${item.id}`}
                            className={cm.cn(inputCls, 'max-w-[7rem]')}
                          />
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editForm.actual}
                            onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })}
                            aria-label={t(
                              'budget.editActualAria',
                              { label: item.label },
                              { defaultValue: 'Actual dollars for {{label}}' },
                            )}
                            data-mol-id={`budget-edit-actual-${item.id}`}
                            className={cm.cn(inputCls, 'max-w-[7rem]')}
                          />
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            'text-on-surface-variant',
                          )}
                        >
                          {item.vendor ?? '—'}
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                            <button
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              disabled={saving}
                              data-mol-id={`budget-save-${item.id}`}
                              className={cm.cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50',
                              )}
                              style={{ background: 'var(--color-success)' }}
                            >
                              {t('common.save', {}, { defaultValue: 'Save' })}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              data-mol-id={`budget-cancel-${item.id}`}
                              className={cm.cn(
                                'px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/60',
                              )}
                            >
                              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'tabular-nums')}>
                          {formatMoney(item.estimated_cents)}
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'tabular-nums')}>
                          {item.actual_cents == null ? (
                            <span className={cm.cn('text-on-surface-variant')}>—</span>
                          ) : item.actual_cents > item.estimated_cents ? (
                            <span
                              className={cm.cn('font-bold')}
                              style={{ color: 'var(--color-error)' }}
                            >
                              {formatMoney(item.actual_cents)}
                            </span>
                          ) : (
                            formatMoney(item.actual_cents)
                          )}
                        </td>
                        <td
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 3),
                            'text-on-surface-variant',
                          )}
                        >
                          {item.vendor ?? '—'}
                        </td>
                        <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(item.id)
                                setEditForm({
                                  estimated: String(item.estimated_cents / 100),
                                  actual:
                                    item.actual_cents == null
                                      ? ''
                                      : String(item.actual_cents / 100),
                                })
                              }}
                              aria-label={t(
                                'budget.editAria',
                                { label: item.label },
                                { defaultValue: 'Edit {{label}}' },
                              )}
                              data-mol-id={`budget-edit-${item.id}`}
                              className={cm.cn(
                                'flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                              )}
                            >
                              <span
                                className="material-symbols-outlined text-[20px]"
                                aria-hidden="true"
                              >
                                edit
                              </span>
                            </button>
                            <ConfirmButton
                              label={
                                <span
                                  className="material-symbols-outlined text-[20px]"
                                  aria-hidden="true"
                                >
                                  delete
                                </span>
                              }
                              confirmLabel={t(
                                'budget.deleteConfirm',
                                { label: item.label },
                                { defaultValue: `Remove “${item.label}” from the budget?` },
                              )}
                              aria-label={t(
                                'budget.removeAria',
                                { label: item.label },
                                { defaultValue: 'Remove {{label}}' },
                              )}
                              onConfirm={() => removeItem(item.id)}
                              data-mol-id={`budget-remove-${item.id}`}
                              disarmSeconds={5}
                              size="sm"
                              color="error"
                              variant="ghost"
                            />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Budget
