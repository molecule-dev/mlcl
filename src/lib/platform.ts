/**
 * molecule.dev platform API client — the CLI's authenticated window onto the
 * IDE's own routes (projects, deployments, env). Token-based: `mlcl login`
 * stores a JWT at ~/.mlcl/credentials.json (0600); every call here attaches
 * it as the session bearer. Override the target with MOLECULE_API_URL
 * (default: the production API) — tests point it at a local mock.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_BASE = 'https://api.molecule.dev/api'
const DEFAULT_SITE = 'https://www.molecule.dev'
const CREDENTIALS_FILE = join(homedir(), '.mlcl', 'credentials.json')

/**
 * MOLECULE_ENV=local flips every default to the local dev stack — the alias
 * for working on the checkout (`alias mlcl-dev="MOLECULE_ENV=local node
 * <repo>/mlcl/bin/run.js"`) then needs zero other env vars.
 */
export function isLocalEnv(): boolean {
  return process.env.MOLECULE_ENV === 'local'
}

export function apiBaseUrl(): string {
  if (isLocalEnv()) return process.env.MOLECULE_API_URL ?? 'http://localhost:4000/api'
  return process.env.MOLECULE_API_URL ?? DEFAULT_BASE
}

/** The site origin for browser-facing URLs (device-code approval). */
export function siteBaseUrl(): string {
  if (isLocalEnv()) return process.env.MOLECULE_SITE_URL ?? 'http://localhost:3000'
  return process.env.MOLECULE_SITE_URL ?? DEFAULT_SITE
}

export interface StoredCredentials {
  token: string
  /** email as reported by /users/me at login time (display only). */
  email?: string
  savedAt: string
}

export function readCredentials(): StoredCredentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return null
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8')) as StoredCredentials
  } catch (_error) {
    // A missing/corrupt credentials file just means logged-out.
    return null
  }
}

export function writeCredentials(creds: StoredCredentials): void {
  mkdirSync(join(CREDENTIALS_FILE, '..'), { recursive: true, mode: 0o700 })
  // mode-at-creation: no world-readable TOCTOU window before a follow-up chmod.
  writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 })
  chmodSync(CREDENTIALS_FILE, 0o600)
}

export function clearCredentials(): void {
  // Unlink, not truncate — no empty inode lingers in page cache/fs slack.
  if (existsSync(CREDENTIALS_FILE)) rmSync(CREDENTIALS_FILE, { force: true })
}

export class PlatformApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  // Precedence: explicit arg > CI env var (MOLECULE_TOKEN) > stored credentials file.
  const token = init.token ?? process.env.MOLECULE_TOKEN ?? readCredentials()?.token
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  const data: unknown = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? `API responded ${response.status}`
    throw new PlatformApiError(response.status, message)
  }
  return data as T
}

/** GET /users/me — verifies the token and returns the account. */
export async function whoami(
  token?: string,
): Promise<{ id: string; email?: string; name?: string }> {
  const raw = await request<{
    props?: { id?: string; email?: string; name?: string }
    id?: string
    email?: string
    name?: string
  }>('/users/me', { token })
  // The platform wraps user payloads as { props: { ... } }.
  return {
    id: raw.props?.id ?? raw.id ?? 'unknown',
    email: raw.props?.email ?? raw.email,
    name: raw.props?.name ?? raw.name,
  }
}

export interface PlatformProject {
  id: string
  name: string
  role?: string
  previewUrl?: string
  liveUrl?: string
  updatedAt?: string
}

/** GET /projects — owned + team projects with the caller's role. */
export function listProjects(token?: string): Promise<PlatformProject[]> {
  return request('/projects', { token })
}

export interface PlatformEnvVar {
  key: string
  value?: string
  scope?: 'all' | 'dev' | 'prod'
  masked?: boolean
}

/** GET /projects/:id/env — the IDE's env editor data (values masked server-side). */
export function getProjectEnv(projectId: string, token?: string): Promise<PlatformEnvVar[]> {
  return request(`/projects/${projectId}/env`, { token })
}

/** PUT /projects/:id/env — upsert values (same route the IDE editor saves through). */
export function putProjectEnv(
  projectId: string,
  values: Record<string, string>,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/env`, { method: 'PUT', body: { values }, token })
}

export interface PlatformDeployment {
  id: string
  status: string
  createdAt?: string
  liveUrl?: string
}

/** POST /projects/:id/deployments — trigger a production deploy (builds in the sandbox, launches the runtime container). */
export function createDeployment(projectId: string, token?: string): Promise<PlatformDeployment> {
  return request(`/projects/${projectId}/deployments`, { method: 'POST', body: {}, token })
}

/** GET /projects/:id/deployments/:depId — poll a deploy (buildLog included for editor+). */
export function getDeployment(
  projectId: string,
  deploymentId: string,
  token?: string,
): Promise<PlatformDeployment & { buildLog?: string }> {
  return request(`/projects/${projectId}/deployments/${deploymentId}`, { token })
}

export interface DeviceCodeSession {
  deviceCode: string
  userCode: string
  /** Site-relative approval path, e.g. /cli?code=ABCD-EFGH. */
  verificationPath: string
  expiresIn: number
  interval: number
}

/** POST /cli/device-code — start the browser-based login dance (anonymous). */
export async function requestDeviceCode(): Promise<DeviceCodeSession> {
  const response = await fetch(`${apiBaseUrl()}/cli/device-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await response.json()) as {
    deviceCode?: string
    userCode?: string
    verificationUrl?: string
    expiresIn?: number
    interval?: number
    error?: string
  }
  if (!response.ok || !data.deviceCode || !data.userCode) {
    throw new PlatformApiError(response.status, data.error ?? 'device-code request failed')
  }
  // The verification path is server-controlled but goes to a browser opener
  // and a terminal — validate it is a plain internal path (starts with /, no
  // control chars, strict charset) so a compromised API cannot steer xdg-open
  // at another scheme or inject terminal escapes.
  const rawPath = data.verificationUrl ?? `/cli?code=${data.userCode}`
  const verificationPath =
    rawPath.startsWith('/') && /^\/[A-Za-z0-9/?&=%._-]*$/.test(rawPath)
      ? rawPath
      : `/cli?code=${data.userCode}`
  return {
    deviceCode: data.deviceCode,
    userCode: data.userCode,
    verificationPath,
    expiresIn: data.expiresIn ?? 600,
    interval: data.interval ?? 2,
  }
}

export class AuthorizationPendingError extends Error {}

/** POST /cli/device-token — poll; resolves with the token once approved. */
export async function pollDeviceToken(deviceCode: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl()}/cli/device-token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await response.json()) as { token?: string; error?: string }
  if (response.ok && data.token) return data.token
  if (data.error === 'authorization_pending') throw new AuthorizationPendingError('pending')
  throw new PlatformApiError(response.status, data.error ?? 'device-token poll failed')
}

export interface PlatformDevice {
  id: string
  name?: string
  createdAt?: string
  updatedAt?: string
  /** True when this row is the session the list was requested from. */
  current?: boolean
  props?: Omit<PlatformDevice, 'props'>
}

/** GET /devices — the caller's device rows (list marks the current session's row). */
export async function listDevices(token?: string): Promise<PlatformDevice[]> {
  const raw = await request<unknown>('/devices', { token })
  const rows = Array.isArray(raw) ? raw : ((raw as { devices?: unknown[] })?.devices ?? [])
  return rows.map((row) => {
    const r = row as PlatformDevice & { props?: Omit<PlatformDevice, 'props'> }
    return r.props ? { ...r.props, current: r.current } : r
  })
}

/** PATCH /devices/:id — rename a device. */
export function renameDevice(deviceId: string, name: string, token?: string): Promise<unknown> {
  return request(`/devices/${deviceId}`, { method: 'PATCH', body: { name }, token })
}

/** DELETE /devices/:id — revoke a device (kills every session bound to it, incl. CLI tokens). */
export function revokeDevice(deviceId: string, token?: string): Promise<unknown> {
  return request(`/devices/${deviceId}`, { method: 'DELETE', token })
}

/** Decode the LOCAL token's deviceId claim (no network) — which row is this machine. */
export function localDeviceId(): string | null {
  const token = process.env.MOLECULE_TOKEN ?? readCredentials()?.token
  if (!token) return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as {
      deviceId?: string
    }
    return payload.deviceId ?? null
  } catch (_error) {
    // A malformed local token just means we cannot identify the current
    // device offline — the network calls will surface the real problem.
    return null
  }
}
