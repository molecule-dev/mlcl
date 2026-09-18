/**
 * e2e helpers for ai-document-processor (Parcela).
 *
 * Auth via the public signup form (POST /api/users) so each test gets
 * a fresh isolated user. The app exposes an Anthropic-backed upload
 * pipeline + Stripe-backed billing — both are real and require the
 * env vars in `.env.flagship-rollout` to be filled.
 */
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3020')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4020') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'parcela'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
  name: string
}

/**
 * Sign up via the UI; lands on /dashboard. Returns the credentials.
 * The signup form has Name + Email + Password fields.
 */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  const name = opts.name ?? 'Parcela Test'
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Name field uses placeholder "How should we address you?"
  const nameInput = page.locator('input[placeholder*="address"]').first()
  if (await nameInput.count().catch(() => 0)) {
    await nameInput.fill(name)
  }
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Hardening: gate on submit-enabled, arm the POST /api/users listener
  // BEFORE the click, then poll for the token cookie set by the auth hook
  // before returning. Eliminates the race where React routed off /signup
  // before the molecule auth hook had set the httpOnly cookie, so an
  // immediate `getAccessToken(page)` read null and `page.request.*` 401-ed.
  const submit = page
    .getByRole('button', { name: /create.*account|sign.*up|get.*started|start.*trial/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

/**
 * Login an existing user via the UI.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Capture network responses during a block. Returns
 * method/url/status tuples for assertions.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number; postData: string | null }>> {
  const reqs: Array<{ method: string; url: string; status: number; postData: string | null }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData: resp.request().postData() ?? null,
    })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
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
 * Tiny synthesizable invoice we can upload via the multipart endpoint.
 * Anthropic Claude classifies a text/plain block honestly; this body
 * has the unambiguous signals (header, vendor, totals, due date) that
 * push the model to invoice + high confidence so tests can assert on
 * `document_type === 'invoice'` without flakiness.
 */
export const INVOICE_TXT = [
  'INVOICE #INV-2025-0042',
  'From: Acme Office Supplies LLC, 123 Pine St, San Francisco, CA',
  'To: Globex Corp Accounts Payable',
  'Date: 2026-04-15',
  'Due Date: 2026-05-15',
  'Item: Office desk - $750.00',
  'Item: Office chair (x2) - $580.00',
  'Subtotal: $1,330.00',
  'Tax 8%: $106.40',
  'Total Due: $1,436.40',
  'Payment Terms: Net 30',
].join('\n')

/**
 * Upload a small text invoice via the live `/api/documents/upload`
 * endpoint using the page's session cookie / JWT. Real Anthropic call.
 */
export async function uploadInvoice(
  page: Page,
  filename = `invoice-${Date.now()}.txt`,
): Promise<{
  id: string
  document_type: string
  classification_confidence: number
  original_name: string
}> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await page.request.post(API_BASE + '/documents/upload', {
    headers,
    multipart: {
      file: {
        name: filename,
        mimeType: 'text/plain',
        buffer: Buffer.from(INVOICE_TXT, 'utf8'),
      },
    },
    timeout: 90_000,
  })
  expect(res.status(), 'upload should be 201').toBe(201)
  const body = (await res.json()) as {
    id: string
    document_type: string
    classification_confidence: number
    original_name: string
  }
  return body
}
