/**
 * Editorial envelope row — category name + spent/assigned + progress bar.
 * Funded portion in primary (assigned), spent portion overlay, overspent
 * tinted error. Used inside grouped budget lists and dashboard digest.
 *
 * Translated from personal-finance's AccountRecentTransactions / ActivityRow
 * editorial-list treatment, retuned for envelope-budget semantics.
 */

import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'

export interface CategoryProgress {
  category_id: string
  category_name: string
  group: string
  assigned_cents: number
  spent_cents: number
}

interface CategoryProgressRowProps {
  row: CategoryProgress
  showGroup?: boolean
  /** When provided, an "Assign" affordance appears that calls back with the
   *  user-typed dollars value when committed. Saving state and errors are
   *  surfaced on the row. */
  onAssign?: (categoryId: string, dollars: number) => Promise<void>
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency())
}

export function CategoryProgressRow({
  row,
  showGroup = false,
  onAssign,
}: CategoryProgressRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState((row.assigned_cents / 100).toFixed(2))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const remaining = row.assigned_cents - row.spent_cents
  const over = remaining < 0
  const fully = !over && remaining === 0 && row.assigned_cents > 0
  const percent =
    row.assigned_cents === 0
      ? 0
      : Math.min(100, Math.round((row.spent_cents / row.assigned_cents) * 100))
  const overflowPct =
    over && row.assigned_cents > 0
      ? Math.min(
          100,
          Math.round(((row.spent_cents - row.assigned_cents) / row.assigned_cents) * 100),
        )
      : 0

  function startEdit() {
    if (!onAssign) return
    setDraft((row.assigned_cents / 100).toFixed(2))
    setErr(null)
    setEditing(true)
  }

  async function commit() {
    if (!onAssign) return
    const dollars = Number(draft)
    if (!Number.isFinite(dollars) || dollars < 0) {
      setErr(
        t(
          'categoryProgressRow.assign.invalid',
          {},
          { defaultValue: 'Enter a non-negative amount.' },
        ),
      )
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await onAssign(row.category_id, dollars)
      setEditing(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErr(msg || t('categoryProgressRow.assign.error', {}, { defaultValue: 'Could not save.' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li
      className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'group')}
      data-mol-id={`category-row-${row.category_id}`}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('mb', 2),
        )}
      >
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'truncate text-on-surface',
            )}
          >
            {row.category_name}
          </p>
          {showGroup ? (
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 0), 'text-on-surface-variant')}>
              {row.group}
            </p>
          ) : null}
        </div>
        <div className={cm.cn('text-right', cm.flex({ align: 'center', gap: 'sm' }))}>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void commit()
              }}
              className={cm.flex({ align: 'center', gap: 'xs' })}
            >
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setEditing(false)
                }}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  'tabular-nums w-24 text-right border border-outline-variant rounded-md',
                )}
                data-testid={`assign-input-${row.category_id}`}
                aria-label={t(
                  'categoryProgressRow.assign.aria',
                  { name: row.category_name },
                  { defaultValue: 'Assigned to {{name}}' },
                )}
              />
              <button
                type="submit"
                disabled={saving}
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
                data-testid={`assign-save-${row.category_id}`}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.save', {}, { defaultValue: 'Save' })}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={cm.cn(
                  cm.sp('px', 1),
                  cm.textSize('xs'),
                  'text-on-surface-variant hover:underline',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
            </form>
          ) : (
            <>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'tabular-nums',
                    over ? 'text-error' : fully ? 'text-on-surface-variant' : 'text-on-surface',
                  )}
                >
                  {fmt(row.spent_cents)}{' '}
                  <span className="text-on-surface-variant/70">/ {fmt(row.assigned_cents)}</span>
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 0),
                    over ? 'text-error font-bold' : 'text-on-surface-variant',
                  )}
                >
                  {over
                    ? t(
                        'categoryProgressRow.over',
                        { amount: fmt(Math.abs(remaining)) },
                        { defaultValue: '{{amount}} over' },
                      )
                    : t(
                        'categoryProgressRow.left',
                        { amount: fmt(remaining) },
                        { defaultValue: '{{amount}} left' },
                      )}
                </p>
              </div>
              {onAssign ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    cm.textPrimary,
                    'rounded-md hover:bg-primary/10',
                  )}
                  data-testid={`assign-edit-${row.category_id}`}
                  aria-label={t(
                    'categoryProgressRow.assign.editAria',
                    { name: row.category_name },
                    { defaultValue: 'Edit assigned amount for {{name}}' },
                  )}
                >
                  {t('categoryProgressRow.assign.edit', {}, { defaultValue: 'Assign' })}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {err ? (
        <p role="alert" className={cm.cn(cm.textSize('xs'), 'text-error', cm.sp('mb', 1))}>
          {err}
        </p>
      ) : null}
      <div className={cm.cn('h-2 rounded-full bg-surface-container overflow-hidden relative')}>
        <div
          className={cm.cn('h-full rounded-full', over ? 'bg-error/40' : 'bg-primary/30')}
          style={{ width: `${percent}%` }}
        />
        {over ? (
          <div
            className={cm.cn('absolute top-0 left-0 h-full rounded-full bg-error')}
            style={{ width: `${Math.max(8, overflowPct)}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </li>
  )
}
