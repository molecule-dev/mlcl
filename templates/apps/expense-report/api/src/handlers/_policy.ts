/**
 * Policy enforcement — evaluate a report's expenses against its expense policy.
 *
 * Reports carry a `policy_id`; policies define `max_amount` (per-expense cap),
 * `requires_receipt_above` (a receipt is mandatory over this amount), and `categories` (the set of
 * expense categories the policy governs — empty = all categories). Both the approvals queue and the
 * report detail surface a `policy_violation` string to the approver — this computes it (it was
 * hardcoded to `null`, so the whole compliance engine was inert).
 *
 * @module
 */

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

/** Minimal shape of an expense row needed to check it against a policy. */
export interface PolicyCheckExpense {
  amount?: number | string | null
  receipt_url?: string | null
  merchant?: string | null
  description?: string | null
  category?: string | null
}

const money = (n: number): string => `$${n.toFixed(2)}`

/**
 * Returns a human-readable summary of a report's policy violations (over the per-expense cap, or
 * missing a receipt where one is required), or `null` when the report has no policy or nothing
 * violates. When the policy scopes to specific `categories`, only expenses in those categories are
 * checked. Amounts are in dollars — the same unit policies and expenses store.
 */
export async function computePolicyViolation(
  policyId: string | null | undefined,
  expenses: PolicyCheckExpense[],
): Promise<string | null> {
  if (!policyId) return null
  const policy = await findById<Record<string, unknown>>('policies', String(policyId))
  if (!policy) return null

  const maxAmount = policy.max_amount != null ? Number(policy.max_amount) : null
  const receiptAbove =
    policy.requires_receipt_above != null ? Number(policy.requires_receipt_above) : null
  // A policy can scope itself to specific expense categories. When `categories` is non-empty, only
  // expenses in that set are governed by the cap/receipt rules; the empty default (ARRAY[]) governs
  // every category. This scope was being dropped — the loop applied the caps to every expense
  // regardless, so a meals-only policy wrongly flagged a lodging/travel expense as over-limit.
  const scopedCategories = Array.isArray(policy.categories)
    ? policy.categories.map((c) => String(c))
    : []

  const problems: string[] = []
  for (const e of expenses) {
    const amt = Number(e.amount ?? 0)
    if (!Number.isFinite(amt)) continue
    if (scopedCategories.length > 0 && !scopedCategories.includes(String(e.category ?? '')))
      continue
    const label = String(e.merchant || e.description || e.category || 'An expense')
    if (maxAmount != null && maxAmount > 0 && amt > maxAmount) {
      problems.push(
        t(
          'reports.policyOverLimit',
          { label, amount: money(amt), limit: money(maxAmount) },
          { defaultValue: '{{label}} ({{amount}}) exceeds the {{limit}} policy limit' },
        ),
      )
    }
    if (receiptAbove != null && receiptAbove > 0 && amt > receiptAbove && !e.receipt_url) {
      problems.push(
        t(
          'reports.policyReceiptRequired',
          { label, amount: money(amt), threshold: money(receiptAbove) },
          { defaultValue: 'Receipt missing for {{label}} ({{amount}}, over {{threshold}})' },
        ),
      )
    }
  }
  return problems.length ? problems.join('; ') : null
}
