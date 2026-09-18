/**
 * Recording a component status change, in exactly one place.
 *
 * A status change is never a single write: it is the component row, a
 * `component_status_history` entry, and an audit record — and the three must
 * agree or the public timeline and the uptime math silently diverge from what
 * the page is showing. There are now three writers (the manual
 * `PUT /components/:id/status` handler, the URL poller, and the heartbeat
 * staleness sweep), so the sequence lives here instead of being copied per
 * writer.
 *
 * @module
 */

import { create, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import { writeAuditLog } from '../handlers/_audit.js'

/** How a status change was decided — recorded in the audit payload. */
export type StatusChangeSource = 'monitor-probe' | 'heartbeat' | 'manual'

/**
 * Record a component status transition (row + history + audit).
 *
 * No-ops when the component is already in `nextStatus`, so callers can invoke it
 * unconditionally on every sweep without writing a history row per tick.
 *
 * @param component - The component row as currently stored.
 * @param nextStatus - The status to move it to.
 * @param via - What decided the change, for the audit trail.
 * @param detail - Extra audit payload (HTTP status, staleness, probe error).
 * @returns True when a transition was written, false when already in that state.
 */
export async function recordStatusTransition(
  component: Record<string, unknown>,
  nextStatus: string,
  via: StatusChangeSource,
  detail: Record<string, unknown> = {},
): Promise<boolean> {
  if (component.status === nextStatus) return false

  // An operator-declared maintenance window outranks every automated signal:
  // flapping a component out of `under_maintenance` would page people for
  // planned work and erase the operator's intent.
  if (component.status === 'under_maintenance' && via !== 'manual') return false

  const componentId = String(component.id)
  await updateById('status_components', componentId, { status: nextStatus })
  await create('component_status_history', {
    component_id: componentId,
    status: nextStatus,
    changed_at: new Date().toISOString(),
  })
  await writeAuditLog({
    userId: String(component.user_id),
    action: 'component.statusChange',
    scope: 'components',
    target: componentId,
    summary: typeof component.name === 'string' ? component.name : null,
    payload: { from: component.status, to: nextStatus, via, ...detail },
  })
  logger.info('status: component transitioned', {
    componentId,
    from: component.status,
    to: nextStatus,
    via,
  })
  return true
}
