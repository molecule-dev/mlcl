/**
 * Typed API client + mutation helpers for to-do-list.
 *
 * Pages should import the shared `Task` / `Project` / `Label` types
 * from here rather than redeclaring them ad-hoc — the backend handlers
 * (api/src/handlers/tasks.ts, projects.ts, labels.ts) enrich every list
 * row with `project`, `labels`, `completed`, etc., so a single shared
 * shape covers Today, Inbox, Upcoming, Completed, Search, ProjectDetail,
 * TaskDetail and Analytics.
 *
 * The mutation helpers (`createTask`, `toggleTaskCompleted`, etc.) wrap
 * the raw HttpClient with typed parameters and unwrap the response so
 * call sites can stay terse and don't repeat the envelope-handling.
 *
 * @module
 */

import type { HttpClient } from '@molecule/app-http'

import { unwrapList, unwrapSingle } from './unwrap.js'

/** Task priority — 1 (highest) through 4 (no priority). */
export type Priority = 1 | 2 | 3 | 4

/** Recurrence summary derived from `recurrence_rule` for the UI. */
export type RecurringCadence = 'daily' | 'weekly' | 'monthly' | 'yearly' | null

/** A task as enriched by GET /api/tasks (and friends). */
export interface Task {
  id: string
  title: string
  description: string | null
  priority: Priority
  due_date: string | null
  due_time: string | null
  project_id: string | null
  parent_id: string | null
  /** Joined project — null when the task lives in the inbox. */
  project: { id: string; name: string; color: string } | null
  /** Names of all labels attached to the task. */
  labels: string[]
  completed: boolean
  completed_at: string | null
  recurrence_rule: string | null
  recurring: RecurringCadence
  position: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string | null
  description?: string
  parent_id: string | null
  position: number
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  task_count: number
  completed_count: number
  /** Optional per-project sections (server returns []). */
  sections?: { id: string; name: string }[]
}

export interface Label {
  id: string
  name: string
  color: string
  task_count: number
  created_at: string
  updated_at: string
}

export type NotificationType =
  'reminder' | 'overdue' | 'assigned' | 'mention' | 'recurring' | 'system_message'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  href: string | null
  unread: boolean
  read_at: string | null
  created_at: string
  data: unknown
}

/** Returned by GET /api/billing/status. */
export interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxLabels: number
    maxProjects: number
    maxTasks: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

// ---------- Tasks ----------

export interface TaskCreateInput {
  title: string
  description?: string
  project_id?: string | null
  parent_id?: string | null
  priority?: Priority
  due_date?: string | null
  due_time?: string | null
  recurrence_rule?: string | null
  position?: number
}

export interface TaskListFilters {
  project_id?: string
  label_id?: string
  completed?: boolean
  due_date?: string
  filter?: 'inbox' | 'upcoming'
}

function buildTaskQuery(filters?: TaskListFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.project_id) params.set('project_id', filters.project_id)
  if (filters.label_id) params.set('label_id', filters.label_id)
  if (typeof filters.completed === 'boolean') params.set('completed', String(filters.completed))
  if (filters.due_date) params.set('due_date', filters.due_date)
  if (filters.filter) params.set('filter', filters.filter)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export async function listTasks(http: HttpClient, filters?: TaskListFilters): Promise<Task[]> {
  const res = await http.get(`/api/tasks${buildTaskQuery(filters)}`)
  return unwrapList<Task>(res)
}

export async function getTask(http: HttpClient, id: string): Promise<Task | null> {
  const res = await http.get(`/api/tasks/${id}`)
  return unwrapSingle<Task>(res)
}

export async function createTask(http: HttpClient, input: TaskCreateInput): Promise<Task | null> {
  const res = await http.post('/api/tasks', input)
  return unwrapSingle<Task>(res)
}

export async function updateTask(
  http: HttpClient,
  id: string,
  patch: Partial<TaskCreateInput> & { is_completed?: boolean },
): Promise<Task | null> {
  const res = await http.patch(`/api/tasks/${id}`, patch)
  return unwrapSingle<Task>(res)
}

export async function deleteTask(http: HttpClient, id: string): Promise<void> {
  await http.delete(`/api/tasks/${id}`)
}

/** Toggle a task's completion. Returns the updated task. */
export async function toggleTaskCompleted(http: HttpClient, id: string): Promise<Task | null> {
  const res = await http.post<{ completed: boolean; task: Task }>(`/api/tasks/${id}/complete`, {})
  if (!res || typeof res !== 'object') return null
  // HttpResponse wraps the body in `data`; the body itself contains
  // `{ completed, task }` from the handler.
  const body = (res as { data?: { task?: Task } }).data
  return body?.task ?? null
}

export async function searchTasks(http: HttpClient, query: string): Promise<Task[]> {
  if (!query.trim()) return []
  const res = await http.get(`/api/tasks/search?q=${encodeURIComponent(query.trim())}`)
  return unwrapList<Task>(res)
}

// ---------- Projects ----------

export async function listProjects(http: HttpClient): Promise<Project[]> {
  const res = await http.get('/api/projects')
  return unwrapList<Project>(res)
}

export async function getProject(http: HttpClient, id: string): Promise<Project | null> {
  const res = await http.get(`/api/projects/${id}`)
  return unwrapSingle<Project>(res)
}

export async function createProject(
  http: HttpClient,
  input: { name: string; color?: string; icon?: string | null },
): Promise<Project | null> {
  const res = await http.post('/api/projects', input)
  return unwrapSingle<Project>(res)
}

export async function updateProject(
  http: HttpClient,
  id: string,
  patch: Partial<{
    name: string
    color: string
    icon: string | null
    is_favorite: boolean
    is_archived: boolean
  }>,
): Promise<Project | null> {
  const res = await http.patch(`/api/projects/${id}`, patch)
  return unwrapSingle<Project>(res)
}

export async function deleteProject(http: HttpClient, id: string): Promise<void> {
  await http.delete(`/api/projects/${id}`)
}

// ---------- Labels ----------

export async function listLabels(http: HttpClient): Promise<Label[]> {
  const res = await http.get('/api/labels')
  return unwrapList<Label>(res)
}

export async function createLabel(
  http: HttpClient,
  input: { name: string; color?: string },
): Promise<Label | null> {
  const res = await http.post('/api/labels', input)
  return unwrapSingle<Label>(res)
}

export async function updateLabel(
  http: HttpClient,
  id: string,
  patch: Partial<{ name: string; color: string }>,
): Promise<Label | null> {
  const res = await http.patch(`/api/labels/${id}`, patch)
  return unwrapSingle<Label>(res)
}

export async function deleteLabel(http: HttpClient, id: string): Promise<void> {
  await http.delete(`/api/labels/${id}`)
}

export async function assignLabel(
  http: HttpClient,
  taskId: string,
  labelId: string,
): Promise<void> {
  await http.post('/api/labels/assignments', { task_id: taskId, label_id: labelId })
}

export async function unassignLabel(
  http: HttpClient,
  taskId: string,
  labelId: string,
): Promise<void> {
  // The HttpClient.delete contract doesn't accept a body, so we encode
  // the join row's identity in the query string and the backend handler
  // reads them off req.query (matched in api/src/handlers/labels.ts).
  await http.delete(
    `/api/labels/assignments?task_id=${encodeURIComponent(taskId)}&label_id=${encodeURIComponent(labelId)}`,
  )
}

// ---------- Notifications ----------

export async function listNotifications(http: HttpClient): Promise<AppNotification[]> {
  const res = await http.get('/api/notifications')
  return unwrapList<AppNotification>(res)
}

export async function markNotificationRead(http: HttpClient, id: string): Promise<void> {
  await http.post(`/api/notifications/${id}/read`, {})
}

export async function markAllNotificationsRead(http: HttpClient): Promise<void> {
  await http.post('/api/notifications/mark-all-read', {})
}

// ---------- User profile ----------

export interface AppUser {
  id: string
  name: string | null
  email: string
  username?: string | null
  twoFactorEnabled?: boolean
  planKey?: string | null
  preferences?: {
    startOfWeek?: string
    timeFormat?: '12h' | '24h'
    timezone?: string
  }
}

interface UserReadResponse {
  props?: AppUser
  data?: { props?: AppUser }
}

export async function getUser(http: HttpClient, id: string): Promise<AppUser | null> {
  const res = (await http.get(`/api/users/${id}`)) as UserReadResponse | null
  if (!res) return null
  if (res.props) return res.props
  if (res.data?.props) return res.data.props
  return null
}

export async function updateUser(
  http: HttpClient,
  id: string,
  patch: Partial<{ name: string; email: string; username: string }>,
): Promise<AppUser | null> {
  const res = (await http.patch(`/api/users/${id}`, patch)) as UserReadResponse | null
  if (!res) return null
  if (res.props) return res.props
  if (res.data?.props) return res.data.props
  return null
}

// ---------- Devices ----------

/** A signed-in device/session row as returned by GET /api/devices. */
export interface AppDevice {
  id: string
  name?: string | null
  /** Most-recent activity timestamp (the API orders by this, desc). */
  updatedAt?: string
  createdAt?: string
  /** True for the device making the request (sorted to the front by the API). */
  isCurrent?: boolean
}

/** List the current user's signed-in devices. */
export async function listDevices(http: HttpClient): Promise<AppDevice[]> {
  const res = await http.get('/api/devices')
  return unwrapList<AppDevice>(res)
}

/**
 * Revoke (sign out) a device by deleting its row. The API's authorization
 * layer enforces server-side session revocation — the removed device is
 * rejected on its next request (within the device-exists cache TTL), so it
 * is actually signed out, not just hidden. Never call this for the current
 * device (use logout for that).
 */
export async function deleteDevice(http: HttpClient, id: string): Promise<void> {
  await http.delete(`/api/devices/${id}`)
}

// ---------- Billing ----------

export async function getBillingStatus(http: HttpClient): Promise<BillingStatus | null> {
  const res = await http.get('/api/billing/status')
  return unwrapSingle<BillingStatus>(res)
}
