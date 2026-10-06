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
/**
 * Where the CLI keeps its token. `MLCL_CREDENTIALS_FILE` points it elsewhere — one
 * file per environment (a production login beside a local-dev one) without
 * changing HOME, which would also move the browser profile the login opens.
 */
function credentialsFile(): string {
  return process.env.MLCL_CREDENTIALS_FILE || join(homedir(), '.mlcl', 'credentials.json')
}

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
    if (!existsSync(credentialsFile())) return null
    return JSON.parse(readFileSync(credentialsFile(), 'utf8')) as StoredCredentials
  } catch (_error) {
    // A missing/corrupt credentials file just means logged-out.
    return null
  }
}

export function writeCredentials(creds: StoredCredentials): void {
  mkdirSync(join(credentialsFile(), '..'), { recursive: true, mode: 0o700 })
  // mode-at-creation: no world-readable TOCTOU window before a follow-up chmod.
  writeFileSync(credentialsFile(), `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 })
  chmodSync(credentialsFile(), 0o600)
}

export function clearCredentials(): void {
  // Unlink, not truncate — no empty inode lingers in page cache/fs slack.
  if (existsSync(credentialsFile())) rmSync(credentialsFile(), { force: true })
}

export class PlatformApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The platform's machine-readable reason (e.g. `workspace.sleeping`), when it sent one. */
    readonly errorKey?: string,
    /** Seconds the platform asked us to wait (`Retry-After`), when it sent the header. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
  }
}

/** The "try again" hint for a 429/503: the `Retry-After` seconds, or a minute for `service.busy`. */
function retryHint(retryAfterSeconds: number | undefined, errorKey: string | undefined): string {
  if (retryAfterSeconds !== undefined) {
    return ` Try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`
  }
  return errorKey === 'service.busy' ? ' Try again in a minute.' : ''
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {},
): Promise<T> {
  // Precedence: explicit arg > CI env var (MOLECULE_TOKEN) > stored credentials file.
  const token = init.token ?? process.env.MOLECULE_TOKEN ?? readCredentials()?.token
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs ?? 30_000),
    })
  } catch (error) {
    // A timeout or abort is rethrown as it was: callers tell "still running" from "failed" by its name.
    const name = (error as Error)?.name
    if (name === 'TimeoutError' || name === 'AbortError') throw error
    // `TypeError: fetch failed` tells a person nothing; say what could not be reached and what to check.
    throw new Error(
      `Cannot reach ${apiBaseUrl()}. Check your network connection, or MOLECULE_API_URL if you set it.`,
      { cause: error },
    )
  }
  const text = await response.text()
  const header = Number(response.headers.get('retry-after'))
  const retryAfter = Number.isFinite(header) && header > 0 ? Math.ceil(header) : undefined
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch (_error) {
    // A proxy error page (Fly 502/503/504) is not JSON: report the status, not a SyntaxError.
    if (!response.ok) {
      throw new PlatformApiError(
        response.status,
        `molecule.dev returned ${response.status} (not JSON).${retryHint(retryAfter, undefined)}`,
        undefined,
        retryAfter,
      )
    }
    throw new PlatformApiError(
      response.status,
      'molecule.dev returned a response that is not JSON.',
    )
  }
  if (!response.ok) {
    const body = data as { error?: string; errorKey?: string } | null
    const message = body?.error ?? `API responded ${response.status}`
    throw new PlatformApiError(
      response.status,
      `${message.replace(/\s+$/, '')}${retryHint(retryAfter, body?.errorKey)}`,
      body?.errorKey,
      retryAfter,
    )
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
  slug?: string
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
export async function getProjectEnv(projectId: string, token?: string): Promise<PlatformEnvVar[]> {
  const raw = (await request<unknown>(`/projects/${projectId}/env`, { token })) as {
    envVars?: Record<string, { value?: string; masked?: boolean; scope?: string }>
  }
  return Object.entries(raw.envVars ?? {}).map(([key, v]) => ({
    key,
    value: v?.value,
    masked: v?.masked,
    scope: v?.scope as PlatformEnvVar['scope'],
  }))
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
  /** The deployment's public address, set by the platform once it is ready. */
  url?: string | null
  /** @deprecated Older platform builds; read `url` first. */
  liveUrl?: string
}

/** POST /projects/:id/deployments — trigger a production deploy (builds in the sandbox, launches the runtime container). */
export function createDeployment(projectId: string, token?: string): Promise<PlatformDeployment> {
  // The platform wraps the row in `{ data }`; older builds returned it bare.
  return request<{ data?: PlatformDeployment } & PlatformDeployment>(
    `/projects/${projectId}/deployments`,
    { method: 'POST', body: {}, token },
  ).then((r) => r.data ?? r)
}

/** GET /projects/:id/deployments/:depId — poll a deploy (buildLog included for editor+). */
export function getDeployment(
  projectId: string,
  deploymentId: string,
  token?: string,
): Promise<PlatformDeployment & { buildLog?: string }> {
  return request<{ data?: PlatformDeployment & { buildLog?: string } } & PlatformDeployment>(
    `/projects/${projectId}/deployments/${deploymentId}`,
    { token },
  ).then((r) => r.data ?? r)
}

export interface DeviceCodeSession {
  deviceCode: string
  userCode: string
  /** Site-relative approval path, e.g. /cli?code=ABCD-EFGH. */
  verificationPath: string
  expiresIn: number
  interval: number
}

/**
 * Parses a response body as JSON. A proxy error page (Fly 502/503/504) is not JSON: report the
 * status, not a SyntaxError.
 */
async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch (_error) {
    throw new PlatformApiError(
      response.status,
      `molecule.dev returned ${response.status} (not JSON). Try again in a minute.`,
    )
  }
}

/** POST /cli/device-code — start the browser-based login dance (anonymous). */
export async function requestDeviceCode(): Promise<DeviceCodeSession> {
  const response = await fetch(`${apiBaseUrl()}/cli/device-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await readJsonBody(response)) as {
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
  const data = (await readJsonBody(response)) as { token?: string; error?: string }
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

/** A personal API token as the platform lists it. The token value itself is never listed. */
export interface PlatformApiToken {
  id: string
  name: string
  createdAt: string
  expiresAt: string
  /** Null until the token is first used. */
  lastUsedAt: string | null
}

/** The create response: the listed fields plus the token value, which is returned this once. */
export interface CreatedApiToken extends PlatformApiToken {
  token: string
}

/** Copy only the listed fields, so a token value can never travel through a list result. */
function apiTokenRow(row: PlatformApiToken): PlatformApiToken {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt ?? null,
  }
}

/** GET /account/api-tokens — the caller's personal API tokens. */
export async function listApiTokens(token?: string): Promise<PlatformApiToken[]> {
  const raw = await request<{ data?: PlatformApiToken[] }>('/account/api-tokens', { token })
  return (raw?.data ?? []).map(apiTokenRow)
}

/** POST /account/api-tokens — mint a named token; the response carries the token value once. */
export async function createApiToken(
  input: { name: string; expiresInDays?: number },
  token?: string,
): Promise<CreatedApiToken> {
  const raw = await request<{ data: CreatedApiToken }>('/account/api-tokens', {
    method: 'POST',
    body: input,
    token,
  })
  return raw.data
}

/** DELETE /account/api-tokens/:id — revoke a token; it stops authenticating. */
export async function revokeApiToken(id: string, token?: string): Promise<{ revoked: boolean }> {
  const raw = await request<{ data?: { revoked?: boolean } }>(
    `/account/api-tokens/${encodeURIComponent(id)}`,
    { method: 'DELETE', token },
  )
  return { revoked: raw?.data?.revoked === true }
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

/** Platform list endpoints wrap rows in various envelopes — unwrap any of them. */
function unwrapRows<T>(raw: unknown, ...keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[]
  const obj = raw as Record<string, unknown>
  if (obj && typeof obj === 'object') {
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
    if (Array.isArray(obj.data)) return obj.data as T[]
  }
  return []
}

// ── Sandbox ──────────────────────────────────────────────────────────────────

export interface SandboxStatus {
  status?: string
  previewUrl?: string
  [k: string]: unknown
}

export function sandboxAction(
  projectId: string,
  action: 'start' | 'stop' | 'restart',
  token?: string,
): Promise<SandboxStatus> {
  return request(`/projects/${projectId}/sandbox/${action}`, { method: 'POST', body: {}, token })
}

export function getSandboxStatus(projectId: string, token?: string): Promise<SandboxStatus> {
  return request(`/projects/${projectId}/sandbox/status`, { token })
}

export function sandboxExec(
  projectId: string,
  command: string,
  token?: string,
): Promise<{ stdout?: string; stderr?: string; exitCode?: number }> {
  return request(`/projects/${projectId}/sandbox/exec`, {
    method: 'POST',
    body: { command },
    token,
  })
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export interface Snapshot {
  id: string
  createdAt?: string
  label?: string
}

export async function listSnapshots(projectId: string, token?: string): Promise<Snapshot[]> {
  return unwrapRows<Snapshot>(await request<unknown>(`/projects/${projectId}/snapshots`, { token }))
}

export function createSnapshot(projectId: string, token?: string): Promise<Snapshot> {
  return request(`/projects/${projectId}/snapshots`, { method: 'POST', body: {}, token })
}

export function restoreSnapshot(
  projectId: string,
  snapshotId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/snapshots/${snapshotId}/restore`, {
    method: 'POST',
    body: {},
    token,
  })
}

export function deleteSnapshot(
  projectId: string,
  snapshotId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/snapshots/${snapshotId}`, { method: 'DELETE', token })
}

// ── Git (platform-mediated push/pull) ────────────────────────────────────────

export function gitPush(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/git-push`, { method: 'POST', body: {}, token })
}

export function gitPull(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/git-pull`, { method: 'POST', body: {}, token })
}

// ── Deployments (list/detail/cancel) + CI workflows ──────────────────────────

export async function listDeployments(
  projectId: string,
  token?: string,
): Promise<PlatformDeployment[]> {
  return unwrapRows<PlatformDeployment>(
    await request<unknown>(`/projects/${projectId}/deployments`, { token }),
  )
}

export function cancelDeployment(
  projectId: string,
  deploymentId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/deployments/${deploymentId}`, { method: 'DELETE', token })
}

export function getWorkflowYaml(
  projectId: string,
  platform: 'github' | 'gitlab',
  token?: string,
): Promise<string> {
  return request<string>(`/projects/${projectId}/workflows/${platform}`, { token })
}

export function applyWorkflow(
  projectId: string,
  platform: 'github' | 'gitlab',
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/workflows/${platform}/apply`, {
    method: 'POST',
    body: {},
    token,
  })
}

// ── Domains ──────────────────────────────────────────────────────────────────

export interface CustomDomain {
  id: string
  domain: string
  verified?: boolean
  status?: string
}

export async function listDomains(projectId: string, token?: string): Promise<CustomDomain[]> {
  return unwrapRows<CustomDomain>(
    await request<unknown>(`/projects/${projectId}/domains`, { token }),
    'domains',
  )
}

export function addDomain(
  projectId: string,
  domain: string,
  token?: string,
): Promise<CustomDomain> {
  return request(`/projects/${projectId}/domains`, { method: 'POST', body: { domain }, token })
}

export function verifyDomain(
  projectId: string,
  domainId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/domains/${domainId}/verify`, {
    method: 'POST',
    body: {},
    token,
  })
}

export function removeDomain(
  projectId: string,
  domainId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/domains/${domainId}`, { method: 'DELETE', token })
}

// ── API keys ─────────────────────────────────────────────────────────────────

export interface ProjectApiKey {
  id: string
  name?: string
  /** Masked display form, e.g. `mk_…a1b2`. */
  masked?: string
  /** The plaintext key — present ONLY in the mint response, exactly once. */
  token?: string
  scopes?: string[]
  createdAt?: string
}

export async function listApiKeys(projectId: string, token?: string): Promise<ProjectApiKey[]> {
  return unwrapRows<ProjectApiKey>(
    await request<unknown>(`/projects/${projectId}/api-keys`, { token }),
    'apiKeys',
  )
}

export function createApiKey(
  projectId: string,
  name: string,
  token?: string,
): Promise<ProjectApiKey> {
  return request(`/projects/${projectId}/api-keys`, { method: 'POST', body: { name }, token })
}

export function revokeApiKey(projectId: string, keyId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/api-keys/${keyId}`, { method: 'DELETE', token })
}

// ── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  userId: string
  email?: string
  role: string
}
export interface TeamInvite {
  id: string
  email?: string
  role: string
}

export async function listTeam(
  projectId: string,
  token?: string,
): Promise<{ members?: TeamMember[]; invites?: TeamInvite[] }> {
  const raw = (await request<unknown>(`/projects/${projectId}/team`, { token })) as {
    data?: { members?: TeamMember[]; invites?: TeamInvite[] }
    members?: TeamMember[]
    invites?: TeamInvite[]
  }
  return raw.data ?? { members: raw.members, invites: raw.invites }
}

export function inviteMember(
  projectId: string,
  email: string,
  role: string,
  token?: string,
): Promise<TeamInvite> {
  return request(`/projects/${projectId}/team/invite`, {
    method: 'POST',
    body: { email, role },
    token,
  })
}

export function revokeInvite(
  projectId: string,
  inviteId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/team/invites/${inviteId}`, { method: 'DELETE', token })
}

export function setMemberRole(
  projectId: string,
  memberId: string,
  role: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/team/${memberId}`, {
    method: 'PATCH',
    body: { role },
    token,
  })
}

export function removeMember(
  projectId: string,
  memberId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/team/${memberId}`, { method: 'DELETE', token })
}

// ── Shares ───────────────────────────────────────────────────────────────────

export interface ShareLink {
  id: string
  slug: string
  url?: string
  createdAt?: string
}

export async function listShares(projectId: string, token?: string): Promise<ShareLink[]> {
  return unwrapRows<ShareLink>(await request<unknown>(`/projects/${projectId}/shares`, { token }))
}

export function createShare(projectId: string, token?: string): Promise<ShareLink> {
  return request(`/projects/${projectId}/shares`, { method: 'POST', body: {}, token })
}

export function removeShare(projectId: string, shareId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/shares/${shareId}`, { method: 'DELETE', token })
}

// ── Builds ───────────────────────────────────────────────────────────────────

export interface ProjectBuild {
  id: string
  status: string
  platform?: string
  createdAt?: string
}

export function startBuild(
  projectId: string,
  platform: 'mobile' | 'desktop',
  token?: string,
): Promise<ProjectBuild> {
  return request(`/projects/${projectId}/builds/${platform}`, { method: 'POST', body: {}, token })
}

export async function listBuilds(projectId: string, token?: string): Promise<ProjectBuild[]> {
  return unwrapRows<ProjectBuild>(
    await request<unknown>(`/projects/${projectId}/builds`, { token }),
  )
}

export function getBuild(
  projectId: string,
  buildId: string,
  token?: string,
): Promise<ProjectBuild> {
  return request(`/projects/${projectId}/builds/${buildId}`, { token })
}

// ── Usage ────────────────────────────────────────────────────────────────────

export function getUsage(
  scope: 'account' | 'project',
  projectId: string | undefined,
  token?: string,
): Promise<unknown> {
  return request(
    scope === 'project' && projectId ? `/projects/${projectId}/usage` : '/account/usage',
    { token },
  )
}

export async function getTiers(token?: string): Promise<unknown[]> {
  return unwrapRows<unknown>(await request<unknown>('/tiers', { token }), 'data')
}

// ── DB backups + export ──────────────────────────────────────────────────────

export interface DbBackup {
  id: string
  createdAt?: string
  status?: string
}

export async function listBackups(projectId: string, token?: string): Promise<DbBackup[]> {
  return unwrapRows<DbBackup>(
    await request<unknown>(`/projects/${projectId}/database/backups`, { token }),
  )
}

export function createBackup(projectId: string, token?: string): Promise<DbBackup> {
  return request(`/projects/${projectId}/database/backups`, { method: 'POST', body: {}, token })
}

export function restoreBackup(
  projectId: string,
  backupId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/database/backups/${backupId}/restore`, {
    method: 'POST',
    body: {},
    token,
  })
}

// ── Invitations ──────────────────────────────────────────────────────────────

export interface Invitation {
  id: string
  email?: string
  role: string
  projectId?: string
  projectName?: string
}

export async function listInvitations(token?: string): Promise<Invitation[]> {
  return unwrapRows<Invitation>(await request<unknown>('/invitations', { token }))
}

export function acceptInvitation(inviteId: string, token?: string): Promise<unknown> {
  return request(`/invitations/${inviteId}/accept`, { method: 'POST', body: {}, token })
}

export function declineInvitation(inviteId: string, token?: string): Promise<unknown> {
  return request(`/invitations/${inviteId}/decline`, { method: 'POST', body: {}, token })
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(token?: string): Promise<{
  id: string
  email?: string
  name?: string
  username?: string
  avatar?: string
  bio?: string
}> {
  const me = await whoami(token)
  const raw = await request<unknown>(`/users/${me.id}`, { token })
  const props =
    (raw as { props?: Record<string, unknown> }).props ?? (raw as Record<string, unknown>)
  return {
    id: me.id,
    email: (props.email as string) ?? me.email,
    name: props.name as string | undefined,
    username: props.username as string | undefined,
    avatar: props.avatar as string | undefined,
    bio: props.bio as string | undefined,
  }
}

export function updateProfile(
  fields: { name?: string; username?: string; bio?: string; avatar?: string },
  token?: string,
): Promise<unknown> {
  return whoami(token).then((me) =>
    request(`/users/${me.id}`, { method: 'PATCH', body: fields, token }),
  )
}

// ── Status ───────────────────────────────────────────────────────────────────

export interface StatusEvent {
  date: string
  status: string
  components?: Record<string, string>
}

export async function getStatusHistory(token?: string): Promise<StatusEvent[]> {
  return unwrapRows<StatusEvent>(await request<unknown>('/status/history', { token }))
}

// ── Activities ───────────────────────────────────────────────────────────────

export interface Activity {
  id: string
  type: string
  status: string
  recipient?: string
  summary?: string
  createdAt?: string
}

export async function listActivities(projectId: string, token?: string): Promise<Activity[]> {
  return unwrapRows<Activity>(
    await request<unknown>(`/projects/${projectId}/activities`, { token }),
  )
}

// ── Vault ────────────────────────────────────────────────────────────────────

export interface VaultSecret {
  key: string
  description?: string
  createdAt?: string
}

export async function listVault(projectId: string, token?: string): Promise<VaultSecret[]> {
  const raw = (await request<unknown>(`/projects/${projectId}/vault`, { token })) as {
    secrets?: VaultSecret[]
    data?: VaultSecret[]
  }
  return raw.secrets ?? raw.data ?? []
}

export function setVaultSecret(
  projectId: string,
  key: string,
  value: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/vault/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: { value },
    token,
  })
}

export function deleteVaultSecret(
  projectId: string,
  key: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/vault/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    token,
  })
}

export function mintVaultToken(projectId: string, token?: string): Promise<{ token: string }> {
  return request(`/projects/${projectId}/vault/token`, { method: 'POST', body: {}, token })
}

export function revokeVaultToken(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/vault/token`, { method: 'DELETE', token })
}

// ── Project CRUD completion ──────────────────────────────────────────────────

export async function getProject(projectId: string, token?: string): Promise<PlatformProject> {
  const raw = await request<unknown>(`/projects/${projectId}`, { token })
  const props = (raw as { props?: PlatformProject }).props ?? (raw as PlatformProject)
  return props
}

/** The input `POST /projects` takes — the same shape the IDE's Dashboard sends. */
export interface CreateProjectInput {
  name: string
  projectType: string
  framework?: string
  packages?: string[]
}

/** Create a project (no sandbox yet — `sandboxAction(id, 'start')` boots one). */
export function createProject(input: CreateProjectInput, token?: string): Promise<PlatformProject> {
  return request<{ data?: PlatformProject } & PlatformProject>('/projects', {
    method: 'POST',
    body: input,
    token,
  }).then((r) => r.data ?? r)
}

/**
 * Write one text file into the project sandbox (`PUT /projects/:id/files/*`).
 * `path` is workspace-relative (`app/src/App.tsx`); the API rejects paths
 * outside /workspace and bodies over 10 MB.
 */
export function writeProjectFile(
  projectId: string,
  path: string,
  content: string,
  token?: string,
): Promise<unknown> {
  const rel = path.replace(/^\/+/, '')
  return request(
    `/projects/${projectId}/files/${rel.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'PUT',
      body: { content },
      token,
    },
  )
}

export function updateProject(
  projectId: string,
  settings: Record<string, unknown>,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}`, { method: 'PATCH', body: settings, token })
}

/** How long `deleteProject` waits for the server to finish tearing a project down. */
export const DELETE_PROJECT_TIMEOUT_MS = 5 * 60_000

export function deleteProject(projectId: string, token?: string): Promise<unknown> {
  // The server aborts running turns/agent runs and tears down production before it answers.
  return request(`/projects/${projectId}`, {
    method: 'DELETE',
    token,
    timeoutMs: DELETE_PROJECT_TIMEOUT_MS,
  })
}

/**
 * PUT /projects/:id/protection — refuse deletion of the project until an
 * owner removes protection. For named, irreplaceable projects that a cleanup
 * of disposable run projects must never sweep up.
 */
export function putProjectProtection(
  projectId: string,
  enabled: boolean,
  token?: string,
): Promise<{ enabled: boolean }> {
  return request(`/projects/${projectId}/protection`, {
    method: 'PUT',
    body: { enabled },
    token,
  })
}

// ── Cloud DB inspection ──────────────────────────────────────────────────────

export interface DatabaseInfo {
  host?: string
  port?: number
  database?: string
  username?: string
  passwordMasked?: string
}

export async function getDatabaseInfo(projectId: string, token?: string): Promise<DatabaseInfo> {
  const raw = await request<unknown>(`/projects/${projectId}/database`, { token })
  return (raw as { props?: DatabaseInfo }).props ?? (raw as DatabaseInfo)
}

export interface DatabaseTable {
  name: string
  columns?: Array<{ name: string; type: string }>
}

export async function getDatabaseTables(
  projectId: string,
  token?: string,
): Promise<DatabaseTable[]> {
  return unwrapRows<DatabaseTable>(
    await request<unknown>(`/projects/${projectId}/database/tables`, { token }),
    'tables',
  )
}

export function queryDatabase(
  projectId: string,
  sql: string,
  token?: string,
): Promise<{ rows?: unknown[]; error?: string }> {
  return request(`/projects/${projectId}/database/query`, { method: 'POST', body: { sql }, token })
}

// ── Account deletion + GDPR export ──────────────────────────────────────────

/**
 * DELETE /users/:id. Accounts with a password must send it; OAuth-only
 * accounts omit it.
 */
export function deleteAccount(password?: string, token?: string): Promise<unknown> {
  return whoami(token).then((me) =>
    request(`/users/${me.id}`, {
      method: 'DELETE',
      // The server reads req.body.password; the IDE http client wraps its own
      // DELETE payload as { data } on the wire, this fetch client does not.
      body: password ? { password } : undefined,
      token,
    }),
  )
}

/** The export bundle's `meta` block (see the platform's DataExport resource). */
export interface AccountExportMeta {
  notice?: string
  sectionLimits?: Record<string, number>
  truncatedSections?: Record<string, { truncated: boolean; limit: number }>
}

export function exportAccountData(
  token?: string,
): Promise<Record<string, unknown> & { meta?: AccountExportMeta }> {
  return whoami(token).then((me) => request(`/users/${me.id}/data-export`, { token }))
}

// ── Agent session transcripts ───────────────────────────────────────────────

/** A stored session, as the platform lists it (never its turns). */
export interface TranscriptSummary {
  id: string
  /** `molecule-ide` = the project's own chat; `import` = a file someone imported. */
  source: 'molecule-ide' | 'import'
  format: string
  harness: string
  /** The first thing the person asked, trimmed. */
  title: string
  model?: string
  startedAt?: string
  turns: number
  importedAt?: string
}

/** The platform's import limit for one transcript file. */
export const TRANSCRIPT_MAX_BYTES = 20 * 1024 * 1024

/** Pull a transcript summary out of whichever envelope the platform used. */
function unwrapTranscript(raw: unknown): TranscriptSummary {
  const obj = (raw ?? {}) as Record<string, unknown>
  const inner = (obj.transcript ?? obj.data ?? obj.props ?? obj) as Record<string, unknown>
  return ((inner.props as TranscriptSummary | undefined) ?? inner) as unknown as TranscriptSummary
}

/**
 * Import one agent session (Claude Code, Codex, … — the platform recognizes the
 * format) into a project. The same text imported twice returns the stored row.
 * Throws {@link PlatformApiError} with status 422 when no reader recognizes the
 * file and 413 when it is too large.
 */
export async function importTranscript(
  projectId: string,
  input: { fileName: string; text: string },
  token?: string,
): Promise<TranscriptSummary & { existing?: boolean }> {
  const raw = await request<unknown>(`/projects/${projectId}/transcripts`, {
    method: 'POST',
    body: input,
    token,
    // A 20 MB body over a slow link needs longer than the default 30 s.
    timeoutMs: 5 * 60_000,
  })
  // The platform answers a repeat import with the stored row and `existing: true`.
  const existing = Boolean(
    raw && typeof raw === 'object' && (raw as Record<string, unknown>).existing === true,
  )
  return { ...unwrapTranscript(raw), ...(existing ? { existing } : {}) }
}

/** The project's stored sessions: its own chat plus every imported one. */
export async function listTranscripts(
  projectId: string,
  token?: string,
): Promise<TranscriptSummary[]> {
  return unwrapRows<TranscriptSummary>(
    await request<unknown>(`/projects/${projectId}/transcripts`, { token }),
    'transcripts',
  )
}

/** Remove one imported session. */
export function removeTranscript(
  projectId: string,
  transcriptId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/transcripts/${encodeURIComponent(transcriptId)}`, {
    method: 'DELETE',
    token,
  })
}

/** What a project's share links show beyond the preview. */
export interface ShareVisibility {
  /** Session transcripts (the project's chat and imported ones). */
  transcripts: boolean
  /** A read-only view of the workspace files. */
  workspace: boolean
}

/** Publish (or unpublish) the project's session transcripts behind its share links. Admin+. */
export async function setPublicTranscripts(
  projectId: string,
  enabled: boolean,
  token?: string,
): Promise<boolean> {
  const raw = await request<{ enabled?: boolean }>(`/projects/${projectId}/public-transcript`, {
    method: 'PUT',
    body: { enabled },
    token,
  })
  return raw?.enabled ?? enabled
}

/** What turning the public workspace on or off did. */
export interface PublicWorkspaceResult {
  enabled: boolean
  /** Files copied for the public view (0 when turned off). */
  files: number
  /** When the files were copied; null when turned off. */
  capturedAt: string | null
}

/**
 * Publish (or unpublish) a read-only view of the workspace files behind its
 * share links. Admin+. Turning it on copies the files from the running
 * sandbox at that moment, and turning it on again re-copies them. Throws
 * {@link PlatformApiError} with status 409 and errorKey `workspace.sleeping`
 * when the sandbox is not running.
 */
export async function setPublicWorkspace(
  projectId: string,
  enabled: boolean,
  token?: string,
): Promise<PublicWorkspaceResult> {
  const raw = await request<Partial<PublicWorkspaceResult> | null>(
    `/projects/${projectId}/public-workspace`,
    { method: 'PUT', body: { enabled }, token },
  )
  return {
    enabled: raw?.enabled ?? enabled,
    files: raw?.files ?? 0,
    capturedAt: raw?.capturedAt ?? null,
  }
}

/** The current share visibility, read from the project's settings. */
export async function getShareVisibility(
  projectId: string,
  token?: string,
): Promise<ShareVisibility> {
  const raw = await request<unknown>(`/projects/${projectId}`, { token })
  const obj = (raw ?? {}) as Record<string, unknown>
  const project = (obj.props ?? obj.data ?? obj) as { settings?: Record<string, unknown> | null }
  const settings = project.settings ?? {}
  return {
    transcripts: settings.publicTranscript === true,
    workspace: settings.publicWorkspace === true,
  }
}

// ── Clone shared project ────────────────────────────────────────────────────

export function cloneSharedProject(slug: string, token?: string): Promise<PlatformProject> {
  return request(`/share/${slug}/clone`, { method: 'POST', body: {}, token })
}

// ── Repo import ─────────────────────────────────────────────────────────────

export interface ImportRepo {
  name: string
  url: string
  owner?: string
  private?: boolean
}

export async function listImportRepos(projectId: string, token?: string): Promise<ImportRepo[]> {
  return unwrapRows<ImportRepo>(
    await request<unknown>(`/projects/${projectId}/git-repos`, { token }),
    'repos',
  )
}

export async function getImportSource(
  projectId: string,
  token?: string,
): Promise<{ source?: string; repo?: string }> {
  const raw = await request<unknown>(`/projects/${projectId}/git-import-source`, { token })
  return (
    (raw as { props?: { source?: string; repo?: string } }).props ??
    (raw as { source?: string; repo?: string })
  )
}

export function setImportSource(
  projectId: string,
  source: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/git-import-source`, {
    method: 'POST',
    body: { source },
    token,
  })
}

export function clearImportSource(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/git-import-source`, { method: 'DELETE', token })
}

export function uploadImportTarball(
  projectId: string,
  tarballPath: string,
  token?: string,
): Promise<unknown> {
  const body = readFileSync(tarballPath)
  return fetch(`${apiBaseUrl()}/projects/${projectId}/git-import-upload`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/gzip',
    },
    body,
    signal: AbortSignal.timeout(120_000),
  }).then(async (r) => {
    if (!r.ok) throw new PlatformApiError(r.status, `import upload failed (${r.status})`)
    return r.text().then((t) => (t ? JSON.parse(t) : {}))
  })
}

// ── SSH key store ───────────────────────────────────────────────────────────

export function setSshKey(projectId: string, key: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/git-ssh-key`, { method: 'PUT', body: { key }, token })
}

// ── Egress policy ───────────────────────────────────────────────────────────

export interface EgressPolicy {
  defaultPolicy?: string
  allowlist?: Array<{ host: string; approvedAt?: string }>
  denials?: Array<{ host: string; deniedAt?: string }>
}

export async function getEgressPolicy(projectId: string, token?: string): Promise<EgressPolicy> {
  const raw = await request<unknown>(`/projects/${projectId}/egress`, { token })
  return (raw as { props?: EgressPolicy }).props ?? (raw as EgressPolicy)
}

export function approveEgressDestination(
  projectId: string,
  host: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/egress/allowlist`, {
    method: 'POST',
    body: { host },
    token,
  })
}

export function revokeEgressDestination(
  projectId: string,
  host: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/egress/allowlist`, {
    method: 'DELETE',
    body: { host },
    token,
  })
}

// ── Logs ────────────────────────────────────────────────────────────────────

export interface LogLine {
  timestamp: string
  level: string
  message: string
  service?: string
}

export async function getLogs(projectId: string, tail = 100, token?: string): Promise<LogLine[]> {
  return unwrapRows<LogLine>(
    await request<unknown>(`/projects/${projectId}/logs?tail=${tail}`, { token }),
    'logs',
  )
}

/** Stream logs via SSE — calls onLine for each log line, resolves when stream ends. */
export async function streamLogs(
  projectId: string,
  onLine: (line: LogLine) => void,
  token?: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/projects/${projectId}/logs/stream`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(600_000),
  })
  if (!response.ok || !response.body)
    throw new PlatformApiError(response.status, 'log stream failed')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          onLine(JSON.parse(line.slice(6)) as LogLine)
        } catch (_error) {
          // Non-JSON SSE data line — skip it.
        }
      }
    }
  }
}

// ── Env detected keys ───────────────────────────────────────────────────────

export async function getDetectedEnvKeys(projectId: string, token?: string): Promise<string[]> {
  const raw = await request<unknown>(`/projects/${projectId}/env/detected`, { token })
  const props = (raw as { props?: { keys?: string[] } }).props ?? (raw as { keys?: string[] })
  return props.keys ?? []
}

// ── Credential broker ───────────────────────────────────────────────────────

export function enableBroker(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/vault/broker`, { method: 'POST', body: {}, token })
}

export function disableBroker(projectId: string, token?: string): Promise<unknown> {
  return request(`/projects/${projectId}/vault/broker`, { method: 'DELETE', token })
}

// ── Scheduled tasks ─────────────────────────────────────────────────────────

export interface ScheduledTask {
  id: string
  type: string
  prompt?: string
  status: string
  createdAt?: string
}

export async function listScheduledTasks(
  projectId: string,
  token?: string,
): Promise<ScheduledTask[]> {
  return unwrapRows<ScheduledTask>(
    await request<unknown>(`/projects/${projectId}/scheduled-tasks`, { token }),
    'tasks',
  )
}

export function cancelScheduledTask(
  projectId: string,
  taskId: string,
  token?: string,
): Promise<unknown> {
  return request(`/projects/${projectId}/scheduled-tasks/${taskId}`, { method: 'DELETE', token })
}

// ── Model catalog ───────────────────────────────────────────────────────────

export interface AiModel {
  id: string
  name?: string
  provider?: string
  contextWindow?: number
  isDefault?: boolean
}

export async function getAiModels(token?: string): Promise<AiModel[]> {
  const raw = await request<unknown>('/ai/models', { token })
  return unwrapRows<AiModel>(raw, 'models', 'data')
}

// ── Chat usage ──────────────────────────────────────────────────────────────

export async function getChatUsage(projectId: string, token?: string): Promise<unknown> {
  const raw = await request<unknown>(`/projects/${projectId}/chat-usage`, { token })
  return (raw as { props?: unknown }).props ?? raw
}
