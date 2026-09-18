/**
 * Shared types + small helpers for OKR backend.
 *
 * Backend handlers (api/src/handlers/objectives.ts, key-results.ts,
 * check-ins.ts, notifications.ts) return rows directly without an
 * envelope. Keep this file thin — no React, no deps — so it can be
 * imported by any page or component.
 */

export type ObjectiveStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'archived'

export type ObjectiveScope = 'individual' | 'team' | 'company'

/** Backend KR metric_type enum (api/src/handlers/key-results.ts:24). */
export type KrMetricType = 'number' | 'percent' | 'boolean' | 'milestone'

export type KrStatus = ObjectiveStatus

export type CheckInConfidence = 'low' | 'medium' | 'high'

export type CheckInStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed'

export interface ObjectiveRow {
  id: string
  owner_id: string
  team_id: string | null
  period_id: string | null
  parent_id: string | null
  scope: ObjectiveScope
  title: string
  description: string | null
  status: ObjectiveStatus
  progress: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface KeyResultRow {
  id: string
  owner_id: string
  objective_id: string
  title: string
  metric_type: KrMetricType
  start_value: number | string
  target_value: number | string
  current_value: number | string
  unit: string | null
  status: KrStatus
  progress: number
  position: number
  last_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ObjectiveWithKrs extends ObjectiveRow {
  key_results: KeyResultRow[]
}

export interface CheckInRow {
  id: string
  owner_id: string
  objective_id: string | null
  key_result_id: string | null
  value: number | string | null
  confidence: CheckInConfidence | null
  status: CheckInStatus | null
  note: string | null
  occurred_at: string
  created_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/** UI-side simplified status palette for cards/pills. */
export type UiStatus = 'on-track' | 'at-risk' | 'behind' | 'completed' | 'not-started'

export function uiStatus(s: string | null | undefined): UiStatus {
  if (s === 'completed') return 'completed'
  if (s === 'at_risk') return 'at-risk'
  if (s === 'off_track') return 'behind'
  return 'on-track'
}

/** UI confidence button → backend check-in.confidence value. */
export function backendConfidence(s: 'on-track' | 'at-risk' | 'behind'): CheckInConfidence {
  if (s === 'behind') return 'low'
  if (s === 'at-risk') return 'medium'
  return 'high'
}

/** UI confidence button → backend check-in.status value. */
export function backendCheckInStatus(s: 'on-track' | 'at-risk' | 'behind'): CheckInStatus {
  if (s === 'behind') return 'off_track'
  if (s === 'at-risk') return 'at_risk'
  return 'on_track'
}

export function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** UI metric → backend metric_type. */
export function backendMetricType(m: string): KrMetricType {
  if (m === 'percentage' || m === 'percent') return 'percent'
  if (m === 'currency') return 'number'
  if (m === 'boolean') return 'boolean'
  return 'number'
}

/** Backend metric_type → UI metric label used by KeyResultRowData. */
export function uiMetricType(m: string): 'percentage' | 'number' | 'currency' | 'boolean' {
  if (m === 'percent') return 'percentage'
  if (m === 'boolean') return 'boolean'
  return 'number'
}

/** Adapt a backend KeyResultRow into the UI KeyResultRowData shape. */
export function toKeyResultRowData(kr: KeyResultRow): {
  id: string
  title: string
  metricType: 'percentage' | 'number' | 'currency' | 'boolean'
  startValue: number
  currentValue: number
  targetValue: number
  status: 'on-track' | 'at-risk' | 'behind' | 'completed' | 'not-started'
  ownerName?: string
} {
  return {
    id: kr.id,
    title: kr.title,
    metricType: uiMetricType(kr.metric_type),
    startValue: toNumber(kr.start_value),
    currentValue: toNumber(kr.current_value),
    targetValue: toNumber(kr.target_value),
    status: uiStatus(kr.status),
  }
}
