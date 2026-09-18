import { create } from '@molecule/api-database'

export interface AuditWrite {
  userId: string
  actorUserId?: string | null
  action: string
  scope?: string | null
  target?: string | null
  summary?: string | null
  payload?: Record<string, unknown> | null
}

/**
 * Persist an audit-log row for a workspace action. Failures here must
 * NOT block the parent request — the caller has already mutated the
 * primary record and we don't want to roll that back. We log the error
 * and move on so audit becomes best-effort.
 */
export async function writeAuditLog(input: AuditWrite): Promise<void> {
  try {
    await create('audit_log', {
      user_id: input.userId,
      actor_user_id: input.actorUserId ?? input.userId,
      action: input.action,
      scope: input.scope ?? null,
      target: input.target ?? null,
      summary: input.summary ?? null,
      payload: JSON.stringify(input.payload ?? {}),
    })
  } catch (err) {
    // We never want a failed audit-row insert to break the user-visible
    // mutation that caused it; surface to logs instead.

    console.error('[audit] failed to write audit log', { action: input.action, err })
  }
}
