/**
 * molecule.dev platform API client — the CLI's authenticated window onto the
 * IDE's own routes (projects, deployments, env). Token-based: `mlcl login`
 * stores a JWT at ~/.mlcl/credentials.json (0600); every call here attaches
 * it as the session bearer. Override the target with MOLECULE_API_URL
 * (default: the production API) — tests point it at a local mock.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_BASE = 'https://api.molecule.dev/api'
const DEFAULT_SITE = 'https://www.molecule.dev'
const CREDENTIALS_FILE = join(homedir(), '.mlcl', 'credentials.json')

export function apiBaseUrl(): string {
  return process.env.MOLECULE_API_URL ?? DEFAULT_BASE
}

/** The site origin for browser-facing URLs (device-code approval). */
export function siteBaseUrl(): string {
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
  mkdirSync(join(CREDENTIALS_FILE, '..'), { recursive: true })
  writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(creds, null, 2)}\n`)
  chmodSync(CREDENTIALS_FILE, 0o600)
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) writeFileSync(CREDENTIALS_FILE, '')
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
export function whoami(token?: string): Promise<{ id: string; email?: string; name?: string }> {
  return request('/users/me', { token })
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
  return {
    deviceCode: data.deviceCode,
    userCode: data.userCode,
    verificationPath: data.verificationUrl ?? `/cli?code=${data.userCode}`,
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
