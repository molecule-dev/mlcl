// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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

/** Sign up a fresh user; returns the credentials.
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a fast
 * response can't be missed), assert < 400, wait for nav off /signup,
 * then poll until the JWT lands in localStorage. Without this, specs
 * that fire authed page.evaluate(fetch ...) immediately after signup()
 * sometimes read a stale empty token (React routes off /signup the
 * moment POST resolves but the auth-state hook persists the JWT in a
 * subsequent microtask → 401 → spec fails on attempt 1, passes on
 * retry → "flaky"). */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const name = page.locator('[data-mol-id="signup-name"]').first()
  if (await name.count().catch(() => 0)) await name.fill('Nimbus QA')
  await page.locator('[data-mol-id="signup-email"]').first().fill(email)
  await page.locator('[data-mol-id="signup-password"]').first().fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page.locator('[data-mol-id="signup-submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Make a multipart upload request through the cookie-authenticated browser
 *  context. `POST /api/uploads` streams the bytes to the active uploads bond
 *  AND creates the canonical `files` metadata row server-side, bound to the
 *  provider-minted storage key + the authenticated owner (the client never
 *  supplies a storage key — doing so would be a cross-tenant S3-read IDOR, so
 *  the byte upload is a single round-trip). The returned row therefore already
 *  points at the bytes that were just written — it is the real, downloadable
 *  file row, not a metadata-only stub. */
export async function apiUpload(
  page: Page,
  filename: string,
  contents: string,
  mime = 'text/plain',
) {
  return await page.evaluate(
    async ({ filename, contents, mime }: { filename: string; contents: string; mime: string }) => {
      const blob = new Blob([contents], { type: mime })
      const form = new FormData()
      form.append('file', blob, filename)
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`upload failed: ${res.status}`)
      return (await res.json()) as {
        id: string
        file_id: string
        name: string
        storage_key: string
        size: number
        mime_type: string
      }
    },
    { filename, contents, mime },
  )
}

/** Return the canonical file row for an already-uploaded file.
 *
 *  Since `POST /api/uploads` now creates the `files` row itself (server-minted
 *  key bound to real S3 bytes — see `apiUpload`), this helper does NOT create a
 *  second row. Minting another row via `POST /api/files` would give it a fresh
 *  server-side storage key with NO bytes behind it, so any download/share of
 *  that row 500s with S3 NoSuchKey. Instead we resolve the row that `apiUpload`
 *  already created (matched by its storage key) — the one whose bytes exist —
 *  and optionally move it into a folder. The `{ name, mime, size, storage_key }`
 *  args are kept for call-site compatibility; `storage_key` is the lookup key. */
export async function apiCreateFileRow(
  page: Page,
  args: {
    name: string
    mime: string
    size: number
    storage_key: string
    folder_id?: string | null
  },
) {
  return await page.evaluate(
    async (args: {
      name: string
      mime: string
      size: number
      storage_key: string
      folder_id?: string | null
    }) => {
      const listRes = await fetch('/api/files', { credentials: 'include' })
      if (!listRes.ok) throw new Error(`list files failed: ${listRes.status}`)
      const rows = (await listRes.json()) as Array<{
        id: string
        name: string
        storage_key: string
      }>
      const row = rows.find((f) => f.storage_key === args.storage_key)
      if (!row) {
        throw new Error(
          `uploaded file row not found for storage_key ${args.storage_key} (POST /api/uploads should have created it)`,
        )
      }
      if (args.folder_id) {
        const moveRes = await fetch(`/api/files/${row.id}/move`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ folder_id: args.folder_id }),
          credentials: 'include',
        })
        if (!moveRes.ok) throw new Error(`move file failed: ${moveRes.status}`)
      }
      return { id: row.id, name: row.name }
    },
    args,
  )
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('[data-mol-id="login-email"]').first().fill(email)
  await page.locator('[data-mol-id="login-password"]').first().fill(password)
  const submit = page.locator('[data-mol-id="login-submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: any) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}
