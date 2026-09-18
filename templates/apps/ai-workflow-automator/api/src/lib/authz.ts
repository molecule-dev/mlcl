/**
 * Authorization helpers for ai-workflow-automator.
 *
 * Every workflow-scoped resource (steps, runs, webhook endpoints, etc.) must
 * be reachable only by the workflow's owner. These helpers replace bare
 * `findById` lookups with ownership-checked variants and return discriminated
 * results so handlers can branch on 404 vs. 403 without leaking existence.
 *
 * Per CLAUDE.md / mlcl-CLAUDE.md "no IDOR" rule (G6) we standardize on
 * 404-for-non-owner so an attacker cannot probe workflow existence.
 */

import { findById } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a workflow by id and verify the caller owns it. Returns the
 * workflow row on success, or `{ ok: false, status: 404 }` when the
 * workflow is missing OR owned by a different user.
 */
export async function requireWorkflowOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(workflowId: string, userId: string): Promise<AuthzResult<T>> {
  const workflow = await findById<T>('workflows', workflowId)
  if (!workflow) return { ok: false, status: 404 }
  if (String((workflow as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row: workflow }
}

/**
 * Resolve a workflow run by id and verify its parent workflow is owned
 * by the caller. Returns the run row on success.
 */
export async function requireWorkflowRunOwnership<
  T extends { workflow_id?: unknown } = Record<string, unknown>,
>(runId: string, userId: string): Promise<AuthzResult<T>> {
  const run = await findById<T>('workflow_runs', runId)
  if (!run) return { ok: false, status: 404 }
  const workflowId = (run as { workflow_id?: unknown }).workflow_id
  if (!workflowId) return { ok: false, status: 404 }
  const owns = await requireWorkflowOwnership(String(workflowId), userId)
  if (!owns.ok) return owns
  return { ok: true, row: run }
}
