// Shared helpers for screen-sharing flagship e2e specs. Every spec
// imports from here rather than rewriting auth/network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'glint') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  accessToken: string
  userId: string
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/**
 * Sign up a fresh user via the public API. The server sets the httpOnly
 * `token` cookie on the response; subsequent page.request.* calls and
 * browser navigations automatically carry it. Returns the accessToken
 * from the response body for callers that need it for Bearer headers.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Glint Tester',
): Promise<SignupResult> {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as {
    props: { id: string }
    accessToken: string
    refreshToken?: string
  }
  // Navigate to a page so the cookie domain is established for subsequent
  // page.goto() calls that expect an authenticated session.
  await page.goto(APP_BASE + '/login')
  return {
    email,
    password,
    name,
    accessToken: body.accessToken,
    userId: body.props.id,
  }
}

/** Log a known user in via the public API. The server sets the httpOnly cookie. */
export async function login(page: Page, email: string, password: string) {
  const res = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as {
    props: { id: string }
    accessToken: string
    refreshToken?: string
  }
  await page.goto(APP_BASE + '/login')
  return body
}

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
}

/** Capture every network response during a block. Captures both browser-level
 * responses (via page.on('response')) AND direct API calls made through
 * page.request.* (APIRequestContext, which doesn't bubble through page events). */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as Parameters<typeof page.on>[1])

  type AnyOpts = Record<string, unknown> | undefined
  const req = page.request as unknown as Record<
    string,
    (url: string, opts?: AnyOpts) => Promise<{ status: () => number }>
  >
  const wrap = (method: string, key: string) => {
    const original = req[key].bind(page.request) as (
      url: string,
      opts?: AnyOpts,
    ) => Promise<{ status: () => number }>
    req[key] = async (url: string, opts?: AnyOpts) => {
      const r = await original(url, opts)
      reqs.push({ method, url, status: r.status() })
      return r
    }
    return original
  }
  const originals: Record<string, unknown> = {}
  for (const [m, k] of [
    ['GET', 'get'],
    ['POST', 'post'],
    ['PUT', 'put'],
    ['PATCH', 'patch'],
    ['DELETE', 'delete'],
    ['HEAD', 'head'],
  ] as const) {
    originals[k] = wrap(m, k)
  }

  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
    for (const k of Object.keys(originals)) {
      req[k] = originals[k] as (url: string, opts?: AnyOpts) => Promise<{ status: () => number }>
    }
  }
  return reqs
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface Workspace {
  id: string
  owner_id: string
  name: string
  slug: string
  plan_key: string
  seat_limit: number
}

export interface Recording {
  id: string
  owner_id: string
  workspace_id: string | null
  title: string
  description: string | null
  duration_ms: number
  video_url: string | null
  thumbnail_url: string | null
  status: string
  visibility: 'private' | 'workspace' | 'public'
  share_token: string
  view_count: number
  comment_count: number
  created_at: string
}

export interface Comment {
  id: string
  recording_id: string
  user_id: string
  content: string
  timestamp_ms: number
  created_at: string
}

/** Fetch (or auto-create) the user's primary workspace. */
export async function primaryWorkspace(page: Page, accessToken: string): Promise<Workspace> {
  const res = await page.request.get(`${API_BASE}/workspaces/me/primary`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as Workspace
}

/** Create a recording for the current user. */
export async function createRecording(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    workspace_id: string
    visibility: Recording['visibility']
    duration_ms: number
    video_url: string
  }> = {},
): Promise<Recording> {
  const ws = overrides.workspace_id ?? (await primaryWorkspace(page, accessToken)).id
  const res = await page.request.post(`${API_BASE}/recordings`, {
    headers: authHeaders(accessToken),
    data: {
      title: overrides.title ?? 'Glint clip',
      description: overrides.description ?? '',
      workspace_id: ws,
      visibility: overrides.visibility ?? 'workspace',
      duration_ms: overrides.duration_ms ?? 12_500,
      video_url: overrides.video_url ?? 'https://example.com/clip.webm',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as Recording
}

/** List the caller's recordings. */
export async function listRecordings(page: Page, accessToken: string): Promise<Recording[]> {
  const res = await page.request.get(`${API_BASE}/recordings`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as Recording[] | { data?: Recording[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export async function postComment(
  page: Page,
  accessToken: string,
  recordingId: string,
  content: string,
  timestamp_ms = 0,
): Promise<Comment> {
  const res = await page.request.post(`${API_BASE}/comments/${recordingId}`, {
    headers: authHeaders(accessToken),
    data: { content, timestamp_ms },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as Comment
}

export async function listComments(
  page: Page,
  accessToken: string,
  recordingId: string,
): Promise<Comment[]> {
  const res = await page.request.get(`${API_BASE}/comments/${recordingId}`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  const body = (await res.json()) as Comment[] | { data?: Comment[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export async function inviteMember(
  page: Page,
  accessToken: string,
  workspaceId: string,
  email: string,
  role: 'admin' | 'member' = 'member',
): Promise<{ invited: boolean; email: string }> {
  const res = await page.request.post(`${API_BASE}/workspace-members/invite`, {
    headers: authHeaders(accessToken),
    data: { workspace_id: workspaceId, email, role },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as { invited: boolean; email: string }
}
