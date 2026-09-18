/**
 * Shared test helpers for the photo-sharing Playwright suite.
 *
 * - APP_BASE / API_BASE pulled from VITE_PORT / API_PORT envs.
 * - signup() drives the actual /signup form via id-anchored inputs and
 *   waits for the AuthGuard redirect to /explore.
 * - login() / logout() round-trip credentials through the visible UI.
 * - apiPost / apiGet / apiPut / apiDelete reuse Playwright's request
 *   context so cookies set during signup/login flow into raw API calls.
 * - uploadAndCreatePhoto encapsulates the two-step upload→create flow
 *   the Upload page uses (multipart to /photo-uploads, then JSON to
 *   /photos), so individual specs can stage data without re-implementing
 *   busboy plumbing.
 */

import { Page, APIRequestContext, expect } from '@molecule/app-e2e-fixtures-default'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const APP_BASE =
  process.env.APP_BASE || `http://localhost:${process.env.VITE_PORT || '3000'}`
export const API_BASE =
  process.env.API_BASE || `http://localhost:${process.env.API_PORT || '4000'}/api`

let counter = 0
export function uniqueEmail(prefix = 'photo-sharing'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for /explore. Eliminates the API-only flake
 * where a spec fired an authed call before the auth-state hook had
 * persisted the token.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test Photographer',
): Promise<{ email: string; password: string }> {
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ') || 'Tester'
  await page.goto(`${APP_BASE}/signup`)
  const inputs = page.locator('input').first()
  await inputs.waitFor({ state: 'visible' })
  // First name + last name + email + password — match by type/autocomplete.
  await page.locator('input[autocomplete="given-name"]').fill(first || 'Test')
  await page.locator('input[autocomplete="family-name"]').fill(last)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  // Should be on /explore after auth redirect.
  await expect(page).toHaveURL(/\/explore/, { timeout: 30_000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${APP_BASE}/login`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input#password, input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/explore/, { timeout: 30_000 })
}

export async function logout(page: Page): Promise<void> {
  // Clear cookies — works regardless of menu rendering.
  await page.context().clearCookies()
}

export async function captureNetwork<T>(
  page: Page,
  fn: () => Promise<T>,
): Promise<{ result: T; reqs: { method: string; url: string; status: number }[] }> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: any) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    const result = await fn()
    return { result, reqs }
  } finally {
    page.off('response', onResp)
  }
}

/** Path to a small valid JPEG fixture used by upload tests. */
export const FIXTURE_JPEG = path.resolve(__dirname, 'fixtures', 'sample.jpg')

/**
 * Two-step upload helper. First posts the file to /api/photo-uploads
 * (multipart); second posts the photo metadata to /api/photos. Returns
 * the created photo id so tests can chain favorite/album/delete on it.
 */
export async function uploadAndCreatePhoto(
  request: APIRequestContext,
  opts: {
    title?: string
    visibility?: 'public' | 'unlisted' | 'private'
    tags?: string[]
    albumId?: string
    file?: string
  } = {},
): Promise<{ photoId: string; uploadId: string; url: string; width: number; height: number }> {
  const file = opts.file || FIXTURE_JPEG
  if (!fs.existsSync(file)) {
    throw new Error(`fixture missing: ${file}`)
  }
  const buffer = fs.readFileSync(file)
  const upload = await request.post(`${API_BASE}/photo-uploads`, {
    multipart: {
      file: { name: path.basename(file), mimeType: 'image/jpeg', buffer },
    },
  })
  expect(upload.status(), 'photo upload should be 201').toBe(201)
  const uploadJson = await upload.json()

  const photoBody = {
    title: opts.title ?? 'Test photo',
    original_url: uploadJson.url,
    large_url: uploadJson.url,
    thumbnail_url: uploadJson.url,
    width: uploadJson.width,
    height: uploadJson.height,
    visibility: opts.visibility ?? 'public',
    tags: opts.tags ?? [],
    ...(opts.albumId ? { album_id: opts.albumId } : {}),
  }
  const photo = await request.post(`${API_BASE}/photos`, {
    data: photoBody,
    headers: { 'content-type': 'application/json' },
  })
  expect(photo.status(), 'photo POST should be 201/200').toBeLessThan(300)
  const photoJson = await photo.json()
  expect(photoJson.id, 'photo id missing in POST response').toBeTruthy()

  return {
    photoId: photoJson.id,
    uploadId: uploadJson.id,
    url: uploadJson.url,
    width: uploadJson.width,
    height: uploadJson.height,
  }
}
