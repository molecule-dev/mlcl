/**
 * Auth for molecule-mcp — the SAME device-code login dance and the SAME
 * credentials file as the mlcl CLI (~/.mlcl/credentials.json), implemented
 * with plain fetch so the server keeps zero unpublished npm dependencies.
 * One approval covers every surface: CLI, MCP, and any mlcl child process
 * the server spawns.
 *
 * Tool semantics are agent-driven (a tool call must never hang for minutes):
 *   login       → { url, userCode, deviceCode } — the agent shows the URL
 *   login_poll  → pending | logged_in — the agent polls after the user clicks
 *   logout      → clears the stored token
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_API = 'https://api.molecule.dev/api'
const DEFAULT_SITE = 'https://www.molecule.dev'
const CREDENTIALS_FILE = join(homedir(), '.mlcl', 'credentials.json')

/** MOLECULE_ENV=local — same one-switch local-dev defaults as the CLI. */
function isLocalEnv(): boolean {
  return process.env.MOLECULE_ENV === 'local'
}

function apiBase(): string {
  if (isLocalEnv()) return process.env.MOLECULE_API_URL ?? 'http://localhost:4000/api'
  return process.env.MOLECULE_API_URL ?? DEFAULT_API
}

function siteBase(): string {
  if (isLocalEnv()) return process.env.MOLECULE_SITE_URL ?? 'http://localhost:3000'
  return process.env.MOLECULE_SITE_URL ?? DEFAULT_SITE
}

export interface StoredCredentials {
  token: string
  email?: string
  savedAt: string
}

export function readCredentials(): StoredCredentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return null
    const raw = readFileSync(CREDENTIALS_FILE, 'utf8').trim()
    if (!raw) return null
    return JSON.parse(raw) as StoredCredentials
  } catch {
    return null
  }
}

function writeCredentials(creds: StoredCredentials): void {
  mkdirSync(join(CREDENTIALS_FILE, '..'), { recursive: true })
  writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(creds, null, 2)}\n`)
  chmodSync(CREDENTIALS_FILE, 0o600)
}

export function clearCredentials(): void {
  // Unlink, not truncate — no empty inode lingers in page cache/fs slack.
  if (existsSync(CREDENTIALS_FILE)) rmSync(CREDENTIALS_FILE, { force: true })
}

async function postJson<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  return { status: response.status, data: (text ? JSON.parse(text) : {}) as T }
}

export interface LoginSession {
  url: string
  userCode: string
  deviceCode: string
}

/** Step 1: start the browser flow. Returns what the agent shows the user. */
export async function startLogin(): Promise<LoginSession> {
  const { status, data } = await postJson<{
    deviceCode?: string
    userCode?: string
    verificationUrl?: string
    error?: string
  }>('/cli/device-code', {})
  if (status !== 201 || !data.deviceCode || !data.userCode) {
    throw new Error(data.error ?? `device-code request failed (${status})`)
  }
  return {
    url: `${siteBase()}${data.verificationUrl ?? `/cli?code=${data.userCode}`}`,
    userCode: data.userCode,
    deviceCode: data.deviceCode,
  }
}

export type LoginPollResult =
  { status: 'pending' } | { status: 'logged_in'; email?: string } | { status: 'expired' }

/** Step 2: poll once. Stores + verifies the token on success. */
export async function pollLogin(deviceCode: string): Promise<LoginPollResult> {
  const { status, data } = await postJson<{ token?: string; error?: string }>('/cli/device-token', {
    deviceCode,
  })
  if (status === 200 && data.token) {
    // Verify + capture the email for display, same as the CLI does.
    try {
      const me = await fetch(`${apiBase()}/users/me`, {
        headers: { authorization: `Bearer ${data.token}` },
        signal: AbortSignal.timeout(15_000),
      })
      const user = (await me.json()) as { email?: string; id?: string }
      writeCredentials({ token: data.token, email: user.email, savedAt: new Date().toISOString() })
      return { status: 'logged_in', email: user.email ?? user.id }
    } catch {
      writeCredentials({ token: data.token, savedAt: new Date().toISOString() })
      return { status: 'logged_in' }
    }
  }
  if (data.error === 'authorization_pending') return { status: 'pending' }
  return { status: 'expired' }
}

/** Who is logged in (validates against the platform). */
export async function whoami(): Promise<{ email?: string; id?: string } | null> {
  const creds = readCredentials()
  const token = creds?.token ?? process.env.MOLECULE_TOKEN
  if (!token) return null
  const me = await fetch(`${apiBase()}/users/me`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!me.ok) return null
  const raw = (await me.json()) as {
    props?: { email?: string; id?: string }
    email?: string
    id?: string
  }
  return { email: raw.props?.email ?? raw.email, id: raw.props?.id ?? raw.id }
}
